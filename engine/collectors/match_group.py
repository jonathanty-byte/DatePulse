"""
Match Group financial metrics collector for DatePulse.

Scrapes quarterly earnings data from Match Group's investor relations page
(https://ir.mtch.com/) to extract key metrics: paying users, RPP,
MAU (Europe), and seasonality commentary.

Stores data in the match_group_metrics table (separate from raw_signals).
This collector runs quarterly — duplicate entries are ignored.

Degrades gracefully if the IR page is blocked or structure changes.
"""

import json
import logging
import re

import requests
from bs4 import BeautifulSoup

from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "match_group"

IR_BASE_URL = "https://ir.mtch.com"
IR_NEWS_URL = f"{IR_BASE_URL}/news-and-events/press-releases"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

REQUEST_TIMEOUT = 20

# Patterns to extract financial metrics from earnings press releases
METRIC_PATTERNS = {
    "total_revenue": [
        r"total\s+revenue\s+(?:of\s+|was\s+)?\$?([\d,.]+)\s*(million|billion)",
        r"revenue\s+(?:of\s+|was\s+)?\$?([\d,.]+)\s*(million|billion)",
    ],
    "total_payers": [
        r"([\d,.]+)\s*million\s+(?:total\s+)?pay(?:ing|ers)",
        r"pay(?:ing|ers)\s+(?:of\s+|was\s+|were\s+)?([\d,.]+)\s*million",
    ],
    "tinder_payers": [
        r"tinder\s+(?:had\s+)?([\d,.]+)\s*million\s+pay(?:ing|ers)",
        r"tinder.*?pay(?:ing|ers)\s+(?:of\s+|was\s+)?([\d,.]+)\s*million",
    ],
    "rpp": [
        r"RPP\s+(?:of\s+|was\s+)?\$?([\d,.]+)",
        r"revenue\s+per\s+(?:paying\s+)?(?:user|payer)\s+(?:of\s+|was\s+)?\$?([\d,.]+)",
    ],
}

# Quarter detection pattern
QUARTER_PATTERN = re.compile(
    r"(?:Q([1-4])|(?:first|second|third|fourth)\s+quarter)\s*(?:20)?(\d{2})",
    re.IGNORECASE,
)

QUARTER_WORDS = {
    "first": "1",
    "second": "2",
    "third": "3",
    "fourth": "4",
}


def _fetch_press_releases() -> list[dict]:
    """
    Fetch list of press releases from Match Group IR.

    Returns a list of {"title": str, "url": str, "date": str}.
    """
    try:
        resp = requests.get(IR_NEWS_URL, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.exceptions.RequestException as exc:
        logger.warning("Failed to fetch Match Group IR page: %s", exc)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    releases = []

    # Look for press release links — IR sites vary in structure
    for link in soup.find_all("a", href=True):
        text = link.get_text(strip=True).lower()
        href = link["href"]

        # Filter for earnings-related press releases
        if any(
            keyword in text
            for keyword in ["quarter", "earnings", "financial results", "reports"]
        ):
            full_url = href if href.startswith("http") else f"{IR_BASE_URL}{href}"
            # Try to find a date near the link
            date_text = ""
            parent = link.find_parent(["tr", "li", "div", "article"])
            if parent:
                time_tag = parent.find("time")
                if time_tag:
                    date_text = time_tag.get("datetime", time_tag.get_text(strip=True))
                else:
                    # Look for date-like text
                    text_content = parent.get_text()
                    date_match = re.search(
                        r"(\w+\s+\d{1,2},?\s+\d{4})", text_content
                    )
                    if date_match:
                        date_text = date_match.group(1)

            releases.append({
                "title": link.get_text(strip=True),
                "url": full_url,
                "date": date_text,
            })

    logger.info("Found %d earnings-related press releases", len(releases))
    return releases


def _extract_quarter(text: str) -> tuple[str | None, str | None]:
    """
    Extract quarter and year from text.

    Returns (quarter like "Q1", year like "2025") or (None, None).
    """
    # Try "Q1 2025" format first
    match = re.search(r"Q([1-4])\s*(?:20)?(\d{2})", text, re.IGNORECASE)
    if match:
        q = match.group(1)
        year = match.group(2)
        if len(year) == 2:
            year = f"20{year}"
        return f"Q{q}", year

    # Try "first quarter 2025" format
    for word, num in QUARTER_WORDS.items():
        pattern = rf"{word}\s+quarter\s+(?:of\s+)?(?:20)?(\d{{2}})"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            year = match.group(1)
            if len(year) == 2:
                year = f"20{year}"
            return f"Q{num}", year

    return None, None


def _extract_metrics(text: str) -> dict[str, float]:
    """
    Extract financial metrics from earnings text using regex patterns.

    Returns {"metric_name": value, ...}.
    """
    metrics = {}

    for metric_name, patterns in METRIC_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    value_str = match.group(1).replace(",", "")
                    value = float(value_str)

                    # Convert billions to millions for consistency
                    if match.lastindex and match.lastindex >= 2:
                        unit = match.group(2).lower()
                        if unit == "billion":
                            value *= 1000

                    metrics[metric_name] = value
                    break
                except (ValueError, IndexError):
                    continue

    return metrics


def _scrape_earnings_release(url: str) -> dict:
    """
    Scrape a single earnings press release page.

    Returns {"quarter": str, "year": str, "metrics": dict}.
    """
    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.exceptions.RequestException as exc:
        logger.warning("Failed to fetch earnings release %s: %s", url, exc)
        return {}

    soup = BeautifulSoup(resp.text, "html.parser")

    # Get the main article text
    article = soup.find("article") or soup.find("div", class_=re.compile("content|body"))
    if article:
        text = article.get_text(separator=" ")
    else:
        text = soup.get_text(separator=" ")

    # Extract quarter info
    quarter, year = _extract_quarter(text)
    if not quarter:
        quarter, year = _extract_quarter(url)

    # Extract metrics
    metrics = _extract_metrics(text)

    return {
        "quarter": quarter,
        "year": year,
        "metrics": metrics,
        "url": url,
    }


def collect() -> int:
    """
    Collect Match Group quarterly earnings data.

    Scrapes the IR page for press releases, extracts financial metrics,
    and stores them in the match_group_metrics table.

    Returns the total number of metrics inserted.
    """
    logger.info("Starting Match Group earnings collection")
    total_inserted = 0

    releases = _fetch_press_releases()
    if not releases:
        logger.info("No earnings releases found")
        return 0

    # Process up to 4 most recent releases (1 year of quarters)
    for release in releases[:4]:
        logger.info("Processing: %s", release["title"])
        data = _scrape_earnings_release(release["url"])

        if not data or not data.get("quarter") or not data.get("metrics"):
            logger.info("No extractable data from: %s", release["title"])
            continue

        quarter = data["quarter"]
        year = data["year"]
        report_date = release.get("date", "")

        for metric_type, value in data["metrics"].items():
            ok = db.insert_match_group_metric(
                report_date=report_date,
                quarter=f"{quarter} {year}",
                metric_type=metric_type,
                value=value,
                region="global",
                notes=json.dumps({"source_url": data["url"]}),
            )
            if ok:
                total_inserted += 1
                logger.info(
                    "  %s %s: %s = %.2f",
                    quarter,
                    year,
                    metric_type,
                    value,
                )

    logger.info(
        "Match Group collection complete: %d metrics inserted", total_inserted
    )
    return total_inserted


if __name__ == "__main__":
    import sys

    sys.path.insert(
        0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent)
    )

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    db.init_db()
    total = collect()
    print(f"Match Group: {total} metrics collected")
