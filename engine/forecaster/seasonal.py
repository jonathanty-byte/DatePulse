"""
Seasonal index calculator for DatePulse.

Combines:
1. Day-of-week patterns from events_fr.json
2. Calendar event boosts (Valentine's Day, holidays, etc.)
3. Historical day×hour matrix built from Google Trends data

The seasonal index is a multiplier (typically 0.5-2.0) that captures
recurring activity patterns independent of real-time signals.
"""

import json
import logging
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Optional

from engine.config import PROJECT_ROOT
from engine.storage import db

logger = logging.getLogger(__name__)

# Load events calendar once at import time
_EVENTS_PATH = PROJECT_ROOT / "data" / "events_fr.json"
_events_data: Optional[dict] = None


def _load_events() -> dict:
    """Load and cache the events calendar."""
    global _events_data
    if _events_data is None:
        with open(_EVENTS_PATH, "r", encoding="utf-8") as f:
            _events_data = json.load(f)
    return _events_data


def get_weekly_pattern(dt: datetime) -> float:
    """
    Return the day-of-week activity multiplier for a given datetime.

    Based on weekly_patterns in events_fr.json.
    """
    events = _load_events()
    day_names = [
        "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday",
    ]
    day_name = day_names[dt.weekday()]
    return events.get("weekly_patterns", {}).get(day_name, 1.0)


def get_event_boost(dt: datetime) -> float:
    """
    Return the event boost multiplier for a given date.

    Checks recurring events and period boosts. Returns the strongest
    applicable boost (not cumulative — max wins).
    """
    events = _load_events()
    target_date = dt.date() if isinstance(dt, datetime) else dt
    boosts: list[float] = [1.0]  # default: no boost

    # Check recurring events
    for event in events.get("recurring_events", []):
        event_month, event_day = map(int, event["date"].split("-"))
        event_date = date(target_date.year, event_month, event_day)

        days_before = event.get("days_before", 0)
        days_after = event.get("days_after", 0)

        start = event_date - timedelta(days=days_before)
        end = event_date + timedelta(days=days_after)

        if start <= target_date <= end:
            # Taper the boost: full at event_date, reduced at edges
            distance = abs((target_date - event_date).days)
            max_distance = max(days_before, days_after, 1)
            taper = 1.0 - (distance / (max_distance + 1)) * 0.5
            boosted = 1.0 + (event["boost"] - 1.0) * taper
            boosts.append(boosted)

    # Check period boosts
    for period in events.get("periods", []):
        if "start" in period and "end" in period:
            p_start_m, p_start_d = map(int, period["start"].split("-"))
            p_end_m, p_end_d = map(int, period["end"].split("-"))

            p_start = date(target_date.year, p_start_m, p_start_d)
            p_end = date(target_date.year, p_end_m, p_end_d)

            # Handle year-spanning periods (e.g., Dec 20 - Jan 2)
            if p_end < p_start:
                if target_date >= p_start or target_date <= p_end:
                    boosts.append(period["boost"])
            elif p_start <= target_date <= p_end:
                boosts.append(period["boost"])

    return max(boosts)


def get_hour_weight(hour: int) -> float:
    """
    Return an activity weight for a given hour of the day.

    Based on typical dating app usage patterns:
    - Peak: 20h-23h
    - High: 12h-14h (lunch), 17h-19h (commute)
    - Low: 3h-7h
    """
    hour_weights = {
        0: 0.6, 1: 0.4, 2: 0.3, 3: 0.2, 4: 0.15, 5: 0.15,
        6: 0.2, 7: 0.3, 8: 0.5, 9: 0.6, 10: 0.65, 11: 0.7,
        12: 0.8, 13: 0.8, 14: 0.7, 15: 0.65, 16: 0.7, 17: 0.8,
        18: 0.85, 19: 0.9, 20: 1.0, 21: 1.0, 22: 0.95, 23: 0.8,
    }
    return hour_weights.get(hour, 0.5)


def build_day_hour_matrix(app_name: str) -> dict[str, list[float]]:
    """
    Build a 7×24 matrix of average signal values from historical
    Google Trends hourly data.

    Returns: {"monday": [val_0h, val_1h, ..., val_23h], ...}
    """
    signals = db.get_signals_in_range(
        source="google_trends",
        app_name=app_name,
        metric_type="interest_hourly",
    )

    day_names = [
        "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday",
    ]
    # Accumulate: matrix[day][hour] = [values]
    accumulator: dict[str, list[list[float]]] = {
        day: [[] for _ in range(24)] for day in day_names
    }

    for sig in signals:
        try:
            dt = datetime.strptime(sig["collected_at"], "%Y-%m-%d %H:%M:%S")
            day_name = day_names[dt.weekday()]
            hour = dt.hour
            accumulator[day_name][hour].append(sig["value"])
        except (ValueError, KeyError):
            continue

    # Average
    matrix: dict[str, list[float]] = {}
    for day in day_names:
        matrix[day] = [
            sum(vals) / len(vals) if vals else 50.0
            for vals in accumulator[day]
        ]

    return matrix


def get_day_hour_score(app_name: str, dt: datetime) -> float:
    """
    Return the historical average score for this day-of-week × hour.

    Falls back to hour_weight × 50 if no historical data.
    """
    matrix = build_day_hour_matrix(app_name)
    day_names = [
        "monday", "tuesday", "wednesday", "thursday",
        "friday", "saturday", "sunday",
    ]
    day_name = day_names[dt.weekday()]
    hour = dt.hour

    value = matrix.get(day_name, [50.0] * 24)[hour]
    return value


def get_seasonal_index(dt: datetime) -> float:
    """
    Compute the combined seasonal index for a given datetime.

    Combines day-of-week pattern, hour weight, and event boost into
    a single score (0-100 scale).

    Formula: base_score × weekly_pattern × event_boost
    where base_score is derived from hour_weight (0-100 scaled).
    """
    hour_w = get_hour_weight(dt.hour)
    weekly_w = get_weekly_pattern(dt)
    event_w = get_event_boost(dt)

    # Base score from hour weight (scaled to 0-100)
    base = hour_w * 100.0

    # Apply multipliers
    score = base * weekly_w * event_w

    # Clamp to 0-100
    return max(0.0, min(100.0, score))
