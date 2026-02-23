"""
Signal normalizer for DatePulse.

Converts raw signal values into percentile-based normalized scores
(same weekday, same month historical comparison).
"""

import logging

logger = logging.getLogger(__name__)
