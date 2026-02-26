# CDC — DatePulse V3.2 (Ship 12 — Projet #3)

> **"C'est le bon moment pour swiper." — Un score simple, basé sur de la vraie data.**
>
> **Mise à jour : 26/02/2026** — Sprint UI (pulse jauge, heatmap responsive), PWA offline, Match Tracker inline, Auto Swiper.

---

## 0. Changements V2 → V3

| V2 (abandonné) | V3 (from scratch) |
|---|---|
| 6 collecteurs (GT, Wikipedia, Bluesky, App Reviews, Météo, Events) | 3 lookup tables statiques + 1 API live optionnelle |
| Backend Python + SQLite + FastAPI + Cron jobs | App React/Next.js full-stack, zéro backend séparé |
| Bot Telegram + Dashboard + Landing + API REST | Single Page App avec tout intégré |
| 7 composants de scoring pondérés | Formule déterministe : `heure × jour × mois × events` |
| 5 jours de dev estimés, 30+ fichiers | 2-3 jours, ~10 fichiers |
| Dépendance pytrends (rate limited, instable) | Zéro dépendance externe au runtime |

**Pourquoi ce pivot :** L'analyse de corrélation montre que Google Trends FR corrèle à r=0.995 avec les données officielles publiées. Autrement dit, les patterns d'activité dating sont **prévisibles à 99%** à partir de 3 variables statiques (heure, jour, mois). Les sources live n'ajoutent que ~1% de signal. Le CDC V2 sur-ingéniérait un problème résolu par une lookup table.

---

## 1. Vision

### 1.1 Problème

Les utilisateurs d'apps de dating ne savent pas quand l'activité est élevée. Ils swipent au hasard — souvent aux pires moments (vendredi 23h, août). Résultat : des sessions frustrantes avec peu de matches.

### 1.2 Solution

DatePulse donne un score d'activité en temps réel (0-100) basé sur les patterns publiés par Tinder, Bumble, Hinge et les études tierces. Pas de magie noire, pas d'IA bullshit — des données vérifiables qui disent "maintenant c'est bien" ou "attends dimanche soir".

### 1.3 Proposition de valeur

**Pour l'utilisateur :** "Ouvre Tinder maintenant — activité +43% vs la moyenne. Dimanche 21h = pic de la semaine."

**Pour le SEO / contenu :** Dashboard visuel partageable, heatmap semaine, best times.

### 1.4 Cible

- **Primaire :** Hommes 25-40, utilisateurs actifs de dating apps, urbains FR
- **Secondaire :** Créateurs contenu dating/lifestyle
- **Tertiaire :** Curiosité virale (r/Tinder, r/datascience, Twitter)

---

## 2. La Data — Ground Truth

### 2.1 Sources validées (publications officielles)

| Source | Donnée clé | Fiabilité |
|---|---|---|
| Tinder (Year in Swipe / blog) | Dating Sunday = pic annuel, 21h = pic quotidien | ✅ Officielle |
| Hinge (blog officiel) | Pic à 21h, fenêtre 19h-22h, octobre = pic messages | ✅ Officielle |
| Bumble (communiqués) | Lundi = jour le plus actif, pic 19h-20h, pré-Valentine +28% | ✅ Officielle |
| Match.com | Dating Sunday : +69% activité | ✅ Officielle |
| Nielsen | Pic quotidien à 21h | ✅ Étude tierce majeure |
| Ogury (6M profils) | Jeudi = spike hebdomadaire | ✅ Étude tierce |
| SwipeStats.io | 3,700+ profils Tinder réels, patterns démographiques | ✅ Dataset public |
| Dating.com | +30% activité nov-fév (cuffing season) | ✅ Étude tierce |

### 2.2 Courbe de vérité terrain

**PATTERN HORAIRE** (index relatif, 100 = pic à 21h)

| Tranche | Index | Note |
|---|---|---|
| 0h-5h | 5 | Plancher nocturne |
| 6h-7h | 10 | Réveil |
| 8h-10h | 25-30 | Mini-pic commute |
| 11h | 35 | Montée pré-midi |
| 12h-14h | 40-45 | Pic secondaire pause déjeuner |
| 15h-17h | 25-30 | Creux travail |
| 18h | 55 | Sortie bureau |
| 19h | 70 | Montée soirée |
| 20h | 85 | Pré-pic |
| **21h** | **100** | **PIC ABSOLU** — convergence toutes sources |
| 22h | 75 | Descente |
| 23h | 45 | Fin de soirée |

**PATTERN HEBDOMADAIRE** (index relatif, 100 = dimanche)

| Jour | Index | Note |
|---|---|---|
| Lundi | 90 | Momentum post-weekend |
| Mardi | 75 | Milieu de semaine |
| Mercredi | 75 | Milieu de semaine |
| Jeudi | 85 | Spike pré-weekend (Ogury) |
| Vendredi | 55 | CREUX — les gens sortent |
| Samedi | 60 | CREUX — idem |
| **Dimanche** | **100** | **PIC** — "Sunday Scaries" |

**PATTERN MENSUEL** (index relatif, 100 = janvier)

| Mois | Index | Note |
|---|---|---|
| **Janvier** | **100** | Dating Sunday, Nouvel An, Cuffing Season peak |
| Février | 90 | Pré-Valentine (+28% likes Bumble) |
| Mars | 75 | Descente progressive |
| Avril | 70 | |
| Mai | 65 | |
| Juin | 60 | |
| Juillet | 60 | |
| **Août** | **50** | **CREUX** — vacances |
| Septembre | 75 | Rebond rentrée |
| Octobre | 80 | Début cuffing season, pic messages Hinge |
| Novembre | 85 | Cuffing season monte |
| Décembre | 65 | Creux fêtes, rebond post-1er janvier |

### 2.3 Événements spéciaux (boosters/réducteurs)

```json
{
  "boosters": {
    "dating_sunday": { "date": "premier dimanche de janvier", "multiplier": 1.35 },
    "pre_valentine": { "range": "1-13 février", "multiplier": 1.20 },
    "nouvel_an": { "range": "1-7 janvier", "multiplier": 1.25 },
    "rentree": { "range": "1-15 septembre", "multiplier": 1.10 },
    "cuffing_start": { "range": "15 octobre - 30 novembre", "multiplier": 1.10 }
  },
  "reducers": {
    "noel": { "range": "24-26 décembre", "multiplier": 0.60 },
    "jour_an": { "date": "31 décembre", "multiplier": 0.50 },
    "15_aout": { "date": "15 août", "multiplier": 0.70 },
    "ete_peak": { "range": "15 juillet - 20 août", "multiplier": 0.85 }
  }
}
```

### 2.4 Validation statistique

Notre analyse de corrélation entre cette courbe théorique et les données Google Trends FR (reconstituées) montre :
- **Composite Google Trends FR : Pearson r = 0.995, R² = 0.989**
- Tinder seul : r = 0.990
- Bumble : r = 0.992
- Hinge : r = 0.989
- Happn : r = 0.910

→ **Les patterns sont suffisamment prévisibles pour qu'une lookup table statique soit aussi précise qu'un pipeline live complexe.**

---

## 3. Formule de Scoring

### 3.1 Score déterministe (V3 — MVP)

```
score(t) = hourly_index[hour(t)] 
         × weekly_index[dayOfWeek(t)] / 100 
         × monthly_index[month(t)] / 100
         × event_multiplier(t)
```

**Exemple : Dimanche 21h en janvier, pas d'événement spécial**
```
score = 100 × (100/100) × (100/100) × 1.0 = 100 → "En feu 🔥"
```

**Exemple : Vendredi 15h en août**
```
score = 28 × (55/100) × (50/100) × 1.0 = 7.7 → "Mort plat 💀"
```

### 3.2 Score enrichi (V3.1 — post-MVP, optionnel)

```
score_enriched(t) = score(t) × 0.85 + live_signal(t) × 0.15
```

Où `live_signal` = Google Trends FR "tinder" temps réel (via pytrends, 1 appel/heure max).
→ Ajoute les anomalies (buzz TV, événement imprévu) mais pas indispensable.

### 3.3 Mapping score → labels UX

| Score | Label | Couleur | Icône | Message |
|---|---|---|---|---|
| 0-15 | Mort plat | Gris | 💀 | "Évite de swiper maintenant" |
| 16-35 | Calme | Bleu | 😴 | "Peu d'activité en ce moment" |
| 36-55 | Moyen | Jaune | 🌤️ | "Activité correcte" |
| 56-75 | Actif | Orange | 🔥 | "Bon moment pour swiper" |
| 76-90 | Très actif | Rouge | ⚡ | "Excellente activité !" |
| 91-100 | En feu | Rouge vif + animation | 🚀 | "Moment optimal ! Fonce !" |

---

## 4. Features MVP

### F1 — Score Live (page principale)

**Ce que l'utilisateur voit :**
- Jauge animée 0-100 avec couleur contextuelle
- Label + icône + message actionnable
- "Dimanche 21h — Score 94/100 — 🚀 Moment optimal !"
- Delta vs moyenne : "+47% vs la moyenne de cette heure"
- Countdown vers le prochain créneau optimal

**Logique :** Calcul 100% côté client à partir des lookup tables embarquées.

### F2 — Heatmap Semaine

**Ce que l'utilisateur voit :**
- Grille 7 jours × 24h, colorée par score prédit
- Highlight des 5 meilleurs créneaux de la semaine
- "Tes 3 meilleurs moments cette semaine : Dim 21h (94), Lun 21h (90), Jeu 21h (85)"

**Logique :** Pré-calculé au chargement, ajusté par le mois en cours + événements.

### F3 — Best Times (quick answer)

**Ce que l'utilisateur voit :**
- Podium des 3 meilleurs créneaux de la semaine
- "Le meilleur moment pour [Tinder] à [Paris] : Dimanche 21h"
- Comparaison simple entre apps (pattern identique, seul le volume change)

### F4 — Page Méthodologie (crédibilité + SEO)

**Ce que l'utilisateur voit :**
- Sources citées avec liens (Tinder Year in Swipe, Hinge blog, etc.)
- Graphiques de corrélation
- Explication transparente de la formule
- "Nous n'inventons rien — nous agrégeons les données publiées par les apps elles-mêmes."

### F5 — Landing intégrée

Pas de landing séparée. La home page EST la landing :
- Score live animé en hero (hook immédiat)
- Scroll down → heatmap + best times
- CTA : "Partage ton résultat" (screenshot/lien)
- Footer : méthodologie, crédits, Evolved Monkey

### F6 — Auto Swiper (automation locale) ✅ IMPLÉMENTÉ

**Ce que l'utilisateur fait :**
- Clique sur le bouton "Lancer Auto Swiper — [App]" dans le frontend (Tinder ou Bumble uniquement)
- OU laisse le cron Windows décider automatiquement quand lancer

**Ce qui se passe :**
1. Le serveur local (`python auto_trigger.py --server`) reçoit la requête
2. Chrome s'ouvre sur l'app demandée (profil utilisateur, sessions déjà connectées)
3. Auto Swiper (extension Chrome) est activé via simulation clavier (pyautogui)
4. L'extension swipe automatiquement pendant la session

**Modes d'utilisation :**

| Mode | Commande | Description |
|---|---|---|
| Serveur HTTP | `python auto_trigger.py --server` | Écoute sur localhost:5555, déclenché par le bouton frontend |
| Cron automatique | `python auto_trigger.py` | Via Task Scheduler, lance si score >= seuil |
| Manuel CLI | `python auto_trigger.py --now` | Force le lancement immédiat |
| Historique | `python auto_trigger.py --history` | Affiche les sessions passées |

**Contraintes :**
- Auto Swiper = une seule app à la fois (pas de multi-tab)
- Le bouton n'apparaît que pour Tinder et Bumble (Hinge et Happn n'ont pas de webapp)
- Le serveur local doit tourner pour que le bouton fonctionne
- Nécessite pyautogui (`pip install pyautogui`)

**Configuration** (`scripts/auto_trigger_config.json`) :
```json
{
  "threshold": 70,
  "apps": ["tinder", "bumble"],
  "session_duration_minutes": 30,
  "chrome_path": "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "app_urls": {
    "tinder": "https://tinder.com/app/recs",
    "bumble": "https://bumble.com/app"
  },
  "quiet_hours": { "start": 1, "end": 7 }
}
```

### F7 — Sprint UI (polish mobile-first) ✅ IMPLÉMENTÉ

**Améliorations visuelles :**
- **ScoreGauge** : pulse animé (glow qui respire, intensité liée au score), taille responsive 180px mobile / 220px desktop
- **HeatmapWeek** : double layout — grille complète desktop + grille compacte mobile sans scroll horizontal, tooltip tactile
- **Tous les composants** : typographie responsive (`text-xs sm:text-sm`), spacing adaptatif, hover states, active:scale-95
- **Dark mode polish** : scrollbar custom, tap-highlight transparent, meilleur contraste textes secondaires
- **Animations** : stagger sur les cartes, scale transitions, cascade sur les lignes de heatmap

### F8 — PWA + Offline ✅ IMPLÉMENTÉ

**Ce que l'utilisateur peut faire :**
- Installer l'app sur Android (Chrome → "Installer l'application") et iOS (Safari → "Sur l'écran d'accueil")
- L'app fonctionne **100% hors-ligne** après la première visite (tout est client-side)
- Auto-update silencieux du service worker à chaque visite

**Stack technique :**
- `vite-plugin-pwa` : génère manifest, service worker (Workbox), registration automatique
- Precache de 15 fichiers (~365 KB) — cache-first strategy
- Manifest : `display: standalone`, orientation portrait, icônes SVG (192x192 + 512x512 maskable)
- Meta tags iOS : `apple-mobile-web-app-capable`, `black-translucent` status bar
- Headers Vercel : `Cache-Control: no-cache` sur sw.js, `Content-Type` correct sur manifest

### F9 — Match Tracker (inline) ✅ IMPLÉMENTÉ

**Ce que l'utilisateur voit :**
- Section intégrée dans la Home, directement sous la heatmap (colonne gauche 2/3)
- Bouton "+" pour ajouter un match (choix de l'app, date/heure, note optionnelle)
- Le score DatePulse au moment du match est capturé automatiquement
- Se synchronise avec l'app sélectionnée en haut (Tinder/Bumble/Hinge/Happn)

**Dashboard stats (à partir de 1+ match) :**
- 4 cards : total matches, score moyen, meilleur jour, meilleure heure
- Corrélation : nombre de matches à score haut (≥60) vs bas (<40) avec pourcentage
- Message d'insight si pattern détecté ("Tu matches plus quand DatePulse est haut !")

**Graphique (à partir de 2+ semaines) :**
- Bar chart matches par semaine, couleur = score moyen de la semaine

**Historique :**
- Liste animée des 5 derniers matches (expandable), avec indicateur app coloré, date, note, score
- Suppression avec double-clic confirmation

**Stockage :** 100% localStorage — mention "Stocké localement — rien n'est envoyé"

---

## 5. Architecture technique

### 5.1 Stack

| Couche | Techno | Justification |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | SPA légère, calcul 100% côté client |
| Styling | Tailwind CSS | Rapide, dark mode natif |
| Animations | Framer Motion | Jauge pulse, transitions fluides |
| PWA | vite-plugin-pwa + Workbox | Installable, offline, auto-update |
| Stockage local | localStorage | Match Tracker, 0 backend |
| Deploy | Vercel | Zero-config, gratuit tier hobby |
| Automation locale | Python 3.11+ | Script cron + serveur HTTP local |
| Extension Chrome | Auto Swiper (tierce) | Automatisation du swipe |

### 5.2 Structure du projet

```
DatePulse/
├── CLAUDE.md                          # Instructions Claude Code
├── CDC_DATEPULSE_Vlight.md            # Ce document
├── COSTRAT-*.md                       # Comptes-rendus sessions COMEX
│
├── frontend/                          # SPA React (déployée sur Vercel)
│   ├── src/
│   │   ├── App.tsx                    # SPA routing (/ et /methodology)
│   │   ├── main.tsx                   # Entry point
│   │   ├── lib/
│   │   │   ├── data.ts               # Lookup tables par app (hourly/weekly/monthly + events)
│   │   │   ├── scoring.ts            # computeScore(), heatmap, best times, countdown
│   │   │   ├── franceTime.ts         # Helpers timezone Europe/Paris
│   │   │   └── matchTracker.ts       # Match Tracker — CRUD localStorage, stats, agrégation
│   │   ├── components/
│   │   │   ├── ScoreGauge.tsx         # Jauge circulaire animée 0-100 + pulse
│   │   │   ├── ScoreLabel.tsx         # Label contextuel + message + delta
│   │   │   ├── HeatmapWeek.tsx        # Grille 7j × 24h (desktop + mobile compact)
│   │   │   ├── BestTimes.tsx          # Top 5 créneaux
│   │   │   ├── CountdownNext.tsx      # Countdown vers prochain pic
│   │   │   ├── AppSelector.tsx        # Sélecteur Tinder/Bumble/Hinge/Happn
│   │   │   ├── PoolFreshness.tsx      # Indicateur fraîcheur du pool + classement Play Store
│   │   │   └── MatchTrackerInline.tsx # Match Tracker inline (form + stats + chart + historique)
│   │   ├── pages/
│   │   │   └── Home.tsx               # Page principale (tout intégré sur une seule page)
│   │   └── styles/
│   │       └── globals.css            # Tailwind base + scrollbar + font smoothing
│   ├── public/
│   │   ├── favicon.svg                # Icône SVG
│   │   ├── icon-192.svg              # Icône PWA 192x192
│   │   ├── icon-maskable.svg         # Icône PWA maskable 512x512
│   │   └── og-image.png              # Open Graph image
│   ├── index.html                     # SEO meta tags + OG + PWA meta
│   ├── package.json
│   ├── vite.config.ts                 # Vite + vite-plugin-pwa
│   ├── tailwind.config.js
│   └── vercel.json                    # Vercel deploy config + rewrites + SW headers
│
├── scripts/                           # Automation locale (PC Windows)
│   ├── scoring_engine.py              # Port Python de data.ts + scoring.ts
│   ├── auto_trigger.py                # Script principal (cron + serveur HTTP + CLI)
│   ├── auto_trigger_config.json       # Config utilisateur (seuil, apps, chrome path)
│   ├── sessions.jsonl                 # Historique des sessions Auto Swiper
│   └── auto_trigger.log              # Logs d'exécution
```

### 5.3 Double architecture : Frontend + Automation locale

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Vercel)                                       │
│  React SPA — calcul score côté client                    │
│  Bouton "Lancer Auto Swiper" → POST localhost:5555       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (localhost uniquement)
┌──────────────────────▼──────────────────────────────────┐
│  SERVEUR LOCAL (PC Windows)                              │
│  python auto_trigger.py --server (port 5555)             │
│  Reçoit POST /trigger {app: "tinder"}                    │
│  → Ouvre Chrome (profil utilisateur, déjà connecté)      │
│  → Active Auto Swiper via pyautogui (Alt+Shift+S)       │
│  → Tab x14 + Enter pour cliquer Play                     │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  CRON (Windows Task Scheduler, toutes les 30 min)        │
│  python auto_trigger.py                                  │
│  Si score >= seuil (70) → lance l'app avec le meilleur   │
│  score automatiquement                                   │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Pas de base de données

Zéro serveur. Le scoring est calculé à la volée côté client. Les tables sont embarquées dans le bundle JS (~2KB) et dupliquées en Python pour l'automation. Le Match Tracker stocke ses données dans `localStorage` (persistant, local, 0 réseau).

### 5.5 Contrainte Auto Swiper

L'extension Auto Swiper ne peut tourner que sur **une seule app à la fois**. Le trigger (manuel ou cron) ne lance donc qu'une seule app par session :
- **Manuel (bouton)** : lance l'app actuellement sélectionnée dans le frontend
- **Cron** : lance l'app avec le meilleur score parmi celles configurées

---

## 6. Sprint Roadmap (3 jours)

### Jour 1 — Core + Score Live (4-5h)

| Tâche | Durée | Livrable |
|---|---|---|
| `npx create-next-app datepulse` + Tailwind + structure | 30min | Projet initialisé |
| `lib/data.ts` — les 3 lookup tables + events | 30min | Data layer complet |
| `lib/scoring.ts` — formule + computeScore() | 30min | Scoring fonctionnel |
| `ScoreGauge.tsx` — jauge circulaire animée (Framer Motion) | 1.5h | Composant principal |
| `ScoreLabel.tsx` — label + message contextuel | 30min | UX messaging |
| `page.tsx` — assemblage score live + auto-refresh 1min | 1h | Page principale |

**Validation J1 :** La page affiche le score actuel avec jauge animée, message contextuel, et se met à jour chaque minute.

### Jour 2 — Heatmap + Best Times + Polish (4-5h)

| Tâche | Durée | Livrable |
|---|---|---|
| `HeatmapWeek.tsx` — grille 7j×24h colorée | 2h | Heatmap fonctionnelle |
| `BestTimes.tsx` — podium top 3 créneaux | 45min | Quick answer |
| `CountdownNext.tsx` — timer vers prochain pic | 30min | Engagement |
| `AppSelector.tsx` — switch entre apps | 30min | Multi-app |
| Dark mode, responsive mobile-first | 1h | Polish UI |
| Meta tags SEO + OG image | 30min | Partageabilité |

**Validation J2 :** App complète avec score + heatmap + best times + responsive + dark mode.

### Jour 3 — Méthodologie + Deploy + Launch (4-5h)

| Tâche | Durée | Livrable |
|---|---|---|
| Page méthodologie (sources, formule, graphiques) | 1.5h | Crédibilité |
| `ShareButton.tsx` — capture/partage résultat | 45min | Viralité |
| API route `/api/score` pour embeds | 30min | Intégrabilité |
| Deploy Vercel + domaine | 30min | Prod live |
| README GitHub | 30min | Open source ready |
| Rédaction post Reddit r/Tinder (data-driven, pas promo) | 1h | Distribution |
| Rédaction tweet thread avec screenshots | 30min | Distribution |

**Validation J3 :** Produit live, partageable, avec post Reddit et tweet prêts.

---

## 7. Monétisation

### 7.1 MVP = Gratuit (zéro friction)

Pas de paywall au lancement. L'objectif est la traction, pas le revenu.

### 7.2 V3.1 — Monétisation douce

| Méthode | Comment | Quand |
|---|---|---|
| **Affiliate links** | Liens vers Tinder Gold/Bumble Premium ("Maximise ce créneau avec X") | M1 |
| **Ebook/guide** | "Le guide data-driven du dating en France" (Gumroad, 9.99€) | M2 |
| **Alertes Pro** (push/email) | Notifications "Score > 80 maintenant" | M3 si traction |
| **API B2B** | Pour créateurs contenu / apps tierces | M3+ si demande |

### 7.3 Projection réaliste

| Mois | Visiteurs | Revenu |
|---|---|---|
| M1 | 500-2000 (Reddit + SEO initial) | 0€ |
| M3 | 2000-5000 (SEO "meilleure heure tinder") | 50-200€ (affiliates) |
| M6 | 5000-15000 (SEO compound) | 200-500€ (affiliates + ebook) |

---

## 8. Distribution

### 8.1 Lancement (Jour 3-5)

1. **Reddit r/Tinder** (4M+ membres) — Post data-driven : "I analyzed 50+ official dating app publications to find the BEST time to swipe. Here's the data." Avec screenshots du heatmap. PAS de lien direct (valeur-first, lien en commentaire si demandé).

2. **Reddit r/datascience** — Angle technique : "I built a scoring model from published dating app data. Here's the correlation analysis."

3. **Twitter/X @EvolvedMonkey** — Thread avec les insights les plus surprenants (vendredi = pire jour, dimanche 21h = pic absolu, etc.) + screenshots.

4. **Hacker News** — "Show HN: DatePulse – When to swipe, backed by official dating app data"

### 8.2 Long-terme (SEO)

Articles blog ciblés :
- "Quelle est la meilleure heure pour Tinder en France ?" (volume de recherche élevé)
- "Quand ouvrir Bumble pour avoir plus de matchs ?"
- "Dating Sunday : pourquoi le premier dimanche de janvier est le meilleur jour"
- "Cuffing Season France : les vrais chiffres"

---

## 9. KPIs

### Lancement (semaine 1)

| KPI | Cible | Mesure |
|---|---|---|
| Visiteurs uniques J1-J7 | 500+ | Vercel Analytics |
| Reddit post upvotes | 50+ | Reddit |
| Temps moyen sur page | >1min | Analytics |
| Partages (share button clicks) | 30+ | Event tracking |

### Court-terme (M1-M3)

| KPI | Cible | Mesure |
|---|---|---|
| Visiteurs uniques / mois | 2000+ | Analytics |
| Taux de retour J7 | 15%+ | Analytics |
| Position SEO "meilleure heure tinder" | Top 20 | Google Search Console |
| GitHub stars | 50+ | GitHub |

---

## 10. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| "C'est juste une lookup table, pas un vrai produit" | Haute | Moyen | L'UX et la data-story FONT le produit. Les meilleures apps cachent la simplicité backend derrière une UX premium. |
| Patterns changent dans le temps | Faible | Faible | Les patterns horaires/hebdomadaires sont stables depuis 10+ ans de données. Mise à jour annuelle des index mensuels si nécessaire. |
| Reddit downvote (comme Boardroom AI) | Moyenne | Moyen | Post data-first sans lien. Valeur intrinsèque du post (insights intéressants même sans cliquer). Karma farming fait au préalable. |
| SEO trop compétitif | Moyenne | Moyen | Cibler des long-tails FR d'abord ("meilleure heure tinder france"). Peu de concurrence en français. |
| Les apps dating bloquent/dénoncent | Très faible | Faible | On n'utilise AUCUNE de leurs APIs ni données privées. Tout est basé sur leurs publications officielles. |

---

## 11. Ce qui est explicitement HORS SCOPE V3

- ❌ Base de données
- ❌ Bot Telegram
- ❌ Collecteurs de données (pytrends, Wikipedia, Bluesky, etc.)
- ❌ Comptes utilisateur / authentification
- ❌ Paiement / Stripe
- ❌ Multi-villes (Paris only pour MVP, les patterns sont nationaux)
- ❌ API publique documentée
- ❌ Auto Swiper multi-app simultané (limitation de l'extension)
- ❌ Auto Swiper pour Hinge / Happn (pas de webapp)

**Ce qui a été ajouté en V3.1 :**
- ✅ Scoring engine Python (port des lookup tables TypeScript)
- ✅ Script cron local pour automation Windows
- ✅ Serveur HTTP local (localhost:5555) pour le bouton frontend
- ✅ Intégration Auto Swiper via pyautogui
- ✅ Historique des sessions (sessions.jsonl)
- ✅ Lookup tables per-app (Tinder ≠ Bumble ≠ Hinge ≠ Happn)

**Ce qui a été ajouté en V3.2 :**
- ✅ Sprint UI : pulse jauge, heatmap responsive mobile, micro-animations, dark mode polish
- ✅ PWA : installable offline (vite-plugin-pwa, service worker, manifest, icônes)
- ✅ Match Tracker inline : saisie matches, stats, corrélation score/matches, graphique, historique
- ✅ Tout sur une seule page (pas de page séparée pour le tracker)

---

## 12. Prompt Claude Code — Copier-coller

```
Lis CDC_DATEPULSE_V3.md — c'est le cahier des charges du projet.

RÉSUMÉ : DatePulse est une Single Page App (Next.js) qui affiche un 
score d'activité dating (0-100) calculé à partir de 3 lookup tables 
statiques (heure, jour de semaine, mois) + événements spéciaux.

Zéro backend, zéro base de données, zéro API externe. 
Tout est calculé côté client.

JOUR 1 — Core + Score Live :
1. Setup Next.js 14 (App Router) + Tailwind + Framer Motion
2. Crée src/lib/data.ts avec les 3 lookup tables exactes du CDC
3. Crée src/lib/scoring.ts avec computeScore() 
4. Crée ScoreGauge.tsx — jauge circulaire animée (SVG + Framer Motion)
   - Couleur dynamique selon le score
   - Animation fluide au changement
   - Dark mode par défaut
5. Crée ScoreLabel.tsx — label contextuel + message actionnable
6. Assemble la page principale (score live + auto-refresh 1min)
7. Responsive mobile-first

Design : Dark mode, palette dating-app (dégradé rose/violet), 
typographie moderne, animations subtiles. Premium mais pas over-designed.

Ne fais que le Jour 1, on valide avant de continuer.
```

---

## 13. Post-mortem template

### Ce qui a bien fonctionné
- [ ] ...

### Ce qui n'a pas fonctionné
- [ ] ...

### Métriques de lancement
- Temps total de dev :
- Visiteurs J1 :
- Reddit upvotes :
- Partages :
- Position SEO à M1 :

### Décision : continuer / pivoter / abandonner
- [ ] ...

### Apprentissages pour Ship 12 #4
- [ ] ...
