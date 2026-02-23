"""
App version tracking collector for DatePulse.

Monitors app updates on Google Play via google-play-scraper.
Each update signals a potential 24-48h activity boost (users return
to the app after an update, reviews spike, etc.).

Produces two signal types per app:
  - app_update_detected: 1.0 on the day an update is detected, 0.0 otherwise
  - days_since_update: number of days since the last update (lower = more active dev)
"""

import logging
from datetime import datetime, timezone

from engine.config import TARGET_APPS
from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "app_versions"

# Google Play package IDs (shared with app_reviews / app_rankings)
PACKAGE_IDS: dict[str, str] = {
    "tinder": "com.tinder",
    "bumble": "com.bumble.app",
    "hinge": "co.hinge.app",
    "happn": "com.ftw_and_co.happn",
}


def _get_app_info(package_id: str) -> dict | None:
    """
    Fetch current app info from Google Play.

    Returns {"version": str, "updated_ts": int, "last_updated": str} or None.
    """
    from google_play_scraper import app

    try:
        info = app(package_id, lang="fr", country="fr")
        return {
            "version": info.get("version", "unknown"),
            "updated_ts": info.get("updated", 0),  # epoch timestamp
            "last_updated": info.get("lastUpdatedOn", ""),
        }
    except Exception as exc:
        logger.warning("Failed to fetch app info for %s: %s", package_id, exc)
        return None


def _get_stored_version(app_name: str) -> str | None:
    """Get the last stored version string for an app."""
    val = db.get_latest_signal_value(
        source=SOURCE,
        app_name=app_name,
        city="france",
        metric_type="app_update_detected",
    )
    # We store version in metadata, but for detection we just check
    # if the version changed. Use a separate query for the stored version.
    signals = db.get_signals(
        source=SOURCE,
        app_name=app_name,
        metric_type="app_update_detected",
        limit=1,
    )
    if signals and signals[0].get("metadata"):
        import json

        try:
            meta = json.loads(signals[0]["metadata"])
            return meta.get("version")
        except (ValueError, TypeError):
            pass
    return None


def collect() -> int:
    """
    Check for app updates and record version tracking signals.

    Returns the total number of signals inserted.
    """
    logger.info("Starting App Versions collection")
    total_inserted = 0
    now = datetime.now(timezone.utc)
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")

    for app_name in TARGET_APPS:
        package_id = PACKAGE_IDS.get(app_name)
        if not package_id:
            logger.warning("No package ID for app '%s', skipping", app_name)
            continue

        info = _get_app_info(package_id)
        if info is None:
            continue

        current_version = info["version"]
        updated_ts = info["updated_ts"]

        # Compute days since last update
        days_since = 0.0
        if updated_ts and updated_ts > 0:
            update_date = datetime.fromtimestamp(updated_ts, tz=timezone.utc)
            days_since = (now - update_date).total_seconds() / 86400.0

            # Insert days_since_update
            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="days_since_update",
                value=round(days_since, 1),
                collected_at=now_str,
            )
            if ok:
                total_inserted += 1

        # Detect new update by comparing with stored version
        stored_version = _get_stored_version(app_name)
        is_new_update = stored_version is not None and stored_version != current_version

        if is_new_update:
            logger.info(
                "%s: NEW UPDATE detected! %s -> %s",
                app_name,
                stored_version,
                current_version,
            )

        # Always record current version (value=1 if new update, 0 otherwise)
        ok = db.insert_raw_signal(
            source=SOURCE,
            app_name=app_name,
            city="france",
            metric_type="app_update_detected",
            value=1.0 if is_new_update else 0.0,
            metadata={"version": current_version, "last_updated": info["last_updated"]},
            collected_at=now_str,
        )
        if ok:
            total_inserted += 1

        logger.info(
            "%s: version=%s, updated=%s, days_since=%.1f",
            app_name,
            current_version,
            info["last_updated"],
            days_since,
        )

    logger.info("App Versions collection complete: %d signals inserted", total_inserted)
    return total_inserted


if __name__ == "__main__":
    import sys

    sys.path.insert(
        0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent)
    )

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    db.init_db()
    total = collect()
    print(f"App Versions: {total} signals collected")
