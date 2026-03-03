# Recherche Data — Comportements Femmes sur les Apps de Dating

**DatePulse Research** — Mars 2026
Synthèse de 6 datasets analysés, ~160 000 profils, focus comportement féminin

---

## Table des matières

1. [Inventaire des datasets](#1-inventaire-des-datasets)
2. [Sélectivité féminine : le fossé fondamental](#2-sélectivité-féminine--le-fossé-fondamental)
3. [Le funnel complet : du swipe au date](#3-le-funnel-complet--du-swipe-au-date)
4. [Patterns d'activité et micro-sessions](#4-patterns-dactivité-et-micro-sessions)
5. [Ce que les femmes veulent (vraiment)](#5-ce-que-les-femmes-veulent-vraiment)
6. [Effet de l'âge](#6-effet-de-lâge)
7. [Impact des features de profil](#7-impact-des-features-de-profil)
8. [Distribution de Pareto (inégalité)](#8-distribution-de-pareto-inégalité)
9. [Messagerie et ghosting](#9-messagerie-et-ghosting)
10. [Satisfaction utilisateur et douleurs](#10-satisfaction-utilisateur-et-douleurs)
11. [Analyse par pays — Focus France](#11-analyse-par-pays--focus-france)
12. [Psychologie et personnalité](#12-psychologie-et-personnalité)
13. [Méthodologie et limites](#13-méthodologie-et-limites)

---

## 1. Inventaire des datasets

| # | Dataset | Source | N | Femmes | Période | Type de données |
|---|---------|--------|---|--------|---------|-----------------|
| 1 | OkCupid Profiles | Kaggle (SF Bay Area) | 59 946 | 24 117 | ~2012 | Profils déclaratifs |
| 2 | Lovoo v3 | Scrape européen | 4 008 | 4 008 | ~2015 | Profils + engagement |
| 3 | Speed Dating | Columbia Univ. | 551 participants, 8 378 dates | 274 | 2002-2004 | Décisions + notations |
| 4 | Tinder Reviews | Google Play | 668 656 | ~2 274 identifiées | 2013-2026 | Avis texte + notes |
| 5 | OkCupid Full (Kirkegaard) | Recherche académique | 68 371 | 25 952 | ~2015 | Profils + 2 541 questions + personnalité |
| 6 | SwipeStats Tinder | swipestats.io | 1 209 | 150 | ~2016-2021 | **Comportement réel** (swipes, matches, messages) |

**Datasets rejetés** :
- *Online Dating Behavior* (1 000 lignes) — synthétique/généré (genre 50/50, 11 valeurs de matches)
- *LibimSeT* (17.3M arêtes) — site tchèque de notation, aucune métadonnée genre/âge
- *SrLozano/Tinder-Big-Data-Analysis* — même données que SwipeStats (JSON brut 560Mo non accessible)

---

## 2. Sélectivité féminine : le fossé fondamental

La donnée la plus importante de toute l'analyse : **les femmes ne likent que 4.6% des profils.**

### Taux de like (% des profils swipés à droite)

| Source | Femmes | Hommes | Ratio |
|--------|--------|--------|-------|
| **SwipeStats** (réel Tinder) | **4.6%** (médiane) | 36.5% (médiane) | **8x** |
| Speed Dating (Columbia) | 36.8% (médiane yes) | 44.4% (médiane yes) | 1.2x |

En speed dating (face-à-face), l'écart est bien moindre car les femmes disent oui à 37% des hommes. **C'est l'interface de swipe qui amplifie la sélectivité féminine** — passer de "est-ce que je le reverrais" (37%) à "est-ce que je like sa photo" (4.6%) représente une chute de 8x.

### Taux de match (matches / likes envoyés)

| Source | Femmes | Hommes | Ratio F/H |
|--------|--------|--------|-----------|
| SwipeStats — moyenne | 40.2% | 4.1% | 9.8x |
| SwipeStats — **médiane** | **39.8%** | **2.2%** | **18.1x** |

La médiane est plus parlante que la moyenne : une femme typique obtient **1 match pour 2.5 likes envoyés**. Un homme typique obtient **1 match pour 45 likes envoyés**.

### Conversion chez Lovoo (app européenne)

Sur Lovoo (4 008 femmes), la métrique équivalente est le ratio kisses/visits :
- Taux de conversion médian : **3.35%** (44 kisses pour 1 221 visites de profil)
- Seules **39%** des femmes cochent "date" comme intérêt — 63% préfèrent "chat" ou "friends"

---

## 3. Le funnel complet : du swipe au date

### Données réelles SwipeStats (n=127 femmes, n=836 hommes)

**Funnel féminin :**
```
2 745 likes → 1 013 matches (36.9%) → 435 conversations (42.9%) → 2 641 messages envoyés
```

**Funnel masculin :**
```
20 760 likes → 630 matches (3.0%) → 271 conversations (43.0%) → 2 218 messages envoyés
```

### Taux de conversion par étape

| Étape | Femmes | Hommes | Commentaire |
|-------|--------|--------|-------------|
| Like → Match | **36.9%** | 3.0% | Le goulot d'étranglement masculin |
| Match → Conversation | **42.9%** | 43.0% | **Identique** — divergence uniquement au swipe |
| Messages/match | 4.3 | 7.5 | Hommes investissent plus par match |

**Insight clé** : Le taux match→conversation est identique quel que soit le genre (~43%). Toute la divergence H/F se joue au niveau du swipe. Après le match, les deux genres se comportent de manière similaire.

---

## 4. Patterns d'activité et micro-sessions

### Fréquence d'utilisation (SwipeStats)

| Métrique | Femmes | Hommes |
|----------|--------|--------|
| Ouvertures/jour (médiane) | **13.7** | 11.4 |
| Swipes/jour (médiane) | **130** | 102 |
| **Swipes par session** | **~9.5** | ~9 |
| Likes par session | **~0.4** | ~3.3 |
| Durée sur l'app (médiane) | 228 jours | 258 jours |

Les femmes ouvrent l'app **14 fois par jour** pour environ **10 swipes par session**, dont moins d'un like. Ce sont des **micro-sessions de tri** réparties sur toute la journée, pas des sessions concentrées.

### Patterns horaires (par plateforme)

| Heure | OkCupid (femmes SF) | Lovoo (femmes EU) | Tinder Reviews (femmes) |
|-------|---------------------|-------------------|-------------------------|
| 8-10h | Montée progressive | Montée | Creux |
| 11-13h | Plateau | **Pic 11h** | Montée midi |
| 14-16h | Plateau | **Pic fort 14-16h** | Plateau |
| 17-19h | Montée | Baisse | Montée |
| 20-22h | **Pic 21-22h** | Faible | **Pic 18-20h** |
| 23h+ | Descente | Faible | Plateau nocturne |

**Divergence âge/plateforme** : Les jeunes femmes (Lovoo, âge moy. 22 ans) sont actives l'après-midi (14-16h). Les femmes plus âgées (OkCupid, âge moy. 33 ans) préfèrent le soir (21-23h). Les reviews Tinder (audience large) montrent un pattern intermédiaire.

### Patterns hebdomadaires

| Source | Pic | Creux |
|--------|-----|-------|
| OkCupid (femmes) | **Samedi** >>> Vendredi | Lundi |
| Lovoo (femmes) | Lundi (biais snapshot possible) | Jeudi |
| Tinder Reviews | Samedi-Dimanche | Vendredi |

---

## 5. Ce que les femmes veulent (vraiment)

### Préférences déclarées vs. révélées (Speed Dating, n=274 femmes)

Les femmes disent valoriser ces attributs (importance déclarée sur 100) :

| Attribut | Importance déclarée | Impact réel sur le "yes" (delta) |
|----------|--------------------|---------------------------------|
| Intelligence | **21.0%** (n°1 déclaré) | 0.77 (n°7 réel) |
| Sincérité | 18.3% (n°2) | 0.85 (n°6) |
| Attractivité physique | 18.1% (n°3) | **1.84** (n°3 réel) |
| Fun | 17.1% (n°4) | **1.77** (n°4 réel) |
| Ambition | 12.8% (n°5) | 0.67 (n°8) |
| Intérêts communs | 12.7% (n°6) | **1.88** (n°1 réel) |

**Le mensonge des préférences déclarées** : Les femmes disent que l'intelligence est le critère n°1, mais ce sont les **intérêts communs, l'attractivité et le fun** qui prédisent réellement leur décision. L'intelligence et la sincérité sont des critères hygiéniques (nécessaires mais non différenciants).

### Notes données par les femmes (sur 10)

| Attribut | Quand elle dit Oui | Quand elle dit Non | Delta |
|----------|-------------------|-------------------|-------|
| Intérêts communs | 6.58 | 4.70 | **+1.88** |
| Appréciation globale | 7.17 | 5.29 | +1.88 |
| Attractivité | 7.07 | 5.23 | **+1.84** |
| Fun | 7.38 | 5.61 | +1.77 |
| Réciprocité perçue | 6.00 | 4.74 | +1.26 |
| Sincérité | 7.63 | 6.78 | +0.85 |
| Intelligence | 7.93 | 7.16 | +0.77 |
| Ambition | 7.37 | 6.70 | +0.67 |

Le "seuil du oui" féminin en attractivité est à **7/10** — les hommes notés 5/10 ont un taux de rejet très élevé.

### Ce que les femmes cherchent (OkCupid Full, n=25 952)

**Type de relation recherché :**

| Recherche | % |
|-----------|---|
| Amis + dating long + dating court | **35.6%** |
| Amis uniquement | 24.5% |
| Amis + dating long | 16.7% |
| Dating long + dating court | 7.3% |
| Dating long uniquement | 7.0% |
| Inclut casual sex | 5.3% |
| Casual sex uniquement | 0.2% |

**81% des femmes cherchent avant tout des "new friends"** dans leur description — même si elles ajoutent souvent du dating en parallèle. Seules 5% mentionnent le casual sex.

**Intérêts Lovoo (n=4 008 femmes) :**
- Chat : 63%
- Amis : 63%
- Date : **39%**

Seules 4 femmes sur 10 sélectionnent explicitement "date" comme intérêt.

---

## 6. Effet de l'âge

### Match rate par tranche d'âge (SwipeStats Tinder)

**Femmes :**

| Tranche | N | Match rate | Like rate |
|---------|---|-----------|-----------|
| 15-19 | 43 | **45.9%** | 6.6% |
| 20-24 | 59 | 39.5% | 8.3% |
| 25-29 | 23 | 39.0% | 8.2% |
| 30-34 | 14 | **27.0%** | 10.2% |
| 35-39 | 4 | **12.8%** | 3.3% |

**Hommes :**

| Tranche | N | Match rate | Like rate |
|---------|---|-----------|-----------|
| 15-19 | 172 | 5.1% | 43.2% |
| 20-24 | 440 | 4.1% | 40.7% |
| 25-29 | 271 | 3.5% | 38.7% |
| 30-34 | 92 | 4.0% | 36.5% |
| 35-39 | 42 | **2.8%** | 26.2% |

Le match rate féminin **chute de 46% à 27% entre 20 et 34 ans**, puis s'effondre à **13% après 35 ans**. Fait intéressant : les femmes 30+ deviennent légèrement moins sélectives (like rate passe de 7% à 10%) mais ça ne compense pas la baisse de match rate.

Le match rate masculin est stable (~3-5%) toutes tranches, sauf les **35-39 ans qui touchent le point bas (2.8%)**.

### Filtres d'âge (SwipeStats)

| Paramètre | Femmes | Hommes |
|-----------|--------|--------|
| Filtre min moyen | 23.4 ans | 20.2 ans |
| Filtre max moyen | 32.5 ans | 31.6 ans |
| Largeur du filtre | **9.1 ans** | 11.4 ans |
| Accepte plus vieux de | +9.1 ans | +7.0 ans |
| Accepte plus jeune de | **0 ans** | -4.4 ans |

Les femmes **n'acceptent pas de plus jeune** (filtre min ≈ leur âge) et acceptent jusqu'à +9 ans. Les hommes ratissent ±4-7 ans dans les deux directions.

### Filtres d'âge par tranche d'âge (OkCupid Full, n=25 952 femmes)

| Âge femme | Min accepté | Max accepté | Largeur |
|-----------|-------------|-------------|---------|
| 18-19 | 18.3 | 30.7 | 12.4 |
| 20-24 | 20.9 | 33.3 | 12.4 |
| 25-29 | 24.0 | 37.6 | 13.6 |
| 30-34 | 27.2 | 41.2 | 14.0 |
| 35-39 | 29.2 | 45.8 | **16.6** |
| 40-44 | 30.7 | 51.1 | **20.5** |
| 45-49 | 30.7 | 58.3 | **27.6** |

Le filtre d'âge **s'élargit drastiquement après 35 ans** — les femmes acceptent des écarts de +16 à +28 ans, contre 12-14 avant 35 ans. Signe d'adaptation à un bassin réduit.

### Effet de l'écart d'âge sur le match (Speed Dating)

| Écart d'âge | Dates | Taux de "yes" féminin |
|-------------|-------|----------------------|
| Même âge (±2) | 1 103 | 37.4% |
| Homme plus jeune (1-2) | 653 | 37.4% |
| Homme plus jeune (3+) | 968 | **37.8%** |
| Homme plus vieux (3-5) | 849 | 36.3% |
| Homme plus vieux (6+) | 517 | **32.3%** |

En face-à-face, les femmes acceptent aussi bien un homme plus jeune que plus vieux. Mais **+6 ans et plus entraîne une chute significative** (37% → 32%).

---

## 7. Impact des features de profil

### SwipeStats — Impact sur le match rate

| Feature | Femmes avec | Femmes sans | Delta F | Hommes avec | Hommes sans | Delta H |
|---------|-------------|-------------|---------|-------------|-------------|---------|
| **Instagram lié** | 45.3% | 38.2% | **+7.1pp** | 5.2% | 3.8% | +1.4pp |
| **Éducation** | 44.2% | 38.7% | **+5.5pp** | 4.2% | 4.1% | +0.1pp |
| Spotify lié | 42.7% | 38.6% | +4.1pp | 4.2% | 4.0% | +0.2pp |

### OkCupid — Investissement dans le profil

| Section | Taux de remplissage | Longueur moy. |
|---------|--------------------:|:--------------|
| Self-summary | 90.4% | 665 caractères |
| Favorites (livres/films) | 83.0% | 592 caractères |
| What I'm doing | 86.8% | 260 caractères |
| Message me if | 77.7% | 204 caractères |
| Private thing to admit | 67.1% | 103 caractères |

Les femmes OkCupid investissent massivement dans leur profil (91% remplissent le résumé, en moyenne 665 caractères). En contraste, seules **2.8%** des femmes Lovoo remplissent le texte libre du profil — l'investissement dépend entièrement de l'UX de la plateforme.

### Nombre de photos (Lovoo)

Moyenne : **4.8 photos** par profil féminin (médiane 4, max 30).

---

## 8. Distribution de Pareto (inégalité)

### Concentration des matches (SwipeStats)

| Percentile | Femmes | Hommes |
|------------|--------|--------|
| **Top 10%** captent | **46.7%** des matches féminins | **66.2%** des matches masculins |
| Top 20% captent | 65.0% | 83.0% |
| **Bottom 50%** captent | **6.7%** | **2.0%** |
| Max matches | 14 874 | 23 758 |
| Médiane matches | 368 | 90 |

L'inégalité est **extrême chez les hommes** : les 10% du top captent les 2/3 de tous les matches, et la moitié inférieure ne reçoit que 2%. Chez les femmes, la distribution est plus égalitaire mais reste fortement Pareto.

### Engagement Lovoo (4 008 femmes)

| Percentile | Visites de profil |
|------------|------------------:|
| Médiane (p50) | 1 221 |
| p90 | 9 814 |
| p99 | 32 523 |
| Max | 164 425 |

Même pattern power-law : les 1% les plus populaires reçoivent **27x plus de visites** que la médiane.

---

## 9. Messagerie et ghosting

### Patterns de messagerie (SwipeStats)

| Métrique | Femmes | Hommes |
|----------|--------|--------|
| Messages envoyés (médiane) | 1 138 | 464 |
| Messages reçus (médiane) | 1 387 | 426 |
| **Ratio envoyé/reçu** | **0.80** | **1.10** |
| Conversations (médiane) | 167 | 63 |
| Longueur moy. conversation | 7.1 msg | 6.4 msg |
| Plus longue conversation | 115 msg | 68 msg |
| **Convos 1 message (ghosting)** | **20.6%** | **32.3%** |
| Messages par match | 2.7 | 3.5 |

Les femmes **reçoivent 25% de messages de plus** qu'elles n'en envoient (ratio 0.80). Les hommes en envoient 10% de plus qu'ils n'en reçoivent. Les hommes sont davantage ghostés après le 1er message : 32% de conversations à 1 message vs 21% pour les femmes.

### Taux de ghosting

| Métrique | Femmes | Hommes |
|----------|--------|--------|
| Ghosting rate (médiane) | **21.9%** | **3.2%** |

Les femmes ghostent considérablement plus que les hommes — 22% des matches ne reçoivent jamais de réponse, contre 3% chez les hommes.

---

## 10. Satisfaction utilisateur et douleurs

### Score moyen des reviews Tinder Google Play

| Année | Global | Femmes identifiées | Hommes identifiés |
|-------|--------|-------------------|-------------------|
| 2014 | 3.47 | 3.16 | 2.86 |
| 2018 | 3.39 | 3.28 | 2.87 |
| 2020 | 2.70 | 2.23 | 2.18 |
| 2022 | 2.30 | 1.88 | 1.90 |
| 2024 | 2.38 | 1.65 | 1.51 |
| 2025 | 2.48 | 1.70 | 1.32 |

**Effondrement de la satisfaction depuis 2018** — passée de 3.4/5 à 2.3/5, affectant les deux genres mais plus fortement les hommes (1.32 en 2025).

### Sujets de plainte — Femmes vs Hommes

| Sujet | Femmes | Hommes | Écart |
|-------|--------|--------|-------|
| **Bots / scams / catfish** | **50.5%** | 20.1% | **F +30pp** |
| **Sécurité / harcèlement** | **7.0%** | 1.9% | **F +5pp** |
| Qualité des matches | 10.8% | **35.9%** | H +25pp |
| Payment / paywall | 14.5% | **32.8%** | H +18pp |
| Algorithme / visibilité | 1.3% | **5.9%** | H +5pp |
| Ghosting / unmatch | 1.5% | **4.4%** | H +3pp |
| Succès relationnels | 26.7% | 31.8% | Similaire |

**Les femmes souffrent de la sécurité** (bots 50%, harcèlement 7%) tandis que **les hommes souffrent de l'accès** (matches 36%, paywall 33%). Deux expériences fondamentalement différentes de la même app.

---

## 11. Analyse par pays — Focus France

### Match rate par pays (SwipeStats)

| Pays | Match rate H | Match rate F | Ratio F/H | N hommes | N femmes |
|------|-------------|-------------|-----------|----------|----------|
| **France** | **1.3%** | 47.5% | **37x** | 19 | 1 |
| Allemagne | 2.6% | 54.7% | 21x | 37 | 6 |
| Suisse | 3.4% | 57.8% | 17x | 12 | 1 |
| Autriche | 7.0% | 45.0% | 6x | 10 | 3 |
| UK | 4.2% | 41.0% | 10x | 33 | 2 |
| USA | 4.3% | 36.2% | 8x | 162 | 24 |
| Canada | 2.4% | 35.5% | 15x | 16 | 10 |
| Pologne | 4.7% | 55.6% | 12x | 17 | 1 |

⚠️ **Échantillons FR très faibles** (19 hommes, 1 femme).

### Par zone géographique (agrégation)

| Zone | Match rate H | N total |
|------|-------------|---------|
| **Europe francophone** (FR+BE+CH) | **1.8%** | 42 |
| Europe germanique (DE+AT) | 3.8% | 47 |
| Nordiques (FI+SE+DK) | 3.6% | 54 |
| Anglo-saxons (US+UK+CA+AU) | 3.7% | 223 |
| Europe de l'Est (PL) | 4.7% | 17 |

L'Europe francophone est **systématiquement en bas** — 1.8% de match rate masculin, soit 2x moins que la moyenne mondiale. Hypothèses : marché plus saturé, femmes plus sélectives, ou culture dating différente (plus d'approche IRL).

### Données démographiques françaises (Lovoo)

Lovoo compte 646 femmes en France (16% du dataset Lovoo), concentrées sur Lyon, Besançon, et les villes proches de la frontière suisse.

---

## 12. Psychologie et personnalité

### Traits de personnalité femmes vs hommes (OkCupid Full, échelle -99 à +99)

| Trait | Femmes | Hommes | Delta |
|-------|--------|--------|-------|
| Love-driven (vs. sex-driven) | **+35.8** | +1.1 | **F +34.7** |
| Romantic | **+28.3** | +7.3 | F +21.0 |
| Kind | **+27.3** | +10.5 | F +16.8 |
| Trusting | +22.5 | +8.8 | F +13.7 |
| Artsy | +9.8 | -5.5 | F +15.3 |
| Spontaneous | +6.2 | +4.2 | +2.0 |
| Adventurous | +6.3 | +12.3 | H +6.0 |
| Independent | +3.1 | +12.3 | H +9.2 |
| Dominant (vs. submissive) | -5.7 | +8.0 | **H +13.7** |
| Science-oriented | -6.9 | +14.4 | **H +21.3** |
| Ambitious | +2.1 | +12.3 | H +10.2 |
| Competitive | -16.6 | +3.2 | H +19.8 |
| Aggressive | -29.5 | -7.1 | H +22.4 |

Les plus grands fossés : les femmes sont fortement **love-driven** (+36 vs +1), **romantic** (+28 vs +7), et **kind** (+27 vs +11). Les hommes sont plus **dominant**, **science-oriented**, et **competitive**.

### Capacité cognitive (OkCupid Full)

| Genre | Score moyen | Médiane |
|-------|-------------|---------|
| Femmes | 16.1 | 16 |
| Hommes | 17.2 | 18 |

Léger avantage masculin sur les questions de capacité cognitive (2 541 questions standardisées).

### Questions clés — Sexualité et intimité (OkCupid Full, femmes)

Parmi les 2 541 questions avec le tag "sex/intimacy" :

**Fréquence idéale de rapports :**
- "Every day" : 27.3%
- "Every other day" : 38.5%
- "A few times a week" : 25.2%
- "A few times a month" : 9.0%

**Position sur le BDSM** (parmi les questions taguées) :
- Intéressée/curieuse : ~30-40% (selon la formulation)
- Pas intéressée : ~60-70%

### Consensus féminins — Questions avec >70% d'accord

30 questions "deal-breaker" identifiées où plus de 70% des femmes donnent la même réponse. Ces couvrent principalement :
- Hygiène et présentation
- Respect et communication
- Intelligence et curiosité
- Valeurs et éthique

### Écarts hommes-femmes — Questions avec >15pp de différence

30 questions identifiées avec >15 points de pourcentage de divergence entre genres, principalement sur :
- Sexualité et attitudes (plus grandes divergences)
- Rôles de genre
- Expression émotionnelle
- Priorités relationnelles

---

## 13. Méthodologie et limites

### Scripts d'analyse

| Script | Dataset | Output |
|--------|---------|--------|
| `scripts/analyze_okcupid.py` | OkCupid Profiles | `scripts/output/okcupid_analysis.json` |
| `scripts/analyze_lovoo.py` | Lovoo v3 | `scripts/output/lovoo_analysis.json` |
| `scripts/analyze_speed_dating.py` | Speed Dating | `scripts/output/speed_dating_analysis.json` |
| `scripts/analyze_tinder_reviews.py` | Tinder Reviews | `scripts/output/tinder_reviews_analysis.json` |
| `scripts/analyze_tinder_women_reviews.py` | Tinder Reviews (femmes) | `scripts/output/tinder_reviews_women.json` |
| `scripts/analyze_okcupid_full_women.py` | OkCupid Full | `scripts/output/okcupid_full_women.json` |
| `scripts/analyze_swipestats.py` | SwipeStats | `scripts/output/swipestats_analysis.json` |
| `scripts/analyze_cross_women.py` | Synthèse 3 datasets | `scripts/output/women_cross_analysis.json` |

### Limites

1. **Biais de sélection** : Les utilisateurs SwipeStats sont des early adopters tech-savvy qui uploadent volontairement leurs données — probablement pas représentatifs de l'utilisateur moyen.

2. **Échantillons faibles** : Seulement 150 femmes SwipeStats, 1 femme FR. Les analyses par pays/tranche d'âge ont des effectifs limités.

3. **Données temporelles** : OkCupid ~2012-2015, Speed Dating 2002-2004, SwipeStats ~2016-2021. Le marché a considérablement évolué. Les reviews Tinder (2013-2026) montrent cette évolution (satisfaction en chute libre).

4. **Pas de données horaires réelles** : Les "activity patterns" d'OkCupid et Lovoo mesurent "last seen" (quand le profil était en ligne), pas les moments de swipe. Seul SwipeStats a des agrégats quotidiens, mais pas d'heure.

5. **Auto-déclaration** : Les profils OkCupid sont déclaratifs (body type, income). Le Speed Dating est le seul dataset avec des données de décision *observées*.

6. **Classification de genre dans les reviews** : La détection H/F dans les reviews Tinder est heuristique (keywords, pronoms) — ~10-15% de couverture, avec un risque de biais.

7. **Géographie** : OkCupid = San Francisco (très spécifique), Lovoo = Europe germanophone/francophone, Speed Dating = NYC (Columbia), SwipeStats = international (dominé USA/Europe du Nord).

---

*Données brutes JSON : `scripts/output/`*
*Scripts Python : `scripts/`*
*Datasets source : `data/`*
