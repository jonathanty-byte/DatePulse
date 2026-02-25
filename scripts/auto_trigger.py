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
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

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


AUTOMATION_PROFILE_DIR = os.path.join(
    os.environ.get("USERPROFILE", ""), ".datepulse", "chrome-profile"
)


def get_extension_path(config: dict) -> str | None:
    """Find the Auto Swiper extension directory on disk."""
    ext_id = config.get("auto_swiper_extension_id", "")
    if not ext_id:
        return None

    # Look in the user's default Chrome profile
    default_data_dir = os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "Google", "Chrome", "User Data"
    )
    profile = config.get("chrome_profile", "Default")
    ext_base = os.path.join(default_data_dir, profile, "Extensions", ext_id)

    if not os.path.isdir(ext_base):
        return None

    versions = sorted(os.listdir(ext_base))
    return os.path.join(ext_base, versions[-1]) if versions else None


def is_profile_setup() -> bool:
    """Check if the automation Chrome profile has been initialized."""
    return os.path.isdir(AUTOMATION_PROFILE_DIR) and \
        os.path.exists(os.path.join(AUTOMATION_PROFILE_DIR, "Default", "Preferences"))


def launch_chrome(config: dict) -> webdriver.Chrome | None:
    """Launch Chrome with Selenium using a dedicated automation profile.

    Uses a separate profile dir (~/.datepulse/chrome-profile/) so it doesn't
    conflict with the user's regular Chrome. The Auto Swiper extension is
    loaded from the user's regular Chrome installation.

    First run: user must log in to Tinder/Bumble. After that, cookies are saved.
    """
    chrome_path = config.get("chrome_path", "")
    debug_port = 9222

    # Load Auto Swiper from the user's Chrome installation
    ext_path = get_extension_path(config)

    # Launch Chrome via subprocess with remote debugging + automation profile
    os.makedirs(AUTOMATION_PROFILE_DIR, exist_ok=True)
    chrome_args = [
        chrome_path,
        f"--remote-debugging-port={debug_port}",
        f"--user-data-dir={AUTOMATION_PROFILE_DIR}",
    ]
    if ext_path:
        chrome_args.append(f"--load-extension={ext_path}")
        logging.info(f"Extension Auto Swiper chargee: {ext_path}")

    try:
        proc = subprocess.Popen(chrome_args)
        logging.info(f"Chrome lance (PID: {proc.pid}, debug port: {debug_port})")
        time.sleep(5)
    except (FileNotFoundError, OSError) as e:
        logging.error(f"Chrome introuvable: {e}")
        return None

    # Connect Selenium to the running Chrome
    options = Options()
    options.add_experimental_option("debuggerAddress", f"127.0.0.1:{debug_port}")

    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        logging.info("Selenium connecte a Chrome")
        return driver
    except Exception as e:
        logging.error(f"Erreur connexion Selenium: {e}")
        try:
            proc.kill()
        except Exception:
            pass
        return None



def start_auto_swiper(driver: webdriver.Chrome, ext_id: str, app: str) -> None:
    """Open Auto Swiper popup and click the Start button."""
    logging.info(f"Ouverture popup Auto Swiper pour {app}...")

    popup_url = f"chrome-extension://{ext_id}/popup/popup.html"

    # Remember the current app tab
    app_tab = driver.current_window_handle

    # Open a new blank tab, then navigate to the extension popup
    driver.switch_to.new_window("tab")
    time.sleep(1)
    driver.get(popup_url)
    time.sleep(5)  # Wait for Vue app to mount

    try:
        # Debug: log the page source and all buttons found
        buttons = driver.find_elements(By.TAG_NAME, "button")
        logging.info(f"Popup: {len(buttons)} bouton(s) trouves")
        for i, btn in enumerate(buttons):
            btn_text = btn.text.strip()[:50]
            btn_class = btn.get_attribute("class") or ""
            logging.info(f"  bouton[{i}]: '{btn_text}' class='{btn_class[:80]}'")

        # Strategy 1: Find button by text content
        clicked = False
        for btn in buttons:
            text = btn.text.strip().lower()
            if any(kw in text for kw in ["start", "play", "run", "go", "swipe", "begin"]):
                btn.click()
                logging.info(f"Auto Swiper demarre! (bouton: '{btn.text.strip()}')")
                clicked = True
                break

        # Strategy 2: Click the first prominent button (primary/success type)
        if not clicked:
            for selector in ["button.n-button--primary-type", "button.n-button--success-type",
                             "button.n-button--info-type", "button.n-button"]:
                try:
                    btn = driver.find_element(By.CSS_SELECTOR, selector)
                    if btn.is_displayed() and btn.is_enabled():
                        btn.click()
                        logging.info(f"Auto Swiper demarre! (selector: '{selector}')")
                        clicked = True
                        break
                except Exception:
                    continue

        if not clicked:
            logging.warning("Bouton Start Auto Swiper non trouve dans le popup")

    except Exception as e:
        logging.error(f"Erreur activation Auto Swiper: {e}")
    finally:
        # Close popup tab, go back to app tab
        time.sleep(1)
        try:
            driver.close()
            driver.switch_to.window(app_tab)
        except Exception:
            pass


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

    # Launch Chrome via Selenium and start Auto Swiper
    duration = config.get("session_duration_minutes", 30)
    urls = [config["app_urls"][app] for app in triggered_apps]
    ext_id = config.get("auto_swiper_extension_id", "")

    logging.info(f"PEAK DETECTED! Lancement de {', '.join(triggered_apps)} pour {duration}min")

    driver = launch_chrome(config)
    if not driver:
        return

    try:
        # Navigate to first app
        driver.get(urls[0])
        logging.info(f"Onglet 1: {urls[0]}")
        time.sleep(3)

        # Open additional apps in new tabs
        for url in urls[1:]:
            driver.execute_script(f"window.open('{url}', '_blank');")
            logging.info(f"Onglet +: {url}")
            time.sleep(2)

        # Start Auto Swiper on each tab
        if ext_id:
            app_tabs = list(driver.window_handles)
            for i, handle in enumerate(app_tabs):
                driver.switch_to.window(handle)
                time.sleep(1)
                start_auto_swiper(driver, ext_id, triggered_apps[i] if i < len(triggered_apps) else "")
        else:
            logging.warning("Extension Auto Swiper non detectee, swipe manuel requis")

        # Log session to history
        log_session(triggered_apps, {a: all_scores[a] for a in triggered_apps}, duration)

        # Write lockfile to prevent duplicate sessions
        write_lockfile(duration)

        # Wait for the session duration
        logging.info(f"Attente de {duration} minutes...")
        time.sleep(duration * 60)

        logging.info("Session terminee")
    except Exception as e:
        logging.error(f"Erreur durant la session: {e}")
    finally:
        try:
            driver.quit()
        except Exception:
            pass
        remove_lockfile()


def setup_profile() -> None:
    """Interactive setup: launch Chrome with automation profile so user can log in."""
    config = load_config()
    print("\n" + "=" * 60)
    print("  DatePulse Auto Trigger — Configuration initiale")
    print("=" * 60)
    print()
    print("Un Chrome va s'ouvrir avec un profil dedie a l'automatisation.")
    print("Tu dois te connecter a tes comptes une seule fois :")
    print()

    apps = config.get("apps", ["tinder"])
    if isinstance(apps, str):
        apps = [apps]
    for app in apps:
        url = config["app_urls"].get(app, "")
        print(f"  - {app.capitalize()}: {url}")

    print()
    print("Etapes :")
    print("  1. Connecte-toi a chaque app dans le Chrome qui va s'ouvrir")
    print("  2. Verifie qu'Auto Swiper fonctionne manuellement (clic sur play)")
    print("  3. Ferme Chrome quand tu as fini")
    print()
    input("Appuie sur Entree pour lancer Chrome...")

    driver = launch_chrome(config)
    if not driver:
        print("Erreur: Chrome n'a pas pu demarrer.")
        return

    # Open all app URLs
    urls = [config["app_urls"][app] for app in apps]
    driver.get(urls[0])
    for url in urls[1:]:
        driver.execute_script(f"window.open('{url}', '_blank');")
        time.sleep(1)

    print()
    print("Chrome est ouvert. Connecte-toi a tes comptes.")
    print("Quand c'est fait, ferme Chrome ou appuie sur Entree ici.")
    input()

    try:
        driver.quit()
    except Exception:
        pass

    print()
    print("Setup termine ! Le profil est sauvegarde dans :")
    print(f"  {AUTOMATION_PROFILE_DIR}")
    print()
    print("Tu peux maintenant lancer : python auto_trigger.py")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--history":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        show_history(count)
    elif len(sys.argv) > 1 and sys.argv[1] == "--setup":
        setup_profile()
    else:
        main()
