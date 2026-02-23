"""
Telegram bot for DatePulse alerts.

Sends notifications when activity scores exceed P85 (good) or P95
(exceptional) thresholds, with rate limiting and quiet hours.
"""

import logging

logger = logging.getLogger(__name__)
