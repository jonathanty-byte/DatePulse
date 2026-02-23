"""
Weight calibration and backtesting for DatePulse scoring model.

Analyzes historical data to:
1. Measure correlation between each signal source and overall activity
2. Run backtesting to validate the scoring model
3. Optionally optimize weights via linear regression

Usage:
    python scripts/calibrate_weights.py
    python scripts/calibrate_weights.py --optimize   # run weight optimization
"""

import argparse
import json
import logging
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np

from engine.config import (
    TARGET_APPS,
    WEIGHT_APP_REVIEWS,
    WEIGHT_BLUESKY,
    WEIGHT_DAY_HOUR,
    WEIGHT_GOOGLE_TRENDS,
    WEIGHT_SEASONAL,
    WEIGHT_WEATHER,
    WEIGHT_WIKIPEDIA,
)
from engine.storage import db
from engine.storage.db import init_db

logger = logging.getLogger(__name__)


def _get_weekly_timeseries(source: str, app_name: str, metric_type: str) -> dict[str, float]:
    """
    Build a week-keyed time series from raw signals.

    Returns: {"2024-W01": avg_value, "2024-W02": avg_value, ...}
    """
    signals = db.get_signals_in_range(
        source=source,
        app_name=app_name,
        metric_type=metric_type,
    )

    weekly: dict[str, list[float]] = defaultdict(list)
    for sig in signals:
        try:
            dt = datetime.strptime(sig["collected_at"], "%Y-%m-%d %H:%M:%S")
            week_key = dt.strftime("%Y-W%W")
            weekly[week_key].append(sig["value"])
        except (ValueError, KeyError):
            continue

    return {k: sum(v) / len(v) for k, v in weekly.items()}


def compute_correlations(app_name: str = "tinder") -> dict[str, float]:
    """
    Compute Pearson correlation between Google Trends (reference)
    and other available signal sources.

    Google Trends is used as the reference since it has the longest
    history and best reflects search intent for dating apps.
    """
    logger.info("Computing correlations for %s", app_name)

    # Reference: Google Trends weekly
    gt_weekly = _get_weekly_timeseries(
        "google_trends", app_name, "interest_weekly"
    )

    if len(gt_weekly) < 10:
        logger.warning("Not enough Google Trends data for correlation analysis")
        return {}

    correlations: dict[str, float] = {}

    # Wikipedia pageviews (aggregated to weekly)
    wiki_weekly = _get_weekly_timeseries(
        "wikipedia", app_name, "pageviews_daily"
    )

    if wiki_weekly:
        corr = _pearson_correlation(gt_weekly, wiki_weekly)
        if corr is not None:
            correlations["wikipedia"] = round(corr, 4)
            logger.info("  GT <-> Wikipedia: r=%.4f", corr)

    # Bluesky (if available)
    bsky_weekly = _get_weekly_timeseries(
        "bluesky", app_name, "mentions_count"
    )
    if bsky_weekly:
        corr = _pearson_correlation(gt_weekly, bsky_weekly)
        if corr is not None:
            correlations["bluesky"] = round(corr, 4)
            logger.info("  GT <-> Bluesky: r=%.4f", corr)

    # App reviews (if available)
    reviews_weekly = _get_weekly_timeseries(
        "app_reviews", app_name, "review_count_daily"
    )
    if reviews_weekly:
        corr = _pearson_correlation(gt_weekly, reviews_weekly)
        if corr is not None:
            correlations["app_reviews"] = round(corr, 4)
            logger.info("  GT <-> App Reviews: r=%.4f", corr)

    return correlations


def _pearson_correlation(
    series_a: dict[str, float],
    series_b: dict[str, float],
) -> float | None:
    """
    Compute Pearson correlation between two week-keyed time series.

    Only uses overlapping weeks.
    """
    common_keys = sorted(set(series_a.keys()) & set(series_b.keys()))

    if len(common_keys) < 10:
        return None

    a = np.array([series_a[k] for k in common_keys])
    b = np.array([series_b[k] for k in common_keys])

    # Handle constant arrays
    if np.std(a) == 0 or np.std(b) == 0:
        return 0.0

    corr_matrix = np.corrcoef(a, b)
    return float(corr_matrix[0, 1])


def backtest(app_name: str = "tinder", months: int = 24) -> dict:
    """
    Run backtesting by comparing model predictions against actual
    Google Trends data.

    Uses a rolling window: for each week, predict the score based on
    prior data and compare with actual Google Trends value.
    """
    logger.info("Running backtest for %s (%d months)", app_name, months)

    gt_weekly = _get_weekly_timeseries(
        "google_trends", app_name, "interest_weekly"
    )
    wiki_weekly = _get_weekly_timeseries(
        "wikipedia", app_name, "pageviews_daily"
    )

    if len(gt_weekly) < 20:
        logger.warning("Not enough data for meaningful backtest")
        return {"error": "insufficient_data", "weeks_available": len(gt_weekly)}

    sorted_weeks = sorted(gt_weekly.keys())
    training_window = 12  # 12 weeks of history for each prediction

    predictions = []
    actuals = []

    for i in range(training_window, len(sorted_weeks)):
        week = sorted_weeks[i]
        actual = gt_weekly[week]

        # Simple prediction: weighted average of recent weeks + Wikipedia
        recent_gt = [gt_weekly[sorted_weeks[j]] for j in range(i - training_window, i)]
        pred_gt = sum(recent_gt) / len(recent_gt)

        # Add Wikipedia signal if available
        if week in wiki_weekly:
            wiki_vals = [wiki_weekly.get(sorted_weeks[j], 0) for j in range(max(0, i - 4), i)]
            pred_wiki = sum(wiki_vals) / max(len(wiki_vals), 1)
            # Normalize wiki to GT scale
            wiki_all = list(wiki_weekly.values())
            gt_all = list(gt_weekly.values())
            if wiki_all and gt_all:
                wiki_scale = (np.mean(gt_all) / max(np.mean(wiki_all), 1))
                pred_wiki_scaled = pred_wiki * wiki_scale
                prediction = 0.65 * pred_gt + 0.35 * pred_wiki_scaled
            else:
                prediction = pred_gt
        else:
            prediction = pred_gt

        predictions.append(prediction)
        actuals.append(actual)

    # Compute metrics
    predictions = np.array(predictions)
    actuals = np.array(actuals)

    correlation = float(np.corrcoef(predictions, actuals)[0, 1])
    mae = float(np.mean(np.abs(predictions - actuals)))
    rmse = float(np.sqrt(np.mean((predictions - actuals) ** 2)))

    # Direction accuracy: did we predict up/down correctly?
    if len(actuals) > 1:
        actual_dirs = np.diff(actuals) > 0
        pred_dirs = np.diff(predictions) > 0
        direction_acc = float(np.mean(actual_dirs == pred_dirs))
    else:
        direction_acc = 0.0

    results = {
        "app": app_name,
        "weeks_tested": len(actuals),
        "correlation": round(correlation, 4),
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "direction_accuracy": round(direction_acc, 4),
    }

    logger.info(
        "Backtest results: r=%.4f, MAE=%.2f, RMSE=%.2f, direction=%.1f%%",
        correlation, mae, rmse, direction_acc * 100,
    )

    return results


def optimize_weights(app_name: str = "tinder") -> dict[str, float]:
    """
    Find optimal weights via linear regression on historical data.

    Uses available signal sources as features and Google Trends
    as the target variable (proxy for actual dating app activity).
    """
    logger.info("Optimizing weights for %s", app_name)

    gt_weekly = _get_weekly_timeseries(
        "google_trends", app_name, "interest_weekly"
    )
    wiki_weekly = _get_weekly_timeseries(
        "wikipedia", app_name, "pageviews_daily"
    )

    if len(gt_weekly) < 20:
        logger.warning("Not enough data for weight optimization")
        return {
            "google_trends": WEIGHT_GOOGLE_TRENDS,
            "wikipedia": WEIGHT_WIKIPEDIA,
            "bluesky": WEIGHT_BLUESKY,
            "app_reviews": WEIGHT_APP_REVIEWS,
            "seasonal": WEIGHT_SEASONAL,
            "weather": WEIGHT_WEATHER,
            "day_hour": WEIGHT_DAY_HOUR,
        }

    # Build feature matrix from overlapping weeks
    common_weeks = sorted(set(gt_weekly.keys()) & set(wiki_weekly.keys()))

    if len(common_weeks) < 20:
        logger.warning("Not enough overlapping data, using defaults")
        return {
            "google_trends": WEIGHT_GOOGLE_TRENDS,
            "wikipedia": WEIGHT_WIKIPEDIA,
        }

    # Features: [gt_lagged, wiki_current]
    # Target: gt_current
    X = []
    y = []

    sorted_common = sorted(common_weeks)
    for i in range(1, len(sorted_common)):
        week = sorted_common[i]
        prev_week = sorted_common[i - 1]

        features = [
            gt_weekly.get(prev_week, 0),  # lagged GT
            wiki_weekly.get(week, 0),      # current wiki
        ]
        X.append(features)
        y.append(gt_weekly[week])

    X = np.array(X)
    y = np.array(y)

    # Normalize features
    X_mean = X.mean(axis=0)
    X_std = X.std(axis=0)
    X_std[X_std == 0] = 1
    X_norm = (X - X_mean) / X_std

    y_mean = y.mean()
    y_std = max(y.std(), 1)
    y_norm = (y - y_mean) / y_std

    # Simple linear regression via least squares
    X_bias = np.column_stack([X_norm, np.ones(len(X_norm))])
    coeffs, _, _, _ = np.linalg.lstsq(X_bias, y_norm, rcond=None)

    # Convert to weights (proportional, summing to 1)
    raw_weights = np.abs(coeffs[:-1])  # exclude bias
    total = raw_weights.sum()

    if total > 0:
        normalized_weights = raw_weights / total
    else:
        normalized_weights = np.array([0.5, 0.5])

    optimized = {
        "google_trends": round(float(normalized_weights[0]) * 0.55, 4),  # GT gets base 55%
        "wikipedia": round(float(normalized_weights[1]) * 0.55, 4),      # Wiki gets rest
        "seasonal": 0.15,
        "day_hour": 0.05,
        "bluesky": 0.10,
        "app_reviews": 0.10,
        "weather": 0.05,
    }

    logger.info("Optimized weights: %s", optimized)
    return optimized


def main() -> None:
    parser = argparse.ArgumentParser(description="DatePulse weight calibration")
    parser.add_argument("--optimize", action="store_true", help="Run weight optimization")
    parser.add_argument("--app", default="tinder", help="App to analyze (default: tinder)")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    init_db()

    # Step 1: Correlation analysis
    print("\n=== Correlation Analysis ===")
    correlations = compute_correlations(args.app)
    if correlations:
        for source, corr in correlations.items():
            print(f"  Google Trends <-> {source}: r={corr:.4f}")
    else:
        print("  Not enough data for correlation analysis")

    # Step 2: Backtesting
    print("\n=== Backtest Results ===")
    bt = backtest(args.app)
    if "error" not in bt:
        print(f"  Weeks tested:        {bt['weeks_tested']}")
        print(f"  Correlation:         {bt['correlation']:.4f}")
        print(f"  MAE:                 {bt['mae']:.2f}")
        print(f"  RMSE:                {bt['rmse']:.2f}")
        print(f"  Direction accuracy:  {bt['direction_accuracy'] * 100:.1f}%")
    else:
        print(f"  {bt['error']} (weeks: {bt.get('weeks_available', 0)})")

    # Step 3: Weight optimization (optional)
    if args.optimize:
        print("\n=== Weight Optimization ===")
        weights = optimize_weights(args.app)
        print("  Current weights vs optimized:")
        current = {
            "google_trends": WEIGHT_GOOGLE_TRENDS,
            "wikipedia": WEIGHT_WIKIPEDIA,
            "bluesky": WEIGHT_BLUESKY,
            "app_reviews": WEIGHT_APP_REVIEWS,
            "seasonal": WEIGHT_SEASONAL,
            "weather": WEIGHT_WEATHER,
            "day_hour": WEIGHT_DAY_HOUR,
        }
        for key in current:
            curr = current[key]
            opt = weights.get(key, curr)
            delta = opt - curr
            print(f"    {key:20s}: {curr:.4f} -> {opt:.4f} ({delta:+.4f})")

    print()


if __name__ == "__main__":
    main()
