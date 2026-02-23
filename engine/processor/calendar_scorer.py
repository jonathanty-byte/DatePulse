"""
Calendar score calculator for DatePulse.

Computes daily activity scores for the past N months by combining:
1. Google Trends weekly data (interpolated to daily) — weight 25%
2. App Reviews volume (daily review count) — weight 25%
3. Reddit posts (daily post count) — weight 15%
4. Seasonal index (event boosts + day-of-week) — weight 15%
5. Wikipedia daily pageviews — weight 10%
6. Downdetector outage reports — weight 10%

Normalization uses min-max within the queried window (not percentile
against full history) to preserve intra-year variation.

The seasonal index is ALWAYS available (computed from events_fr.json),
so the endpoint works even without real signal data.

Two main entry points:
- compute_calendar_scores(): combined weighted calendar (backward compat)
- compute_calendar_scores_per_source(): independent calendar per source
"""

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from engine.forecaster.seasonal import get_event_boost, get_weekly_pattern, _load_events
from engine.storage import db

logger = logging.getLogger(__name__)

# Weights for calendar score components (must sum to 1.0)
WEIGHT_TRENDS = 0.25
WEIGHT_APP_REVIEWS = 0.25
WEIGHT_REDDIT = 0.15
WEIGHT_SEASONAL = 0.15
WEIGHT_WIKIPEDIA = 0.10
WEIGHT_DOWNDETECTOR = 0.10


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
    """Normalize a dict of daily values to 0-100 using min-max within the window."""
    if not values:
        return {}

    min_v = min(values.values())
    max_v = max(values.values())

    if max_v == min_v:
        return {day: 50.0 for day in values}

    return {
        day: ((val - min_v) / (max_v - min_v)) * 100.0
        for day, val in values.items()
    }


def _get_event_name(target_date: date, events_data: dict) -> Optional[str]:
    """Return the name of a recurring event on this date, or None."""
    for event in events_data.get("recurring_events", []):
        event_month, event_day = map(int, event["date"].split("-"))
        if target_date.month == event_month and target_date.day == event_day:
            return event["name"]
    return None


def _load_all_sources(
    app_name: str,
    start_str: str,
    end_str: str,
) -> dict[str, dict[str, float]]:
    """
    Load and min-max normalize all signal sources for the given window.

    Returns {source_name: {date_str: normalized_value_0_100}}.
    Also stores raw values under "{source_name}_raw" keys.
    """
    sources: dict[str, dict[str, float]] = {}

    # Google Trends weekly -> interpolated daily
    gt_weekly = db.get_daily_signals_aggregated(
        source="google_trends",
        app_name=app_name,
        metric_type="interest_weekly",
        start_date=start_str,
        end_date=end_str,
    )
    gt_daily_raw = _interpolate_weekly_to_daily(gt_weekly)
    if gt_daily_raw:
        sources["google_trends_raw"] = dict(gt_daily_raw)
        sources["google_trends"] = _normalize_dict_values(gt_daily_raw)

    # Standard sources: fetch aggregated daily, then normalize
    STANDARD_SOURCES = [
        ("wikipedia", "pageviews_daily"),
        ("app_reviews", "review_count_daily"),
        ("reddit", "posts_daily"),
        ("downdetector", "outage_reports"),
    ]

    for source_name, metric_type in STANDARD_SOURCES:
        data = db.get_daily_signals_aggregated(
            source=source_name,
            app_name=app_name,
            metric_type=metric_type,
            start_date=start_str,
            end_date=end_str,
        )
        raw = {d["day"]: d["avg_value"] for d in data}
        if raw:
            sources[f"{source_name}_raw"] = dict(raw)
            sources[source_name] = _normalize_dict_values(raw)

    return sources


def compute_calendar_scores_per_source(
    app_name: str,
    months: int = 12,
) -> dict:
    """
    Compute independent calendars per source + a combined weighted calendar.

    Returns:
    {
        "sources": {
            "google_trends": [{"date": "...", "score": 72.5, "raw_value": 25.0, ...}, ...],
            "wikipedia": [...],
            "seasonal": [...],
            ...
        },
        "combined": [{"date": "...", "score": 72.5, "components": {...}, ...}, ...],
        "available_sources": ["google_trends", "wikipedia", ...],
    }
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    # Load all normalized sources
    all_sources = _load_all_sources(app_name, start_str, end_str)

    # Source names (exclude _raw keys)
    source_names = [k for k in all_sources if not k.endswith("_raw")]

    day_names = [
        "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday",
    ]
    events_data = _load_events()

    # Build per-source calendars
    per_source: dict[str, list[dict]] = {name: [] for name in source_names}
    per_source["seasonal"] = []

    # Build combined calendar
    combined: list[dict] = []

    current = start_date
    while current <= end_date:
        day_str = current.isoformat()
        dt = datetime(current.year, current.month, current.day, 12, 0)
        event_name = _get_event_name(current, events_data)
        dow = day_names[current.weekday()]

        # Seasonal score (always available)
        weekly_w = get_weekly_pattern(dt)
        event_w = get_event_boost(dt)
        seasonal_raw = 50.0 * weekly_w * event_w
        seasonal_score = max(0.0, min(100.0, seasonal_raw))

        per_source["seasonal"].append({
            "date": day_str,
            "score": round(seasonal_score, 1),
            "raw_value": round(seasonal_raw, 2),
            "day_of_week": dow,
            "event": event_name,
        })

        # Per-source entries
        for name in source_names:
            normalized = all_sources[name]
            raw_key = f"{name}_raw"
            raw_vals = all_sources.get(raw_key, {})

            if day_str in normalized:
                per_source[name].append({
                    "date": day_str,
                    "score": round(normalized[day_str], 1),
                    "raw_value": round(raw_vals.get(day_str, 0), 2),
                    "day_of_week": dow,
                    "event": event_name,
                })

        # Combined weighted score
        available_weight = WEIGHT_SEASONAL
        weighted_sum = seasonal_score * WEIGHT_SEASONAL
        components: dict[str, float] = {"seasonal": round(seasonal_score, 1)}

        source_weight_map = {
            "google_trends": WEIGHT_TRENDS,
            "wikipedia": WEIGHT_WIKIPEDIA,
            "app_reviews": WEIGHT_APP_REVIEWS,
            "reddit": WEIGHT_REDDIT,
            "downdetector": WEIGHT_DOWNDETECTOR,
        }

        for name, weight in source_weight_map.items():
            if name in all_sources and day_str in all_sources[name]:
                score = all_sources[name][day_str]
                available_weight += weight
                weighted_sum += score * weight
                components[name] = round(score, 1)

        final_score = (weighted_sum / available_weight) if available_weight > 0 else 50.0
        final_score = max(0.0, min(100.0, final_score))

        combined.append({
            "date": day_str,
            "score": round(final_score, 1),
            "components": components,
            "event": event_name,
            "day_of_week": dow,
        })

        current += timedelta(days=1)

    available = [name for name in list(per_source.keys()) if per_source[name]]

    return {
        "sources": per_source,
        "combined": combined,
        "available_sources": available,
    }


def compute_calendar_scores(
    app_name: str,
    months: int = 12,
) -> list[dict]:
    """
    Compute daily activity scores for the past N months (combined calendar).

    Backward-compatible wrapper around compute_calendar_scores_per_source().

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
    result = compute_calendar_scores_per_source(app_name, months)
    return result["combined"]
