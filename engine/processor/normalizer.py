"""
Signal normalizer for DatePulse.

Converts raw signal values into percentile-based normalized scores (0-100).
Normalization is relative to historical data, optionally filtered by
same weekday and same month for seasonal consistency.
"""

import logging
from bisect import bisect_left
from datetime import datetime, timezone
from typing import Optional

from engine.storage import db

logger = logging.getLogger(__name__)


def percentile_rank(values: list[float], current: float) -> float:
    """
    Compute the percentile rank of `current` within a sorted list of values.

    Returns a value between 0 and 100.
    """
    if not values:
        return 50.0  # default when no history

    sorted_vals = sorted(values)
    n = len(sorted_vals)

    # Number of values strictly below current
    pos = bisect_left(sorted_vals, current)

    return (pos / n) * 100.0


def normalize_signal(
    source: str,
    app_name: str,
    city: str,
    metric_type: str,
    current_value: float,
    history_limit: int = 5000,
) -> float:
    """
    Normalize a signal value against its historical distribution.

    Fetches up to `history_limit` historical values for the same
    source/app/city/metric and returns the percentile rank (0-100).
    """
    historical = db.get_signal_values(
        source=source,
        app_name=app_name,
        city=city,
        metric_type=metric_type,
        limit=history_limit,
    )

    if len(historical) < 10:
        # Not enough history — fall back to simple min-max
        return _minmax_normalize(historical, current_value)

    return percentile_rank(historical, current_value)


def _minmax_normalize(values: list[float], current: float) -> float:
    """
    Simple min-max normalization to 0-100 range.
    Used as fallback when history is too short for meaningful percentiles.
    """
    if not values:
        return 50.0

    all_vals = values + [current]
    min_v = min(all_vals)
    max_v = max(all_vals)

    if max_v == min_v:
        return 50.0

    return ((current - min_v) / (max_v - min_v)) * 100.0


def normalize_all_latest(
    app_name: str,
    city: str,
) -> dict[str, float]:
    """
    Normalize the latest value for each available signal source.

    Returns a dict mapping component names to normalized scores (0-100):
    {
        "google_trends": 72.5,
        "wikipedia": 65.0,
        "bluesky": 0.0,      # None if no data
        ...
    }
    """
    components: dict[str, Optional[float]] = {}

    # Google Trends — use hourly as primary, fall back to weekly
    gt_value = db.get_latest_signal_value(
        "google_trends", app_name, "france", "interest_hourly"
    )
    if gt_value is None:
        gt_value = db.get_latest_signal_value(
            "google_trends", app_name, "france", "interest_weekly"
        )
    if gt_value is not None:
        components["google_trends"] = normalize_signal(
            "google_trends", app_name, "france", "interest_hourly",
            gt_value,
        )
    else:
        components["google_trends"] = None

    # Wikipedia pageviews
    wiki_value = db.get_latest_signal_value(
        "wikipedia", app_name, "france", "pageviews_daily"
    )
    if wiki_value is not None:
        components["wikipedia"] = normalize_signal(
            "wikipedia", app_name, "france", "pageviews_daily",
            wiki_value,
        )
    else:
        components["wikipedia"] = None

    # Bluesky mentions
    bsky_value = db.get_latest_signal_value(
        "bluesky", app_name, "france", "mentions_count"
    )
    if bsky_value is not None:
        components["bluesky"] = normalize_signal(
            "bluesky", app_name, "france", "mentions_count",
            bsky_value,
        )
    else:
        components["bluesky"] = None

    # App reviews
    reviews_value = db.get_latest_signal_value(
        "app_reviews", app_name, "france", "review_count_daily"
    )
    if reviews_value is not None:
        components["app_reviews"] = normalize_signal(
            "app_reviews", app_name, "france", "review_count_daily",
            reviews_value,
        )
    else:
        components["app_reviews"] = None

    # Weather boost — per city
    weather_value = db.get_latest_signal_value(
        "weather", "all", city, "weather_boost"
    )
    if weather_value is not None:
        # Weather boost is already 0-100 scaled
        components["weather"] = weather_value
    else:
        components["weather"] = None

    return components
