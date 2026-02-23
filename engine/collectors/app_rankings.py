"""
App Store rankings collector for DatePulse.

Tracks chart positions and store metrics for dating apps using:
1. Apple App Store top charts via RSS feed (no auth required)
2. Google Play store metrics via google-play-scraper (no auth required)

Produces three signal types per app:
  - appstore_chart_rank: position in App Store FR top free chart (0 if not in top 200)
  - playstore_rating_count: total number of ratings on Google Play
  - playstore_install_count: total installs on Google Play
"""

import logging
from datetime import datetime, timezone

import requests

from engine.config import TARGET_APPS
from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "app_rankings"

# Apple App Store top free apps RSS feed (France)
APPLE_RSS_URL = (
    "https://rss.marketingtools.apple.com/api/v2/fr/apps/top-free/200/apps.json"
)

# App name keywords to match in App Store results
APP_KEYWORDS_IOS: dict[str, list[str]] = {
    "tinder": ["tinder"],
    "bumble": ["bumble"],
    "hinge": ["hinge"],
    "happn": ["happn"],
}

# Google Play package IDs (same as app_reviews collector)
PACKAGE_IDS: dict[str, str] = {
    "tinder": "com.tinder",
    "bumble": "com.bumble.app",
    "hinge": "co.hinge.app",
    "happn": "com.ftw_and_co.happn",
}

REQUEST_TIMEOUT = 15


def _fetch_ios_top_chart() -> list[dict]:
    """
    Fetch top 200 free apps from App Store FR.

    Returns a list of {"name": str, "id": str, "rank": int}.
    """
    try:
        resp = requests.get(APPLE_RSS_URL, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except (requests.exceptions.RequestException, ValueError) as exc:
        logger.warning("Failed to fetch App Store top chart: %s", exc)
        return []

    results = data.get("feed", {}).get("results", [])
    chart = []
    for i, app in enumerate(results):
        chart.append({
            "name": app.get("name", ""),
            "id": app.get("id", ""),
            "artist": app.get("artistName", ""),
            "rank": i + 1,
        })

    logger.info("Fetched App Store FR top chart: %d apps", len(chart))
    return chart


def _find_app_rank(chart: list[dict], app_name: str) -> int:
    """
    Find the rank of an app in the chart by matching keywords.

    Returns the rank (1-based) or 0 if not found in top 200.
    """
    keywords = APP_KEYWORDS_IOS.get(app_name, [app_name])

    for entry in chart:
        entry_name = entry["name"].lower()
        entry_artist = entry.get("artist", "").lower()
        for keyword in keywords:
            if keyword in entry_name or keyword in entry_artist:
                return entry["rank"]

    return 0


def _fetch_gplay_metrics(package_id: str) -> dict | None:
    """
    Fetch Google Play store metrics for an app.

    Returns {"ratings": int, "installs": int, "score": float} or None.
    """
    from google_play_scraper import app

    try:
        info = app(package_id, lang="fr", country="fr")
        return {
            "ratings": info.get("ratings", 0) or 0,
            "installs": info.get("minInstalls", 0) or 0,
            "score": info.get("score", 0.0) or 0.0,
        }
    except Exception as exc:
        logger.warning("Failed to fetch Google Play metrics for %s: %s", package_id, exc)
        return None


def collect() -> int:
    """
    Collect app ranking data from App Store and Google Play.

    Returns the total number of signals inserted.
    """
    logger.info("Starting App Rankings collection")
    total_inserted = 0
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # 1. iOS App Store top chart
    chart = _fetch_ios_top_chart()

    for app_name in TARGET_APPS:
        # App Store rank
        if chart:
            rank = _find_app_rank(chart, app_name)
            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="appstore_chart_rank",
                value=float(rank),
                collected_at=now_str,
            )
            if ok:
                total_inserted += 1
            if rank > 0:
                logger.info("%s: App Store FR rank #%d", app_name, rank)
            else:
                logger.info("%s: not in App Store FR top 200", app_name)

        # Google Play metrics
        package_id = PACKAGE_IDS.get(app_name)
        if package_id:
            metrics = _fetch_gplay_metrics(package_id)
            if metrics:
                # Rating count
                ok = db.insert_raw_signal(
                    source=SOURCE,
                    app_name=app_name,
                    city="france",
                    metric_type="playstore_rating_count",
                    value=float(metrics["ratings"]),
                    collected_at=now_str,
                )
                if ok:
                    total_inserted += 1

                # Install count
                ok = db.insert_raw_signal(
                    source=SOURCE,
                    app_name=app_name,
                    city="france",
                    metric_type="playstore_install_count",
                    value=float(metrics["installs"]),
                    collected_at=now_str,
                )
                if ok:
                    total_inserted += 1

                logger.info(
                    "%s: Google Play %d ratings, %d+ installs, score %.1f",
                    app_name,
                    metrics["ratings"],
                    metrics["installs"],
                    metrics["score"],
                )

    logger.info("App Rankings collection complete: %d signals inserted", total_inserted)
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
    print(f"App Rankings: {total} signals collected")
