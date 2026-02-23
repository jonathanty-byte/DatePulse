"""
Google Trends collector for DatePulse.

Fetches hourly (7-day) and weekly (5-year) interest data for all target
dating apps in a single pytrends request, then stores each data point
as a raw signal.
"""

import logging
import math
import random
import time

import pandas as pd
from pytrends.request import TrendReq

from engine.config import TARGET_APPS
from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "google_trends"

# pytrends keyword mapping (search terms)
APP_KEYWORDS: dict[str, str] = {
    "tinder": "Tinder",
    "bumble": "Bumble",
    "hinge": "Hinge",
    "happn": "Happn",
}


def _create_client() -> TrendReq:
    """Create a pytrends client configured for France."""
    return TrendReq(hl="fr-FR", tz=-60)


def _sleep_between_requests() -> None:
    """Random sleep 15-30s to respect rate limits."""
    delay = random.uniform(15, 30)
    logger.debug("Sleeping %.1fs between requests", delay)
    time.sleep(delay)


def _fetch_with_retry(
    pytrends: TrendReq,
    keywords: list[str],
    timeframe: str,
    max_retries: int = 3,
    base_delay: float = 30.0,
) -> pd.DataFrame:
    """
    Build payload and fetch interest_over_time with exponential backoff.

    Returns an empty DataFrame on total failure (all retries exhausted).
    """
    for attempt in range(max_retries):
        try:
            pytrends.build_payload(keywords, timeframe=timeframe, geo="FR")
            df = pytrends.interest_over_time()
            if df.empty:
                logger.warning("Empty response for timeframe=%s", timeframe)
                return df
            return df
        except Exception as exc:
            delay = base_delay * math.pow(2, attempt)
            logger.warning(
                "Attempt %d/%d failed for timeframe=%s: %s — retrying in %.0fs",
                attempt + 1,
                max_retries,
                timeframe,
                exc,
                delay,
            )
            time.sleep(delay)

    logger.error("All %d retries exhausted for timeframe=%s", max_retries, timeframe)
    return pd.DataFrame()


def _process_dataframe(df: pd.DataFrame, metric_type: str) -> int:
    """
    Iterate a pytrends DataFrame and insert each data point as a raw signal.

    Returns the number of successfully inserted rows.
    """
    if df.empty:
        return 0

    inserted = 0
    # Drop the "isPartial" column if present
    columns = [c for c in df.columns if c != "isPartial"]

    for timestamp, row in df.iterrows():
        collected_at = pd.Timestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")

        for keyword in columns:
            value = row[keyword]

            # Skip NaN values
            if pd.isna(value):
                continue

            # Map keyword back to app name
            app_name = keyword.lower()
            if app_name not in [a.lower() for a in TARGET_APPS]:
                continue

            is_partial = bool(row.get("isPartial", False))

            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type=metric_type,
                value=float(value),
                metadata={"is_partial": is_partial} if is_partial else None,
                collected_at=collected_at,
            )
            if ok:
                inserted += 1

    return inserted


def collect() -> int:
    """
    Run the full Google Trends collection pipeline.

    Fetches hourly data (last 7 days) and weekly data (last 5 years),
    then returns the total number of inserted signals.
    """
    logger.info("Starting Google Trends collection")
    pytrends = _create_client()
    keywords = [APP_KEYWORDS[app] for app in TARGET_APPS if app in APP_KEYWORDS]

    total = 0

    # Hourly data (last 7 days)
    logger.info("Fetching hourly data (now 7-d) for %s", keywords)
    df_hourly = _fetch_with_retry(pytrends, keywords, timeframe="now 7-d")
    count = _process_dataframe(df_hourly, metric_type="interest_hourly")
    logger.info("Hourly data: %d signals inserted", count)
    total += count

    _sleep_between_requests()

    # Weekly data (last 5 years)
    logger.info("Fetching weekly data (today 5-y) for %s", keywords)
    df_weekly = _fetch_with_retry(pytrends, keywords, timeframe="today 5-y")
    count = _process_dataframe(df_weekly, metric_type="interest_weekly")
    logger.info("Weekly data: %d signals inserted", count)
    total += count

    logger.info("Google Trends collection complete: %d total signals", total)
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
    print(f"Google Trends: {total} signals collected")
