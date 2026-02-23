"""
Bluesky mentions collector for DatePulse.

Uses the AT Protocol public API to count mentions of dating apps.
"""

import logging

from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "bluesky"


def collect() -> int:
    """Collect Bluesky mention data. Not yet implemented."""
    logger.info("Bluesky collector not yet implemented — skipping")
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
    print(f"Bluesky: {total} signals collected")
