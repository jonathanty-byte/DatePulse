# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

DatePulse V3 is a lightweight Single Page App that shows real-time dating app activity scores (0-100). Scores are computed 100% client-side using feminine-calibrated lookup tables derived from official publications by Tinder, Bumble, Hinge, and third-party studies (Nielsen, Ogury, SwipeStats, Reincubate, BMC Psychology, Sumter, Hily).

**Key insight**: Activity patterns on dating apps are 99% predictable from 3 variables (hour, day of week, month) — confirmed by r=0.995 correlation with Google Trends FR data. The model targets female activity patterns (the global data is 76% male / 24% female — we isolate the female signal).

## Architecture

```
Frontend (Vercel): Static lookup tables -> Client-side scoring -> React UI
                   + Real-time weather from wttr.in (localStorage cache, 30min TTL)
                   + Google Trends modifier from trends.json (localStorage cache, 2h TTL)
Automation (local): Python scoring engine -> Chrome + Auto Swiper via pyautogui
                    Python trends_live.py -> Google Trends fetch -> trends.json (cron 2h)
Bridge: Frontend button -> POST localhost:5555/trigger -> Python server
```

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Recharts. No backend, no database. External data: wttr.in for weather (with static fallback), trends.json for Google Trends modifier.
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
│   │   │   ├── matchTracker.ts       # Match logging (CRUD), stats, weekly aggregation (localStorage)
│   │   │   └── franceTime.ts         # Europe/Paris timezone helpers + getParisHour()
│   │   ├── components/
│   │   │   ├── ScoreGauge.tsx         # Animated circular gauge (Framer Motion)
│   │   │   ├── ScoreLabel.tsx         # Contextual label + message + delta vs weekly average
│   │   │   ├── HeatmapWeek.tsx        # 7-day x 24-hour color grid (highlights current time)
│   │   │   ├── BestTimes.tsx          # Top 5 time slots
│   │   │   ├── CountdownNext.tsx      # Countdown to next peak
│   │   │   ├── AppSelector.tsx        # Tinder/Bumble/Hinge/Happn tabs
│   │   │   ├── PoolFreshness.tsx      # Pool freshness indicator + download trends
│   │   │   ├── MatchTrackerInline.tsx # Match Tracker (log, edit, delete, rate 1-10)
│   │   │   └── YearlyChart.tsx        # Yearly activity curves (recharts AreaChart, multi-app select)
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Main page (score + weather + heatmap + yearly chart + Auto Swiper)
│   │   │   └── Methodology.tsx        # Methodology page (sources, formula, events, weather)
│   │   └── styles/
│   │       └── globals.css            # Tailwind base styles
│   ├── public/
│   │   ├── weather.json               # Static weather fallback (used if wttr.in is down)
│   │   └── trends.json                # Google Trends live modifier (updated by trends_live.py cron)
│   ├── index.html                     # SEO meta tags + OG
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── vercel.json                    # Vercel deploy config
│
├── scripts/                           # Local automation (Windows PC)
│   ├── scoring_engine.py              # Python port of data.ts + scoring.ts (feminine model + weather)
│   ├── weather_proxy.py               # Optional: cron script to update weather.json from wttr.in
│   ├── trends_live.py                 # Google Trends live modifier (cron 2h → trends.json)
│   ├── auto_trigger.py                # Main script (cron + HTTP server + CLI)
│   ├── auto_trigger_config.json       # User config (threshold, apps, chrome path)
│   ├── sessions.jsonl                 # Auto Swiper session history
│   ├── auto_trigger.log              # Execution logs
│   └── trends_live.log               # Trends fetch logs
```

## Commands

```bash
# Frontend
cd frontend && npm install
npm run dev      # Vite dev server (port 5173)
npm run build    # Production build -> dist/

# Deploy (force to bypass Vercel build cache + PWA service worker cache)
cd frontend && npx vercel --prod --yes --force

# Auto Swiper automation
python scripts/auto_trigger.py --server   # HTTP server on localhost:5555 (for frontend button)
python scripts/auto_trigger.py            # Cron mode (score >= threshold -> launch)
python scripts/auto_trigger.py --now      # Force-launch immediately
python scripts/auto_trigger.py --history  # Show session history

# Weather (optional — frontend fetches wttr.in directly)
python scripts/weather_proxy.py           # Update frontend/public/weather.json from wttr.in

# Google Trends live modifier (cron every 2h)
python scripts/trends_live.py             # Fetch trends + write frontend/public/trends.json
python scripts/trends_live.py --dry-run   # Print results without writing
```

## Scoring Model

Deterministic formula: `score(t) = hourly[h] * weekly[d] * monthly[m] / 10000 * event_multiplier * weather_modifier * trend_modifier`

Feminine-calibrated tables (isolating female activity from the 76% male global signal):

- **Hourly index**: Peak at 20h (100), lunch boost 12-13h, trough 1-5h (3-4). Sources: SwipeStats gender split, Bumble PR, Reincubate F 25-34.
- **Weekly index**: Peak Saturday (100), Sunday 90, Friday 65 (FOMO boost). Sources: Reincubate F 25-34, Hily survey.
- **Monthly index**: Peak January (100) for all apps, trough December (60). Sources: Adjust Benchmarks 2023-2024, Sensor Tower FR. **Important**: Valentine effect is handled exclusively by SPECIAL_EVENTS — monthly indexes must NOT inflate February.
- **Per-app variations**: Bumble peaks Monday (women-first), Happn peaks Thursday (urban commute, Ogury). Hinge has wider evening window 18-21h.
- **Events (10 boosters + 4 reducers)**: Nouvel An +35% (1-5 Jan), Dating Sunday +25% (1st/2nd Sun Jan after 5th), Pre-Valentine +30%, Valentine Day +35%, Rentree +15%, Cuffing +6%, Sunday Blues +8%, Vendredi FOMO +12%, Dimanche Ennui +8%, Winter Darkness +5%, Post-Noel +15%, 8 Mars +8%, Noel -40%, Reveillon -50%, 15 Aout -30%, Pic Ete +8%.
- **Weather modifier**: clear 0.95, clouds 1.00, rain 1.10, snow 1.27, thunderstorm 1.15. Sources: OKCupid, Hinge storm data.

Psychological variables operationalized in the model:
- **ENNUI**: Lunch boost, Dimanche Ennui, weather rain/snow
- **SOLITUDE**: Sunday Blues, Vendredi FOMO, Valentine, Nouvel An, Post-Noel
- **VALIDATION**: Peak 19-20h post-work, Monday Bumble dominant
- **STRESS/SAD**: Winter Darkness, Cuffing attenuated, Rentree

Output: 0-100 with contextual labels (Tres calme / Calme / Moyen / Actif / Tres actif / En feu).

### Scoring consistency rules

Three scoring paths must stay consistent:
- `computeScore()` — real-time score with events + weather + trend modifier (used for live display)
- `computeWeekHeatmap()` — static weekly heatmap (hourly × weekly × monthly / 10000, NO events/weather/trends)
- `getNextPeak()` — next peak countdown (uses same static formula as heatmap for consistency)

**Rule**: Only `computeScore()` applies dynamic modifiers (events, weather, Google Trends). All other scoring functions use the static formula for UI consistency.

## Match Tracker

Local match logging stored in `localStorage` (key: `datepulse_matches`).

- **Add match**: app, date/time, optional note, optional compatibility rating (1-10)
- **Edit match**: modify app, date/time, note, rating (score auto-recomputed on date change)
- **Delete match**: remove from log
- **Stats**: total, by app, avg score, best day/hour, high/low score distribution
- **Weekly aggregation**: last 8 weeks of match data for trend analysis

## Yearly Activity Chart

`YearlyChart.tsx` displays monthly activity indexes for all 4 apps using Recharts AreaChart.

- **Multi-select**: clickable legend chips to toggle any combination of apps
- **Visual**: selected apps shown with full stroke + gradient fill, unselected as ghost (10% opacity)
- **Current month**: pulsing dot + dashed reference line
- **Data source**: `APP_MONTHLY` from data.ts (static, no events/weather)

## Weather Integration

The frontend fetches real-time weather from `wttr.in/Paris?format=j1` (free, CORS OK, no API key).

- **Cache**: localStorage with 30min TTL — badge appears instantly on repeat visits
- **Fallback**: `/weather.json` static file if wttr.in is unreachable
- **Display**: Weather badge on Home page shows condition + temperature + score impact (e.g., "Pluie +10% sur le score")
- **Scoring**: Only affects `computeScore()` (real-time score). Heatmap, best times, and yearly chart remain static projections.

## Google Trends Integration

A weighted combination of 3 Google Trends FR proxy terms correlates at r=0.93 with Tinder's APP_MONTHLY curve. This powers a real-time trend modifier that adjusts the score based on actual search activity vs our static prediction.

- **Script**: `scripts/trends_live.py` runs every 2h via Task Scheduler, fetches 90-day daily data from Google Trends (pytrends), computes modifier, writes `frontend/public/trends.json`
- **Proxy terms**: `serie` (weight 0.50, r=0.71 solo), `site de rencontre` (0.30, r=0.59), `rencontre` (0.20, r=0.49). Fetched individually to avoid Google's volume normalization crushing low-volume terms.
- **Algorithm**: Relative deviation comparison. Each term is self-normalized (peak=100), then weighted-combined. The modifier = `1 + (gt_deviation - model_deviation)` where deviation = how much the current month differs from its window average. This solves the variance compression problem (3-month window has narrower spread than 12-month model).
- **Clamps**: Modifier clamped to [0.70, 1.40]. Input validation: trendModifier must be in [0.5, 2.0] or defaults to 1.0.
- **Graceful degradation**: 3 terms OK → high confidence, 2 terms → medium, 1 term → low, 0 terms → neutral fallback (modifier=1.0). Existing trends.json is never overwritten on total failure.
- **Cache**: localStorage with 2h TTL (key: `dp_trends`) — badge appears instantly on repeat visits
- **Fallback**: `/trends.json` ships with neutral values (modifier=1.0). Script overwrites with live data on first successful run.
- **Display**: Trends badge on Home page shows direction icon (📈/📉) + percentage (e.g., "+4% ce mois"). Opacity varies by confidence level. Hidden if trend_pct=0 or confidence=none.
- **Scoring**: Only affects `computeScore()` (real-time score). Heatmap, best times, countdown, and yearly chart remain static projections — same rule as weather.

## Design System

- **Theme**: Dark (bg-gray-950), glass morphism cards (`rounded-2xl border border-white/10 bg-white/[0.02]`)
- **Brand palette**: Rose/pink (#ec4899 brand-500), defined in tailwind.config.js (brand-50 to brand-900)
- **App colors**: Tinder #ec4899 (pink), Bumble #f59e0b (amber), Hinge #8b5cf6 (violet), Happn #f97316 (orange)
- **Animations**: Framer Motion entrance (opacity 0→1, y 20→0, scale 0.98→1), staggered delays, hover scale
- **Charts**: Recharts with dark-themed custom tooltips, SVG pulse animations
- **Typography**: text-gray-100 primary, text-gray-400/500 secondary, gradient titles (from-brand-400 to-brand-600)

## Deployment

- **Frontend**: Vercel (vercel.json configured) — https://frontend-sigma-gules-59.vercel.app
- **Automation**: Local only (Windows PC, not deployed)
- **CI**: GitHub Actions build check on push (.github/workflows/test.yml)
- **Cache busting**: Use `npx vercel --prod --yes --force` to bypass build cache. PWA service worker may also cache old bundles — clear via browser DevTools if needed.

## Auto Swiper Integration

The frontend button "Lancer Auto Swiper" (visible only for Tinder/Bumble) sends a POST to `localhost:5555/trigger` with `{app: "tinder"|"bumble"}`. The local Python server opens Chrome (user's regular profile, already logged in) and activates the Auto Swiper extension via keyboard simulation (Alt+Shift+S → Tab x14 → Enter).

Constraint: Auto Swiper only supports one app at a time.
