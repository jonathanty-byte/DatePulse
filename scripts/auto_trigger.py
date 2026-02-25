"""
DatePulse Auto Trigger — Launch Chrome + Auto Swiper during peak hours.

Designed to run every 30 minutes via Windows Task Scheduler.
Calculates the DatePulse score and opens the dating app in Chrome
when the score exceeds the configured threshold.

Installation (Windows Task Scheduler):
  1. Open Task Scheduler (taskschd.msc)
  2. Create a basic task:
     - Name: "DatePulse Auto Trigger"
     - Trigger: Repeat every 30 minutes, indefinitely
     - Action: Start a program
       Program: python
       Arguments: C:\\Users\\jonat\\projects\\DatePulse\\scripts\\auto_trigger.py
       Start in: C:\\Users\\jonat\\projects\\DatePulse\\scripts
  3. Conditions: Start only if on AC power
  4. Settings: If the task is already running, do not start a new instance
"""

import subprocess
import time
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from scoring_engine import compute_score, get_score_label, get_next_peak, PARIS_TZ

SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "auto_trigger_config.json"
LOCKFILE_PATH = SCRIPT_DIR / ".auto_trigger_lock"
SESSIONS_PATH = SCRIPT_DIR / "sessions.jsonl"


def load_config() -> dict:
    """Load configuration from auto_trigger_config.json."""
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def setup_logging(log_file: str) -> None:
    """Configure logging to file and stdout."""
    log_path = Path(log_file)
    if not log_path.is_absolute():
        log_path = SCRIPT_DIR.parent / log_file

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def is_session_running() -> bool:
    """Check if a session is already in progress via lockfile."""
    if not LOCKFILE_PATH.exists():
        return False

    try:
        with open(LOCKFILE_PATH, "r") as f:
            expires_str = f.read().strip()
        expires = datetime.fromisoformat(expires_str)
        if datetime.now(PARIS_TZ) < expires:
            return True
        # Lockfile expired, clean it up
        LOCKFILE_PATH.unlink(missing_ok=True)
        return False
    except (ValueError, OSError):
        # Corrupted lockfile, remove it
        LOCKFILE_PATH.unlink(missing_ok=True)
        return False


def write_lockfile(duration_minutes: int) -> None:
    """Write a lockfile with an expiration timestamp."""
    expires = datetime.now(PARIS_TZ) + timedelta(minutes=duration_minutes)
    with open(LOCKFILE_PATH, "w") as f:
        f.write(expires.isoformat())


def remove_lockfile() -> None:
    """Remove the lockfile."""
    LOCKFILE_PATH.unlink(missing_ok=True)


def log_session(triggered_apps: list[str], scores: dict[str, dict], duration: int) -> None:
    """Append a session entry to sessions.jsonl."""
    entry = {
        "timestamp": datetime.now(PARIS_TZ).isoformat(),
        "apps": triggered_apps,
        "scores": {app: s["score"] for app, s in scores.items()},
        "events": {app: s["event"] for app, s in scores.items() if s["event"]},
        "duration_minutes": duration,
    }
    with open(SESSIONS_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def show_history(count: int = 20) -> None:
    """Display recent sessions from sessions.jsonl."""
    if not SESSIONS_PATH.exists():
        print("Aucune session enregistree.")
        return

    lines = SESSIONS_PATH.read_text(encoding="utf-8").strip().splitlines()
    if not lines:
        print("Aucune session enregistree.")
        return

    sessions = [json.loads(line) for line in lines]
    recent = sessions[-count:]

    print(f"\n{'='*65}")
    print(f" Historique des sessions ({len(sessions)} total, {len(recent)} affichees)")
    print(f"{'='*65}")
    print(f" {'Date':20s} {'Apps':20s} {'Scores':12s} {'Duree':>6s}")
    print(f" {'-'*20} {'-'*20} {'-'*12} {'-'*6}")

    for s in recent:
        dt = datetime.fromisoformat(s["timestamp"])
        date_str = dt.strftime("%d/%m/%Y %Hh%M")
        apps_str = ", ".join(s["apps"])
        scores_str = " ".join(f"{a[0].upper()}{v}" for a, v in s["scores"].items())
        dur_str = f"{s['duration_minutes']}min"
        event_str = ""
        if s.get("events"):
            event_str = f"  ({', '.join(s['events'].values())})"
        print(f" {date_str:20s} {apps_str:20s} {scores_str:12s} {dur_str:>6s}{event_str}")

    print()


def main() -> None:
    config = load_config()
    setup_logging(config.get("log_file", "scripts/auto_trigger.log"))

    now = datetime.now(PARIS_TZ)
    hour = now.hour
    logging.info("=" * 50)
    logging.info(f"Auto Trigger run — {now.strftime('%A %d/%m/%Y %Hh%M')}")

    # Check quiet hours
    quiet = config.get("quiet_hours", {})
    quiet_start = quiet.get("start", 1)
    quiet_end = quiet.get("end", 7)
    if quiet_start <= hour < quiet_end:
        logging.info(f"Quiet hours ({quiet_start}h-{quiet_end}h), skip")
        return

    # Compute scores for all configured apps
    apps = config.get("apps", config.get("app", "tinder"))
    if isinstance(apps, str):
        apps = [apps]
    threshold = config.get("threshold", 70)

    triggered_apps = []
    all_scores = {}
    for app in apps:
        result = compute_score(now, app)
        all_scores[app] = result
        label = get_score_label(result["score"])
        event_str = f" [{result['event']} x{result['event_multiplier']}]" if result["event"] else ""
        logging.info(f"  {app}: {result['score']}/100 ({label['label']}){event_str}")

        if result["score"] >= threshold:
            triggered_apps.append(app)
        else:
            peak = get_next_peak(now, app, threshold)
            if peak:
                logging.info(
                    f"    -> < seuil {threshold}, prochain pic: "
                    f"{peak['date'].strftime('%A %Hh')} "
                    f"(dans {peak['hours_until']}h{peak['minutes_until']:02d}min)"
                )

    if not triggered_apps:
        logging.info(f"Aucune app >= seuil {threshold}, skip")
        return

    # Check if a session is already running
    if is_session_running():
        logging.info("Session deja en cours, skip")
        return

    # Launch Chrome with one tab per triggered app
    duration = config.get("session_duration_minutes", 30)
    chrome_path = config.get("chrome_path", "chrome")
    urls = [config["app_urls"][app] for app in triggered_apps]

    logging.info(f"PEAK DETECTED! Lancement de {', '.join(triggered_apps)} pour {duration}min")

    chrome_args = [chrome_path] + urls
    profile_dir = config.get("chrome_profile_dir", "")
    if profile_dir:
        chrome_args.append(f"--user-data-dir={profile_dir}")

    try:
        proc = subprocess.Popen(chrome_args)
        logging.info(f"Chrome lance (PID: {proc.pid}) -- {len(urls)} onglet(s)")
    except FileNotFoundError:
        logging.error(f"Chrome introuvable: {chrome_path}")
        logging.error("Verifier chrome_path dans auto_trigger_config.json")
        return
    except OSError as e:
        logging.error(f"Erreur lancement Chrome: {e}")
        return

    # Log session to history
    log_session(triggered_apps, {a: all_scores[a] for a in triggered_apps}, duration)

    # Write lockfile to prevent duplicate sessions
    write_lockfile(duration)

    # Wait for the session duration
    logging.info(f"Attente de {duration} minutes...")
    time.sleep(duration * 60)

    # Session complete
    remove_lockfile()
    logging.info("Session terminee")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--history":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        show_history(count)
    else:
        main()
