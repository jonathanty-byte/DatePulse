"""
Wikipedia Pageviews collector for DatePulse.

Uses the Wikimedia REST API to fetch daily pageview counts
for dating app articles on French Wikipedia.

API: https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/
     fr.wikipedia/all-access/all-agents/{article}/daily/{start}/{end}
"""

import logging
import time
from datetime import datetime, timedelta, timezone

import requests

from engine.config import WIKIPEDIA_ARTICLES
from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "wikipedia"
BASE_URL = (
    "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article"
    "/fr.wikipedia/all-access/all-agents"
)
USER_AGENT = "DatePulse/1.0 (https://github.com/datepulse; contact@datepulse.fr)"


def _fetch_pageviews(
    article: str,
    start_date: datetime,
    end_date: datetime,
) -> list[dict]:
    """
    Fetch daily pageviews for a single article between two dates.

    Returns a list of dicts: [{"timestamp": "2024010100", "views": 123}, ...]
    """
    start_str = start_date.strftime("%Y%m%d00")
    end_str = end_date.strftime("%Y%m%d00")

    url = f"{BASE_URL}/{article}/daily/{start_str}/{end_str}"
    headers = {"User-Agent": USER_AGENT}

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("items", [])
    except requests.exceptions.HTTPError as exc:
        if resp.status_code == 404:
            logger.warning("Article not found: %s", article)
            return []
        logger.error("HTTP error fetching %s: %s", article, exc)
        return []
    except Exception as exc:
        logger.error("Failed to fetch pageviews for %s: %s", article, exc)
        return []


def collect(days_back: int = 30) -> int:
    """
    Collect Wikipedia pageviews for the last N days (default 30).

    Returns total number of inserted signals.
    """
    logger.info("Starting Wikipedia collection (last %d days)", days_back)

    end_date = datetime.now(timezone.utc) - timedelta(days=1)  # yesterday (today incomplete)
    start_date = end_date - timedelta(days=days_back)

    total = 0

    for app_name, article in WIKIPEDIA_ARTICLES.items():
        logger.info("Fetching pageviews for %s (%s)", app_name, article)

        items = _fetch_pageviews(article, start_date, end_date)
        inserted = 0

        for item in items:
            ts = item.get("timestamp", "")
            views = item.get("views", 0)

            # Parse timestamp "2024012300" -> "2024-01-23 00:00:00"
            try:
                dt = datetime.strptime(ts, "%Y%m%d%H")
                collected_at = dt.strftime("%Y-%m-%d %H:%M:%S")
            except ValueError:
                continue

            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="pageviews_daily",
                value=float(views),
                collected_at=collected_at,
            )
            if ok:
                inserted += 1

        logger.info("  %s: %d signals inserted", app_name, inserted)
        total += inserted

        # Small delay between apps to be polite
        time.sleep(1)

    logger.info("Wikipedia collection complete: %d total signals", total)
    return total


def collect_range(start_date: datetime, end_date: datetime) -> int:
    """
    Collect Wikipedia pageviews for a custom date range (used by backfill).

    Returns total number of inserted signals.
    """
    logger.info(
        "Fetching Wikipedia pageviews from %s to %s",
        start_date.strftime("%Y-%m-%d"),
        end_date.strftime("%Y-%m-%d"),
    )

    total = 0

    for app_name, article in WIKIPEDIA_ARTICLES.items():
        logger.info("  Fetching %s (%s)", app_name, article)

        items = _fetch_pageviews(article, start_date, end_date)
        inserted = 0

        for item in items:
            ts = item.get("timestamp", "")
            views = item.get("views", 0)

            try:
                dt = datetime.strptime(ts, "%Y%m%d%H")
                collected_at = dt.strftime("%Y-%m-%d %H:%M:%S")
            except ValueError:
                continue

            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="pageviews_daily",
                value=float(views),
                collected_at=collected_at,
            )
            if ok:
                inserted += 1

        logger.info("    %s: %d signals inserted", app_name, inserted)
        total += inserted
        time.sleep(1)

    return total


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent))

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    db.init_db()
    total = collect()
    print(f"Wikipedia: {total} signals collected")
