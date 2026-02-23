"""
App Store / Google Play review collector for DatePulse.

Scrapes recent review counts and ratings for dating apps
using app-store-scraper / google-play-scraper.
"""

import logging

from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "app_reviews"


def collect() -> int:
    """Collect app review data. Not yet implemented."""
    logger.info("App reviews collector not yet implemented — skipping")
    return 0


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
