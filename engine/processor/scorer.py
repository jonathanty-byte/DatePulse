"""
Composite scorer for DatePulse.

Combines normalized signals using the weighted formula to produce
a 0-100 activity score with percentile ranking and trend detection.

Components (7):
  35% Google Trends   | 20% Wikipedia  | 15% App Reviews
  10% Bluesky         | 10% Seasonal   |  5% Weather
   5% Day×Hour matrix
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from engine.config import (
    TARGET_APPS,
    TARGET_CITIES,
    WEIGHT_APP_REVIEWS,
    WEIGHT_BLUESKY,
    WEIGHT_DAY_HOUR,
    WEIGHT_GOOGLE_TRENDS,
    WEIGHT_SEASONAL,
    WEIGHT_WEATHER,
    WEIGHT_WIKIPEDIA,
)
from engine.forecaster.seasonal import get_day_hour_score, get_seasonal_index
from engine.processor.normalizer import normalize_all_latest
from engine.storage import db

logger = logging.getLogger(__name__)

# Weight mapping: component name -> (weight, fallback_score)
WEIGHT_MAP: dict[str, tuple[float, float]] = {
    "google_trends": (WEIGHT_GOOGLE_TRENDS, None),
    "wikipedia":     (WEIGHT_WIKIPEDIA, None),
    "bluesky":       (WEIGHT_BLUESKY, None),
    "app_reviews":   (WEIGHT_APP_REVIEWS, None),
    "weather":       (WEIGHT_WEATHER, None),
}


def _redistribute_weights(
    available: dict[str, float],
    missing: list[str],
) -> dict[str, float]:
    """
    Redistribute weights from missing components proportionally
    among available ones.

    If google_trends=0.35 is available and bluesky=0.10 is missing,
    google_trends gets a proportional share of the missing weight.
    """
    total_available_weight = sum(
        WEIGHT_MAP[k][0] for k in available if k in WEIGHT_MAP
    )
    # Add seasonal + day_hour weights which are always available
    total_available_weight += WEIGHT_SEASONAL + WEIGHT_DAY_HOUR

    total_missing_weight = sum(
        WEIGHT_MAP[k][0] for k in missing if k in WEIGHT_MAP
    )

    if total_available_weight == 0:
        return {}

    redistribution_factor = 1.0 + (total_missing_weight / total_available_weight)

    adjusted: dict[str, float] = {}
    for name, score in available.items():
        if name in WEIGHT_MAP:
            adjusted[name] = WEIGHT_MAP[name][0] * redistribution_factor
    # Seasonal and day_hour always get redistributed too
    adjusted["seasonal"] = WEIGHT_SEASONAL * redistribution_factor
    adjusted["day_hour"] = WEIGHT_DAY_HOUR * redistribution_factor

    return adjusted


def compute_score(
    app_name: str,
    city: str,
    dt: Optional[datetime] = None,
) -> dict:
    """
    Compute the composite activity score for an app+city.

    Returns:
    {
        "score": 72.5,
        "percentile": 85.0,
        "trend": "rising",
        "components": {
            "google_trends": {"normalized": 80.0, "weight": 0.35, "weighted": 28.0},
            ...
        },
        "computed_at": "2026-02-23 14:00:00"
    }
    """
    if dt is None:
        dt = datetime.now(timezone.utc)

    # Get normalized signal values
    normalized = normalize_all_latest(app_name, city)

    available: dict[str, float] = {}
    missing: list[str] = []

    for name in WEIGHT_MAP:
        val = normalized.get(name)
        if val is not None:
            available[name] = val
        else:
            missing.append(name)

    if missing:
        logger.debug(
            "Missing components for %s/%s: %s — redistributing weights",
            app_name, city, missing,
        )

    # Compute seasonal and day_hour scores (always available)
    seasonal_score = get_seasonal_index(dt)
    day_hour_score = get_day_hour_score(app_name, dt)

    # Get adjusted weights
    adjusted_weights = _redistribute_weights(available, missing)

    # Build component details and compute weighted sum
    components: dict[str, dict] = {}
    raw_score = 0.0

    for name, norm_val in available.items():
        weight = adjusted_weights.get(name, 0.0)
        weighted_val = norm_val * weight
        raw_score += weighted_val
        components[name] = {
            "normalized": round(norm_val, 2),
            "weight": round(weight, 4),
            "weighted": round(weighted_val, 2),
        }

    # Seasonal component
    seasonal_weight = adjusted_weights.get("seasonal", WEIGHT_SEASONAL)
    seasonal_weighted = seasonal_score * seasonal_weight
    raw_score += seasonal_weighted
    components["seasonal"] = {
        "normalized": round(seasonal_score, 2),
        "weight": round(seasonal_weight, 4),
        "weighted": round(seasonal_weighted, 2),
    }

    # Day×Hour component
    day_hour_weight = adjusted_weights.get("day_hour", WEIGHT_DAY_HOUR)
    day_hour_weighted = day_hour_score * day_hour_weight
    raw_score += day_hour_weighted
    components["day_hour"] = {
        "normalized": round(day_hour_score, 2),
        "weight": round(day_hour_weight, 4),
        "weighted": round(day_hour_weighted, 2),
    }

    # Mark missing components
    for name in missing:
        components[name] = {
            "normalized": None,
            "weight": 0.0,
            "weighted": 0.0,
            "status": "no_data",
        }

    # Clamp final score
    final_score = max(0.0, min(100.0, raw_score))

    # Compute percentile against historical scores
    percentile = _compute_percentile(app_name, city, final_score)

    # Detect trend
    trend = detect_trend(app_name, city)

    computed_at = dt.strftime("%Y-%m-%d %H:%M:%S")

    return {
        "score": round(final_score, 2),
        "percentile": round(percentile, 1),
        "trend": trend,
        "components": components,
        "computed_at": computed_at,
    }


def _compute_percentile(app_name: str, city: str, score: float) -> float:
    """Compute percentile rank of a score against historical scores."""
    history = db.get_scores_history(app_name, city, limit=5000)

    if len(history) < 5:
        return 50.0  # not enough history

    historical_scores = [h["score"] for h in history]
    below = sum(1 for s in historical_scores if s < score)
    return (below / len(historical_scores)) * 100.0


def detect_trend(
    app_name: str,
    city: str,
    window: int = 6,
) -> str:
    """
    Compare recent scores to detect trend direction.

    Looks at the last `window` scores and compares the recent half
    to the older half.

    Returns: "rising", "falling", or "stable"
    """
    history = db.get_scores_history(app_name, city, limit=window)

    if len(history) < 4:
        return "stable"

    mid = len(history) // 2
    older = [h["score"] for h in history[:mid]]
    recent = [h["score"] for h in history[mid:]]

    avg_older = sum(older) / len(older)
    avg_recent = sum(recent) / len(recent)

    delta = avg_recent - avg_older
    threshold = 5.0  # 5-point change = meaningful trend

    if delta > threshold:
        return "rising"
    elif delta < -threshold:
        return "falling"
    else:
        return "stable"


def score_all(dt: Optional[datetime] = None) -> list[dict]:
    """
    Compute and store scores for all app×city combinations.

    Returns list of score results.
    """
    if dt is None:
        dt = datetime.now(timezone.utc)

    results = []

    for app_name in TARGET_APPS:
        for city in TARGET_CITIES:
            try:
                result = compute_score(app_name, city, dt)

                # Persist to DB
                db.insert_score(
                    app_name=app_name,
                    city=city,
                    score=result["score"],
                    percentile=result["percentile"],
                    trend=result["trend"],
                    components=result["components"],
                )

                results.append({
                    "app": app_name,
                    "city": city,
                    **result,
                })

                logger.info(
                    "Score %s/%s: %.1f (P%.0f, %s)",
                    app_name, city, result["score"],
                    result["percentile"], result["trend"],
                )
            except Exception as exc:
                logger.error(
                    "Failed to score %s/%s: %s", app_name, city, exc,
                    exc_info=True,
                )

    return results


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent))

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    db.init_db()

    results = score_all()
    print(f"\n=== Scored {len(results)} app×city combinations ===")
    for r in results:
        print(f"  {r['app']}/{r['city']}: {r['score']:.1f} (P{r['percentile']:.0f}, {r['trend']})")
