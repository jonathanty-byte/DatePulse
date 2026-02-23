# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DatePulse is a data intelligence tool that aggregates public signals to produce real-time activity scores (0-100) for dating apps (Tinder, Bumble, Hinge, Happn) in French cities. It predicts optimal times to use dating apps by combining Google Trends, Wikipedia Pageviews, Bluesky mentions, App Store reviews, weather, and calendar events.

**Current state**: MVP complete. All 5 days of the sprint implemented. Pipeline operational, frontend deployed, Telegram bot functional.

## Architecture

```
Sources (6 free APIs) -> Data Engine (Python) -> SQLite -> FastAPI REST API -> React Frontend
                                                       \-> Telegram Bot (alerts)
```

**Two separate stacks**:
- **Backend (`engine/`)**: Python 3.11+ — data collection, scoring model, FastAPI API, Telegram bot
- **Frontend (`frontend/`)**: React 18 + TypeScript + Vite + Tailwind CSS — dashboard and landing page

**Database**: SQLite at `data/datepulse.db` (5 tables: `raw_signals`, `scores`, `forecasts`, `telegram_users`, `alerts_log`)

## Commands

### Python Engine
```bash
pip install -r engine/requirements.txt
python -m engine.main                  # Full pipeline: collect -> score -> forecast -> alert
python -m engine.main --collect-only   # Only collect data
python -m engine.main --score-only     # Only compute scores
python -m engine.main --dry-run        # Test run
uvicorn engine.api.routes:app --reload # Start API server (port 8000)
python -m engine.alerts.telegram_bot   # Start Telegram bot
```

### Frontend
```bash
cd frontend && npm install
npm run dev      # Vite dev server (port 5173, proxies /api to :8000)
npm run build    # Production build -> dist/
```

### Tests
```bash
pip install pytest
pytest tests/ -v              # All tests
pytest tests/ -v -k "TestAPI" # Just API tests
```

### Data utilities
```bash
python scripts/seed_historical.py      # Backfill 2 years of historical data
python scripts/calibrate_weights.py    # Optimize scoring model weights
sqlite3 data/datepulse.db "SELECT source, COUNT(*) FROM raw_signals GROUP BY source;"
```

## Scoring Model

Composite weighted formula (7 components):
- 35% Google Trends normalized
- 20% Wikipedia Pageviews normalized
- 15% App review volume (7-day rolling)
- 10% Bluesky mentions velocity
- 10% Seasonal index (calendar + historical day/hour)
- 5% Weather boost (rain/cold = indoor activity boost)
- 5% Historical day x hour matrix

Output: score 0-100 with historical percentile ranking and trend (rising/falling/stable).

## API Endpoints (FastAPI)

```
GET /api/score/live?app=tinder&city=paris
GET /api/score/forecast?app=tinder&city=paris&days=7
GET /api/score/history?app=tinder&city=paris&period=30d
GET /api/score/best-times?app=tinder&city=paris
GET /api/apps
GET /api/health
```

## Key Design Decisions

- **Resilient pipeline**: One collector failing must not block others. The orchestrator (`engine/main.py`) runs all collectors with independent error handling.
- **4-phase pipeline**: collect -> score -> forecast -> alert. Each phase can be run independently via CLI flags.
- **SQLite with WAL mode**: Zero-config DB, UNIQUE constraints for deduplication, indexed on time-series queries.
- **Percentile-based normalization**: Scores are normalized against historical data rather than raw values.
- **Forecasting**: J+7 predictions (168 hourly slots) use seasonal_index + weather forecast + calendar events.
- **Telegram alerts**: Only fire when score > P85 (good) or P95 (exceptional), max 3/day, quiet hours 23h-8h, cooldown between alerts.
- **SPA routing**: Simple pathname-based routing without external dependency (/ -> Landing, /dashboard -> Dashboard).

## Deployment

- **Frontend**: Vercel (`frontend/vercel.json` configured with SPA rewrites)
- **Backend**: Railway (`railway.toml` + `Procfile`)
- **Scheduler**: GitHub Actions cron hourly (`.github/workflows/collect.yml`)

## Environment Variables

Configured in `.env` (git-ignored). Only secret is `TELEGRAM_BOT_TOKEN`. All data source APIs are free and unauthenticated.

Key config: `TARGET_APPS`, `TARGET_CITIES`, `DEFAULT_CITY`, `DB_PATH`, `SCORING_INTERVAL_MINUTES`, `ALERT_COOLDOWN_MINUTES`.
