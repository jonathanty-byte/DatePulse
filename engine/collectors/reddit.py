"""
Reddit collector for DatePulse.

Fetches recent post counts from dating-related subreddits using
Reddit's public JSON API (no authentication required).

Endpoint: https://www.reddit.com/r/{subreddit}/new.json?limit=100
Paginated with the `after` parameter, up to ~1000 posts.

Produces one signal type per app:
  - posts_daily: number of posts per day in the app's subreddit
"""

import logging
import time
from collections import defaultdict
from datetime import datetime, timezone

import requests

from engine.config import TARGET_APPS
from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "reddit"

# Mapping from app name to subreddit name
APP_SUBREDDITS: dict[str, str] = {
    "tinder": "Tinder",
    "bumble": "bumble",
    "hinge": "hingeapp",
    "happn": "dating_advice",  # No dedicated sub, fallback
}

BASE_URL = "https://www.reddit.com/r/{subreddit}/new.json"

# Browser-like User-Agent (Reddit blocks python-requests default UA)
HEADERS = {
    "User-Agent": "DatePulse/1.0 (data collection; non-commercial research)",
}

# Max pages to fetch per subreddit (100 posts/page, ~10 pages = ~1000 posts)
MAX_PAGES = 10
POSTS_PER_PAGE = 100

# Rate limiting delays (seconds)
DELAY_BETWEEN_PAGES = 2
DELAY_BETWEEN_SUBS = 3

# Request timeout (seconds)
REQUEST_TIMEOUT = 15


def _fetch_posts(subreddit_name: str) -> list[dict]:
    """
    Fetch recent posts from a subreddit via public JSON API.

    Returns a list of {"created_utc": float, "title": str} dicts.
    """
    all_posts: list[dict] = []
    after = None

    for page in range(MAX_PAGES):
        params = {"limit": POSTS_PER_PAGE, "raw_json": 1}
        if after:
            params["after"] = after

        url = BASE_URL.format(subreddit=subreddit_name)

        try:
            resp = requests.get(
                url, headers=HEADERS, params=params, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.exceptions.HTTPError as exc:
            if resp.status_code == 429:
                logger.warning(
                    "Rate limited by Reddit on r/%s, stopping pagination",
                    subreddit_name,
                )
                break
            logger.warning(
                "HTTP error fetching r/%s page %d: %s",
                subreddit_name,
                page + 1,
                exc,
            )
            break
        except (requests.exceptions.RequestException, ValueError) as exc:
            logger.warning(
                "Failed to fetch r/%s page %d: %s",
                subreddit_name,
                page + 1,
                exc,
            )
            break

        children = data.get("data", {}).get("children", [])
        if not children:
            break

        for child in children:
            post_data = child.get("data", {})
            created_utc = post_data.get("created_utc")
            if created_utc:
                all_posts.append({
                    "created_utc": float(created_utc),
                })

        # Pagination cursor
        after = data.get("data", {}).get("after")
        if not after:
            break

        if page < MAX_PAGES - 1:
            time.sleep(DELAY_BETWEEN_PAGES)

    return all_posts


def _count_posts_by_day(posts: list[dict]) -> dict[str, int]:
    """
    Aggregate posts by day.

    Returns {"YYYY-MM-DD": count, ...}.
    """
    daily_counts: dict[str, int] = defaultdict(int)

    for post in posts:
        created_utc = post.get("created_utc")
        if created_utc is None:
            continue
        post_date = datetime.fromtimestamp(created_utc, tz=timezone.utc)
        day_str = post_date.strftime("%Y-%m-%d")
        daily_counts[day_str] += 1

    return dict(daily_counts)


def collect() -> int:
    """
    Collect Reddit post counts for all target dating apps.

    Uses Reddit's public JSON API — no API key required.
    Returns the total number of signals inserted.
    """
    logger.info("Starting Reddit collection (public JSON API)")
    total_inserted = 0

    for app_name in TARGET_APPS:
        subreddit_name = APP_SUBREDDITS.get(app_name)
        if not subreddit_name:
            logger.warning("No subreddit mapping for app '%s', skipping", app_name)
            continue

        logger.info("Fetching posts from r/%s for %s", subreddit_name, app_name)

        try:
            posts = _fetch_posts(subreddit_name)
        except Exception as exc:
            logger.error("Failed to fetch r/%s: %s", subreddit_name, exc)
            continue

        daily_counts = _count_posts_by_day(posts)
        logger.info(
            "r/%s: %d posts fetched, %d days of data",
            subreddit_name,
            len(posts),
            len(daily_counts),
        )

        for day_str, count in daily_counts.items():
            collected_at = f"{day_str} 12:00:00"

            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="posts_daily",
                value=float(count),
                collected_at=collected_at,
            )
            if ok:
                total_inserted += 1

        if app_name != TARGET_APPS[-1]:
            time.sleep(DELAY_BETWEEN_SUBS)

    logger.info("Reddit collection complete: %d signals inserted", total_inserted)
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
    print(f"Reddit: {total} signals collected")
