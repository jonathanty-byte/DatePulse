"""
DatePulse data engine — main orchestrator.

Runs the full pipeline: collect -> score -> forecast -> alert.
One collector failing does not block the others.

Usage:
    python -m engine.main                   # Full pipeline
    python -m engine.main --dry-run         # Test run
    python -m engine.main --collect-only    # Only collect data
    python -m engine.main --score-only      # Only compute scores
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from types import ModuleType

# Allow running as `python engine/main.py` in addition to `python -m engine.main`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.collectors import (
    app_rankings,
    app_reviews,
    app_versions,
    bluesky,
    cloudflare_radar,
    downdetector,
    events,
    google_trends,
    match_group,
    reddit,
    weather,
    wikipedia,
)
from engine.storage.db import init_db

logger = logging.getLogger(__name__)

# Ordered list of (name, module) -- each module must expose collect() -> int
COLLECTORS: list[tuple[str, ModuleType]] = [
    ("google_trends", google_trends),
    ("wikipedia", wikipedia),
    ("bluesky", bluesky),
    ("app_reviews", app_reviews),
    ("reddit", reddit),
    ("downdetector", downdetector),
    ("app_rankings", app_rankings),
    ("app_versions", app_versions),
    ("cloudflare_radar", cloudflare_radar),
    ("match_group", match_group),
    ("weather", weather),
    ("events", events),
]


def run_all(dry_run: bool = False) -> dict[str, int | str]:
    """
    Execute all collectors and return a summary dict.

    Each collector runs independently -- a failure in one does not
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


def run_scoring() -> int:
    """Compute scores for all app x city combinations. Returns count."""
    from engine.processor.scorer import score_all

    results = score_all()
    return len(results)


def run_forecasting() -> int:
    """Generate 7-day forecasts for all app x city combinations."""
    from engine.forecaster.predictor import forecast_all

    return forecast_all()


def run_alerts() -> None:
    """Check and send Telegram alerts."""
    from engine.alerts.telegram_bot import run_alert_check

    try:
        asyncio.run(run_alert_check())
    except Exception as exc:
        logger.error("Alert check failed: %s", exc, exc_info=True)


def main() -> None:
    """Entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(description="DatePulse data collection pipeline")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Test run -- collectors execute but pipeline is for validation only",
    )
    parser.add_argument(
        "--collect-only",
        action="store_true",
        help="Only run data collectors, skip scoring/forecasting",
    )
    parser.add_argument(
        "--score-only",
        action="store_true",
        help="Only compute scores (skip collection and forecasting)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    logger.info("=== DatePulse Pipeline Start ===")

    # Initialize database
    init_db()

    has_errors = False

    # Step 1: Collect data
    if not args.score_only:
        logger.info("--- Phase 1: Data Collection ---")
        results = run_all(dry_run=args.dry_run)

        print("\n=== Collection Summary ===")
        for name, result in results.items():
            if isinstance(result, str) and result.startswith("ERROR"):
                print(f"  {name}: FAILED -- {result}")
                has_errors = True
            else:
                print(f"  {name}: {result} signals")

        total = sum(v for v in results.values() if isinstance(v, int))
        print(f"  Total: {total} signals")

    # Step 2: Compute scores
    if not args.collect_only:
        logger.info("--- Phase 2: Scoring ---")
        try:
            score_count = run_scoring()
            print(f"\n=== Scoring: {score_count} scores computed ===")
        except Exception as exc:
            logger.error("Scoring failed: %s", exc, exc_info=True)
            has_errors = True

    # Step 3: Generate forecasts
    if not args.collect_only and not args.score_only:
        logger.info("--- Phase 3: Forecasting ---")
        try:
            forecast_count = run_forecasting()
            print(f"=== Forecasting: {forecast_count} forecasts generated ===")
        except Exception as exc:
            logger.error("Forecasting failed: %s", exc, exc_info=True)
            has_errors = True

    # Step 4: Send alerts
    if not args.collect_only and not args.score_only and not args.dry_run:
        logger.info("--- Phase 4: Alerts ---")
        run_alerts()

    print("\n========================")
    if has_errors:
        logger.warning("Pipeline completed with errors")
        sys.exit(1)
    else:
        logger.info("Pipeline completed successfully")


if __name__ == "__main__":
    main()
