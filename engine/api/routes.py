"""
FastAPI REST API for DatePulse.

Endpoints:
    GET /api/score/live       — Current activity score
    GET /api/score/forecast   — 7-day hourly predictions
    GET /api/score/history    — Historical scores
    GET /api/score/best-times — Best time slots from history
    GET /api/apps             — Available apps list
    GET /api/health           — System health check
"""

import json
import logging
import os
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from engine.config import CITIES, TARGET_APPS, TARGET_CITIES
from engine.storage import db

# Simple admin key — defaults to "datepulse" if not set
ADMIN_KEY = os.getenv("ADMIN_KEY", "datepulse")

# Track background pipeline state
_pipeline_status: dict = {"running": False, "last_run": None, "last_result": None}

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    logger.info("DatePulse API started")
    yield


app = FastAPI(
    title="DatePulse API",
    description="Real-time dating app activity scores for French cities",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        "https://frontend-sigma-gules-59.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------
# GET /api/score/live
# -----------------------------------------------------------------------
@app.get("/api/score/live")
async def score_live(
    app_name: str = Query("tinder", alias="app", description="App name"),
    city: str = Query("paris", description="City slug"),
):
    """
    Get the current live activity score for an app + city.

    Returns score (0-100), percentile, trend, and component breakdown.
    """
    score = db.get_latest_score(app_name, city)

    if score is None:
        # Try with france as city (Google Trends data is national)
        score = db.get_latest_score(app_name, "france")

    if score is None:
        return {
            "score": None,
            "message": f"No score available for {app_name}/{city}",
        }

    components = json.loads(score["components"]) if score.get("components") else {}

    return {
        "app": app_name,
        "city": city,
        "score": score["score"],
        "percentile": score["percentile"],
        "trend": score["trend"],
        "components": components,
        "updated_at": score["computed_at"],
    }


# -----------------------------------------------------------------------
# GET /api/score/forecast
# -----------------------------------------------------------------------
@app.get("/api/score/forecast")
async def score_forecast(
    app_name: str = Query("tinder", alias="app", description="App name"),
    city: str = Query("paris", description="City slug"),
    days: int = Query(7, ge=1, le=14, description="Number of days"),
):
    """Get hourly forecast for the next N days."""
    forecasts = db.get_forecasts(app_name, city, days=days)

    if not forecasts:
        return {
            "app": app_name,
            "city": city,
            "forecast": [],
            "message": "No forecast data available",
        }

    items = []
    for f in forecasts:
        components = json.loads(f["components"]) if f.get("components") else {}
        items.append({
            "date": f["forecast_date"],
            "hour": f["forecast_hour"],
            "predicted_score": f["predicted_score"],
            "confidence": f["confidence"],
            "components": components,
        })

    return {
        "app": app_name,
        "city": city,
        "days": days,
        "forecast": items,
    }


# -----------------------------------------------------------------------
# GET /api/score/history
# -----------------------------------------------------------------------
@app.get("/api/score/history")
async def score_history(
    app_name: str = Query("tinder", alias="app", description="App name"),
    city: str = Query("paris", description="City slug"),
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
):
    """Get historical scores for the specified period."""
    limit_map = {"7d": 168, "30d": 720, "90d": 2160}
    limit = limit_map.get(period, 720)

    history = db.get_scores_history(app_name, city, limit=limit)

    if not history:
        # Fall back to raw Google Trends signals as history proxy
        return _raw_signal_history(app_name, city, period)

    items = []
    for h in history:
        items.append({
            "date": h["computed_at"],
            "score": h["score"],
            "percentile": h.get("percentile"),
            "trend": h.get("trend"),
        })

    return {
        "app": app_name,
        "city": city,
        "period": period,
        "history": items,
    }


def _raw_signal_history(app_name: str, city: str, period: str) -> dict:
    """
    Build history from raw signals when score history is sparse.
    Uses Google Trends weekly data as a proxy.
    """
    limit_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    limit = limit_map.get(period, 30)

    # Try weekly GT data
    signals = db.get_signals(
        source="google_trends",
        app_name=app_name,
        metric_type="interest_weekly",
        limit=limit * 4,
    )

    items = []
    for s in reversed(signals):  # oldest first
        items.append({
            "date": s["collected_at"],
            "score": s["value"],
            "percentile": None,
            "trend": None,
        })

    return {
        "app": app_name,
        "city": city,
        "period": period,
        "source": "google_trends_proxy",
        "history": items,
    }


# -----------------------------------------------------------------------
# GET /api/score/best-times
# -----------------------------------------------------------------------
@app.get("/api/score/best-times")
async def score_best_times(
    app_name: str = Query("tinder", alias="app", description="App name"),
    city: str = Query("paris", description="City slug"),
):
    """
    Get the best time slots based on historical and forecast data.

    Returns the top 10 day+hour combinations ranked by average score.
    """
    forecasts = db.get_forecasts(app_name, city, days=7)

    if not forecasts:
        return {
            "app": app_name,
            "city": city,
            "best_times": [],
            "message": "No forecast data available",
        }

    # Group by day-of-week + hour
    day_names_fr = {
        0: "lundi", 1: "mardi", 2: "mercredi", 3: "jeudi",
        4: "vendredi", 5: "samedi", 6: "dimanche",
    }

    slot_scores: dict[str, list[float]] = {}
    for f in forecasts:
        try:
            dt = datetime.strptime(f["forecast_date"], "%Y-%m-%d")
            day_name = day_names_fr[dt.weekday()]
            hour = f["forecast_hour"]
            key = f"{day_name}|{hour}"

            if key not in slot_scores:
                slot_scores[key] = []
            slot_scores[key].append(f["predicted_score"])
        except (ValueError, KeyError):
            continue

    # Average and sort
    ranked = []
    for key, scores in slot_scores.items():
        day, hour = key.split("|")
        avg = sum(scores) / len(scores)
        ranked.append({
            "day": day,
            "hour": f"{int(hour):02d}h",
            "hour_int": int(hour),
            "avg_score": round(avg, 1),
        })

    ranked.sort(key=lambda x: x["avg_score"], reverse=True)

    return {
        "app": app_name,
        "city": city,
        "best_times": ranked[:10],
    }


# -----------------------------------------------------------------------
# GET /api/score/calendar
# -----------------------------------------------------------------------
@app.get("/api/score/calendar")
async def score_calendar(
    app_name: str = Query("tinder", alias="app", description="App name"),
    months: int = Query(12, ge=1, le=24, description="Number of months"),
):
    """
    Get daily activity scores for the last N months (calendar view).

    Returns both a combined weighted calendar and independent per-source
    calendars so each signal's contribution can be evaluated separately.
    """
    from engine.processor.calendar_scorer import compute_calendar_scores_per_source

    result = compute_calendar_scores_per_source(app_name, months)

    combined = result["combined"]
    scores = [d["score"] for d in combined]
    avg_score = sum(scores) / len(scores) if scores else 0

    sorted_days = sorted(combined, key=lambda d: d["score"], reverse=True)

    return {
        "app": app_name,
        "months": months,
        "total_days": len(combined),
        "avg_score": round(avg_score, 1),
        "top_days": sorted_days[:10],
        "worst_days": sorted_days[-10:][::-1],
        "calendar": combined,
        "calendars": result["sources"],
        "available_sources": result["available_sources"],
    }


# -----------------------------------------------------------------------
# POST /api/admin/collect — trigger pipeline on the server
# -----------------------------------------------------------------------
def _run_pipeline_background():
    """Run the full pipeline in a background thread."""
    _pipeline_status["running"] = True
    _pipeline_status["last_run"] = datetime.now(timezone.utc).isoformat()
    try:
        from engine.main import run_all, run_scoring, run_forecasting

        collect_results = run_all()
        score_count = run_scoring()
        forecast_count = run_forecasting()

        _pipeline_status["last_result"] = {
            "collection": {
                k: v if isinstance(v, int) else str(v)
                for k, v in collect_results.items()
            },
            "scores": score_count,
            "forecasts": forecast_count,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        _pipeline_status["last_result"] = {"error": str(exc)}
    finally:
        _pipeline_status["running"] = False


@app.post("/api/admin/collect")
async def admin_collect(x_admin_key: Optional[str] = Header(None)):
    """Trigger the full data collection pipeline in the background."""
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    if _pipeline_status["running"]:
        return {"status": "already_running", "started_at": _pipeline_status["last_run"]}

    thread = threading.Thread(target=_run_pipeline_background, daemon=True)
    thread.start()

    return {"status": "started", "message": "Pipeline running in background"}


@app.get("/api/admin/status")
async def admin_status(x_admin_key: Optional[str] = Header(None)):
    """Check pipeline execution status."""
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    return _pipeline_status


# -----------------------------------------------------------------------
# GET /api/apps
# -----------------------------------------------------------------------
@app.get("/api/apps")
async def get_apps():
    """List available dating apps and cities."""
    return {
        "apps": TARGET_APPS,
        "cities": [
            {"id": city_id, **CITIES[city_id]}
            for city_id in TARGET_CITIES
            if city_id in CITIES
        ],
    }


# -----------------------------------------------------------------------
# GET /api/health
# -----------------------------------------------------------------------
@app.get("/api/health")
async def health():
    """System health check with source status."""
    sources_status = {}
    sources = ["google_trends", "wikipedia", "bluesky", "app_reviews", "weather", "events"]

    for source in sources:
        count = db.count_signals(source=source)
        signals = db.get_signals(source=source, limit=1)
        last_collected = signals[0]["collected_at"] if signals else None
        sources_status[source] = {
            "total_signals": count,
            "last_collected": last_collected,
            "status": "active" if count > 0 else "no_data",
        }

    # Total counts
    total_signals = db.count_signals()
    total_scores = 0
    with db.get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) as cnt FROM scores").fetchone()
        total_scores = row["cnt"]
        row = conn.execute("SELECT COUNT(*) as cnt FROM forecasts").fetchone()
        total_forecasts = row["cnt"]

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "total_signals": total_signals,
            "total_scores": total_scores,
            "total_forecasts": total_forecasts,
        },
        "sources": sources_status,
    }
