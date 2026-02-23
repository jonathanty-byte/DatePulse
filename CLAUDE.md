# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DatePulse is a data intelligence tool that aggregates public signals to produce real-time activity scores (0-100) for dating apps (Tinder, Bumble, Hinge, Happn) in French cities. It predicts optimal times to use dating apps by combining Google Trends, Wikipedia Pageviews, Bluesky mentions, App Store reviews, weather, and calendar events.

**Current state**: Specification phase. The CDC (CDC_DATEPULSE.md) is complete. No code has been written yet.

## Architecture

```
Sources (6 free APIs) → Data Engine (Python) → SQLite → FastAPI REST API → React Frontend
                                                    └→ Telegram Bot (alerts)
```

**Two separate stacks**:
- **Backend (`engine/`)**: Python 3.11+ — data collection, scoring model, FastAPI API, Telegram bot
- **Frontend (`frontend/`)**: React 18 + TypeScript + Vite + Tailwind CSS — dashboard and landing page

**Database**: SQLite at `data/datepulse.db` (5 tables: `raw_signals`, `scores`, `forecasts`, `telegram_users`, `alerts_log`)

## Planned Commands

### Python Engine
```bash
pip install -r engine/requirements.txt
python engine/main.py              # Run full collection pipeline
python engine/main.py --dry-run    # Test run without persisting
python scripts/seed_historical.py  # Backfill 2 years of historical data
python scripts/calibrate_weights.py # Optimize scoring model weights
```

### Frontend
```bash
cd frontend && npm install
npm run dev      # Vite dev server
npm run build    # Production build
```

### Verify data
```bash
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
- 5% Historical day×hour matrix

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

## Data Sources (all free, no auth except Telegram)

| Source | Collector | API/Library |
|--------|-----------|-------------|
| Google Trends | `collectors/google_trends.py` | `pytrends` (rate-limit sensitive, use sleep 10-30s) |
| Wikipedia | `collectors/wikipedia.py` | Wikimedia REST API |
| Bluesky | `collectors/bluesky.py` | AT Protocol public API |
| App Store Reviews | `collectors/app_reviews.py` | `app-store-scraper` / `google-play-scraper` |
| Weather | `collectors/weather.py` | Open-Meteo API |
| Events calendar | `collectors/events.py` | Static JSON (`data/events_fr.json`) |

## Key Design Decisions

- **Resilient pipeline**: One collector failing must not block others. The orchestrator (`engine/main.py`) runs all collectors with independent error handling.
- **SQLite with WAL mode**: Zero-config DB, UNIQUE constraints for deduplication, indexed on time-series queries.
- **Percentile-based normalization**: Scores are normalized against historical data (same weekday, same month) rather than raw values.
- **Forecasting**: J+7 predictions use seasonal_index + weather forecast + calendar events.
- **Telegram alerts**: Only fire when score > P85 (good) or P95 (exceptional), max 3/day, quiet hours 23h-8h.

## Environment Variables

Configured in `.env` (git-ignored). Only secret is `TELEGRAM_BOT_TOKEN`. All data source APIs are free and unauthenticated.

Key config: `TARGET_APPS`, `TARGET_CITIES`, `DEFAULT_CITY`, `DB_PATH`, `SCORING_INTERVAL_MINUTES`.

## Target Cities

Paris, Lyon, Bordeaux, Marseille, Lille (coordinates in `data/cities.json`).

## Deployment Target

- Frontend: Vercel
- Backend (engine + API): Railway free tier
- Scheduler: GitHub Actions cron (hourly collection)
