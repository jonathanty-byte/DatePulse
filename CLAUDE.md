# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

DatePulse V3 is a lightweight Single Page App that shows real-time dating app activity scores (0-100). Scores are computed 100% client-side using feminine-calibrated lookup tables derived from official publications by Tinder, Bumble, Hinge, and third-party studies (Nielsen, Ogury, SwipeStats, Reincubate, BMC Psychology, Sumter, Hily).

**Key insight**: Activity patterns on dating apps are 99% predictable from 3 variables (hour, day of week, month) — confirmed by r=0.995 correlation with Google Trends FR data. The model targets female activity patterns (the global data is 76% male / 24% female — we isolate the female signal).

## Architecture

```
Frontend (Vercel): Static lookup tables -> Client-side scoring -> React UI
                   + Real-time weather from wttr.in (localStorage cache, 30min TTL)
Automation (local): Python scoring engine -> Chrome + Auto Swiper via pyautogui
Bridge: Frontend button -> POST localhost:5555/trigger -> Python server
```

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion. No backend, no database. Single external API: wttr.in for weather (with static fallback).
**Automation**: Python scripts running locally on Windows (Task Scheduler cron + HTTP server).

## Project Structure

```
DatePulse/
├── frontend/                          # SPA React (deployed on Vercel)
│   ├── src/
│   │   ├── App.tsx                    # SPA routing (/ and /methodology)
│   │   ├── main.tsx                   # Entry point
│   │   ├── lib/
│   │   │   ├── data.ts               # Per-app lookup tables (feminine model) + events psy + WEATHER_MODIFIERS
│   │   │   ├── scoring.ts            # computeScore(date, app, weather), heatmap, best times, countdown
│   │   │   └── franceTime.ts         # Europe/Paris timezone helpers + getParisHour()
│   │   ├── components/
│   │   │   ├── ScoreGauge.tsx         # Animated circular gauge (Framer Motion)
│   │   │   ├── ScoreLabel.tsx         # Contextual label + message + delta
│   │   │   ├── HeatmapWeek.tsx        # 7-day x 24-hour color grid
│   │   │   ├── BestTimes.tsx          # Top 5 time slots
│   │   │   ├── CountdownNext.tsx      # Countdown to next peak
│   │   │   ├── AppSelector.tsx        # Tinder/Bumble/Hinge/Happn tabs
│   │   │   ├── PoolFreshness.tsx      # Pool freshness indicator
│   │   │   └── MatchTrackerInline.tsx # Match Tracker (log matches, discover patterns)
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Main page (score + weather badge + heatmap + Auto Swiper)
│   │   │   └── Methodology.tsx        # Methodology page (sources, formula, events, weather)
│   │   └── styles/
│   │       └── globals.css            # Tailwind base styles
│   ├── public/
│   │   └── weather.json               # Static weather fallback (used if wttr.in is down)
│   ├── index.html                     # SEO meta tags + OG
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── vercel.json                    # Vercel deploy config
│
├── scripts/                           # Local automation (Windows PC)
│   ├── scoring_engine.py              # Python port of data.ts + scoring.ts (feminine model + weather)
│   ├── weather_proxy.py               # Optional: cron script to update weather.json from wttr.in
│   ├── auto_trigger.py                # Main script (cron + HTTP server + CLI)
│   ├── auto_trigger_config.json       # User config (threshold, apps, chrome path)
│   ├── sessions.jsonl                 # Auto Swiper session history
│   └── auto_trigger.log              # Execution logs
```

## Commands

```bash
# Frontend
cd frontend && npm install
npm run dev      # Vite dev server (port 5173)
npm run build    # Production build -> dist/

# Auto Swiper automation
python scripts/auto_trigger.py --server   # HTTP server on localhost:5555 (for frontend button)
python scripts/auto_trigger.py            # Cron mode (score >= threshold -> launch)
python scripts/auto_trigger.py --now      # Force-launch immediately
python scripts/auto_trigger.py --history  # Show session history

# Weather (optional — frontend fetches wttr.in directly)
python scripts/weather_proxy.py           # Update frontend/public/weather.json from wttr.in
```

## Scoring Model

Deterministic formula: `score(t) = hourly[h] * weekly[d] * monthly[m] / 10000 * event_multiplier * weather_modifier`

Feminine-calibrated tables (isolating female activity from the 76% male global signal):

- **Hourly index**: Peak at 20h (100), lunch boost 12-13h, trough 1-5h (3-4). Sources: SwipeStats gender split, Bumble PR, Reincubate F 25-34.
- **Weekly index**: Peak Saturday (100), Sunday 90, Friday 65 (FOMO boost). Sources: Reincubate F 25-34, Hily survey.
- **Monthly index**: Peak January (100), trough December (60). Sources: Adjust Benchmarks 2023-2024, Sensor Tower FR.
- **Events (10 boosters + 4 reducers)**: Dating Sunday +25%, Nouvel An +35%, Pre-Valentine +30%, Valentine Day +35%, Rentree +15%, Cuffing +6%, Sunday Blues +8%, Vendredi FOMO +12%, Dimanche Ennui +8%, Winter Darkness +5%, Post-Noel +15%, 8 Mars +8%, Noel -40%, Reveillon -50%, 15 Aout -30%, Pic Ete +8%.
- **Weather modifier**: clear 0.95, clouds 1.00, rain 1.10, snow 1.27, thunderstorm 1.15. Sources: OKCupid, Hinge storm data.

Psychological variables operationalized in the model:
- **ENNUI**: Lunch boost, Dimanche Ennui, weather rain/snow
- **SOLITUDE**: Sunday Blues, Vendredi FOMO, Valentine, Nouvel An, Post-Noel
- **VALIDATION**: Peak 19-20h post-work, Monday Bumble dominant
- **STRESS/SAD**: Winter Darkness, Cuffing attenuated, Rentree

Output: 0-100 with contextual labels (Mort plat / Calme / Moyen / Actif / Tres actif / En feu).

## Weather Integration

The frontend fetches real-time weather from `wttr.in/Paris?format=j1` (free, CORS OK, no API key).

- **Cache**: localStorage with 30min TTL — badge appears instantly on repeat visits
- **Fallback**: `/weather.json` static file if wttr.in is unreachable
- **Display**: Weather badge on Home page shows condition + temperature + score impact (e.g., "Pluie +10% sur le score")
- **Scoring**: Only affects `computeScore()` (real-time score). Heatmap and best times remain static projections.

## Deployment

- **Frontend**: Vercel (vercel.json configured) — https://frontend-sigma-gules-59.vercel.app
- **Automation**: Local only (Windows PC, not deployed)
- **CI**: GitHub Actions build check on push (.github/workflows/test.yml)

## Auto Swiper Integration

The frontend button "Lancer Auto Swiper" (visible only for Tinder/Bumble) sends a POST to `localhost:5555/trigger` with `{app: "tinder"|"bumble"}`. The local Python server opens Chrome (user's regular profile, already logged in) and activates the Auto Swiper extension via keyboard simulation (Alt+Shift+S → Tab x14 → Enter).

Constraint: Auto Swiper only supports one app at a time.
