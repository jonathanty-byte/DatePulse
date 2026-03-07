# DatePulse

> Swipe when it matters.

[![Build](https://github.com/jonathanty-byte/DatePulse/actions/workflows/test.yml/badge.svg)](https://github.com/jonathanty-byte/DatePulse/actions/workflows/test.yml)

**Live**: [frontend-sigma-gules-59.vercel.app](https://frontend-sigma-gules-59.vercel.app)

DatePulse is a client-side SPA that helps dating app users optimize their timing and understand their data. Three core features:

1. **Dating Wrapped** — Upload your GDPR data export → premium dashboard: 6 chapters + Conversation Pulse (15 sections) + Swipe Pulse (5 sections) + benchmarks + verdict
2. **Live Score (0-100)** — Real-time activity prediction for Tinder, Bumble, Hinge, Happn based on published studies (Nielsen, Ogury, SwipeStats) and validated against Google Trends FR (r=0.995)
3. **Insights Encyclopedia** — 90 data-driven hypotheses (personalized if Wrapped data uploaded, demo otherwise)

**100% client-side** — no data leaves the browser.

## Architecture

```
Static lookup tables ──→ Scoring engine (client-side) ──→ React UI
wttr.in weather ────────→ Weather modifier (localStorage cache)
trends.json ────────────→ Google Trends modifier (Python cron)
GDPR upload ────────────→ Parser → Wrapped report + Insights engine
```

**Stack**: React 18 · TypeScript · Vite · Tailwind CSS 3 · Framer Motion · Recharts · vite-plugin-pwa

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — Wrapped CTA + live score ticker |
| `/score` | Live score gauge + heatmap + best times + pool freshness |
| `/wrapped` | GDPR upload → Wrapped report (7 chapters) + Conversation Pulse + Swipe Pulse |
| `/insights` | 90 hypotheses encyclopedia (personal if data uploaded, demo otherwise) |

## Quick start

```bash
cd frontend
npm install
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # TypeScript check + production build
npm test             # Vitest (226+ tests)
```

## Deploy

```bash
cd frontend && npx vercel --prod --yes --force
```

The Edge Function (`frontend/api/llm.ts`) requires `OPENROUTER_KEY` set in Vercel env vars.

## Scoring model

```
score(t) = hourly[h] × weekly[d] × monthly[m] / 10000
         × event_multiplier × weather_modifier × trend_modifier
```

- **Hourly**: Peak 20h (100), lunch boost 12-13h, trough 1-5h
- **Weekly**: Peak Saturday (100), Friday 65, app-specific variations
- **Monthly**: Peak January (100), trough December (60)
- **Events**: 10 boosters + 4 reducers (Nouvel An +35%, Noel -40%, etc.)
- **Weather**: clear 0.95, clouds 1.00, rain 1.10, snow 1.27
- **Trends**: Google Trends FR live modifier, clamped [0.70, 1.40]

## Dating Wrapped

Parses GDPR exports from Tinder (Format A + B), Bumble, and Hinge. 100% client-side.

- **Wrapped Report**: 7 color-coded chapter blocks (overview, timing, conversion, conversations, CP, SP, ADN & verdict) with premium dashboard visual hierarchy
- **Conversation Pulse** (15 sections): ghost detection, opener analysis, question density, survival curves, tempo, escalation, balance, fatigue, signals, mirroring, language, timing, patterns, verdict
- **Swipe Pulse** (5 sections): algorithm ghost, psychology, rhythms, conversion, archetype
- **Personalized Insights**: `generateUserInsights()` maps metrics to 41-field `InsightsDataSet`, displayed inline after Wrapped and on `/insights`

## Project structure

```
frontend/
  src/
    pages/          # 4 active route components (Home, Score, Wrapped, Insights)
    components/     # UI components (SharedInsightComponents, WrappedReport, etc.)
    lib/            # Core logic (scoring, parsing, insights engine, etc.)
    lib/__tests__/  # Test suites (226+ tests)
  api/llm.ts        # Vercel Edge Function (OpenRouter proxy, currently unused)
  public/           # trends.json, weather fallback, rankings data
scripts/            # Python automation (local): trends, auto-swiper, rankings scraper
.github/workflows/  # CI (build on push) + daily rankings scraper
```

## Tests

```bash
cd frontend
npm test                                              # All tests
npx vitest run src/lib/__tests__/wrappedParser.test.ts # Single suite
npx vitest run -t "findClosestMatch"                   # By name pattern
```

## License

Private project.
