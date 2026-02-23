"""
Wikipedia Pageviews collector for DatePulse.

Uses the Wikimedia REST API to fetch daily pageview counts
for dating app articles on French Wikipedia.
"""

import logging

from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "wikipedia"


def collect() -> int:
    """Collect Wikipedia pageview data. Not yet implemented."""
    logger.info("Wikipedia collector not yet implemented — skipping")
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
    print(f"Wikipedia: {total} signals collected")
