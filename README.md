# DatePulse

> Sais quand ouvrir ton app de dating pour maximiser tes matches.

DatePulse aggregates 6 public data sources in real-time to produce an activity score (0-100) for dating apps in French cities. It predicts optimal times to use Tinder, Bumble, Hinge, and Happn.

## How it works

```
Sources (6 free APIs) --> Data Engine (Python) --> SQLite --> FastAPI REST API --> React Frontend
                                                         \-> Telegram Bot (alerts)
```

**Data sources**: Google Trends, Wikipedia Pageviews, Bluesky mentions, App Store reviews, weather (Open-Meteo), calendar events.

**Scoring model**: 7-component weighted composite — Google Trends (35%), Wikipedia (20%), App Reviews (15%), Bluesky (10%), Seasonal (10%), Weather (5%), Day/Hour (5%). Normalized against historical percentiles.

## Quick start

### Backend (Python engine + API)

```bash
# Install dependencies
pip install -r engine/requirements.txt

# Initialize database and run collection pipeline
python -m engine.main

# Start the API server
uvicorn engine.api.routes:app --reload --port 8000

# Run Telegram bot (requires TELEGRAM_BOT_TOKEN in .env)
python -m engine.alerts.telegram_bot
```

### Frontend (React dashboard)

```bash
cd frontend
npm install
npm run dev      # Dev server on http://localhost:5173
npm run build    # Production build
```

### Environment variables

Create `.env` at the project root:

```env
DB_PATH=data/datepulse.db
TARGET_APPS=tinder,bumble,hinge,happn
TARGET_CITIES=paris,lyon,bordeaux,marseille,lille
DEFAULT_CITY=paris
SCORING_INTERVAL_MINUTES=60
ALERT_COOLDOWN_MINUTES=120
TELEGRAM_BOT_TOKEN=         # Optional, for Telegram alerts
```

All data source APIs are free and unauthenticated. Only `TELEGRAM_BOT_TOKEN` is required for the bot.

## Pipeline

```bash
python -m engine.main                # Full pipeline: collect -> score -> forecast -> alert
python -m engine.main --collect-only # Only collect data
python -m engine.main --score-only   # Only compute scores
python -m engine.main --dry-run      # Test run
```

The pipeline runs hourly via GitHub Actions (`.github/workflows/collect.yml`).

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/score/live?app=tinder&city=paris` | Current activity score |
| `GET /api/score/forecast?app=tinder&city=paris&days=7` | Hourly predictions |
| `GET /api/score/history?app=tinder&city=paris&period=30d` | Historical scores |
| `GET /api/score/best-times?app=tinder&city=paris` | Top 10 time slots |
| `GET /api/apps` | Available apps and cities |
| `GET /api/health` | System health and source status |

## Tests

```bash
pip install pytest
pytest tests/ -v
```

## Deployment

- **Frontend**: Vercel (`frontend/vercel.json` configured)
- **Backend**: Railway (`railway.toml` + `Procfile`)
- **Scheduler**: GitHub Actions cron (hourly)

## Project structure

```
engine/
    main.py              # Pipeline orchestrator
    config.py            # Configuration + .env loading
    collectors/          # 6 data source collectors
    processor/           # Normalizer + scorer
    forecaster/          # Seasonal patterns + J+7 predictor
    storage/db.py        # SQLite layer (5 tables)
    alerts/              # Telegram bot + alert logic
    api/routes.py        # FastAPI REST API
frontend/
    src/pages/           # Landing + Dashboard
    src/components/      # ScoreGauge, HeatmapWeek, HistoryChart, etc.
    src/hooks/           # useScore, useForecast, useHistory
    src/services/api.ts  # API client
tests/
    test_pipeline.py     # End-to-end pipeline tests
scripts/
    seed_historical.py   # 2-year data backfill
    calibrate_weights.py # Scoring model optimization
data/
    events_fr.json       # French calendar events
    cities.json          # Target cities + coordinates
```

## License

Private project.
