"""
DatePulse Auto Trigger — Launch Chrome + Auto Swiper during peak hours.

Designed to run every 30 minutes via Windows Task Scheduler.
Calculates the DatePulse score and opens the dating app in Chrome
when the score exceeds the configured threshold.

Uses the user's regular Chrome (already logged in, extensions installed).
Auto Swiper is activated via its keyboard shortcut (Alt+Shift+S).

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
        LOCKFILE_PATH.unlink(missing_ok=True)
        return False
    except (ValueError, OSError):
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


# ── Chrome launch + Auto Swiper activation ───────────────────────

def launch_chrome_tab(config: dict, url: str) -> bool:
    """Open a single URL in the user's regular Chrome (already logged in).

    Returns True if the tab was opened successfully.
    """
    chrome_path = config.get("chrome_path", "chrome")

    try:
        subprocess.Popen([chrome_path, url])
        logging.info(f"Onglet ouvert: {url}")
        return True
    except (FileNotFoundError, OSError) as e:
        logging.error(f"Erreur ouverture {url}: {e}")
        return False


def activate_auto_swiper(app_name: str) -> None:
    """Press the Auto Swiper keyboard shortcut (Alt+Shift+S) to open its popup,
    then Tab 14 times to reach the Play button and press Enter.

    Uses pyautogui to simulate keyboard input in the user's Chrome.
    Must be called while the target tab is focused.
    """
    try:
        import pyautogui
    except ImportError:
        logging.warning("pyautogui non installe, Auto Swiper doit etre lance manuellement")
        logging.warning("Installer avec: python -m pip install pyautogui")
        return

    # Press Alt+Shift+S to open Auto Swiper popup
    logging.info(f"Activation Auto Swiper sur {app_name} (Alt+Shift+S)...")
    pyautogui.hotkey("alt", "shift", "s")
    time.sleep(3)  # Wait for popup to appear and Vue app to mount

    # Tab 14 times to reach the Play button (Enter alone hits OK/Refresh)
    for _ in range(14):
        pyautogui.press("tab")
        time.sleep(0.1)

    # Press Enter to click the Play button
    pyautogui.press("enter")
    time.sleep(1)

    logging.info(f"Auto Swiper sur {app_name}: commande envoyee")


# ── Main ─────────────────────────────────────────────────────────

def main() -> None:
    config = load_config()
    setup_logging(config.get("log_file", "scripts/auto_trigger.log"))

    now = datetime.now(PARIS_TZ)
    hour = now.hour
    logging.info("=" * 50)
    logging.info(f"Auto Trigger run -- {now.strftime('%A %d/%m/%Y %Hh%M')}")

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

    # Pick the app with the highest score (extension only supports one at a time)
    best_app = max(triggered_apps, key=lambda a: all_scores[a]["score"])
    duration = config.get("session_duration_minutes", 30)
    url = config["app_urls"][best_app]

    logging.info(f"PEAK DETECTED! Lancement de {best_app} (meilleur score) pour {duration}min")

    if launch_chrome_tab(config, url):
        time.sleep(8)
        activate_auto_swiper(best_app)

    # Log session to history
    log_session([best_app], {best_app: all_scores[best_app]}, duration)

    # Write lockfile to prevent duplicate sessions
    write_lockfile(duration)

    # Wait for the session duration
    logging.info(f"Attente de {duration} minutes...")
    time.sleep(duration * 60)

    # Session complete
    remove_lockfile()
    logging.info("Session terminee")


def trigger_now(target_app: str | None = None) -> dict:
    """Force-trigger Auto Swiper on a single app, ignoring score threshold.

    Args:
        target_app: App to trigger (e.g. "tinder"). If None, uses first configured app.

    Returns a status dict (used by both CLI --now and HTTP server).
    """
    config = load_config()
    setup_logging(config.get("log_file", "scripts/auto_trigger.log"))

    now = datetime.now(PARIS_TZ)
    logging.info("=" * 50)
    logging.info(f"Manual trigger -- {now.strftime('%A %d/%m/%Y %Hh%M')}")

    # Determine which app to launch
    if target_app is None:
        configured = config.get("apps", config.get("app", "tinder"))
        target_app = configured[0] if isinstance(configured, list) else configured

    if target_app not in config.get("app_urls", {}):
        logging.error(f"App inconnue: {target_app}")
        return {"status": "error", "reason": f"unknown app: {target_app}"}

    result = compute_score(now, target_app)
    label = get_score_label(result["score"])
    logging.info(f"  {target_app}: {result['score']}/100 ({label['label']})")

    duration = config.get("session_duration_minutes", 30)
    url = config["app_urls"][target_app]

    logging.info(f"MANUAL TRIGGER! Lancement de {target_app} pour {duration}min")

    if launch_chrome_tab(config, url):
        time.sleep(8)
        activate_auto_swiper(target_app)

    log_session([target_app], {target_app: result}, duration)

    return {
        "status": "triggered",
        "app": target_app,
        "score": result["score"],
        "duration": duration,
    }


# ── Local HTTP server for frontend button ─────────────────────────

def run_server(port: int = 5555) -> None:
    """Run a local HTTP server that exposes /trigger endpoint.

    The frontend button calls POST http://localhost:5555/trigger
    to force-launch Auto Swiper.
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import threading

    config = load_config()
    setup_logging(config.get("log_file", "scripts/auto_trigger.log"))

    class TriggerHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path == "/trigger":
                # Read target app from request body
                target_app = None
                content_len = int(self.headers.get("Content-Length", 0))
                if content_len > 0:
                    body = json.loads(self.rfile.read(content_len))
                    target_app = body.get("app")
                # Run trigger in a background thread so HTTP responds immediately
                result = {"status": "launching", "app": target_app}
                threading.Thread(
                    target=trigger_now, args=(target_app,), daemon=True
                ).start()
                self._respond(200, result)
            else:
                self._respond(404, {"error": "not found"})

        def do_GET(self):
            if self.path == "/status":
                running = is_session_running()
                now = datetime.now(PARIS_TZ)
                apps = config.get("apps", config.get("app", "tinder"))
                if isinstance(apps, str):
                    apps = [apps]
                scores = {}
                for app in apps:
                    r = compute_score(now, app)
                    scores[app] = r["score"]
                self._respond(200, {
                    "session_running": running,
                    "scores": scores,
                    "time": now.strftime("%Hh%M"),
                })
            else:
                self._respond(404, {"error": "not found"})

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors_headers()
            self.end_headers()

        def _cors_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def _respond(self, code, data):
            self.send_response(code)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())

        def log_message(self, format, *args):
            logging.info(f"HTTP {args[0]}")

    server = HTTPServer(("127.0.0.1", port), TriggerHandler)
    logging.info(f"Serveur local demarre sur http://localhost:{port}")
    logging.info(f"  POST /trigger  -> lancer Auto Swiper")
    logging.info(f"  GET  /status   -> scores + etat session")
    logging.info("Ctrl+C pour arreter")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info("Serveur arrete")
        server.server_close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--history":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        show_history(count)
    elif len(sys.argv) > 1 and sys.argv[1] == "--now":
        config = load_config()
        setup_logging(config.get("log_file", "scripts/auto_trigger.log"))
        trigger_now()
    elif len(sys.argv) > 1 and sys.argv[1] == "--server":
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 5555
        run_server(port)
    else:
        main()
