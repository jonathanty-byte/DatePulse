# DatePulse

> Swipe when it matters.

[![Build](https://github.com/jonathanty-byte/DatePulse/actions/workflows/test.yml/badge.svg)](https://github.com/jonathanty-byte/DatePulse/actions/workflows/test.yml)

**Live**: [frontend-sigma-gules-59.vercel.app](https://frontend-sigma-gules-59.vercel.app)

DatePulse is a client-side SPA that helps dating app users optimize their timing and understand their data. Two core features:

1. **Live Score (0-100)** — Real-time activity prediction for Tinder, Bumble, Hinge, Happn based on published studies (Nielsen, Ogury, SwipeStats) and validated against Google Trends FR (r=0.995)
2. **Dating Wrapped** — Upload your GDPR data export → full diagnostic: 90 data-driven hypotheses, conversation analysis, swipe patterns, benchmarks, personalized insights

**100% client-side** — no data leaves the browser.

## Architecture

```
Static lookup tables ──→ Scoring engine (client-side) ──→ React UI
wttr.in weather ────────→ Weather modifier (localStorage cache)
trends.json ────────────→ Google Trends modifier (Python cron)
GDPR upload ────────────→ Parser → Wrapped report + 90 hypotheses
/api/llm ───────────────→ Vercel Edge Function → OpenRouter (Coach AI)
```

**Stack**: React 18 · TypeScript · Vite · Tailwind CSS 3 · Framer Motion · Recharts · vite-plugin-pwa

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — Wrapped CTA + live score ticker |
| `/score` | Live score gauge + heatmap + best times + pool freshness |
| `/coach` | Profile Audit AI + Message Coach (via Edge Function) |
| `/wrapped` | GDPR upload → Wrapped report + personalized Insights inline |
| `/insights` | 90 hypotheses encyclopedia (personal if data uploaded, demo otherwise) |
| `/tracker` | Manual match tracker (localStorage) |

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

- **Wrapped Report**: 6 sections (overview, timing, conversion, conversations, DNA radar, verdict)
- **Conversation Pulse** (H1-H70): ghost detection, opener analysis, question density, survival curves
- **Swipe Pulse** (H71-H90): velocity decay, circadian patterns, selectivity analysis, archetypes
- **Personalized Insights**: `generateUserInsights()` maps metrics to 41-field `InsightsDataSet`, displayed inline after Wrapped and on `/insights`

## Project structure

```
frontend/
  src/
    pages/          # 6 route-level components
    components/     # 24 UI components (SharedInsightComponents, InsightsContent, etc.)
    lib/            # 23 logic modules (scoring, parsing, insights engine, etc.)
    lib/__tests__/  # 8 test suites (226+ tests)
  api/llm.ts        # Vercel Edge Function (OpenRouter proxy)
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
