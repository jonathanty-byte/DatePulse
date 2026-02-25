#!/usr/bin/env python3
"""
Scrape Google Play Store rankings for dating apps in France.

Produces two JSON files consumed by the DatePulse frontend:
  - rankings-latest.json  : current snapshot (score, ratings, installs, rank)
  - rankings-history.json : rolling 90-day history for trend charts
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from google_play_scraper import app as gplay_app

# ─── Config ───────────────────────────────────────────────────────────────────

APPS = {
    "tinder": "com.tinder",
    "bumble": "com.bumble.app",
    "hinge": "co.hinge.app",
    "happn": "com.ftw_and_co.happn",
}

COUNTRY = "fr"
LANG = "fr"
MAX_HISTORY_ENTRIES = 90

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data"

TrendValue = Literal["up", "down", "stable"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    """Print a timestamped progress message."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def load_json(path: Path) -> any:
    """Load JSON from a file, returning None if it does not exist or is invalid."""
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        log(f"  Warning: could not load {path.name}: {exc}")
        return None


def save_json(path: Path, data: any) -> None:
    """Write JSON to a file with pretty-printing."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    log(f"  Wrote {path.name} ({path.stat().st_size:,} bytes)")


# ─── Step 1: Fetch app metadata ──────────────────────────────────────────────

def fetch_app_details(app_name: str, app_id: str) -> dict | None:
    """
    Call google_play_scraper.app() for a single app.
    Returns a dict with the fields we care about, or None on failure.
    """
    try:
        log(f"  Fetching details for {app_name} ({app_id})...")
        info = gplay_app(app_id, lang=LANG, country=COUNTRY)
        return {
            "score": info.get("score"),
            "ratings": info.get("ratings"),
            "reviews": info.get("reviews"),
            "installs": info.get("installs"),              # e.g. "100,000,000+"
            "recentInstalls": info.get("realInstalls"),     # numeric recent installs
            "updated": info.get("updated"),                 # last update date string
        }
    except Exception as exc:
        log(f"  ERROR fetching {app_name}: {exc}")
        return None


# ─── Step 2: Determine ranking from ratings count ────────────────────────────

def compute_ranks_from_details(details: dict[str, dict | None]) -> dict[str, int | None]:
    """
    Rank our 4 apps by total ratings count (most rated = #1).
    This gives a relative ranking among tracked apps since Play Store search
    API is unreliable.
    """
    ranked = []
    for app_name, info in details.items():
        if info and info.get("ratings"):
            ranked.append((app_name, info["ratings"]))

    # Sort by ratings descending
    ranked.sort(key=lambda x: x[1], reverse=True)

    ranks: dict[str, int | None] = {name: None for name in APPS}
    for position, (app_name, _) in enumerate(ranked, start=1):
        ranks[app_name] = position
        log(f"    {app_name}: rank #{position}")

    return ranks


# ─── Step 3: Compute trend from history ───────────────────────────────────────

def compute_trends(
    current_ranks: dict[str, int | None],
    history: list[dict],
) -> dict[str, TrendValue]:
    """
    Compare today's rank to the most recent historical entry.
    Returns one of: "up", "down", "stable".
    """
    trends: dict[str, TrendValue] = {name: "stable" for name in APPS}

    if not history:
        return trends

    # Find the most recent entry that is not today
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    previous = None
    for entry in reversed(history):
        if entry.get("date") != today_str:
            previous = entry
            break

    if previous is None:
        return trends

    prev_apps = previous.get("apps", {})
    for app_name in APPS:
        cur = current_ranks.get(app_name)
        prev = prev_apps.get(app_name, {}).get("rank")
        if cur is not None and prev is not None:
            if cur < prev:
                trends[app_name] = "up"
            elif cur > prev:
                trends[app_name] = "down"
            else:
                trends[app_name] = "stable"
        else:
            trends[app_name] = "stable"

    return trends


# ─── Step 4: Update history file ─────────────────────────────────────────────

def update_history(
    history_path: Path,
    today_str: str,
    apps_data: dict,
) -> list[dict]:
    """
    Load existing history, upsert today's entry, trim to MAX_HISTORY_ENTRIES.
    Returns the updated history list.
    """
    history = load_json(history_path)
    if not isinstance(history, list):
        history = []

    # Build today's compact entry (only rank, score, ratings for history)
    today_entry = {
        "date": today_str,
        "apps": {
            name: {
                "rank": data.get("rank"),
                "score": data.get("score"),
                "ratings": data.get("ratings"),
            }
            for name, data in apps_data.items()
        },
    }

    # Upsert: replace if today already exists, otherwise append
    replaced = False
    for i, entry in enumerate(history):
        if entry.get("date") == today_str:
            history[i] = today_entry
            replaced = True
            log(f"  Updated existing entry for {today_str} in history")
            break

    if not replaced:
        history.append(today_entry)
        log(f"  Appended new entry for {today_str} to history")

    # Sort descending by date and trim
    history.sort(key=lambda e: e.get("date", ""), reverse=True)
    if len(history) > MAX_HISTORY_ENTRIES:
        trimmed = len(history) - MAX_HISTORY_ENTRIES
        history = history[:MAX_HISTORY_ENTRIES]
        log(f"  Trimmed {trimmed} old entries (keeping {MAX_HISTORY_ENTRIES} days)")

    return history


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    log("=== DatePulse Play Store Rankings Scraper ===")
    log(f"Target apps: {', '.join(APPS.keys())}")

    # Ensure output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    log(f"Output directory: {OUTPUT_DIR}")

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    updated_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. Fetch app metadata
    log("Step 1/3: Fetching app details...")
    details: dict[str, dict | None] = {}
    for app_name, app_id in APPS.items():
        details[app_name] = fetch_app_details(app_name, app_id)

    # 2. Determine relative ranking from ratings
    log("Step 2/3: Computing relative rankings...")
    ranks = compute_ranks_from_details(details)

    # 3. Load existing history for trend computation
    history_path = OUTPUT_DIR / "rankings-history.json"
    existing_history = load_json(history_path)
    if not isinstance(existing_history, list):
        existing_history = []

    trends = compute_trends(ranks, existing_history)

    # 4. Assemble the latest snapshot
    log("Step 3/3: Writing output files...")
    apps_snapshot: dict[str, dict] = {}
    for app_name in APPS:
        info = details.get(app_name) or {}
        apps_snapshot[app_name] = {
            "rank": ranks.get(app_name),
            "score": info.get("score"),
            "ratings": info.get("ratings"),
            "reviews": info.get("reviews"),
            "installs": info.get("installs"),
            "recentInstalls": info.get("recentInstalls"),
            "updated": info.get("updated"),
            "trend": trends.get(app_name),
        }

    latest = {
        "updated": updated_iso,
        "apps": apps_snapshot,
    }

    # Write rankings-latest.json
    latest_path = OUTPUT_DIR / "rankings-latest.json"
    save_json(latest_path, latest)

    # Write rankings-history.json
    history = update_history(history_path, today_str, apps_snapshot)
    save_json(history_path, history)

    # Summary
    log("=== Done ===")
    for app_name, data in apps_snapshot.items():
        rank_str = f"#{data['rank']}" if data["rank"] is not None else "N/A"
        score_str = f"{data['score']:.1f}" if data["score"] is not None else "N/A"
        trend_str = " (stable)"
        if data["trend"] == "up":
            trend_str = " (up)"
        elif data["trend"] == "down":
            trend_str = " (down)"
        log(f"  {app_name:8s}  rank={rank_str:>4s}  score={score_str}{trend_str}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(1)
