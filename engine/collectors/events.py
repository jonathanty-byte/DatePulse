"""
Calendar events collector for DatePulse.

Reads static event data from data/events_fr.json to provide
seasonal boost factors (Valentine's Day, holidays, etc.).
"""

import logging

from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "events"


def collect() -> int:
    """Collect calendar event data. Not yet implemented."""
    logger.info("Events collector not yet implemented — skipping")
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
    print(f"Events: {total} signals collected")
