"""
Telegram bot for DatePulse alerts.

Commands:
    /start    - Register + welcome
    /now      - Current live score
    /settings - Change city / apps
    /forecast - Best slots next 48h
    /stats    - Weekly summary

Alert logic:
    - Score > P85 -> "Bon moment" notification
    - Score > P95 -> "Moment exceptionnel" notification
    - Max 3 alerts/day, quiet hours 23h-8h, cooldown between alerts
"""

import asyncio
import logging
from datetime import datetime, timezone

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
)

from engine.config import (
    ALERT_COOLDOWN_MINUTES,
    CITIES,
    DEFAULT_CITY,
    TARGET_APPS,
    TARGET_CITIES,
    TELEGRAM_BOT_TOKEN,
)
from engine.storage import db

logger = logging.getLogger(__name__)

MAX_ALERTS_PER_DAY = 3
QUIET_HOUR_START = 23
QUIET_HOUR_END = 8


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Register a new user and send welcome message."""
    chat_id = update.effective_chat.id
    username = update.effective_user.username if update.effective_user else None

    is_new = db.upsert_telegram_user(chat_id, username=username)

    if is_new:
        text = (
            "Bienvenue sur DatePulse !\n\n"
            "Je t'envoie des alertes quand l'activite des apps "
            "de dating est au-dessus de la moyenne.\n\n"
            "Commandes :\n"
            "/now - Score en temps reel\n"
            "/forecast - Meilleurs creneaux a venir\n"
            "/settings - Changer ville / apps\n"
            "/stats - Resume de la semaine\n\n"
            f"Config par defaut : Paris, toutes les apps."
        )
    else:
        text = "Content de te revoir ! Utilise /now pour le score actuel."

    await update.message.reply_text(text)


async def cmd_now(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show current live scores for user's configured apps."""
    chat_id = update.effective_chat.id
    user = db.get_telegram_user(chat_id)

    if not user:
        await update.message.reply_text("Utilise /start d'abord !")
        return

    city = user["city"]
    apps = user["apps"].split(",")
    city_display = CITIES.get(city, {}).get("display_name", city.capitalize())

    lines = [f"Score en direct - {city_display}\n"]

    for app in apps:
        app = app.strip()
        score_data = db.get_latest_score(app, city)

        if score_data is None:
            # Try national data
            score_data = db.get_latest_score(app, "france")

        if score_data:
            score = score_data["score"]
            pct = score_data.get("percentile", 0)
            trend = score_data.get("trend", "stable")

            trend_icon = {"rising": "/\\", "falling": "\\/", "stable": "="}
            icon = trend_icon.get(trend, "=")

            level = _score_label(score)
            lines.append(
                f"  {app.capitalize()} : {score:.0f}/100 "
                f"({level}) {icon} P{pct:.0f}"
            )
        else:
            lines.append(f"  {app.capitalize()} : pas de donnees")

    await update.message.reply_text("\n".join(lines))


async def cmd_settings(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show and update user settings."""
    chat_id = update.effective_chat.id
    user = db.get_telegram_user(chat_id)

    if not user:
        await update.message.reply_text("Utilise /start d'abord !")
        return

    args = context.args or []

    if len(args) >= 1:
        # Parse: /settings paris or /settings lyon tinder,bumble
        new_city = args[0].lower()
        if new_city in TARGET_CITIES:
            new_apps = args[1] if len(args) > 1 else None
            db.update_telegram_user_settings(chat_id, city=new_city, apps=new_apps)
            city_display = CITIES.get(new_city, {}).get("display_name", new_city)
            text = f"Parametres mis a jour !\nVille : {city_display}"
            if new_apps:
                text += f"\nApps : {new_apps}"
            await update.message.reply_text(text)
            return
        else:
            cities_list = ", ".join(TARGET_CITIES)
            await update.message.reply_text(
                f"Ville inconnue. Villes disponibles : {cities_list}"
            )
            return

    # Show current settings
    city_display = CITIES.get(user["city"], {}).get("display_name", user["city"])
    text = (
        "Parametres actuels :\n"
        f"  Ville : {city_display}\n"
        f"  Apps : {user['apps']}\n\n"
        "Pour modifier :\n"
        "  /settings lyon\n"
        "  /settings paris tinder,bumble"
    )
    await update.message.reply_text(text)


async def cmd_forecast(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show the top 5 forecast slots for next 48h."""
    chat_id = update.effective_chat.id
    user = db.get_telegram_user(chat_id)

    if not user:
        await update.message.reply_text("Utilise /start d'abord !")
        return

    city = user["city"]
    apps = [a.strip() for a in user["apps"].split(",")]
    city_display = CITIES.get(city, {}).get("display_name", city.capitalize())

    lines = [f"Meilleurs creneaux 48h - {city_display}\n"]

    for app in apps[:2]:  # limit to first 2 apps to avoid long messages
        forecasts = db.get_forecasts(app, city, days=2)
        if not forecasts:
            lines.append(f"  {app.capitalize()} : pas de previsions")
            continue

        # Sort by predicted_score and take top 5
        sorted_f = sorted(forecasts, key=lambda f: f["predicted_score"], reverse=True)
        top5 = sorted_f[:5]

        lines.append(f"  {app.capitalize()} :")
        for f in top5:
            day_name = _day_name_fr(f["forecast_date"])
            lines.append(
                f"    {day_name} {f['forecast_hour']:02d}h "
                f"- {f['predicted_score']:.0f}/100"
            )

    await update.message.reply_text("\n".join(lines))


async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show weekly summary stats."""
    chat_id = update.effective_chat.id
    user = db.get_telegram_user(chat_id)

    if not user:
        await update.message.reply_text("Utilise /start d'abord !")
        return

    city = user["city"]
    apps = [a.strip() for a in user["apps"].split(",")]
    city_display = CITIES.get(city, {}).get("display_name", city.capitalize())

    lines = [f"Resume semaine - {city_display}\n"]

    for app in apps:
        history = db.get_scores_history(app, city, limit=168)  # 7 days of hourly

        if not history:
            lines.append(f"  {app.capitalize()} : pas de donnees")
            continue

        scores = [h["score"] for h in history]
        avg = sum(scores) / len(scores)
        peak = max(scores)
        low = min(scores)

        # Find best slot
        best = max(history, key=lambda h: h["score"])

        lines.append(
            f"  {app.capitalize()} :\n"
            f"    Moyenne : {avg:.0f}/100\n"
            f"    Pic : {peak:.0f} | Creux : {low:.0f}\n"
            f"    Meilleur : {best['computed_at'][:16]}"
        )

    # Total user count
    user_count = db.count_telegram_users()
    lines.append(f"\nUtilisateurs DatePulse : {user_count}")

    await update.message.reply_text("\n".join(lines))


# ---------------------------------------------------------------------------
# Alert system
# ---------------------------------------------------------------------------

async def check_and_send_alerts(application: Application) -> None:
    """
    Check all active users for alert-worthy scores.

    Called periodically by the scheduler.
    """
    now = datetime.now(timezone.utc)
    current_hour = now.hour

    # Quiet hours check (23h-8h)
    if current_hour >= QUIET_HOUR_START or current_hour < QUIET_HOUR_END:
        logger.debug("Quiet hours (%d-%d), skipping alerts", QUIET_HOUR_START, QUIET_HOUR_END)
        return

    users = db.get_active_telegram_users()
    if not users:
        return

    logger.info("Checking alerts for %d users", len(users))

    for user in users:
        chat_id = user["chat_id"]
        city = user["city"]
        apps = [a.strip() for a in user["apps"].split(",")]

        # Max alerts per day
        alerts_today = db.count_alerts_today(chat_id)
        if alerts_today >= MAX_ALERTS_PER_DAY:
            continue

        for app in apps:
            score_data = db.get_latest_score(app, city)
            if not score_data:
                score_data = db.get_latest_score(app, "france")
            if not score_data:
                continue

            score = score_data["score"]
            percentile = score_data.get("percentile", 0)

            # Cooldown check
            last_alert = db.get_last_alert_time(chat_id, app)
            if last_alert:
                try:
                    last_dt = datetime.strptime(last_alert, "%Y-%m-%d %H:%M:%S")
                    elapsed = (now - last_dt.replace(tzinfo=timezone.utc)).total_seconds() / 60
                    if elapsed < ALERT_COOLDOWN_MINUTES:
                        continue
                except ValueError:
                    pass

            # Determine alert type
            alert_type = None
            if percentile >= 95:
                alert_type = "exceptional"
            elif percentile >= 85:
                alert_type = "good"

            if alert_type is None:
                continue

            # Build and send message
            msg = _build_alert_message(app, city, score, percentile, alert_type)

            try:
                await application.bot.send_message(chat_id=chat_id, text=msg)
                db.insert_alert_log(chat_id, app, city, score, alert_type)
                logger.info(
                    "Alert sent: %s %s/%s score=%.0f P%.0f to chat=%d",
                    alert_type, app, city, score, percentile, chat_id,
                )
            except Exception as exc:
                logger.error("Failed to send alert to %d: %s", chat_id, exc)


def _build_alert_message(
    app: str, city: str, score: float, percentile: float, alert_type: str
) -> str:
    """Format an alert message."""
    city_display = CITIES.get(city, {}).get("display_name", city.capitalize())
    app_cap = app.capitalize()

    if alert_type == "exceptional":
        header = f"!! Activite {app_cap} exceptionnelle a {city_display}"
        footer = "C'est le moment ideal, fonce !"
    else:
        header = f"Activite {app_cap} elevee a {city_display}"
        footer = "Les 2 prochaines heures sont favorables."

    return (
        f"{header}\n"
        f"Score : {score:.0f}/100 (top {100 - percentile:.0f}% historique)\n"
        f"{footer}\n\n"
        f"/now pour voir tous les scores"
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _score_label(score: float) -> str:
    if score >= 80:
        return "En feu"
    if score >= 60:
        return "Actif"
    if score >= 40:
        return "Moyen"
    return "Calme"


def _day_name_fr(date_str: str) -> str:
    """Convert YYYY-MM-DD to French day name."""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        names = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
        return names[dt.weekday()]
    except ValueError:
        return date_str


# ---------------------------------------------------------------------------
# Bot runner
# ---------------------------------------------------------------------------

def run_bot() -> None:
    """Start the Telegram bot with polling."""
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set, cannot start bot")
        return

    logger.info("Starting DatePulse Telegram bot")

    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Register command handlers
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("now", cmd_now))
    application.add_handler(CommandHandler("settings", cmd_settings))
    application.add_handler(CommandHandler("forecast", cmd_forecast))
    application.add_handler(CommandHandler("stats", cmd_stats))

    # Start polling
    application.run_polling(allowed_updates=Update.ALL_TYPES)


async def run_alert_check() -> None:
    """Run a single alert check cycle (for cron usage)."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set, skipping alert check")
        return

    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    await application.initialize()
    await check_and_send_alerts(application)
    await application.shutdown()


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent))

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    db.init_db()
    run_bot()
