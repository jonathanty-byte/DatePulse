"""
Historical data backfill for DatePulse.

Fetches 2 years of:
- Wikipedia daily pageviews (via Wikimedia REST API)
- Google Trends weekly data (already covered by 5-year fetch in collector)

Usage:
    python scripts/seed_historical.py
    python scripts/seed_historical.py --months 6   # shorter backfill
"""

import argparse
import logging
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.collectors import google_trends, wikipedia
from engine.storage.db import init_db, count_signals

logger = logging.getLogger(__name__)


def backfill_wikipedia(months: int = 24) -> int:
    """
    Backfill Wikipedia pageviews for the specified number of months.

    Fetches in 3-month chunks to avoid API timeouts on large ranges.
    """
    logger.info("=== Backfilling Wikipedia pageviews (%d months) ===", months)

    end_date = datetime.now(timezone.utc) - timedelta(days=1)
    start_date = end_date - timedelta(days=months * 30)

    total = 0
    chunk_days = 90  # 3-month chunks

    current_start = start_date
    while current_start < end_date:
        current_end = min(current_start + timedelta(days=chunk_days), end_date)

        logger.info(
            "Chunk: %s to %s",
            current_start.strftime("%Y-%m-%d"),
            current_end.strftime("%Y-%m-%d"),
        )

        count = wikipedia.collect_range(current_start, current_end)
        total += count

        logger.info("  Chunk inserted: %d signals", count)

        current_start = current_end + timedelta(days=1)

        # Polite delay between chunks
        time.sleep(2)

    logger.info("Wikipedia backfill complete: %d total signals", total)
    return total


def backfill_google_trends() -> int:
    """
    Ensure Google Trends 5-year weekly data is present.

    The regular collector already fetches `today 5-y` which covers
    ~260 weekly data points per app. This just re-runs if needed.
    """
    existing = count_signals(source="google_trends")
    if existing > 500:
        logger.info(
            "Google Trends data already present (%d signals) — skipping backfill",
            existing,
        )
        return 0

    logger.info("=== Backfilling Google Trends (5-year weekly) ===")
    count = google_trends.collect()
    logger.info("Google Trends backfill complete: %d signals", count)
    return count


def main() -> None:
    """Run the full historical backfill pipeline."""
    parser = argparse.ArgumentParser(description="DatePulse historical data backfill")
    parser.add_argument(
        "--months",
        type=int,
        default=24,
        help="Number of months to backfill (default: 24)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    init_db()

    logger.info("=== DatePulse Historical Backfill Start ===")
    start_time = time.time()

    # Google Trends first (may hit rate limits)
    gt_count = backfill_google_trends()

    # Wikipedia (more reliable, can run longer)
    wiki_count = backfill_wikipedia(months=args.months)

    elapsed = time.time() - start_time

    print("\n=== Backfill Summary ===")
    print(f"  Google Trends: {gt_count} signals")
    print(f"  Wikipedia:     {wiki_count} signals")
    print(f"  Total:         {gt_count + wiki_count} signals")
    print(f"  Duration:      {elapsed:.0f}s")
    print("========================\n")

    # Show DB totals
    total = count_signals()
    print(f"Total signals in database: {total}")


if __name__ == "__main__":
    main()
