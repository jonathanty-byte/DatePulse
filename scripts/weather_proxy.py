"""
Weather proxy for DatePulse — fetches current weather for Paris
and writes a static JSON file for the frontend.

Usage:
    python scripts/weather_proxy.py

Schedule via Task Scheduler (Windows) or cron (Linux) every 30min.
Output: frontend/public/weather.json
"""

import json
import urllib.request
from datetime import datetime
from pathlib import Path


def map_weather_code(code: int) -> str:
    """Map wttr.in weather codes to our condition categories."""
    if code in (113,):
        return "clear"
    if code in (116, 119, 122):
        return "clouds"
    if code in (176, 263, 266, 281, 284):
        return "drizzle"
    if code in (293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359):
        return "rain"
    if code in (200, 386, 389, 392, 395):
        return "thunderstorm"
    if code in (179, 182, 185, 227, 230, 320, 323, 326, 329, 332,
                335, 338, 350, 362, 365, 368, 371, 374, 377):
        return "snow"
    if code in (143, 248, 260):
        return "mist"
    return "clouds"  # default


def fetch_weather() -> dict:
    """Fetch current weather for Paris from wttr.in and return parsed result."""
    url = "https://wttr.in/Paris?format=j1"
    req = urllib.request.Request(url, headers={"User-Agent": "DatePulse/1.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=10).read())
    current = data["current_condition"][0]

    code = int(current["weatherCode"])
    condition = map_weather_code(code)

    return {
        "condition": condition,
        "description": current["weatherDesc"][0]["value"],
        "temp": int(current["temp_C"]),
        "city": "Paris",
        "updated": datetime.now().isoformat(),
    }


def main():
    """Fetch weather and write to frontend/public/weather.json."""
    output = Path(__file__).parent.parent / "frontend" / "public" / "weather.json"

    try:
        result = fetch_weather()
        output.write_text(json.dumps(result, indent=2, ensure_ascii=False))
        print(f"[OK] {result['condition']} ({result['description']}, "
              f"{result['temp']}C) -> {output}")
    except Exception as e:
        print(f"[ERROR] {e}")
        # Keep existing file as fallback
        if not output.exists():
            fallback = {
                "condition": "clouds",
                "description": "Fallback",
                "temp": 12,
                "city": "Paris",
                "updated": datetime.now().isoformat(),
            }
            output.write_text(json.dumps(fallback, indent=2))
            print(f"[FALLBACK] Wrote default weather to {output}")


if __name__ == "__main__":
    main()
