# CDC — DatePulse V4.1

> **"Swipe when it matters."** — Score d'activite temps reel + analyse complete de tes donnees dating.
>
> **Mise a jour : 05/03/2026** — Insights personnalises inline sous Wrapped, composant InsightsContent reutilisable, moteur generateUserInsights(), bridge localStorage.

---

## 0. Historique des versions

| Version | Date | Description |
|---------|------|-------------|
| V3.0 | 02/2026 | SPA React, 3 lookup tables statiques, score 0-100 |
| V3.1 | 02/2026 | Auto Swiper, scoring engine Python, serveur HTTP local |
| V3.2 | 02/2026 | Sprint UI, PWA offline, Match Tracker inline |
| V3.3 | 02/2026 | Meteo temps reel, Google Trends live modifier (r=0.93), YearlyChart, page methodologie |
| V3.4 | 02/2026 | Pivot DateDetox → DatePulse, rebranding indigo, Edge Function LLM, Profile Audit, Message Coach |
| V3.5 | 02/2026 | Wrapped V2 : RadarChart ADN Dating, Purchases ROI, flow emotionnel, teinte app-source |
| V3.6 | 03/2026 | SwipeStats benchmarks (n=1209), quintiles qualitatifs, 6eme axe Qualite, share image fix |
| V3.7 | 03/2026 | Conversation Pulse : 50 hypotheses (H1-H50), 7 ecrans emotionnels, CDS 5 axes |
| V3.8 | 03/2026 | Hinge deep insights : funnel, comments, response time, premium ROI, unmatch survival |
| V3.9 | 03/2026 | Advanced Conversation (H51-H70), page /insights, insightsData.ts |
| V4.0 | 03/2026 | Swipe Pulse (H71-H90), convergence UX Wrapped/Insights, composants partages, standardisation layout |
| **V4.1** | **03/2026** | **Insights personnalises inline sous Wrapped : InsightsContent.tsx reutilisable, generateUserInsights() moteur, bridge localStorage dp_user_insights, dual-mode Insights page** |

> Les archives detaillees (CDC V1 DateDetox, CDC V3.3, 6 COSTRAT) sont dans `archive/`.

---

## 1. Vision

### 1.1 Probleme

Les utilisateurs d'apps de dating ne savent pas quand l'activite est elevee. Ils swipent au hasard, souvent aux pires moments. Resultat : des sessions frustrantes avec peu de matches. Et quand ils exportent leurs donnees RGPD, ils n'ont aucun outil pour les comprendre.

### 1.2 Solution

DatePulse repond a deux besoins :
1. **Score live (0-100)** : quand swiper, base sur les patterns publies par Tinder, Bumble, Hinge et etudes tierces
2. **Dating Wrapped** : analyse complete de l'export RGPD — 90 hypotheses data-driven, benchmarks, diagnostic personnalise

### 1.3 Proposition de valeur

- **Temps reel** : "Ouvre Tinder maintenant — activite +43% vs la moyenne"
- **Retrospectif** : "Tu as passe 847h sur Tinder. Ton ghost rate est 71.8%. Voici ton ADN Dating."
- **100% client-side** : aucune donnee ne quitte le navigateur

### 1.4 Cible

- **Primaire** : Hommes 25-40, utilisateurs actifs de dating apps, urbains FR
- **Secondaire** : Utilisateurs curieux de leurs stats (export RGPD)
- **Tertiaire** : Viralite (r/Tinder, r/datascience, TikTok screenshots)

---

## 2. La Data — Ground Truth

### 2.1 Sources validees

| Source | Donnee cle | Fiabilite |
|--------|-----------|-----------|
| Tinder (Year in Swipe / blog) | Dating Sunday = pic annuel, 21h = pic quotidien | Officielle |
| Hinge (blog officiel) | Pic a 21h, fenetre 19h-22h, octobre = pic messages | Officielle |
| Bumble (communiques) | Lundi = jour le plus actif, pic 19h-20h, pre-Valentine +28% | Officielle |
| Nielsen | Pic quotidien a 21h | Etude tierce majeure |
| Ogury (6M profils) | Jeudi = spike hebdomadaire | Etude tierce |
| SwipeStats.io (n=1209) | Distributions match rate, like rate, ghost rate par genre | Dataset public |

### 2.2 Validation statistique

- **Composite Google Trends FR : Pearson r = 0.995, R2 = 0.989**
- Tinder seul : r = 0.990, Bumble : r = 0.992, Hinge : r = 0.989, Happn : r = 0.910
- Proxy terms Google Trends (r=0.93) : `serie` (0.50), `site de rencontre` (0.30), `rencontre` (0.20)

### 2.3 Benchmarks SwipeStats (n=1209)

| Metrique | Hommes (med) | Femmes (med) |
|----------|-------------|-------------|
| Match rate | 2.2% | 39.8% |
| Like rate | 36.5% | 4.6% |
| Ghost rate | 3.2% | 21.9% |

Affichage en quintiles qualitatifs ("moitie superieure", "quart superieur"), pas en percentiles chiffres. Sources citees, incertitude explicite.

---

## 3. Formule de Scoring

### 3.1 Score enrichi (V3.3+)

```
score(t) = hourly[h] x weekly[d] x monthly[m] / 10000
         x event_multiplier(t)
         x weather_modifier(t)
         x trend_modifier(t)
```

- **weather_modifier** : meteo temps reel Paris (wttr.in). Clair 0.95, nuages 1.00, pluie 1.10, neige 1.27
- **trend_modifier** : Google Trends FR live. Clampe [0.70, 1.40]
- **Regle** : seul `computeScore()` applique les modificateurs dynamiques. Heatmap, best times, countdown = formule statique.

### 3.2 Labels UX (scoring.ts)

| Score | Label | Icone |
|-------|-------|-------|
| 91-100 | MOMENTUM OPTIMAL | Star |
| 76-90 | MOMENTUM+ | Lightning |
| 56-75 | MOMENTUM | Fire |
| 36-55 | TRANSITION | Cloud |
| 0-35 | HORS PIC | Stop |

---

## 4. Routes et Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Score live + heatmap + best times + pool freshness + CTAs |
| `/coach` | Coach | Profile Audit IA + Message Coach (absorbe /audit et /methodology) |
| `/wrapped` | Wrapped | Upload RGPD → rapport complet (10 sections + Conversation Pulse + Swipe Pulse) |
| `/tracker` | Tracker | Match Tracker manuel (localStorage) |
| `/insights` | Insights | Encyclopedie des 90 hypotheses — mode dual (personnalise si dp_user_insights present, demo sinon) |

### Navigation

- **NavBar** : 5 items (Accueil, Coach, Wrapped, Tracker, Insights)
- **Footer** : unifie sur toutes les pages (Accueil | Coach | Wrapped | Insights)
- **SPA routing** : custom (pushState + popstate + click delegation), pas de React Router

---

## 5. Features

### F1 — Score Live (Home)

- Jauge circulaire animee 0-100 avec pulse
- Label contextuel + message actionnable + delta vs moyenne
- Badges meteo et Google Trends
- Countdown vers prochain creneau optimal
- Selecteur d'app (Tinder / Bumble / Hinge / Happn)

### F2 — Heatmap Semaine (Home)

- Grille 7j x 24h, coloree par score predit
- Double layout : desktop complet + mobile compact
- Legende interactive

### F3 — Best Times (Home)

- Podium des 3 meilleurs creneaux de la semaine
- Pool Freshness avec classement Play Store FR

### F4 — Coach (Profile Audit + Message Coach)

- **Profile Audit** : upload photo/bio → analyse LLM (OpenRouter via Edge Function)
- **Message Coach** : coller une conversation → 3 suggestions calibrees (safe/balanced/bold)
- Tab system : Photo, Bio, Message
- Absorbe les anciennes routes /audit et /methodology

### F5 — Dating Wrapped + Insights personnalises

Upload d'export RGPD → rapport interactif complet + insights personnalises inline. 100% client-side.

**Parser** (`wrappedParser.ts`) :
- Auto-detection app source (Tinder, Bumble, Hinge)
- Tinder Format A (pre-2024, arrays) et Format B (2024+, Usage dicts)
- Hinge multi-fichier (matches.json, subscriptions.json, user.json)
- Flag `dailyOnly` quand pas de timestamps per-swipe

**Flow post-upload** :
1. Upload → parsing → `WrappedMetrics` + `ConversationInsights` + `AdvancedSwipeInsights`
2. `generateUserInsights()` transforme les metriques en `InsightsDataSet` (41 champs)
3. `saveUserInsights()` persiste dans localStorage (`dp_user_insights`)
4. Rapport Wrapped s'affiche (6 sections + Conversation/Swipe Pulse)
5. Separateur visuel "Tes Insights personnalises"
6. `InsightsContent` rend les 11 sections Insights avec les donnees personnalisees
7. L'utilisateur peut aussi voir `/insights` en mode personnalise (donnees persistees)

**Rapport** (`WrappedReport.tsx`) — 6 sections principales + 2 modules avances :

| Section | id | Contenu |
|---------|----|---------|
| Vue d'ensemble | wr-overview | SpotlightCards (swipes, matches, temps), NarrativeIntro, funnel |
| Timing | wr-timing | Meilleurs jours (day-of-week bars), CTA contextuel |
| Conversion | wr-conversion | Purchases ROI, comment impact, premium |
| Conversations | wr-conversations | Ghost rate, response time, survival curve |
| ADN Dating | wr-dna | RadarChart 6 axes + benchmarks quintiles |
| Verdict | wr-verdict | Score composite + archetype + CTA onboarding |

**Conversation Pulse** (conditionnel : messages disponibles) :
- 10 sections avec SectionNav dedié (badge "Conversation Pulse")
- H1-H50 : ghost detection, survival curve, question density, opener analysis, escalation timing, double-text, fatigue, CDS composite
- H51-H70 : patterns avances (temporal, linguistic, behavioral)

**Swipe Pulse** (conditionnel : swipes >= 50) :
- 5 sections avec SectionNav dedie (badge "Swipe Pulse")
- H71-H74 Algorithme : velocity decay, match clustering, like-to-match latency, post-inactivity surge
- H75-H78 Psychologie : selectivity oscillation, pass streak, late-night desperation, superlike paradox
- H79-H82 Rythmes : circadian signature, weekly micro-cycles, month-start renewal, drought-to-binge
- H83-H86 Conversion : first-swipe bonus, right-swipe momentum, match quality by selectivity, diminishing returns
- H87-H90 Meta : active vs passive days, app open decisiveness, subscription timing, swipe personality archetype

**Feature flags** : `isConversationPulseEnabled()` avec kill switch J+21 (2026-03-24)

### F6 — Page Insights (dual-mode)

Encyclopedie des 90 hypotheses — mode **personnalise** ou **demo** :

**Mode dual** (`useInsightsData` hook) :
- Si `dp_user_insights` present dans localStorage → mode "personal" via `generateUserInsights()`
- Sinon → mode "demo" avec donnees CEO anonymisees (`insightsData.ts`)
- Banniere de contexte adaptee ("Tes donnees [app]" vs "Exemple — etude de cas")

**Architecture composant** :
- `InsightsContent.tsx` : composant de rendu pur, prend `InsightsDataSet` + `mode` en props
- Reutilise dans `/insights` (page standalone) ET dans `/wrapped` (inline apres rapport)
- 5 composants utilitaires extraits : `VerdictBadge`, `AppTag`, `SeverityDot`, `ImpactDots`, `ComparisonTable`

**Contenu** :
- 11 sections : Hero, Profil, Conversations, Opener, Timing, Algorithme, Premium, Photo, Hypotheses, Clusters, Plan d'action
- Filtres par verdict (confirmed/debunked/mixed) et par theme
- Recommendations associees a chaque hypothese
- Hero stats animes (compteurs filtres dynamiques)

### F7 — Match Tracker

- Saisie manuelle de matches (app, date, note)
- Score DatePulse capture automatiquement au moment du match
- Dashboard : total, score moyen, meilleur jour, meilleure heure
- Correlation score/matches (high score vs low score matches)
- Graphique hebdomadaire
- 100% localStorage

### F8 — Auto Swiper (automation locale)

- Bouton frontend → POST localhost:5555 → Python server → Chrome + Auto Swiper extension
- Tinder et Bumble uniquement
- Modes : serveur HTTP, cron automatique, CLI

### F9 — PWA + Offline

- Installable iOS + Android
- Service worker Workbox (precache ~365KB)
- Auto-update silencieux

---

## 6. Architecture technique

### 6.1 Stack

| Couche | Techno |
|--------|--------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |
| Edge Function | Vercel (proxy LLM) |
| Deploy | Vercel |
| Tests | Vitest + jsdom + Testing Library |
| Automation | Python 3.11+ (local Windows) |

### 6.2 Structure du projet

```
DatePulse/
├── CLAUDE.md                              # Instructions Claude Code (source de verite)
├── CDC_DATEPULSE_V4.md                    # Ce document
├── archive/                               # CDC et COSTRAT obsoletes
│
├── frontend/                              # SPA React (Vercel)
│   ├── src/
│   │   ├── App.tsx                        # SPA routing custom (5 routes)
│   │   ├── main.tsx                       # Entry point
│   │   │
│   │   ├── lib/                           # 23 fichiers logique metier
│   │   │   ├── data.ts                    # Lookup tables par app
│   │   │   ├── scoring.ts                 # computeScore(), heatmap, labels
│   │   │   ├── franceTime.ts              # Helpers timezone Europe/Paris
│   │   │   ├── wrappedParser.ts           # Parser RGPD (Tinder/Bumble/Hinge)
│   │   │   ├── wrappedMetrics.ts          # Metriques Wrapped
│   │   │   ├── conversationIntelligence.ts # Conversation Pulse (H1-H50)
│   │   │   ├── conversationAdvanced.ts    # Conversation avancee (H51-H70)
│   │   │   ├── swipeAdvanced.ts           # Swipe Pulse (H71-H90)
│   │   │   ├── insightsData.ts            # 90 hypotheses + verdicts + recommendations (demo)
│   │   │   ├── insightsEngine.ts          # generateUserInsights() — moteur personnalisation
│   │   │   ├── insightsPersistence.ts     # save/load/clear dp_user_insights localStorage
│   │   │   ├── useInsightsData.ts         # Hook dual-mode (personal vs demo)
│   │   │   ├── benchmarks.ts              # Quintiles SwipeStats (n=1209)
│   │   │   ├── featureFlags.ts            # Kill switch Conversation Pulse
│   │   │   ├── shareImage.ts              # Generation image de partage
│   │   │   ├── llmService.ts              # Proxy OpenRouter
│   │   │   ├── profileAudit.ts            # Analyse profil IA
│   │   │   ├── messageCoach.ts            # Coach de messages
│   │   │   ├── matchTracker.ts            # CRUD matches localStorage
│   │   │   ├── sessionTracker.ts          # Tracking sessions
│   │   │   ├── rankings.ts               # Classement Play Store FR
│   │   │   ├── boostOptimizer.ts          # Optimisation boosts
│   │   │   └── weeklyReport.ts            # Rapport hebdomadaire
│   │   │
│   │   ├── lib/__tests__/                 # 6 suites, 226 tests
│   │   │   ├── wrappedParser.test.ts      # 36 tests
│   │   │   ├── wrappedMetrics.test.ts     # 34 tests
│   │   │   ├── conversationIntelligence.test.ts # 30 tests
│   │   │   ├── conversationAdvanced.test.ts     # 53 tests
│   │   │   ├── swipeAdvanced.test.ts      # 53 tests
│   │   │   └── benchmarks.test.ts         # 20 tests
│   │   │
│   │   ├── components/                    # 24 composants UI
│   │   │   ├── SharedInsightComponents.tsx # 10 composants partages (Insights + Wrapped)
│   │   │   ├── InsightsContent.tsx        # Rendu pur des 11 sections Insights (reutilisable)
│   │   │   ├── NavBar.tsx                 # Navigation sticky
│   │   │   ├── ScoreGauge.tsx             # Jauge circulaire 0-100
│   │   │   ├── HeatmapWeek.tsx            # Grille 7j x 24h
│   │   │   ├── WrappedReport.tsx          # Rapport Wrapped complet
│   │   │   ├── WrappedUpload.tsx          # Upload RGPD
│   │   │   ├── WrappedShare.tsx           # Partage Wrapped
│   │   │   ├── ProfileAudit.tsx           # Audit profil IA
│   │   │   ├── MessageCoach.tsx           # Coach messages
│   │   │   └── ... (13 autres)
│   │   │
│   │   └── pages/                         # 7 pages
│   │       ├── Home.tsx                   # Score live + heatmap + CTAs
│   │       ├── Coach.tsx                  # Audit + Coach (tabs)
│   │       ├── Wrapped.tsx                # Upload → rapport
│   │       ├── Tracker.tsx                # Match tracker
│   │       ├── Insights.tsx               # Encyclopedie hypotheses
│   │       ├── Methodology.tsx            # (route → Coach)
│   │       └── Audit.tsx                  # (route → Coach)
│   │
│   ├── api/
│   │   └── llm.ts                         # Vercel Edge Function (OpenRouter proxy)
│   │
│   ├── public/
│   │   ├── trends.json                    # Google Trends modifier (cron 2h)
│   │   ├── weather.json                   # Fallback meteo statique
│   │   └── data/                          # Rankings Play Store (cron daily)
│   │
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tailwind.config.js
│   └── vercel.json
│
├── scripts/                               # Automation locale (Windows)
│   ├── trends_live.py                     # Google Trends → trends.json (cron 2h)
│   ├── auto_trigger.py                    # Auto Swiper (cron + HTTP server)
│   ├── scrape_rankings.py                 # Play Store FR scraper (GitHub Actions daily)
│   └── scoring_engine.py                  # Port Python du scoring TS
│
└── .github/workflows/
    ├── test.yml                           # CI : npm ci + build (push/PR master)
    └── rankings.yml                       # Daily rankings scraper (06:00 UTC)
```

### 6.3 Composants partages

**SharedInsightComponents.tsx** — 11 composants UI mutualises :

| Composant | Description |
|-----------|-------------|
| `fadeIn()` | Animation scroll-triggered |
| `fadeHero()` | Animation hero (above fold) |
| `GlassCard` | Carte glass morphism |
| `AnimatedCounter` | Compteur anime (IntersectionObserver) |
| `SpotlightCard` | Carte hero avec gradient |
| `NarrativeIntro` | Paragraphe narratif avec fade |
| `MiniBar` | Barres horizontales animees |
| `ExpandToggle` | Section depliable |
| `SectionTitle` | Titre de section avec emoji + gradient |
| `ProgressRing` | Anneau de progression SVG |
| `SectionNav` | Pilules de navigation sticky (generique) |

**InsightsContent.tsx** — composant de rendu pur (V4.1) :

| Element | Description |
|---------|-------------|
| `InsightsContent` | Composant principal — prend `InsightsDataSet` + `mode` en props |
| `VerdictBadge` | Badge verdict (confirme/refute/mixte) |
| `AppTag` | Tag app (Tinder/Hinge/Both) |
| `SeverityDot` | Point de severite (critical/warning/good) |
| `ImpactDots` | 3 points d'impact |
| `ComparisonTable` | Tableau comparatif Tinder vs Hinge |

Reutilise dans : `/insights` (page standalone) et `/wrapped` (inline apres rapport, lazy-loaded).

### 6.4 Data flow

```
Frontend (Vercel)
  ├── Lookup tables statiques → Score live (100% client-side)
  ├── wttr.in/Paris → Weather modifier (cache localStorage 30min)
  ├── trends.json → Trends modifier (cache localStorage 2h)
  ├── /api/llm → Vercel Edge Function → OpenRouter (Profile Audit, Message Coach)
  └── Upload RGPD → Parser client-side → Wrapped rapport
       └── generateUserInsights() → InsightsDataSet → InsightsContent inline
       └── saveUserInsights() → dp_user_insights localStorage → /insights dual-mode

Automation (local Windows)
  ├── trends_live.py (cron 2h) → trends.json
  └── auto_trigger.py (HTTP server port 5555) → Chrome + Auto Swiper
```

### 6.5 Persistance

Tout en localStorage :
- `datepulse_matches` — Match Tracker
- `datepulse_sessions` — Sessions
- `datepulse_active_session` — Session en cours
- `datepulse_last_audit` — Dernier audit
- `dp_weather` — Cache meteo (30min TTL)
- `dp_trends` — Cache trends (2h TTL)
- `dp_user_insights` — Bridge Wrapped→Insights (~200KB metriques agregees, pas de TTL)

---

## 7. Les 90 Hypotheses

### Vue d'ensemble

| Cluster | IDs | Source | Fichier |
|---------|-----|--------|---------|
| Statiques (insights) | H1-H50 | Personal/ (data CEO) | insightsData.ts |
| Conversation avancee | H51-H70 | Analyse conversationnelle | conversationAdvanced.ts |
| Swipe avance | H71-H90 | Analyse comportementale swipes | swipeAdvanced.ts |

### H1-H50 : Insights statiques

9 themes : Ghosting, Openers, Timing, Conversations, Algorithme, Comportement, Premium, Psychologie, Meta. Chaque hypothese a un verdict (confirmed/debunked/mixed), une severite (critical/warning/good), une app cible (tinder/hinge/both), et des recommendations.

### H51-H70 : Conversation avancee

20 hypotheses sur les patterns conversationnels profonds : emoji decay, vocabulary richness, response time variance, question cascading, conversation momentum, etc.

### H71-H90 : Swipe Pulse

| Cluster | Hypotheses | Theme |
|---------|-----------|-------|
| A — Algorithme Fantome | H71-H74 | Velocity decay, match clustering, latency drift, post-inactivity surge |
| B — Psychologie du Swipe | H75-H78 | Selectivity oscillation, pass streak, late-night desperation, superlike paradox |
| C — Rythmes Caches | H79-H82 | Circadian signature, weekly micro-cycles, month-start renewal, drought-to-binge |
| D — Conversion Secrete | H83-H86 | First-swipe bonus, right-swipe momentum, match quality by selectivity, diminishing returns |
| E — Meta-Strategie | H87-H90 | Active vs passive days, app open decisiveness, subscription timing, swipe personality archetype |

**dailyOnly handling** : 9 hypotheses necessitent des timestamps per-swipe. Quand `dailyOnly=true` (Tinder Format B), ces cartes UI sont masquees.

---

## 8. Design System

- **Theme** : Dark (`bg-[#080b14]`), glass morphism (`rounded-2xl border border-white/10 bg-white/[0.02]`)
- **Brand** : Indigo (#6366f1), palette 50-900 dans tailwind.config.js
- **App colors** : Tinder `#ec4899`, Bumble `#f59e0b`, Hinge `#8b5cf6`, Happn `#f97316`
- **Typography** : text-gray-100 primary, text-gray-400/500 secondary, gradient titles (brand-400 → brand-600)
- **Animations** : Framer Motion (opacity 0→1, y 20→0), staggered delays, hover scale
- **Layout** : max-w-4xl pour toutes les pages de contenu (Wrapped, Insights, Tracker, Coach), max-w-2xl pour les formulaires (upload Wrapped)

---

## 9. Tests

226+ tests dans 8 suites Vitest :

| Suite | Tests | Couverture |
|-------|-------|-----------|
| wrappedParser.test.ts | 36 | Parser Tinder A/B, Bumble, Hinge, edge cases |
| wrappedMetrics.test.ts | 34 | Metriques, taux, monthly data, benchmarks |
| conversationIntelligence.test.ts | 30 | Ghost detection, survival curve, question density |
| conversationAdvanced.test.ts | 53 | Patterns linguistiques, temporels, comportementaux |
| swipeAdvanced.test.ts | 53 | Velocity, clustering, circadian, archetypes |
| benchmarks.test.ts | 20 | Quintiles, distributions, edge cases |
| insightsEngine.test.ts | — | Moteur generateUserInsights(), mapping 41 champs |
| insightsPersistence.test.ts | — | save/load/clear localStorage bridge |

**CI** : GitHub Actions (push/PR master) execute `npm ci && npm run build`. Les tests ne sont PAS executes en CI (a ajouter).

---

## 10. Deploiement

- **Frontend** : Vercel — `https://frontend-sigma-gules-59.vercel.app`
- **Edge Function** : `frontend/api/llm.ts` (OPENROUTER_KEY en env Vercel)
- **PWA** : vite-plugin-pwa, Workbox, `registerType: "autoUpdate"`
- **Rankings** : GitHub Actions daily scraper (06:00 UTC → data/rankings-*.json)
- **Google Trends** : Python cron local toutes les 2h → trends.json

---

## 11. Monetisation (non implementee)

Modele prevu (pas encore en place) :
- **Curieux** (Free) : Score live + heatmap + Wrapped basique
- **Engage** ($9.99/mois) : Profile Audit illimite + benchmarks detailles
- **Serieux** ($19.99/mois) : Message Coach illimite + Conversation Pulse premium
- **Paywall** : conditionnel a retention J7 >= 15%

---

## 12. Hors scope

- Base de donnees / backend
- Comptes utilisateur / authentification
- Paiement / Stripe / LemonSqueezy (reporte)
- Multi-villes (Paris only, les patterns sont nationaux)
- LLM dans Conversation Pulse (100% client-side = argument confiance)
- TikTok / contenu video
- Newsletter / email forecast
- Backend pour benchmarks anonymises (checkbox opt-in dormante en place)

---

## 13. Dette technique

1. **CI sans tests** — `npm test` non execute en CI, seulement `npm run build`
2. **enrichMatchesWithMessages** — fuzzy match ±24h, collisions possibles si 2 matches le meme jour
3. **Share image** — Canvas API, rendu non-identique cross-browser
4. **Benchmarks internationaux** — n=1209, 88% anglophones, pas FR. Quintiles qualitatifs attenuent
5. **trends_live.py local** — si PC eteint, trends.json stale
6. **Recharts** — ~350KB gzipped (lazy-loaded)
7. **Kill switch J+21** — Conversation Pulse desactive apres 2026-03-24 si engagement < 30%
8. **Tinder Format B dailyOnly** — certaines metriques degradees (pas de timestamps per-swipe)
9. **H18 blacklistee** — "Wait J+1" interdit en prescriptif (variable confondante)
10. **README.md obsolete** — decrit encore l'ancienne architecture FastAPI/SQLite
11. **InsightsContent inline dans Wrapped** — lazy-loaded, ajoute ~120KB au chunk Wrapped si utilisateur uploade des donnees
12. **generateUserInsights() couverture partielle** — 31/74 hypotheses Bucket A implementees (V4.1), reste en fallback demo

---

## 14. Metriques de succes

| Metrique | Cible | Mesure |
|----------|-------|--------|
| wrapped_uploaded events | baseline +30% | Vercel Analytics |
| Temps moyen Wrapped | >3 min | Analytics |
| CTA click-through Wrapped → DatePulse | >10% | Event tracking |
| share_clicked | >3% | Event tracking |
| Retention J7 | >=15% (seuil paywall) | Analytics |
| SEO "analyser donnees Tinder" | top 10 Google FR | Search Console |
| Page /insights engagement | scroll >50% | IntersectionObserver |
