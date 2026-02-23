"""
Forecast predictor for DatePulse.

Generates J+7 hourly predictions using:
- Seasonal index (day-of-week, hour, calendar events)
- Historical day×hour matrix from Google Trends
- Weather forecast (if available)
- Latest signal trend

Predictions are stored in the forecasts table.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from engine.config import TARGET_APPS, TARGET_CITIES
from engine.forecaster.seasonal import (
    build_day_hour_matrix,
    get_event_boost,
    get_hour_weight,
    get_seasonal_index,
    get_weekly_pattern,
)
from engine.processor.normalizer import normalize_signal
from engine.storage import db

logger = logging.getLogger(__name__)


def _get_base_level(app_name: str) -> float:
    """
    Get the current baseline activity level for an app from recent data.

    Uses the average of the last 24 hourly Google Trends values.
    Returns 50.0 if no data available.
    """
    signals = db.get_signals(
        source="google_trends",
        app_name=app_name,
        metric_type="interest_hourly",
        limit=24,
    )

    if not signals:
        # Fall back to weekly data
        signals = db.get_signals(
            source="google_trends",
            app_name=app_name,
            metric_type="interest_weekly",
            limit=4,
        )

    if not signals:
        return 50.0

    values = [s["value"] for s in signals]
    return sum(values) / len(values)


def predict_hour(
    app_name: str,
    city: str,
    target_dt: datetime,
    base_level: Optional[float] = None,
) -> dict:
    """
    Predict the activity score for a specific future hour.

    Returns:
    {
        "forecast_date": "2026-02-24",
        "forecast_hour": 21,
        "predicted_score": 72.5,
        "confidence": 0.65,
        "components": {...}
    }
    """
    if base_level is None:
        base_level = _get_base_level(app_name)

    # Component 1: Seasonal index (day pattern + hour + events)
    seasonal_score = get_seasonal_index(target_dt)

    # Component 2: Historical day×hour value
    matrix = build_day_hour_matrix(app_name)
    day_names = [
        "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday",
    ]
    day_name = day_names[target_dt.weekday()]
    day_hour_value = matrix.get(day_name, [50.0] * 24)[target_dt.hour]

    # Component 3: Event boost
    event_boost = get_event_boost(target_dt)

    # Combine: weighted average of seasonal and historical,
    # modulated by base level and event boost
    predicted = (
        0.4 * seasonal_score
        + 0.3 * day_hour_value
        + 0.3 * base_level
    ) * event_boost

    # Clamp to 0-100
    predicted = max(0.0, min(100.0, predicted))

    # Confidence: decreases with distance from now
    now = datetime.now(timezone.utc)
    hours_ahead = (target_dt - now).total_seconds() / 3600
    # Confidence: 0.8 for next hour, decays to 0.3 at 168h (7 days)
    confidence = max(0.3, 0.8 - (hours_ahead / 168) * 0.5)

    return {
        "forecast_date": target_dt.strftime("%Y-%m-%d"),
        "forecast_hour": target_dt.hour,
        "predicted_score": round(predicted, 2),
        "confidence": round(confidence, 3),
        "components": {
            "seasonal_score": round(seasonal_score, 2),
            "day_hour_value": round(day_hour_value, 2),
            "base_level": round(base_level, 2),
            "event_boost": round(event_boost, 3),
        },
    }


def predict_next_7_days(
    app_name: str,
    city: str,
) -> list[dict]:
    """
    Generate hourly predictions for the next 7 days.

    Returns a list of 168 prediction dicts (7 days × 24 hours).
    """
    logger.info("Generating 7-day forecast for %s/%s", app_name, city)

    now = datetime.now(timezone.utc)
    base_level = _get_base_level(app_name)

    predictions = []

    for hours_ahead in range(1, 169):  # 1h to 168h
        target_dt = now + timedelta(hours=hours_ahead)
        # Round to the hour
        target_dt = target_dt.replace(minute=0, second=0, microsecond=0)

        pred = predict_hour(app_name, city, target_dt, base_level)
        predictions.append(pred)

    logger.info(
        "  Generated %d predictions (avg score: %.1f)",
        len(predictions),
        sum(p["predicted_score"] for p in predictions) / len(predictions),
    )

    return predictions


def forecast_and_store(
    app_name: str,
    city: str,
) -> int:
    """
    Generate 7-day forecast and persist to database.

    Returns number of forecasts stored.
    """
    predictions = predict_next_7_days(app_name, city)
    stored = 0

    for pred in predictions:
        ok = db.insert_forecast(
            app_name=app_name,
            city=city,
            forecast_date=pred["forecast_date"],
            forecast_hour=pred["forecast_hour"],
            predicted_score=pred["predicted_score"],
            confidence=pred["confidence"],
            components=pred["components"],
        )
        if ok:
            stored += 1

    logger.info("Stored %d forecasts for %s/%s", stored, app_name, city)
    return stored


def forecast_all() -> int:
    """
    Generate and store forecasts for all app×city combinations.

    Returns total number of forecasts stored.
    """
    total = 0

    for app_name in TARGET_APPS:
        for city in TARGET_CITIES:
            try:
                count = forecast_and_store(app_name, city)
                total += count
            except Exception as exc:
                logger.error(
                    "Failed to forecast %s/%s: %s", app_name, city, exc,
                    exc_info=True,
                )

    logger.info("Total forecasts generated: %d", total)
    return total


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent))

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    db.init_db()

    total = forecast_all()
    print(f"\nTotal forecasts: {total}")

    # Show sample: best 5 upcoming slots
    for app in TARGET_APPS[:1]:  # just tinder for demo
        preds = predict_next_7_days(app, "paris")
        top5 = sorted(preds, key=lambda p: p["predicted_score"], reverse=True)[:5]
        print(f"\nTop 5 predicted slots for {app}/paris:")
        for p in top5:
            print(
                f"  {p['forecast_date']} {p['forecast_hour']:02d}h — "
                f"score: {p['predicted_score']:.1f} (confidence: {p['confidence']:.2f})"
            )
