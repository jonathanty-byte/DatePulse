# CDC — DatePulse (Ship 12 — Projet #3)

> **L'outil qui te dit quand ouvrir ton app de dating pour maximiser tes matches.**

---

## 1. Vision

### 1.1 Problème

Les utilisateurs d'apps de dating swipent au hasard, sans savoir quand l'activité est réellement élevée. Résultat : des sessions improductives aux heures creuses et des opportunités ratées aux pics d'activité. Aucun outil n'agrège les signaux d'activité dating en France pour prédire les meilleurs moments.

### 1.2 Solution

DatePulse est un concentrateur de données qui agrège des signaux publics (Google Trends, Wikipedia Pageviews, Bluesky, App Store Reviews, météo, calendrier) pour produire un score d'activité en temps réel par app de dating et une projection prévisionnelle. L'utilisateur reçoit des alertes quand l'activité dépasse un seuil historique.

### 1.3 Proposition de valeur

- **Pour l'utilisateur final** : "Ouvre Tinder maintenant, l'activité est +43% au-dessus de la moyenne" → plus de matches par minute investie.
- **Pour les créateurs de contenu dating** : données factuelles pour alimenter leurs articles/vidéos.
- **Pour les apps B2B** : intelligence marché sur les patterns d'usage concurrents.

### 1.4 Positionnement

Bloomberg Terminal du dating. Aucun concurrent direct. Les apps de dating gardent leurs données propriétaires — DatePulse reconstruit l'intelligence par proxy externe.

### 1.5 Cible

- **Primaire** : Hommes 25-40 ans, utilisateurs actifs de 2+ apps de dating, tech-savvy, urbains (Paris, Lyon, Bordeaux).
- **Secondaire** : Créateurs de contenu dating/lifestyle, journalistes tech.
- **Tertiaire (B2B)** : Apps de dating émergentes cherchant de l'intelligence concurrentielle.

---

## 2. Assets disponibles

### 2.1 Données accessibles gratuitement (zéro auth)

| Source | Type de donnée | Méthode d'accès | Fréquence | Auth requise |
|--------|---------------|-----------------|-----------|--------------|
| Google Trends (pytrends) | Intérêt de recherche par terme, région FR, historique 5 ans | API Python `pytrends` | Quotidien (horaire sur 7j, hebdo sur 5 ans) | Non |
| Wikipedia Pageviews | Vues quotidiennes des pages Tinder/Bumble/Hinge/Happn sur fr.wikipedia | API REST Wikimedia | Quotidien (historique complet) | Non |
| Bluesky (AT Protocol) | Mentions/posts contenant les noms d'apps dating, filtrés FR | API REST publique | Temps réel | Non |
| App Store Reviews (FR) | Volume et fréquence des avis iOS/Android | `app-store-scraper` / `google-play-scraper` (npm) | Quotidien | Non |
| Open-Meteo | Météo actuelle et prévisions 7 jours, par ville | API REST gratuite | Horaire | Non |
| Jours fériés / événements | Calendrier FR, Saint-Valentin, rentrée, etc. | Statique (JSON maintenu manuellement) | Annuel | Non |

### 2.2 Endpoints clés

**Wikipedia Pageviews** :
```
https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/all-agents/{article}/daily/{start}/{end}
```
Articles cibles : `Tinder_(application)`, `Bumble_(application)`, `Hinge_(application)`, `Happn`

**Bluesky Search Posts** :
```
https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q={query}&lang=fr&limit=100
```
Queries : `tinder`, `bumble`, `hinge`, `happn`, `dating app`

**Open-Meteo** :
```
https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=precipitation_sum,temperature_2m_max
```

### 2.3 Données enrichissement (one-shot ou trimestriel)

| Source | Donnée | Accès |
|--------|--------|-------|
| INSEE | Démographie 18-40 ans par département, stats mariages/divorces | Open data gratuit |
| Match Group SEC Filings | Revenus Europe, MAU tendances, ARPU trimestriel | EDGAR (gratuit) |
| Statista (free tier) | Taux de pénétration dating FR, projections marché | Résumés gratuits |
| Sensor Tower (free tier) | Rankings app stores, estimations downloads | Dashboard gratuit limité |

### 2.4 Stack technique

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS
- **Backend / Data Engine** : Python 3.11+ (pytrends, requests, pandas, scikit-learn)
- **Base de données** : SQLite (fichier `data/datepulse.db`) — zéro config, zéro dépendance externe
- **Scheduler** : GitHub Actions (cron gratuit) ou Vercel Cron Jobs
- **Notifications MVP** : Telegram Bot API (gratuit, instantané)
- **Déploiement** : Vercel (frontend) + Railway free tier (Python workers)
- **Migration future** : Turso (SQLite edge) ou Supabase quand le produit scale

---

## 3. Features

### 3.1 MVP (Ship 12 scope — 5 jours)

#### F1 — Data Engine (Backend Python)

**Description** : Pipeline de collecte automatisé qui agrège les signaux depuis toutes les sources gratuites et les stocke en séries temporelles dans SQLite.

**Collecteurs** :

1. **google_trends.py** : Récupère l'intérêt horaire (7 derniers jours) et hebdomadaire (5 ans) pour les termes "Tinder", "Bumble", "Hinge", "Happn", "dating app" en France via `pytrends`.

2. **wikipedia.py** : Récupère les pageviews quotidiennes des articles FR Wikipedia pour chaque app de dating via l'API Wikimedia REST. Historique complet disponible.

3. **bluesky.py** : Cherche les posts récents mentionnant les apps de dating sur Bluesky via l'API publique AT Protocol. Comptabilise le volume de posts et l'engagement (likes, reposts) par créneau horaire.

4. **app_reviews.py** : Compte le nombre d'avis postés par jour sur l'App Store FR et le Google Play Store FR pour chaque app via `app-store-scraper` et `google-play-scraper`.

5. **weather.py** : Récupère la météo actuelle et les prévisions 7 jours pour Paris, Lyon, Bordeaux, Marseille, Lille via Open-Meteo.

6. **events.py** : Charge le calendrier d'événements FR (jours fériés, Saint-Valentin, rentrée, Nouvel An, etc.) depuis un fichier JSON statique.

7. **main.py (orchestrateur)** : Exécute tous les collecteurs séquentiellement avec gestion d'erreurs. Un collecteur en échec ne bloque pas les autres. Log les résultats.

**Critères d'acceptation** :
- Tous les collecteurs s'exécutent sans erreur en < 5 minutes.
- Les données sont persistées dans SQLite avec déduplication (UNIQUE constraints).
- Un dry-run peut être lancé manuellement via `python engine/main.py --dry-run`.
- Les erreurs d'un collecteur n'empêchent pas les autres de s'exécuter.
- Chaque collecteur est testable individuellement.

#### F2 — Modèle de Scoring

**Description** : Algorithme qui combine les signaux collectés en un score d'activité normalisé (0-100) par app et par créneau horaire.

**Formule** :
```
score = (
    0.35 × google_trends_normalized
  + 0.20 × wikipedia_pageviews_normalized
  + 0.10 × bluesky_mentions_velocity
  + 0.15 × app_review_volume_rolling_7d
  + 0.10 × seasonal_index
  + 0.05 × weather_boost_factor
  + 0.05 × day_hour_matrix_historical
)
```

**Détail des composants** :
- `google_trends_normalized` : Intérêt de recherche normalisé 0-100 (déjà fourni par Google Trends, re-normalisé sur l'historique).
- `wikipedia_pageviews_normalized` : Pageviews du jour normalisées sur la moyenne glissante 30 jours.
- `bluesky_mentions_velocity` : Nombre de posts/heure normalisé sur la moyenne des 7 derniers jours.
- `app_review_volume_rolling_7d` : Volume d'avis sur 7 jours glissants normalisé sur la moyenne mensuelle.
- `seasonal_index` : Score basé sur le calendrier (mois, jour de la semaine, événements spéciaux). Calibré sur l'historique Google Trends.
- `weather_boost_factor` : Boost quand il pleut ou fait froid (corrélation pluie ↔ activité indoor).
- `day_hour_matrix_historical` : Moyenne historique du score pour ce jour de semaine × heure.

**Calibration** :
- Poids initiaux définis empiriquement (ci-dessus).
- Backtesting sur 24 mois d'historique Google Trends + Wikipedia Pageviews.
- V2 : régression linéaire pour optimiser les poids sur données réelles.

**Sous-fonctionnalités** :
- Calcul du score brut par app × ville × heure.
- Normalisation 0-100 basée sur les percentiles historiques (même jour de semaine, même mois).
- Calcul du percentile temps réel : "ce score est dans le top X% historique".
- Projection J+7 basée sur seasonal_index + météo prévue + calendrier événements.

**Critères d'acceptation** :
- Le score est calculable pour chaque app × ville × créneau horaire.
- Le backtesting montre une corrélation > 0.6 entre le score composite et le volume Google Trends réel.
- La projection J+7 est générée et stockée.

#### F3 — API REST

**Description** : Endpoints qui exposent les scores et projections au frontend et au bot Telegram.

**Endpoints** :
```
GET /api/score/live
  ?app=tinder&city=paris
  → { score: 78, percentile: 92, trend: "rising", updated_at: "..." }

GET /api/score/forecast
  ?app=tinder&city=paris&days=7
  → { forecast: [{ date, hour, predicted_score, confidence }] }

GET /api/score/history
  ?app=tinder&city=paris&period=30d
  → { history: [{ date, hour, score }] }

GET /api/score/best-times
  ?app=tinder&city=paris
  → { best_times: [{ day: "dimanche", hour: "21h", avg_score: 85 }] }

GET /api/apps
  → { apps: ["tinder", "bumble", "hinge", "happn"] }

GET /api/health
  → { status: "ok", last_collection: "...", sources_status: {...} }
```

**Critères d'acceptation** :
- Temps de réponse < 500ms.
- Données mises à jour au minimum toutes les heures.
- CORS configuré pour le frontend Vercel.
- Endpoint /health pour monitoring.

#### F4 — Dashboard Frontend

**Description** : Interface web responsive affichant le score live, les projections et l'historique.

**Écrans** :
1. **Dashboard principal** :
   - Score live actuel (jauge circulaire animée 0-100) avec label contextuel ("Calme" / "Actif" / "En feu").
   - Indicateur de percentile : "Meilleur que 92% des créneaux".
   - Tendance : flèche montante/descendante avec delta.
   - Sélecteur d'app (Tinder, Bumble, Hinge, Happn) et de ville.
   - Badge "Données mises à jour il y a X min".

2. **Prévisions 7 jours** :
   - Heatmap jour × heure (lundi-dimanche, 0h-23h) colorée par score prévu.
   - Highlight des 5 meilleurs créneaux de la semaine.

3. **Historique** :
   - Graphique ligne : score sur 30 jours avec overlay événements (Saint-Valentin, météo, etc.).
   - Comparaison multi-apps en overlay.

4. **Best Times** :
   - Classement des meilleurs jours/heures par app, basé sur l'historique.

**Critères d'acceptation** :
- Mobile-first, responsive.
- Chargement initial < 2 secondes.
- Données rafraîchies automatiquement toutes les 30 minutes.
- Dark mode par défaut (cohérent avec l'usage "soirée" du dating).

#### F5 — Alerte Telegram (MVP Notifications)

**Description** : Bot Telegram qui envoie une alerte quand le score dépasse un seuil configurable.

**Logique** :
- Toutes les 30 minutes, le worker vérifie le score live.
- Si score > P85 historique → message "Bon moment".
- Si score > P95 historique → message "Moment exceptionnel".
- L'utilisateur peut configurer : apps suivies, ville, seuil de notification, heures silencieuses.

**Format du message** :
```
🔥 Activité Tinder +43% à Paris
Score : 87/100 (top 5% historique)
Les 2 prochaines heures sont optimales.
→ Ouvre Tinder maintenant

📊 Facteurs : Dimanche soir × Météo pluvieuse × Post-fête
```

**Commandes du bot** :
- `/start` — Inscription + configuration initiale
- `/now` — Score instantané pour les apps configurées
- `/settings` — Modifier apps, ville, seuils, heures silencieuses
- `/forecast` — Prévision des meilleurs créneaux des 48 prochaines heures
- `/stats` — Résumé de la semaine (meilleur créneau, score moyen, etc.)

**Critères d'acceptation** :
- Délai entre détection et notification < 2 minutes.
- Pas plus de 3 notifications par jour (anti-spam).
- Commandes fonctionnelles et réponses formatées.
- Gestion des heures silencieuses (pas de notif entre 23h et 8h par défaut).

#### F6 — Landing Page

**Description** : Page marketing avec proposition de valeur, démo live du score actuel, et CTA.

**Sections** :
1. Hero : headline + score live animé en temps réel.
2. How it works : 3 étapes illustrées.
3. Features : captures du dashboard et exemples d'alertes.
4. Social proof : compteur d'utilisateurs du bot.
5. CTA : "Rejoins le bot Telegram" + "Accède au dashboard".
6. Footer : liens, crédits données, méthodologie.

---

### 3.2 V2 (Post-Ship 12)

- **Reddit API** : Ajouter comme source quand/si l'accès API est approuvé.
- **Web Push Notifications** : Remplacer Telegram par des notifications navigateur natives.
- **Modèle ML avancé** : Random Forest ou XGBoost calibré sur 6+ mois de données réelles.
- **Profils personnalisés** : L'utilisateur renseigne ses stats pour des recommandations adaptées.
- **Score par quartier** : Granularité infra-ville pour Paris (arrondissements).
- **API B2B** : Documentation Swagger, clés API, rate limiting, pricing tiers.
- **Comparateur multi-apps** : "Sur ce créneau, Bumble a +15% d'activité vs Tinder".
- **Chrome Extension** : Overlay du score directement sur la version web des apps.

---

## 4. Architecture technique

### 4.1 Schéma global

```
┌─────────────────────────────────────────────────────────────┐
│                      SOURCES EXTERNES                        │
│  Google Trends · Wikipedia · Bluesky · App Stores · Météo    │
└───────────────────────────┬─────────────────────────────────┘
                            │ Collecte (cron toutes les heures)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATA ENGINE (Python)                         │
│  collectors/ → processor/ → scorer/ → storage/               │
│  Orchestrateur + error handling + logging                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ Write
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  SQLite (data/datepulse.db)                   │
│  raw_signals · scores · forecasts · telegram_users · alerts  │
└──────────┬──────────────────────────────────┬───────────────┘
           │ Read                              │ Read
           ▼                                   ▼
┌──────────────────────────┐  ┌────────────────────────────────┐
│  API REST (FastAPI)       │  │  TELEGRAM BOT (Python)         │
│  Score, forecast, history │  │  Alertes + commandes           │
└──────────┬───────────────┘  └────────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  FRONTEND (React + Vite)  │
│  Dashboard + Landing      │
└──────────────────────────┘
```

### 4.2 Structure du projet

```
datepulse/
├── README.md
├── CDC_DATEPULSE.md
├── .env                        # Variables d'environnement (git-ignoré)
├── .gitignore
│
├── engine/                     # Python data engine
│   ├── requirements.txt
│   ├── main.py                 # Orchestrateur principal (CLI: --dry-run)
│   ├── config.py               # Charge .env, constantes, villes, apps cibles
│   │
│   ├── collectors/
│   │   ├── __init__.py
│   │   ├── google_trends.py    # pytrends — intérêt horaire 7j + hebdo 5 ans
│   │   ├── wikipedia.py        # Wikimedia Pageviews API — vues quotidiennes
│   │   ├── bluesky.py          # AT Protocol — mentions sociales temps réel
│   │   ├── app_reviews.py      # App Store + Play Store reviews volume
│   │   ├── weather.py          # Open-Meteo API — météo actuelle + prévisions
│   │   └── events.py           # Calendrier événements FR (JSON statique)
│   │
│   ├── processor/
│   │   ├── __init__.py
│   │   ├── normalizer.py       # Normalisation 0-100 par percentile
│   │   └── scorer.py           # Calcul du score composite pondéré
│   │
│   ├── forecaster/
│   │   ├── __init__.py
│   │   ├── seasonal.py         # Index saisonnier (mois, jour, événements)
│   │   └── predictor.py        # Projection J+7
│   │
│   ├── storage/
│   │   ├── __init__.py
│   │   └── db.py               # SQLite init, tables, CRUD (insert_raw_signal, get_signals, etc.)
│   │
│   ├── alerts/
│   │   ├── __init__.py
│   │   └── telegram_bot.py     # Bot Telegram (commandes + alertes auto)
│   │
│   └── api/
│       ├── __init__.py
│       └── routes.py           # FastAPI endpoints
│
├── frontend/                   # React app
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   │
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ScoreGauge.tsx          # Jauge circulaire animée 0-100
│   │   │   ├── TrendIndicator.tsx      # Flèche tendance + delta
│   │   │   ├── HeatmapWeek.tsx         # Heatmap 7 jours × 24h
│   │   │   ├── HistoryChart.tsx        # Ligne historique 30j
│   │   │   ├── BestTimesTable.tsx      # Classement meilleurs créneaux
│   │   │   ├── AppSelector.tsx         # Sélecteur d'app
│   │   │   ├── CitySelector.tsx        # Sélecteur de ville
│   │   │   └── AlertPreview.tsx        # Preview format alerte Telegram
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Forecast.tsx
│   │   │   ├── History.tsx
│   │   │   └── Landing.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useScore.ts
│   │   │   ├── useForecast.ts
│   │   │   └── useHistory.ts
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                  # Client API
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── styles/
│   │       └── globals.css
│   │
│   └── public/
│       └── favicon.svg
│
├── data/
│   ├── datepulse.db            # SQLite database (git-ignoré)
│   ├── events_fr.json          # Calendrier événements FR
│   └── cities.json             # Villes cibles + coordonnées
│
└── scripts/
    ├── seed_historical.py      # Backfill 2 ans Google Trends + Wikipedia
    ├── calibrate_weights.py    # Optimisation poids du modèle
    └── deploy.sh               # Script déploiement
```

### 4.3 Schéma base de données (SQLite)

```sql
-- Signaux bruts collectés
CREATE TABLE IF NOT EXISTS raw_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    source TEXT NOT NULL,                  -- 'google_trends', 'wikipedia', 'bluesky', 'app_reviews', 'weather', 'events'
    app_name TEXT,                          -- 'tinder', 'bumble', 'hinge', 'happn', NULL pour météo/events
    city TEXT DEFAULT 'paris',
    metric_type TEXT NOT NULL,             -- 'search_interest', 'pageviews', 'post_count', 'review_count', etc.
    value REAL NOT NULL,
    metadata TEXT,                          -- JSON sérialisé, données brutes complémentaires
    UNIQUE(collected_at, source, app_name, city, metric_type)
);

-- Scores calculés
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calculated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    app_name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'paris',
    score REAL NOT NULL,                   -- 0.00 à 100.00
    percentile REAL,                       -- percentile historique
    trend TEXT,                            -- 'rising', 'falling', 'stable'
    components TEXT,                        -- JSON sérialisé, détail par facteur
    UNIQUE(calculated_at, app_name, city)
);

-- Prévisions
CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    target_date TEXT NOT NULL,             -- 'YYYY-MM-DD'
    target_hour INTEGER NOT NULL,          -- 0-23
    app_name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'paris',
    predicted_score REAL NOT NULL,
    confidence REAL,                       -- 0.00 à 1.00
    UNIQUE(generated_at, target_date, target_hour, app_name, city)
);

-- Utilisateurs Telegram
CREATE TABLE IF NOT EXISTS telegram_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    settings TEXT DEFAULT '{"apps": ["tinder", "bumble"], "city": "paris", "threshold_percentile": 85, "quiet_hours_start": 23, "quiet_hours_end": 8, "max_alerts_per_day": 3}'
);

-- Historique alertes envoyées
CREATE TABLE IF NOT EXISTS alerts_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    telegram_id INTEGER NOT NULL,
    app_name TEXT NOT NULL,
    score REAL NOT NULL,
    percentile REAL NOT NULL,
    message_text TEXT
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_raw_signals_time ON raw_signals(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_signals_source_app ON raw_signals(source, app_name);
CREATE INDEX IF NOT EXISTS idx_scores_time ON scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_app_city ON scores(app_name, city);
CREATE INDEX IF NOT EXISTS idx_forecasts_target ON forecasts(target_date, target_hour, app_name);
```

### 4.4 Variables d'environnement

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=

# Config
DEFAULT_CITY=paris
DB_PATH=data/datepulse.db
SCORING_INTERVAL_MINUTES=30
ALERT_COOLDOWN_MINUTES=120

# Apps cibles
TARGET_APPS=tinder,bumble,hinge,happn

# Villes cibles
TARGET_CITIES=paris,lyon,bordeaux,marseille,lille
```

Note : Aucune clé API requise pour les collecteurs MVP (Google Trends, Wikipedia, Bluesky, Open-Meteo, App Store Reviews). Seul le bot Telegram nécessite un token.

---

## 5. Sprint Roadmap (5 jours)

### Jour 1 — Data Engine Core

**Objectif** : Pipeline de collecte fonctionnel, données en base.

| Tâche | Durée | Livrable |
|-------|-------|----------|
| Setup projet Python + SQLite + tables SQL | 1h | Structure + DB prête |
| Collecteur Google Trends (pytrends) | 2h | google_trends.py fonctionnel |
| Collecteur Wikipedia Pageviews (API REST) | 1h | wikipedia.py fonctionnel |
| Collecteur Bluesky (AT Protocol) | 1.5h | bluesky.py fonctionnel |
| Collecteur App Store Reviews | 1.5h | app_reviews.py fonctionnel |
| Collecteur Météo (Open-Meteo) | 1h | weather.py fonctionnel |
| Orchestrateur + premier run complet | 1h | main.py exécutable |

**Validation J1** : `python engine/main.py --dry-run` collecte et stocke des données depuis toutes les sources. Vérifier avec :
```bash
sqlite3 data/datepulse.db "SELECT source, COUNT(*) FROM raw_signals GROUP BY source;"
```

### Jour 2 — Modèle de Scoring + Historique

**Objectif** : Score calculable, backtesté sur 2 ans.

| Tâche | Durée | Livrable |
|-------|-------|----------|
| Script backfill 2 ans Google Trends + Wikipedia | 2h | seed_historical.py |
| Normalisation des signaux (0-100) | 1h | normalizer.py |
| Algorithme de scoring composite (7 composants) | 2h | scorer.py |
| Index saisonnier (calendrier + historique) | 1.5h | seasonal.py |
| Prédicteur J+7 | 1.5h | predictor.py |
| Calibration + backtesting | 1h | calibrate_weights.py |

**Validation J2** : Le score corrèle à > 0.6 avec les données historiques. `python scripts/calibrate_weights.py` affiche la matrice de corrélation.

### Jour 3 — API + Dashboard

**Objectif** : Interface utilisable avec données live.

| Tâche | Durée | Livrable |
|-------|-------|----------|
| API FastAPI : 6 endpoints (score, forecast, history, best-times, apps, health) | 2h | routes.py + deploy |
| Setup frontend React + Tailwind (dark mode) | 1h | Projet Vite initialisé |
| ScoreGauge + TrendIndicator components | 2h | Composants animés |
| HeatmapWeek + HistoryChart (recharts) | 2h | Visualisations |
| Page Dashboard assemblée | 1h | Dashboard fonctionnel |

**Validation J3** : Dashboard affiche le score live avec rafraîchissement auto. API répond en < 500ms.

### Jour 4 — Alertes + Landing

**Objectif** : Bot Telegram opérationnel, page marketing prête.

| Tâche | Durée | Livrable |
|-------|-------|----------|
| Bot Telegram : commandes /start /now /settings /forecast /stats | 2h | telegram_bot.py |
| Logique d'alertes : seuils + cooldown + quiet hours | 1.5h | Alertes automatiques |
| Landing page : hero avec score live + how it works + CTA | 2h | Landing.tsx |
| Intégration score live animé sur la landing | 1h | API connectée |
| Cron job setup (GitHub Actions) | 1h | Collecte automatisée |

**Validation J4** : Le bot répond à /now avec le score actuel. Les alertes se déclenchent quand le score dépasse P85.

### Jour 5 — Polish + Deploy + Launch

**Objectif** : Produit live, prêt pour distribution.

| Tâche | Durée | Livrable |
|-------|-------|----------|
| Tests end-to-end pipeline complet | 1.5h | Pipeline validé |
| SEO meta tags + OG images | 1h | SEO ready |
| Deploy Vercel (front) + Railway (engine + API) | 1h | Prod live |
| README + documentation API minimale | 1h | Docs |
| Rédaction post Reddit r/dating + r/OnlineDating | 1h | Post prêt (karma farming fait au préalable) |
| Rédaction post Product Hunt | 1h | Listing prêt |
| Annonce Telegram + Twitter/X | 0.5h | Distribution |

**Validation J5** : Produit accessible publiquement, premier post publié. Pipeline cron tourne toutes les heures.

---

## 6. Monétisation

### 6.1 Modèle Freemium

| Tier | Prix | Fonctionnalités |
|------|------|-----------------|
| **Free** | 0€ | Score du jour (1 app, 1 ville), tendance générale, best times globaux |
| **Pro** | 4.99€/mois | Alertes Telegram temps réel, toutes les apps, toutes les villes, heatmap 7j, historique 30j, prévisions horaires |
| **API B2B** | 49€/mois | Accès API complet, rate limit élevé, export CSV, webhook alertes |

### 6.2 Projections de revenus

| Mois | Utilisateurs gratuits | Pro | B2B | MRR |
|------|----------------------|-----|-----|-----|
| M1 | 200 | 5 | 0 | 25€ |
| M3 | 1000 | 30 | 1 | 199€ |
| M6 | 3000 | 100 | 3 | 647€ |
| M12 | 8000 | 300 | 8 | 1 892€ |

### 6.3 Canaux de distribution

1. **Reddit** : r/Tinder (4M+), r/dating_advice (2M+), r/OnlineDating — posts données/insights, pas promo directe. Nécessite karma farming préalable.
2. **Twitter/X** : Compte @DatePulse publiant le "rapport dating" hebdo avec score moyen par app.
3. **Product Hunt** : Launch avec démo live du score.
4. **SEO** : Articles blog "Meilleure heure pour Tinder en France", "Quand ouvrir Bumble".
5. **Partenariats créateurs** : Fournir des données gratuites aux YouTubers/TikTokers dating en échange de mentions.
6. **Bluesky** : Poster les alertes publiques sur un compte dédié (viralité organique).

---

## 7. KPIs

### 7.1 KPIs Produit

| KPI | Cible M1 | Cible M3 | Mesure |
|-----|----------|----------|--------|
| Utilisateurs dashboard (MAU) | 200 | 1000 | Analytics frontend |
| Utilisateurs bot Telegram | 50 | 200 | Compteur bot |
| Taux de rétention J7 | 30% | 40% | Retour sur dashboard |
| Alertes envoyées/jour | 50 | 500 | alerts_log table |
| Taux conversion Free→Pro | 2% | 3% | Stripe |

### 7.2 KPIs Techniques

| KPI | Cible | Mesure |
|-----|-------|--------|
| Uptime pipeline collecte | > 99% | GitHub Actions logs |
| Latence API P95 | < 500ms | Railway metrics |
| Corrélation score vs réalité | > 0.6 | Backtesting hebdo |
| Fraîcheur données | < 1h | Timestamp dernière collecte |
| Couverture sources | 5/6 sources actives | Endpoint /health |

### 7.3 KPIs Business

| KPI | Cible M3 | Cible M6 |
|-----|----------|----------|
| MRR | 199€ | 647€ |
| CAC (coût acquisition) | 0€ (organique) | < 2€ |
| LTV Pro (6 mois moyen) | 30€ | 30€ |
| Churn mensuel Pro | < 15% | < 10% |

---

## 8. Risques et mitigations

### 8.1 Risques techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Rate limiting pytrends (Google bloque les requêtes excessives) | Haute | Élevé | Espacer les requêtes (sleep 10-30s entre chaque), cacher agressivement, fallback sur données Wikipedia |
| Wikipedia Pageviews API indisponible temporairement | Faible | Moyen | Cache local 24h, le modèle fonctionne sans (redistribuer le poids) |
| Bluesky base utilisateurs FR trop faible pour être significative | Moyenne | Faible | Source à poids faible (0.10), complément pas pilier. Remplaçable par Mastodon si besoin |
| App Store scraping bloqué ou instable | Moyenne | Moyen | Utiliser plusieurs librairies (npm + Python fallback), cache résultats |
| SQLite limitations de concurrence en production | Faible (MVP) | Moyen | WAL mode activé, migration vers Turso/Supabase si scaling nécessaire |
| Données Google Trends pas d'horaire au-delà de 7j | Certaine | Moyen | Combiner hebdo long-terme + horaire court-terme, interpoler avec Wikipedia daily |

### 8.2 Risques produit

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Le score ne corrèle pas avec l'activité réelle des apps | Moyenne | Critique | Validation croisée multi-sources, transparence méthodologie, itération rapide des poids |
| Les utilisateurs ne font pas confiance à un "score de dating" | Moyenne | Élevé | Montrer la méthodologie, publier des rapports de précision, UX claire sur les limites |
| Marché trop niche | Moyenne | Élevé | Pivoter vers B2B si B2C ne décolle pas |
| Les apps de dating bloquent ou dénoncent le service | Faible | Moyen | Aucun scraping des apps elles-mêmes, uniquement données publiques tierces |

### 8.3 Risques légaux

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| RGPD : collecte de données personnelles | Très faible | Élevé | Aucune donnée personnelle collectée — uniquement des agrégats publics |
| Utilisation des noms de marque (Tinder, Bumble) | Faible | Moyen | Usage nominatif autorisé (comparaison), pas de confusion sur l'affiliation |
| Terms of Service Wikipedia / Bluesky | Très faible | Faible | APIs publiques, respect des rate limits, usage conforme |

---

## 9. Post-mortem template (à remplir après le sprint)

### Ce qui a bien fonctionné
- [ ] ...

### Ce qui n'a pas fonctionné
- [ ] ...

### Surprises / apprentissages
- [ ] ...

### Métriques de lancement
- Vues Reddit :
- Upvotes :
- Utilisateurs J1 :
- Inscriptions bot Telegram :
- Temps total de développement :

### Décision : continuer / pivoter / abandonner
- [ ] ...
