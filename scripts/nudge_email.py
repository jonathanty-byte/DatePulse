"""
Smart Nudge Email — Daily notification at 20h45 with tonight's optimal window.

Cron: Task Scheduler daily at 20:45
Requires: Beehiiv API key in BEEHIIV_API_KEY env var (or --dry-run without it).

Usage:
    python scripts/nudge_email.py             # Send nudge email via Beehiiv
    python scripts/nudge_email.py --dry-run   # Print nudge content without sending
"""

import argparse
import io
import json
import os
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Fix Windows console encoding for emojis
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Add scripts dir to path for scoring_engine import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scoring_engine import compute_score, get_score_label, get_next_peak, APPS, PARIS_TZ

# ── Config ───────────────────────────────────────────────────────

BEEHIIV_API_URL = "https://api.beehiiv.com/v2"
PUBLICATION_ID = os.environ.get("BEEHIIV_PUB_ID", "")
APP_URL = "https://frontend-sigma-gules-59.vercel.app"

# ── Nudge content generation ─────────────────────────────────────

def generate_nudge() -> dict:
    """Generate the nudge email content for tonight."""
    now = datetime.now(PARIS_TZ)

    # Score at 21h tonight (the prime time)
    tonight_21h = now.replace(hour=21, minute=0, second=0, microsecond=0)
    if now.hour >= 22:
        # Too late for tonight, target tomorrow
        tonight_21h += timedelta(days=1)

    # Compute scores for all apps at 21h
    app_scores = {}
    for app in APPS:
        result = compute_score(tonight_21h, app)
        label = get_score_label(result["score"])
        app_scores[app] = {
            "score": result["score"],
            "label": label["label"],
            "event": result["event"],
            "event_multiplier": result["event_multiplier"],
        }

    # Find the best app tonight
    best_app = max(app_scores, key=lambda a: app_scores[a]["score"])
    best_score = app_scores[best_app]["score"]
    best_label = app_scores[best_app]["label"]

    # Find next peak for best app
    peak = get_next_peak(now, best_app, 70)

    # Build subject line
    if best_score >= 76:
        subject = f"Ce soir c'est le moment — {best_app.capitalize()} a {best_score}/100"
        emoji = "🟢"
    elif best_score >= 56:
        subject = f"Bon creneau ce soir — {best_app.capitalize()} a {best_score}/100"
        emoji = "🟢"
    elif best_score >= 36:
        subject = f"Soiree moyenne — {best_score}/100 sur {best_app.capitalize()}"
        emoji = "🟡"
    else:
        subject = f"Red Light ce soir — evite les apps ({best_score}/100)"
        emoji = "🔴"

    # Event info
    event_info = ""
    if app_scores[best_app]["event"]:
        evt = app_scores[best_app]["event"]
        mult = app_scores[best_app]["event_multiplier"]
        if mult > 1:
            event_info = f"\n\n📅 Evenement actif : {evt} (+{round((mult-1)*100)}% d'activite)"
        else:
            event_info = f"\n\n📅 Evenement actif : {evt} ({round((mult-1)*100)}% d'activite)"

    # Peak window info
    peak_info = ""
    if peak:
        peak_time = peak["date"].strftime("%Hh")
        peak_day = peak["date"].strftime("%A")
        peak_info = f"\n\n⏰ Prochaine fenetre optimale : {peak_day} a {peak_time} (score {peak['score']}/100)"

    # All apps summary
    apps_summary = "\n".join(
        f"  {'🟢' if s['score'] >= 56 else '🟡' if s['score'] >= 36 else '🔴'} "
        f"{app.capitalize():8s} : {s['score']}/100 ({s['label']})"
        for app, s in app_scores.items()
    )

    # Build body
    body_text = f"""{emoji} Score ce soir a 21h : {best_score}/100 sur {best_app.capitalize()}

{apps_summary}{event_info}{peak_info}

{'👉 Ouvre DateDetox et lance une session de 15 min' if best_score >= 36 else '🛑 Pas la peine de swiper ce soir. Fais autre chose.'}

{APP_URL}

---
DateDetox — Swipe less. Match more.
"""

    # HTML version
    body_html = f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #030712; color: #f3f4f6; border-radius: 16px;">
  <h1 style="font-size: 24px; background: linear-gradient(to right, #f472b6, #db2777); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0 0 8px;">
    DateDetox
  </h1>
  <p style="color: #9ca3af; font-size: 14px; margin: 0 0 24px;">Ton nudge du soir</p>

  <div style="background: {'#052e16' if best_score >= 56 else '#422006' if best_score >= 36 else '#450a0a'}; border: 1px solid {'#16a34a33' if best_score >= 56 else '#f59e0b33' if best_score >= 36 else '#dc262633'}; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
    <p style="font-size: 48px; font-weight: 800; margin: 0; color: {'#22c55e' if best_score >= 56 else '#f59e0b' if best_score >= 36 else '#dc2626'};">
      {best_score}/100
    </p>
    <p style="color: #9ca3af; font-size: 14px; margin: 8px 0 0;">
      {best_app.capitalize()} — ce soir a 21h
    </p>
  </div>

  <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
    {''.join(f'<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);"><span style="color: #9ca3af;">{app.capitalize()}</span><span style="color: {"#22c55e" if s["score"] >= 56 else "#f59e0b" if s["score"] >= 36 else "#dc2626"}; font-weight: 600;">{s["score"]}/100</span></div>' for app, s in app_scores.items())}
  </div>

  {f'<p style="color: #9ca3af; font-size: 14px;">{event_info.strip()}</p>' if event_info else ''}
  {f'<p style="color: #9ca3af; font-size: 14px;">{peak_info.strip()}</p>' if peak_info else ''}

  <a href="{APP_URL}" style="display: block; text-align: center; background: linear-gradient(to right, #db2777, #059669); color: white; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin-top: 24px;">
    {'Ouvrir DateDetox' if best_score >= 36 else 'Voir le score en direct'}
  </a>

  <p style="color: #4b5563; font-size: 12px; text-align: center; margin-top: 24px;">
    DateDetox — Swipe less. Match more.
  </p>
</div>
"""

    return {
        "subject": subject,
        "body_text": body_text,
        "body_html": body_html,
        "best_app": best_app,
        "best_score": best_score,
        "app_scores": app_scores,
    }


# ── Beehiiv API ──────────────────────────────────────────────────

def send_via_beehiiv(nudge: dict) -> bool:
    """Send the nudge email via Beehiiv API."""
    import urllib.request

    api_key = os.environ.get("BEEHIIV_API_KEY")
    if not api_key:
        print("ERROR: BEEHIIV_API_KEY env var not set. Use --dry-run to preview.")
        return False

    if not PUBLICATION_ID:
        print("ERROR: BEEHIIV_PUB_ID env var not set.")
        return False

    # Create a post (email broadcast)
    payload = {
        "title": nudge["subject"],
        "subtitle": f"Score du soir : {nudge['best_score']}/100 sur {nudge['best_app'].capitalize()}",
        "content": [
            {
                "type": "html",
                "html": nudge["body_html"],
            }
        ],
        "status": "confirmed",  # Auto-send
    }

    url = f"{BEEHIIV_API_URL}/publications/{PUBLICATION_ID}/posts"
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status in (200, 201):
                print(f"OK: Nudge email sent via Beehiiv (status {resp.status})")
                return True
            else:
                print(f"ERROR: Beehiiv returned status {resp.status}")
                return False
    except Exception as e:
        print(f"ERROR: Failed to send via Beehiiv: {e}")
        return False


# ── Main ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="DateDetox Smart Nudge Email")
    parser.add_argument("--dry-run", action="store_true", help="Print nudge content without sending")
    args = parser.parse_args()

    nudge = generate_nudge()

    print(f"Subject: {nudge['subject']}")
    print(f"Best app: {nudge['best_app']} ({nudge['best_score']}/100)")
    print()

    if args.dry_run:
        print("--- TEXT VERSION ---")
        print(nudge["body_text"])
        print("--- DRY RUN: email not sent ---")
    else:
        success = send_via_beehiiv(nudge)
        if not success:
            sys.exit(1)


if __name__ == "__main__":
    main()
