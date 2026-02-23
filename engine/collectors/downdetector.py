"""
Downdetector collector for DatePulse.

Scrapes outage report data from downdetector.fr for dating apps.
Produces one signal type per app:
  - outage_reports: number of user-reported issues per time slot

Degrades gracefully if Cloudflare blocks the request (returns 0).
"""

import json
import logging
import re
import time

import requests

from engine.config import TARGET_APPS
from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "downdetector"

# Downdetector FR URL slugs for target apps
APP_SLUGS: dict[str, str] = {
    "tinder": "tinder",
    "bumble": "bumble",
    "hinge": "hinge",
    "happn": "happn",
}

BASE_URL = "https://downdetector.fr/statut/{slug}/"

# Browser-like headers to reduce Cloudflare blocking
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
}

# Rate limiting delay between apps (seconds)
DELAY_BETWEEN_APPS = 3

# Request timeout (seconds)
REQUEST_TIMEOUT = 15


def _extract_chart_data(html: str) -> list[dict]:
    """
    Extract outage report data points from Downdetector page HTML.

    Downdetector embeds chart data as JSON in script tags. We look for
    patterns like series data arrays with x (timestamp) and y (count) values.

    Returns a list of {"timestamp": str, "count": int} dicts.
    """
    from bs4 import BeautifulSoup

    data_points: list[dict] = []

    soup = BeautifulSoup(html, "html.parser")

    # Strategy 1: Look for embedded JSON chart data in script tags
    for script in soup.find_all("script"):
        script_text = script.string or ""

        # Look for chart data arrays (common Highcharts/Chart.js patterns)
        # Pattern: arrays of [timestamp, value] or {x: timestamp, y: value}
        json_patterns = [
            r'series\s*:\s*\[\s*\{[^}]*data\s*:\s*(\[[^\]]*\])',
            r'"data"\s*:\s*(\[\s*\[\d+\s*,\s*\d+\](?:\s*,\s*\[\d+\s*,\s*\d+\])*\s*\])',
            r'categories\s*:\s*(\[[^\]]+\])',
        ]

        for pattern in json_patterns:
            matches = re.findall(pattern, script_text, re.DOTALL)
            for match in matches:
                try:
                    parsed = json.loads(match)
                    if isinstance(parsed, list):
                        for item in parsed:
                            if isinstance(item, list) and len(item) == 2:
                                ts, count = item
                                # Timestamp in milliseconds
                                if isinstance(ts, (int, float)) and ts > 1_000_000_000:
                                    if ts > 1_000_000_000_000:
                                        ts = ts / 1000  # ms to seconds
                                    from datetime import datetime, timezone

                                    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                                    data_points.append({
                                        "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
                                        "count": int(count),
                                    })
                except (json.JSONDecodeError, ValueError, TypeError):
                    continue

    # Strategy 2: Look for data in ld+json or other structured formats
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld_data = json.loads(script.string or "")
            # Some sites embed report data in structured data
            if isinstance(ld_data, dict) and "mainEntity" in ld_data:
                logger.debug("Found ld+json data, but no report counts")
        except (json.JSONDecodeError, ValueError):
            continue

    return data_points


def _fetch_outage_data(slug: str) -> list[dict]:
    """
    Fetch and parse outage report data for an app from Downdetector.

    Returns a list of {"timestamp": str, "count": int} dicts.
    Returns empty list if the page is blocked or parsing fails.
    """
    url = BASE_URL.format(slug=slug)

    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.exceptions.HTTPError as exc:
        if resp.status_code == 403:
            logger.warning(
                "Cloudflare blocked request to %s (403 Forbidden)", url
            )
        else:
            logger.warning("HTTP error fetching %s: %s", url, exc)
        return []
    except requests.exceptions.RequestException as exc:
        logger.warning("Request failed for %s: %s", url, exc)
        return []

    # Check for Cloudflare challenge page
    if "challenge-platform" in resp.text or "cf-browser-verification" in resp.text:
        logger.warning("Cloudflare challenge detected for %s", url)
        return []

    return _extract_chart_data(resp.text)


def collect() -> int:
    """
    Collect Downdetector outage reports for all target dating apps.

    Returns the total number of signals inserted.
    Returns 0 gracefully if Cloudflare blocks all requests.
    """
    logger.info("Starting Downdetector collection")
    total_inserted = 0

    for app_name in TARGET_APPS:
        slug = APP_SLUGS.get(app_name)
        if not slug:
            logger.warning("No Downdetector slug for app '%s', skipping", app_name)
            continue

        logger.info("Fetching outage data for %s (slug: %s)", app_name, slug)
        data_points = _fetch_outage_data(slug)

        if not data_points:
            logger.info("No outage data extracted for %s", app_name)
        else:
            logger.info(
                "Got %d data points for %s", len(data_points), app_name
            )

        for point in data_points:
            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="outage_reports",
                value=float(point["count"]),
                collected_at=point["timestamp"],
            )
            if ok:
                total_inserted += 1

        if app_name != TARGET_APPS[-1]:
            time.sleep(DELAY_BETWEEN_APPS)

    logger.info("Downdetector collection complete: %d signals inserted", total_inserted)
    return total_inserted


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent))

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    db.init_db()
    total = collect()
    print(f"Downdetector: {total} signals collected")
