"""
Seasonal index calculator for DatePulse.

Builds day-of-week x hour-of-day activity matrices from historical data
to provide the seasonal component of the scoring model.
"""

import logging

logger = logging.getLogger(__name__)
