# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

DatePulse V3 is a lightweight Single Page App that shows real-time dating app activity scores (0-100). Scores are computed 100% client-side using static lookup tables derived from official publications by Tinder, Bumble, Hinge, and third-party studies (Nielsen, Ogury, SwipeStats).

**Key insight**: Activity patterns on dating apps are 99% predictable from 3 variables (hour, day of week, month) — confirmed by r=0.995 correlation with Google Trends FR data. No backend needed.

## Architecture

```
Static lookup tables (embedded in JS) -> Client-side scoring -> React UI
```

**Single stack**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion. No backend, no database, no external APIs.

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx                    # SPA routing (/ and /methodology)
│   ├── main.tsx                   # Entry point
│   ├── lib/
│   │   ├── data.ts                # Lookup tables (hourly/weekly/monthly + events)
│   │   └── scoring.ts             # computeScore(), heatmap, best times, countdown
│   ├── components/
│   │   ├── ScoreGauge.tsx         # Animated circular gauge (Framer Motion)
│   │   ├── ScoreLabel.tsx         # Contextual label + message + delta
│   │   ├── HeatmapWeek.tsx        # 7-day x 24-hour color grid
│   │   ├── BestTimes.tsx          # Top 5 time slots
│   │   ├── CountdownNext.tsx      # Countdown to next peak
│   │   └── AppSelector.tsx        # Tinder/Bumble/Hinge/Happn tabs
│   ├── pages/
│   │   └── Home.tsx               # Main page (score + heatmap + best times)
│   ├── types/
│   │   └── index.ts               # Re-exports from lib
│   └── styles/
│       └── globals.css            # Tailwind base styles
├── index.html                     # SEO meta tags + OG
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json                    # Vercel deploy config
```

## Commands

```bash
cd frontend && npm install
npm run dev      # Vite dev server (port 5173)
npm run build    # Production build -> dist/
```

## Scoring Model

Deterministic formula: `score(t) = hourly[h] * weekly[d]/100 * monthly[m]/100 * event_multiplier`

- **Hourly index**: Peak at 21h (100), trough 1-5h (5)
- **Weekly index**: Peak Sunday (100), trough Friday (55)
- **Monthly index**: Peak January (100), trough August (50)
- **Events**: Boosters (Dating Sunday +35%, Valentine +20%) and reducers (Noel -40%)

Output: 0-100 with contextual labels (Mort plat / Calme / Moyen / Actif / Tres actif / En feu).

## Deployment

- **Frontend**: Vercel (vercel.json configured)
- **CI**: GitHub Actions build check on push (.github/workflows/test.yml)
