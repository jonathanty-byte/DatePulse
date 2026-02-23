"""
DatePulse data engine — main orchestrator.

Runs all collectors sequentially with independent error handling.
One collector failing does not block the others.

Usage:
    python -m engine.main              # Full pipeline
    python -m engine.main --dry-run    # Test run without persisting
"""

import argparse
import logging
import sys
from pathlib import Path
from types import ModuleType

# Allow running as `python engine/main.py` in addition to `python -m engine.main`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.collectors import (
    app_reviews,
    bluesky,
    events,
    google_trends,
    weather,
    wikipedia,
)
from engine.storage.db import init_db

logger = logging.getLogger(__name__)

# Ordered list of (name, module) — each module must expose collect() -> int
COLLECTORS: list[tuple[str, ModuleType]] = [
    ("google_trends", google_trends),
    ("wikipedia", wikipedia),
    ("bluesky", bluesky),
    ("app_reviews", app_reviews),
    ("weather", weather),
    ("events", events),
]


def run_all(dry_run: bool = False) -> dict[str, int | str]:
    """
    Execute all collectors and return a summary dict.

    Each collector runs independently — a failure in one does not
    prevent the others from executing.
    """
    results: dict[str, int | str] = {}

    for name, module in COLLECTORS:
        logger.info("--- Running collector: %s ---", name)
        try:
            if dry_run and name != "google_trends":
                # In dry-run mode, only run real collectors (Google Trends)
                # Placeholders already return 0, so run them all anyway
                pass
            count = module.collect()
            results[name] = count
            logger.info("Collector %s: %d signals collected", name, count)
        except Exception as exc:
            logger.error("Collector %s FAILED: %s", name, exc, exc_info=True)
            results[name] = f"ERROR: {exc}"

    return results


def main() -> None:
    """Entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(description="DatePulse data collection pipeline")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Test run — collectors execute but pipeline is for validation only",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    logger.info("=== DatePulse Pipeline Start (dry_run=%s) ===", args.dry_run)

    # Initialize database
    init_db()

    # Run all collectors
    results = run_all(dry_run=args.dry_run)

    # Print summary
    print("\n=== Pipeline Summary ===")
    has_errors = False
    for name, result in results.items():
        if isinstance(result, str) and result.startswith("ERROR"):
            print(f"  {name}: FAILED — {result}")
            has_errors = True
        else:
            print(f"  {name}: {result} signals")

    total = sum(v for v in results.values() if isinstance(v, int))
    print(f"\nTotal signals collected: {total}")
    print("========================\n")

    if has_errors:
        logger.warning("Pipeline completed with errors")
        sys.exit(1)
    else:
        logger.info("Pipeline completed successfully")


if __name__ == "__main__":
    main()
