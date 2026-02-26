"""
DatePulse Scoring Engine — Python port of frontend/src/lib/data.ts + scoring.ts
Feminine scoring model: tables calibrated for female activity patterns.

Deterministic scoring: score(t) = hourly[h] * weekly[d] * monthly[m] / 10000 * event_multiplier * weather_mod
All times in Europe/Paris timezone.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

PARIS_TZ = ZoneInfo("Europe/Paris")

# ── Apps supported ───────────────────────────────────────────────

APPS = ("tinder", "bumble", "hinge", "happn")

# ── Shared base indexes (Tinder baseline — feminine model) ──────

HOURLY_INDEX = {
    0: 6, 1: 4, 2: 3, 3: 3, 4: 3, 5: 4, 6: 8, 7: 12,
    8: 20, 9: 22, 10: 25, 11: 32, 12: 45, 13: 48, 14: 40,
    15: 22, 16: 22, 17: 30, 18: 62, 19: 85, 20: 100, 21: 92,
    22: 65, 23: 35,
}

WEEKLY_INDEX = {
    0: 90,   # Dimanche
    1: 82,   # Lundi
    2: 68,   # Mardi
    3: 65,   # Mercredi
    4: 78,   # Jeudi
    5: 65,   # Vendredi
    6: 100,  # Samedi — pic feminin
}

MONTHLY_INDEX = {
    0: 100,  # Janvier
    1: 74,   # Fevrier
    2: 68,   # Mars
    3: 65,   # Avril
    4: 86,   # Mai
    5: 72,   # Juin
    6: 89,   # Juillet
    7: 82,   # Aout
    8: 75,   # Septembre
    9: 83,   # Octobre
    10: 78,  # Novembre
    11: 60,  # Decembre
}

# ── Per-app lookup tables ────────────────────────────────────────

APP_HOURLY = {
    "tinder": HOURLY_INDEX,
    "bumble": {
        0: 6, 1: 4, 2: 3, 3: 3, 4: 3, 5: 4, 6: 8, 7: 12,
        8: 18, 9: 20, 10: 24, 11: 30, 12: 42, 13: 44, 14: 36,
        15: 24, 16: 22, 17: 32, 18: 65, 19: 100, 20: 92, 21: 80,
        22: 55, 23: 30,
    },
    "hinge": {
        0: 5, 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 6, 7: 10,
        8: 18, 9: 20, 10: 22, 11: 28, 12: 40, 13: 42, 14: 35,
        15: 22, 16: 20, 17: 28, 18: 58, 19: 82, 20: 100, 21: 95,
        22: 75, 23: 42,
    },
    "happn": {
        0: 4, 1: 2, 2: 2, 3: 2, 4: 2, 5: 4, 6: 10, 7: 20,
        8: 35, 9: 32, 10: 25, 11: 28, 12: 42, 13: 44, 14: 35,
        15: 25, 16: 25, 17: 36, 18: 68, 19: 85, 20: 100, 21: 90,
        22: 60, 23: 30,
    },
}

APP_WEEKLY = {
    "tinder": WEEKLY_INDEX,
    "bumble": {
        0: 85,   # Dimanche
        1: 100,  # Lundi — pic Bumble
        2: 80,   # Mardi
        3: 70,   # Mercredi
        4: 75,   # Jeudi
        5: 58,   # Vendredi
        6: 90,   # Samedi
    },
    "hinge": {
        0: 90,   # Dimanche
        1: 80,   # Lundi
        2: 68,   # Mardi
        3: 65,   # Mercredi
        4: 82,   # Jeudi
        5: 52,   # Vendredi
        6: 100,  # Samedi — pic feminin
    },
    "happn": {
        0: 72,   # Dimanche
        1: 90,   # Lundi
        2: 88,   # Mardi
        3: 85,   # Mercredi
        4: 95,   # Jeudi — pic Happn (Ogury)
        5: 62,   # Vendredi
        6: 100,  # Samedi
    },
}

APP_MONTHLY = {
    "tinder": MONTHLY_INDEX,
    "bumble": {
        0: 90, 1: 100, 2: 88, 3: 72, 4: 68, 5: 62,
        6: 60, 7: 55, 8: 75, 9: 80, 10: 82, 11: 65,
    },
    "hinge": {
        0: 88, 1: 100, 2: 82, 3: 70, 4: 68, 5: 65,
        6: 78, 7: 90, 8: 80, 9: 85, 10: 82, 11: 72,
    },
    "happn": {
        0: 100, 1: 85, 2: 78, 3: 75, 4: 72, 5: 70,
        6: 80, 7: 82, 8: 78, 9: 75, 10: 72, 11: 68,
    },
}

# ── Special events ───────────────────────────────────────────────
# Each event: (name, check_function, multiplier)
# check_function receives a Paris-localized datetime

SPECIAL_EVENTS = [
    # Adjusted boosters
    {
        "name": "Dating Sunday",
        "check": lambda d: d.month == 1 and d.weekday() == 6 and d.day <= 7,
        "multiplier": 1.25,
    },
    {
        "name": "Nouvel An",
        "check": lambda d: d.month == 1 and 1 <= d.day <= 7,
        "multiplier": 1.35,
    },
    {
        "name": "Pre-Saint-Valentin",
        "check": lambda d: d.month == 2 and 1 <= d.day <= 13,
        "multiplier": 1.30,
    },
    {
        "name": "Saint-Valentin",
        "check": lambda d: d.month == 2 and d.day == 14,
        "multiplier": 1.35,
    },
    {
        "name": "Rentree",
        "check": lambda d: d.month == 9 and 1 <= d.day <= 15,
        "multiplier": 1.15,
    },
    {
        "name": "Cuffing Season",
        "check": lambda d: (d.month == 10 and d.day >= 15) or d.month == 11,
        "multiplier": 1.06,
    },
    # New psychological events
    {
        "name": "Sunday Blues",
        "check": lambda d: d.weekday() == 6 and 18 <= d.hour <= 22,
        "multiplier": 1.08,
    },
    {
        "name": "Vendredi FOMO",
        "check": lambda d: d.weekday() == 4 and 20 <= d.hour <= 23,
        "multiplier": 1.12,
    },
    {
        "name": "Dimanche Ennui",
        "check": lambda d: d.weekday() == 6 and 14 <= d.hour <= 17,
        "multiplier": 1.08,
    },
    {
        "name": "Winter Darkness",
        "check": lambda d: d.month in (1, 2, 11, 12) and 17 <= d.hour <= 22,
        "multiplier": 1.05,
    },
    {
        "name": "Post-Noel",
        "check": lambda d: d.month == 12 and 27 <= d.day <= 30,
        "multiplier": 1.15,
    },
    {
        "name": "8 Mars",
        "check": lambda d: d.month == 3 and d.day == 8,
        "multiplier": 1.08,
    },
    # Reducers
    {
        "name": "Noel",
        "check": lambda d: d.month == 12 and 24 <= d.day <= 26,
        "multiplier": 0.60,
    },
    {
        "name": "Reveillon",
        "check": lambda d: d.month == 12 and d.day == 31,
        "multiplier": 0.50,
    },
    {
        "name": "15 Aout",
        "check": lambda d: d.month == 8 and d.day == 15,
        "multiplier": 0.70,
    },
    {
        "name": "Pic Ete",
        "check": lambda d: (d.month == 7 and d.day >= 1) or (d.month == 8 and d.day <= 20),
        "multiplier": 1.08,
    },
]

# ── Weather modifiers ────────────────────────────────────────────

WEATHER_MODIFIERS = {
    "clear": 0.95,
    "clouds": 1.00,
    "rain": 1.10,
    "drizzle": 1.05,
    "snow": 1.27,
    "thunderstorm": 1.15,
    "mist": 1.03,
    "fog": 1.03,
}

# ── Helper: get Paris date parts ─────────────────────────────────

def _get_paris_parts(dt: datetime) -> tuple[int, int, int]:
    """Return (hour, js_day, month_0indexed) in Europe/Paris timezone.

    js_day uses JS convention: 0=Sunday, 1=Monday, ..., 6=Saturday.
    month is 0-indexed: 0=January, ..., 11=December.
    """
    paris_dt = dt.astimezone(PARIS_TZ)
    hour = paris_dt.hour
    # Python weekday(): 0=Monday..6=Sunday → JS getDay(): 0=Sunday..6=Saturday
    py_weekday = paris_dt.weekday()
    js_day = (py_weekday + 1) % 7
    month = paris_dt.month - 1  # 0-indexed
    return hour, js_day, month


# ── Core scoring ─────────────────────────────────────────────────

def compute_score(
    dt: Optional[datetime] = None,
    app: str = "tinder",
    weather_condition: Optional[str] = None,
) -> dict:
    """Compute the activity score for a given datetime and app.

    Returns dict with: score, hourly, weekly, monthly, event, event_multiplier
    """
    if dt is None:
        dt = datetime.now(PARIS_TZ)
    if app not in APPS:
        raise ValueError(f"Unknown app: {app}. Must be one of {APPS}")

    hour, js_day, month = _get_paris_parts(dt)
    paris_dt = dt.astimezone(PARIS_TZ)

    hourly = APP_HOURLY[app][hour]
    weekly = APP_WEEKLY[app][js_day]
    monthly = APP_MONTHLY[app][month]

    # Find the strongest matching event
    event_multiplier = 1.0
    event_name = None
    for event in SPECIAL_EVENTS:
        if event["check"](paris_dt):
            if event_name is None or abs(event["multiplier"] - 1) > abs(event_multiplier - 1):
                event_multiplier = event["multiplier"]
                event_name = event["name"]

    # Weather modifier
    weather_mod = (
        WEATHER_MODIFIERS.get(weather_condition, 1.0)
        if weather_condition
        else 1.0
    )

    raw = (hourly * weekly * monthly) / 10000 * event_multiplier * weather_mod
    score = min(100, max(0, round(raw)))

    return {
        "score": score,
        "hourly": hourly,
        "weekly": weekly,
        "monthly": monthly,
        "event": event_name,
        "event_multiplier": event_multiplier,
    }


# ── Score labels ─────────────────────────────────────────────────

def get_score_label(score: int) -> dict:
    """Return label and message for a given score."""
    if score >= 91:
        return {"label": "En feu", "message": "Moment optimal ! Fonce !"}
    if score >= 76:
        return {"label": "Tres actif", "message": "Excellente activite !"}
    if score >= 56:
        return {"label": "Actif", "message": "Bon moment pour swiper"}
    if score >= 36:
        return {"label": "Moyen", "message": "Activite correcte"}
    if score >= 16:
        return {"label": "Calme", "message": "Peu d'activite en ce moment"}
    return {"label": "Mort plat", "message": "Evite de swiper maintenant"}


# ── Next peak finder ─────────────────────────────────────────────

def get_next_peak(
    from_dt: Optional[datetime] = None,
    app: str = "tinder",
    threshold: int = 70,
) -> Optional[dict]:
    """Find the next time slot where score >= threshold.

    Searches up to 7 days ahead, hour by hour.
    Returns dict with: date, score, hours_until, minutes_until — or None.
    """
    if from_dt is None:
        from_dt = datetime.now(PARIS_TZ)

    # Round up to next hour
    check = from_dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)

    for _ in range(168):  # 7 days * 24 hours
        result = compute_score(check, app)
        if result["score"] >= threshold:
            diff = check - from_dt
            total_seconds = diff.total_seconds()
            hours_until = int(total_seconds // 3600)
            minutes_until = int((total_seconds % 3600) // 60)
            return {
                "date": check,
                "score": result["score"],
                "hours_until": hours_until,
                "minutes_until": minutes_until,
            }
        check += timedelta(hours=1)

    return None


# ── Standalone test ──────────────────────────────────────────────

if __name__ == "__main__":
    now = datetime.now(PARIS_TZ)
    print(f"Date/heure Paris : {now.strftime('%A %d/%m/%Y %Hh%M')}")
    print()

    for app in APPS:
        result = compute_score(now, app)
        label = get_score_label(result["score"])
        event_str = f" [{result['event']} x{result['event_multiplier']}]" if result["event"] else ""
        print(f"  {app:8s} : {result['score']:3d}/100  ({label['label']:10s}) "
              f"H={result['hourly']:3d} W={result['weekly']:3d} M={result['monthly']:3d}{event_str}")

    print()
    peak = get_next_peak(now, "tinder", 70)
    if peak:
        print(f"Prochain pic Tinder (>=70) : {peak['date'].strftime('%A %Hh')} "
              f"(dans {peak['hours_until']}h{peak['minutes_until']:02d}min, score={peak['score']})")
    else:
        print("Aucun pic >= 70 dans les 7 prochains jours")
