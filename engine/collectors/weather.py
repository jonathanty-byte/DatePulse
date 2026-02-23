"""
Weather data collector for DatePulse.

Uses the Open-Meteo free API to fetch current weather and forecasts
for target cities (rain/cold = indoor activity boost).
"""

import logging

from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "weather"


def collect() -> int:
    """Collect weather data. Not yet implemented."""
    logger.info("Weather collector not yet implemented — skipping")
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
    print(f"Weather: {total} signals collected")
