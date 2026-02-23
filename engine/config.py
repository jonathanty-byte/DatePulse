"""
DatePulse configuration — loads .env and exposes all settings.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve project root (parent of engine/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load .env from project root
load_dotenv(PROJECT_ROOT / ".env")

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DB_PATH = PROJECT_ROOT / os.getenv("DB_PATH", "data/datepulse.db")

# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------
TARGET_APPS: list[str] = [
    a.strip()
    for a in os.getenv("TARGET_APPS", "tinder,bumble,hinge,happn").split(",")
]
TARGET_CITIES: list[str] = [
    c.strip()
    for c in os.getenv("TARGET_CITIES", "paris,lyon,bordeaux,marseille,lille").split(",")
]
DEFAULT_CITY: str = os.getenv("DEFAULT_CITY", "paris")

# ---------------------------------------------------------------------------
# Scheduling & alerts
# ---------------------------------------------------------------------------
SCORING_INTERVAL_MINUTES: int = int(os.getenv("SCORING_INTERVAL_MINUTES", "60"))
ALERT_COOLDOWN_MINUTES: int = int(os.getenv("ALERT_COOLDOWN_MINUTES", "120"))
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")

# ---------------------------------------------------------------------------
# Cloudflare Radar API
# ---------------------------------------------------------------------------
CLOUDFLARE_API_TOKEN: str = os.getenv("CLOUDFLARE_API_TOKEN", "")

# ---------------------------------------------------------------------------
# City coordinates (for Open-Meteo)
# ---------------------------------------------------------------------------
CITIES: dict[str, dict] = {
    "paris":     {"lat": 48.8566, "lon": 2.3522,  "display_name": "Paris"},
    "lyon":      {"lat": 45.7640, "lon": 4.8357,  "display_name": "Lyon"},
    "bordeaux":  {"lat": 44.8378, "lon": -0.5792, "display_name": "Bordeaux"},
    "marseille": {"lat": 43.2965, "lon": 5.3698,  "display_name": "Marseille"},
    "lille":     {"lat": 50.6292, "lon": 3.0573,  "display_name": "Lille"},
}

# ---------------------------------------------------------------------------
# Wikipedia article mapping (app -> FR article title)
# ---------------------------------------------------------------------------
WIKIPEDIA_ARTICLES: dict[str, str] = {
    "tinder": "Tinder",
    "bumble": "Bumble",
    "hinge":  "Hinge",
    "happn":  "Happn",
}

# ---------------------------------------------------------------------------
# Scoring weights (must sum to 1.0)
# ---------------------------------------------------------------------------
WEIGHT_GOOGLE_TRENDS: float = 0.35
WEIGHT_WIKIPEDIA: float = 0.20
WEIGHT_BLUESKY: float = 0.10
WEIGHT_APP_REVIEWS: float = 0.15
WEIGHT_SEASONAL: float = 0.10
WEIGHT_WEATHER: float = 0.05
WEIGHT_DAY_HOUR: float = 0.05
