# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DatePulse is a lightweight SPA that shows real-time dating app activity scores (0-100). Tagline: "Swipe when it matters." Scores are computed 100% client-side using feminine-calibrated lookup tables derived from official publications by Tinder, Bumble, Hinge, and third-party studies (Nielsen, Ogury, SwipeStats, Reincubate, BMC Psychology, Sumter, Hily).

**Key insight**: Activity patterns on dating apps are 99% predictable from 3 variables (hour, day of week, month) — confirmed by r=0.995 correlation with Google Trends FR data. The model targets female activity patterns (the global data is 76% male / 24% female — we isolate the female signal).

## Commands

```bash
# Frontend development (all commands run from frontend/)
cd frontend && npm install
npm run dev          # Vite dev server on port 5173
npm run build        # tsc -b && vite build → dist/
npm run preview      # Preview production build locally

# Tests (Vitest + jsdom + Testing Library)
npm test             # vitest run (single pass)
npm run test:watch   # vitest (watch mode)
# Test files live in frontend/src/lib/__tests__/
# Run a single test file:
npx vitest run src/lib/__tests__/wrappedParser.test.ts
# Run tests matching a name pattern:
npx vitest run -t "findClosestMatch"

# Deploy (force bypasses Vercel build cache + PWA service worker cache)
cd frontend && npx vercel --prod --yes --force

# Python automation (local Windows only, not deployed)
python scripts/auto_trigger.py --server   # HTTP server on localhost:5555
python scripts/trends_live.py             # Google Trends → frontend/public/trends.json
python scripts/trends_live.py --dry-run   # Preview without writing
python scripts/nudge_email.py --dry-run   # Preview email without sending
```

**No linting or formatting tools are configured.** TypeScript strict mode (`tsc -b`) is the main static check, run as part of `npm run build`. Note: `noUnusedLocals` and `noUnusedParameters` are both `false` — TS won't flag unused vars. Vitest config is in `frontend/vitest.config.ts` (separate from `vite.config.ts`), with `globals: true`.

**CI** (.github/workflows/test.yml): Runs `npm ci && npm run build` on push/PR to master (Node.js 20). Note: CI only type-checks + builds — it does **not** run `npm test`. A daily rankings scraper also runs via GitHub Actions (.github/workflows/rankings.yml).

## Architecture

```
Frontend (Vercel): Static lookup tables → Client-side scoring → React UI
                   + wttr.in weather (localStorage 30min TTL, static fallback)
                   + trends.json Google Trends modifier (localStorage 2h TTL)
                   + Vercel Edge Function proxy → OpenRouter LLM (currently unused, Coach hidden)
                   + @vercel/analytics (page views + custom events)

Automation (local): Python scripts on Windows (Task Scheduler cron + HTTP server)
                    trends_live.py (cron 2h), nudge_email.py (cron daily 20h45)

Bridge: Frontend button → POST localhost:5555/trigger → Python auto_trigger.py
```

**Stack**: React 18 + TypeScript + Vite + Tailwind CSS 3 + Framer Motion + Recharts + vite-plugin-pwa

**Routes** (SPA, defined in `App.tsx`): `/`, `/score`, `/wrapped`, `/insights`

**Hidden routes** (code exists but unreachable — Coach feature hidden): `/coach`, `/audit`, `/methodology`, `/tracker`

**Custom SPA router** — no React Router. Uses `window.history.pushState` + `popstate` event listener + click delegation in `App.tsx`. Home page is a static import; all other pages use `React.lazy()`.

### Key directories

- `frontend/src/lib/` — Core logic: scoring engine, data tables, match tracker, session tracker, LLM service, wrapped parser/metrics, share image generator
- `frontend/src/components/` — React UI components (gauge, heatmap, charts, forms, modals)
- `frontend/src/pages/` — Route-level page components
- `frontend/api/llm.ts` — Vercel Edge Function (proxies LLM calls, hides `OPENROUTER_KEY`)
- `scripts/` — Python automation (local only): auto swiper, trends fetcher, nudge emails

### Data flow

All scoring data lives in `lib/data.ts` as static lookup tables (per-app hourly, weekly, monthly indexes + events + weather modifiers). `lib/scoring.ts` combines them into scores. Everything is client-side — no backend database.

**External data sources** (all with localStorage caches and static fallbacks):
- **Weather**: `wttr.in/Paris?format=j1` → cached 30min → fallback `/weather.json`
- **Trends**: `trends.json` written by Python cron → cached 2h → ships with neutral defaults
- **Rankings**: `data/rankings-latest.json` + `data/rankings-history.json` written by GitHub Actions daily scraper (`scripts/scrape_rankings.py`) — Play Store FR data for all 4 apps. Fetched by `lib/rankings.ts`.

**LLM path** (currently unused — Coach hidden): `lib/llmService.ts` calls `/api/llm` (Vercel Edge Function) in prod, or uses `VITE_OPENROUTER_KEY` env var in dev. Edge function reads `OPENROUTER_KEY` server-side.

**Persistence**: All user data in localStorage — matches (`datepulse_matches`), sessions (`datepulse_sessions`, `datepulse_active_session`), audit (`datepulse_last_audit`), caches (`dp_weather`, `dp_trends`).

## Scoring Model

Deterministic formula: `score(t) = hourly[h] × weekly[d] × monthly[m] / 10000 × event_multiplier × weather_modifier × trend_modifier`

- **Hourly**: Peak 20h (100), lunch boost 12-13h, trough 1-5h (3-4)
- **Weekly**: Peak Saturday (100), Sunday 90, Friday 65. Bumble peaks Monday, Happn Thursday.
- **Monthly**: Peak January (100), trough December (60). Valentine effect is ONLY in SPECIAL_EVENTS — monthly indexes must NOT inflate February.
- **Events**: 10 boosters + 4 reducers (Nouvel An +35%, Noel -40%, etc.) — defined in `data.ts`
- **Weather**: clear 0.95, clouds 1.00, rain 1.10, snow 1.27, thunderstorm 1.15
- **Trends**: Google Trends modifier clamped [0.70, 1.40], defaults to 1.0 on failure

**Score labels** (in `scoring.ts`): 91-100 MOMENTUM OPTIMAL, 76-90 MOMENTUM+, 56-75 MOMENTUM, 36-55 TRANSITION, 0-35 HORS PIC

### Critical: scoring consistency rules

Three scoring paths must stay in sync:

| Function | Dynamic modifiers | Used for |
|----------|------------------|----------|
| `computeScore()` | events + weather + trends | Live score display |
| `computeWeekHeatmap()` | NONE (static only) | Heatmap, boost optimizer |
| `getNextPeak()` | NONE (static only) | Countdown to next peak |

**Rule**: Only `computeScore()` applies dynamic modifiers. All other scoring functions use `hourly × weekly × monthly / 10000` for UI consistency. This same rule applies to weather AND trends.

## Timezone

The app is France/Paris-centric. `lib/franceTime.ts` provides `getParisHour()` and Europe/Paris timezone helpers used throughout the scoring engine.

## Design System

- **Theme**: Dark (`bg-[#080b14]`), glass morphism cards (`rounded-2xl border border-white/10 bg-white/[0.02]`)
- **Brand**: Indigo (#6366f1), full palette in `tailwind.config.js` (brand-50 to brand-900)
- **App colors**: Tinder `#ec4899`, Bumble `#f59e0b`, Hinge `#8b5cf6`, Happn `#f97316`
- **Typography**: text-gray-100 primary, text-gray-400/500 secondary, gradient titles (brand-400 → brand-600)
- **Animations**: Framer Motion entrance (opacity 0→1, y 20→0), staggered delays, hover scale

## Deployment

- **Frontend**: Vercel — `https://frontend-sigma-gules-59.vercel.app`
- **Edge Function**: `frontend/api/llm.ts` — requires `OPENROUTER_KEY` env var in Vercel (no `VITE_` prefix)
- **CI**: GitHub Actions build check on push (.github/workflows/test.yml)
- **PWA**: Service worker via vite-plugin-pwa (Workbox), `registerType: "autoUpdate"`. CacheFirst for Google Fonts (365d TTL). May cache old bundles — use `--force` on deploy or clear via DevTools.
- **Rankings scraper**: GitHub Actions daily at 06:00 UTC. Scrapes Google Play FR (Tinder, Bumble, Hinge, Happn), writes to `frontend/public/data/`, auto-commits with `[skip ci]`. Can be triggered manually via `workflow_dispatch`.

**Note**: `README.md` was rewritten in V4.1 to match the current architecture. CLAUDE.md remains the authoritative doc with full detail.

## Google Trends Integration

`scripts/trends_live.py` runs every 2h, fetches 3 proxy terms from Google Trends FR, computes a modifier, writes `frontend/public/trends.json`.

- **Proxy terms**: `serie` (0.50), `site de rencontre` (0.30), `rencontre` (0.20) — fetched individually to avoid Google's normalization
- **Algorithm**: Relative deviation comparison. `modifier = 1 + (gt_deviation - model_deviation)`, clamped [0.70, 1.40]
- **Graceful degradation**: 3 terms → high confidence, 2 → medium, 1 → low, 0 → neutral (1.0). Never overwrites existing file on total failure.

## Dating Wrapped

`/wrapped` — Spotify Wrapped-style analysis of RGPD dating app data exports. 100% client-side processing.

- **Parser** (`wrappedParser.ts`): Auto-detects app source. Supports Tinder Format A (pre-2024, arrays) and Format B (2024+, `Usage` dicts). Hinge multi-file support (matches.json, subscriptions.json, user.json). `dailyOnly` flag when no per-swipe timestamps — uses message timestamps as hourly proxy.
- **Metrics** (`wrappedMetrics.ts`): `bestMonth`/`worstMonth` use match rate (matches/likes), not absolute count. Hinge-specific: funnel stats, comment analysis, response time, premium ROI, unmatch survival.
- **Report** (`WrappedReport.tsx`): Monthly ComposedChart: swipes as bars + match rate line + match count labels. Hourly chart uses messages as proxy when `dailyOnly`. App-source theming (colors adapt per dating app).

### Wrapped visual hierarchy (premium dashboard style)

7 chapter blocks with colored `border-left-4` + tinted backgrounds:

| Chapter | bg | accent | Content |
|---------|-----|--------|---------|
| CH.1 Vue d'ensemble | `bg-slate-50` | `#6366f1` | SpotlightCards, funnel |
| CH.2 Timing | `bg-blue-50` | `#3b82f6` | Day/hour charts, monthly evolution |
| CH.3 Conversion | `bg-rose-50` | `#f43f5e` | Comment impact, matches, premium ROI |
| CH.4 Conversations | `bg-amber-50` | `#f59e0b` | Ghost rate, response time, unmatch |
| CP Conversation Pulse | `bg-emerald-50` | `#10b981` | 15 sections (3 free + 12 premium behind PaywallGate) |
| SP Swipe Pulse | `bg-cyan-50` | `#06b6d4` | 5 sections (1 free + 4 premium behind PaywallGate) |
| CH.5 ADN & Verdict | `bg-violet-50` | `#8b5cf6` | Benchmarks, RadarChart, verdict, share button |

- **ChapterInterstitial**: compact horizontal layout with SVG icon in gradient badge
- **SectionTitle**: `level="chapter"` (3xl font-black gradient) vs `level="section"` (xl font-extrabold)
- **Card variants**: `default` (shadow-sm), `elevated` (shadow-md + ring, used for chart cards), `flat`
- **SectionDivider**: gradient `h-px` between thematic groups inside CP/SP

## Auto Swiper Integration

Frontend "Lancer Auto Swiper" button (Tinder/Bumble only) → POST `localhost:5555/trigger` → Python server opens Chrome profile → keyboard simulation activates extension (Alt+Shift+S → Tab ×14 → Enter). One app at a time only.
