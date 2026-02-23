"""
Google Play review collector for DatePulse.

Scrapes recent reviews for dating apps using google-play-scraper.
Produces two signal types per app:
  - review_count_daily: number of reviews per day
  - review_avg_rating: average star rating per day
"""

import logging
import time
from collections import defaultdict
from datetime import datetime

from engine.config import TARGET_APPS
from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "app_reviews"

# Google Play package IDs for target apps
PACKAGE_IDS: dict[str, str] = {
    "tinder": "com.tinder",
    "bumble": "com.bumble.app",
    "hinge": "co.hinge.app",
    "happn": "com.ftw_and_co.happn",
}

# Max pages of 200 reviews each (4 pages = ~800 reviews per app)
MAX_PAGES = 4
REVIEWS_PER_PAGE = 200

# Rate limiting delays (seconds)
DELAY_BETWEEN_APPS = 2
DELAY_BETWEEN_PAGES = 1


def _fetch_reviews_for_locale(
    package_id: str, lang: str, country: str
) -> list[dict]:
    """
    Fetch up to MAX_PAGES * REVIEWS_PER_PAGE reviews for a single locale.

    Returns a list of review dicts from google-play-scraper.
    """
    from google_play_scraper import Sort, reviews

    all_reviews: list[dict] = []
    token = None

    for page in range(MAX_PAGES):
        try:
            result, token = reviews(
                package_id,
                lang=lang,
                country=country,
                sort=Sort.NEWEST,
                count=REVIEWS_PER_PAGE,
                continuation_token=token,
            )
            all_reviews.extend(result)
            logger.debug(
                "Page %d for %s (%s/%s): %d reviews fetched",
                page + 1,
                package_id,
                lang,
                country,
                len(result),
            )

            if not token:
                break

            if page < MAX_PAGES - 1:
                time.sleep(DELAY_BETWEEN_PAGES)

        except Exception as exc:
            logger.warning(
                "Failed to fetch page %d for %s (%s/%s): %s",
                page + 1,
                package_id,
                lang,
                country,
                exc,
            )
            break

    return all_reviews


def _fetch_reviews(package_id: str) -> list[dict]:
    """
    Fetch reviews for a package, trying FR first then EN as fallback.

    Returns a list of review dicts from google-play-scraper.
    """
    result = _fetch_reviews_for_locale(package_id, lang="fr", country="fr")
    if result:
        return result

    logger.info("No FR reviews for %s, falling back to EN", package_id)
    time.sleep(DELAY_BETWEEN_PAGES)
    return _fetch_reviews_for_locale(package_id, lang="en", country="us")


def _aggregate_daily(reviews_list: list[dict]) -> dict[str, dict]:
    """
    Aggregate reviews by day.

    Returns {
        "YYYY-MM-DD": {"count": int, "total_score": float}
    }
    """
    daily: dict[str, dict] = defaultdict(lambda: {"count": 0, "total_score": 0.0})

    for review in reviews_list:
        review_date = review.get("at")
        score = review.get("score")

        if review_date is None or score is None:
            continue

        if isinstance(review_date, datetime):
            day_str = review_date.strftime("%Y-%m-%d")
        else:
            day_str = str(review_date)[:10]

        daily[day_str]["count"] += 1
        daily[day_str]["total_score"] += float(score)

    return dict(daily)


def collect() -> int:
    """
    Collect Google Play reviews for all target dating apps.

    Inserts two signals per app per day:
      - review_count_daily: number of reviews
      - review_avg_rating: average star rating

    Returns the total number of signals inserted.
    """
    logger.info("Starting App Reviews collection (Google Play)")
    total_inserted = 0

    for app_name in TARGET_APPS:
        package_id = PACKAGE_IDS.get(app_name)
        if not package_id:
            logger.warning("No package ID for app '%s', skipping", app_name)
            continue

        logger.info("Fetching reviews for %s (%s)", app_name, package_id)
        try:
            reviews_list = _fetch_reviews(package_id)
        except Exception as exc:
            logger.error("Failed to fetch reviews for %s: %s", app_name, exc)
            continue

        logger.info("Got %d reviews for %s", len(reviews_list), app_name)
        daily = _aggregate_daily(reviews_list)

        for day_str, stats in daily.items():
            count = stats["count"]
            avg_rating = stats["total_score"] / count if count > 0 else 0.0
            collected_at = f"{day_str} 12:00:00"

            # Insert review count
            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="review_count_daily",
                value=float(count),
                collected_at=collected_at,
            )
            if ok:
                total_inserted += 1

            # Insert average rating
            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="review_avg_rating",
                value=round(avg_rating, 2),
                collected_at=collected_at,
            )
            if ok:
                total_inserted += 1

        if app_name != TARGET_APPS[-1]:
            time.sleep(DELAY_BETWEEN_APPS)

    logger.info("App Reviews collection complete: %d signals inserted", total_inserted)
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
    print(f"App reviews: {total} signals collected")
