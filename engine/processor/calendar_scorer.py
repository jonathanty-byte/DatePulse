"""
Calendar score calculator for DatePulse.

Computes daily activity scores for the past N months by combining:
1. Google Trends weekly data (interpolated to daily) — weight 50%
2. Wikipedia daily pageviews (normalized 0-100) — weight 30%
3. Seasonal index (event boosts + day-of-week) — weight 20%

The seasonal index is ALWAYS available (computed from events_fr.json),
so the endpoint works even without real signal data.
"""

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from engine.forecaster.seasonal import get_event_boost, get_weekly_pattern, _load_events
from engine.processor.normalizer import percentile_rank
from engine.storage import db

logger = logging.getLogger(__name__)

# Weights for calendar score components
WEIGHT_TRENDS = 0.50
WEIGHT_WIKIPEDIA = 0.30
WEIGHT_SEASONAL = 0.20


def _interpolate_weekly_to_daily(
    weekly_data: list[dict],
) -> dict[str, float]:
    """
    Interpolate weekly Google Trends data points to daily values.

    Uses linear interpolation between consecutive weekly data points.
    Returns a dict mapping "YYYY-MM-DD" -> interpolated_value.
    """
    if not weekly_data:
        return {}

    daily: dict[str, float] = {}
    sorted_data = sorted(weekly_data, key=lambda d: d["day"])

    for i in range(len(sorted_data) - 1):
        start_day = datetime.strptime(sorted_data[i]["day"], "%Y-%m-%d").date()
        end_day = datetime.strptime(sorted_data[i + 1]["day"], "%Y-%m-%d").date()
        start_val = sorted_data[i]["avg_value"]
        end_val = sorted_data[i + 1]["avg_value"]

        delta_days = (end_day - start_day).days
        if delta_days <= 0:
            continue

        for d in range(delta_days):
            current_day = start_day + timedelta(days=d)
            t = d / delta_days
            value = start_val + (end_val - start_val) * t
            daily[current_day.isoformat()] = value

    # Add the last data point
    last = sorted_data[-1]
    daily[last["day"]] = last["avg_value"]

    return daily


def _normalize_dict_values(values: dict[str, float]) -> dict[str, float]:
    """Normalize a dict of daily values to 0-100 using percentile ranking."""
    if not values:
        return {}

    all_vals = sorted(values.values())
    return {
        day: percentile_rank(all_vals, val)
        for day, val in values.items()
    }


def _get_event_name(target_date: date, events_data: dict) -> Optional[str]:
    """Return the name of a recurring event on this date, or None."""
    for event in events_data.get("recurring_events", []):
        event_month, event_day = map(int, event["date"].split("-"))
        if target_date.month == event_month and target_date.day == event_day:
            return event["name"]
    return None


def compute_calendar_scores(
    app_name: str,
    months: int = 12,
) -> list[dict]:
    """
    Compute daily activity scores for the past N months.

    Returns a list of dicts:
    [
        {
            "date": "2025-03-01",
            "score": 72.5,
            "components": {"google_trends": 80.0, "wikipedia": 65.0, "seasonal": 72.0},
            "event": "Saint-Valentin" | null,
            "day_of_week": "saturday"
        },
        ...
    ]
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)

    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    # 1. Google Trends weekly -> interpolated daily
    gt_weekly = db.get_daily_signals_aggregated(
        source="google_trends",
        app_name=app_name,
        metric_type="interest_weekly",
        start_date=start_str,
        end_date=end_str,
    )
    gt_daily_raw = _interpolate_weekly_to_daily(gt_weekly)
    gt_daily = _normalize_dict_values(gt_daily_raw)

    # 2. Wikipedia daily pageviews -> normalized
    wiki_data = db.get_daily_signals_aggregated(
        source="wikipedia",
        app_name=app_name,
        metric_type="pageviews_daily",
        start_date=start_str,
        end_date=end_str,
    )
    wiki_daily_raw = {d["day"]: d["avg_value"] for d in wiki_data}
    wiki_daily = _normalize_dict_values(wiki_daily_raw)

    # 3. Build daily results
    day_names = [
        "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday",
    ]

    events_data = _load_events()
    results = []
    current = start_date

    while current <= end_date:
        day_str = current.isoformat()
        dt = datetime(current.year, current.month, current.day, 12, 0)

        # Components
        gt_score = gt_daily.get(day_str)
        wiki_score = wiki_daily.get(day_str)

        # Seasonal: weekly pattern x event boost, scaled from base 50
        weekly_w = get_weekly_pattern(dt)
        event_w = get_event_boost(dt)
        seasonal_raw = 50.0 * weekly_w * event_w
        seasonal_score = max(0.0, min(100.0, seasonal_raw))

        # Weighted combination with redistribution for missing sources
        available_weight = WEIGHT_SEASONAL
        weighted_sum = seasonal_score * WEIGHT_SEASONAL
        components: dict[str, float] = {"seasonal": round(seasonal_score, 1)}

        if gt_score is not None:
            available_weight += WEIGHT_TRENDS
            weighted_sum += gt_score * WEIGHT_TRENDS
            components["google_trends"] = round(gt_score, 1)

        if wiki_score is not None:
            available_weight += WEIGHT_WIKIPEDIA
            weighted_sum += wiki_score * WEIGHT_WIKIPEDIA
            components["wikipedia"] = round(wiki_score, 1)

        final_score = (weighted_sum / available_weight) if available_weight > 0 else 50.0
        final_score = max(0.0, min(100.0, final_score))

        event_name = _get_event_name(current, events_data)

        results.append({
            "date": day_str,
            "score": round(final_score, 1),
            "components": components,
            "event": event_name,
            "day_of_week": day_names[current.weekday()],
        })

        current += timedelta(days=1)

    return results
