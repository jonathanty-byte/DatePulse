# CDC — DateDetox V1.0 (évolution DatePulse V3.3)

> **"Swipe less. Match more."** — La seule app de dating qui te dit de MOINS utiliser les apps de dating.
>
> **Date : 27/02/2026** — Pivot branding + AI Profile Audit + Session Timer + Dating Wrapped + Message Coach.

---

## 0. Genèse : de DatePulse à DateDetox

### 0.1 Pourquoi ce pivot

DatePulse V3.3 est un produit techniquement solide (scoring r=0.995, PWA, heatmap, météo live, Google Trends modifier) mais qui souffre de deux faiblesses structurelles :

| Faiblesse | Diagnostic | Impact |
|---|---|---|
| **Besoin marché faible** | "Quand swiper" = nice-to-know, pas un pain point | Rétention J7 incertaine, pas de conversion payante |
| **Monétisation fragile** | Affiliates dating = marché ultra-compétitif, guide ebook = conversion <0.5% | Revenu M6 estimé < 500€ |

Le pivot DateDetox ne jette rien — il **reframe** l'existant sous un positionnement plus fort et ajoute des features à forte valeur perçue.

### 0.2 Le reframe

| Feature existante | Frame "DatePulse" (optimisation) | Frame "DateDetox" (wellbeing) |
|---|---|---|
| Score temps réel | "Swipe au bon moment" | "N'ouvre PAS l'app maintenant, c'est mort" |
| Heatmap | "Visualise les pics" | "Planifie tes sessions pour ne pas doomscroller" |
| Best Times | "Les meilleurs créneaux" | "Tes 3 fenêtres de la semaine. Le reste = temps perdu." |
| Boost Optimizer (nouveau) | "Maximise tes matches" | "Arrête de jeter 5€ par boost mal timé" |
| AI Profile Audit (nouveau) | "Optimise ton profil" | "Améliore ton profil pour passer MOINS de temps à swiper" |
| Message Coach (nouveau) | "Craft better openers" | "Fais avancer tes conversations pour sortir de l'app plus vite" |

Le frame wellbeing transforme chaque feature utilitaire en acte de **self-care**. Et le self-care a une WTP prouvée (Headspace : $100M ARR, Calm : $150M ARR).

### 0.3 Positionnement

**Tagline** : "Swipe less. Match more."

**Pitch 30 secondes** : Les apps de dating rendent malheureux. L'homme moyen y passe 4h/semaine pour 3 matches. DateDetox inverse l'équation : un score temps réel te dit quand NE PAS ouvrir l'app, une IA audite ton profil pour que chaque session compte, et un budget hebdomadaire te force à être intentionnel. Résultat : moins de temps, plus de matches, zéro doomscroll.

**Positionnement media** : "L'app anti-Tinder" — la seule app de dating qui te dit de MOINS utiliser les apps de dating.

### 0.4 Scoring IdeaForge

| Critère | Poids | Note | Justification |
|---|---|---|---|
| Besoin marché | ×0.25 | **9/10** | Dating app fatigue documenté. "Mon profil est nul et je le sais pas" + "je swipe trop pour rien" = douleur réelle. |
| Faisabilité solo | ×0.20 | **7/10** | Base DatePulse existante. Ajout AI Profile Audit (~1 sem), Dating Wrapped (~1 sem), Session Timer (~2j). Total ~3-4 semaines. |
| Revenu potentiel | ×0.20 | **8.5/10** | Tiers $5.99/$14.99. WTP wellbeing > WTP outil. Coûts LLM marginaux (~$0.002/call). |
| Nouveauté calibrée | ×0.15 | **10/10** | Digital wellbeing × dating = territoire vierge. Recombinaison Uzzi parfaite (domaine familier × domaine distant). |
| Distribution | ×0.10 | **10/10** | Dating Wrapped = machine UGC (effet Spotify Wrapped). "IA note ton profil" = viral TikTok/Reddit. Double moteur. |
| Motivation | ×0.10 | **10/10** | LLM + data viz + reverse-engineering RGPD + viralité. Projet complet et excitant. |

**Score composite : 8.85/10** 🏆

---

## 1. Vision

### 1.1 Problème

Les apps de dating créent un cycle addictif et frustrant :

1. **Le doomscroll** : L'utilisateur ouvre Tinder 12× par jour, swipe 200 profils, obtient 2 matches. Il ne sait pas que 80% de son temps est gaspillé aux mauvais moments.
2. **Le profil médiocre** : 73% des profils masculins ont des erreurs critiques (photos floues, bio vide, mauvais ordre de photos) mais aucun feedback objectif n'existe. Les amis disent "c'est bien" par politesse.
3. **Les conversations qui meurent** : L'utilisateur matche mais les conversations s'éteignent après 3-4 messages. Il ne sait pas comment relancer ou faire avancer.
4. **L'absence de recul** : Aucun outil ne donne une vue d'ensemble de son comportement dating (heures de swipe, taux de conversion, patterns). L'utilisateur opère à l'aveugle.

**Stat clé** : Les études montrent une corrélation entre utilisation intensive des dating apps et anxiété/dépression. Le problème n'est pas "matcher plus" — c'est **être intentionnel** pour matcher mieux en moins de temps.

### 1.2 Solution

DateDetox est une plateforme de **dating intentionnel** qui combine :

- **Timing intelligence** (hérité de DatePulse) : Score 0-100 basé sur les données publiées par les apps elles-mêmes, pour ne swiper QUE quand c'est efficace.
- **AI Profile Audit** : Analyse IA du profil avec score et recommandations concrètes, pour qu'un profil optimisé réduise le temps de swipe nécessaire.
- **Dating Wrapped** : Bilan complet basé sur les données RGPD de l'utilisateur, pour prendre conscience de ses patterns et les corriger.
- **Session management** : Timer, budget hebdomadaire, et insights pour remplacer le doomscroll par des sessions courtes et ciblées.
- **Message Coach** : Suggestions IA pour faire avancer les conversations et passer du chat au date plus rapidement.

### 1.3 Cible

- **Primaire** : Hommes 25-40, utilisateurs actifs de dating apps (Tinder, Bumble, Hinge), urbains FR, frustrés par leur ratio temps/résultats
- **Secondaire** : Créateurs contenu dating/lifestyle (UGC avec le Wrapped et le Profile Audit)
- **Tertiaire** : Viralité curiosité (r/Tinder, r/datascience, TikTok dating)

### 1.4 Proposition de valeur par persona

| Persona | Pain point | DateDetox value prop |
|---|---|---|
| **Le mass-swiper** (30 min/jour, 5% match rate) | "Je swipe beaucoup mais ça ne matche pas" | Profile Audit + Red Light/Green Light → sessions courtes mais efficaces |
| **Le frustré** (paie Tinder Gold, peu de résultats) | "J'ai payé mais rien ne change" | Dating Wrapped montre le vrai problème (souvent le profil, pas l'algo) + Boost Optimizer |
| **Le doomscroller** (ouvre l'app 10×/jour par habitude) | "Je perds du temps" | Session Timer + budget hebdomadaire + Red Light screen |
| **Le ghosté** (matche mais conversations meurent) | "On matche mais après c'est le silence" | Message Coach + insights sur ses patterns de conversation |

---

## 2. La Data — Ground Truth (hérité de DatePulse V3.3)

> Cette section est identique à DatePulse V3.3 et constitue le socle du Timing Engine.

### 2.1 Sources validées

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

### 2.2 Patterns temporels

**HORAIRE** (index relatif, 100 = pic à 21h)

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
| **21h** | **100** | **PIC ABSOLU** |
| 22h | 75 | Descente |
| 23h | 45 | Fin de soirée |

**HEBDOMADAIRE** (index relatif, 100 = dimanche)

| Jour | Index | Note |
|---|---|---|
| Lundi | 90 | Momentum post-weekend |
| Mardi | 75 | Milieu de semaine |
| Mercredi | 75 | Milieu de semaine |
| Jeudi | 85 | Spike pré-weekend (Ogury) |
| Vendredi | 55 | CREUX — les gens sortent |
| Samedi | 60 | CREUX — idem |
| **Dimanche** | **100** | **PIC** — "Sunday Scaries" |

**MENSUEL** (index relatif, 100 = janvier)

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
| Octobre | 80 | Début cuffing season |
| Novembre | 85 | Cuffing season monte |
| Décembre | 65 | Creux fêtes |

### 2.3 Événements spéciaux

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

- **Composite Google Trends FR : Pearson r = 0.995, R² = 0.989**
- Tinder seul : r = 0.990 | Bumble : r = 0.992 | Hinge : r = 0.989 | Happn : r = 0.910

### 2.5 Formule de scoring

**Score statique (base) :**
```
score(t) = hourly_index[hour(t)]
         × weekly_index[dayOfWeek(t)] / 100
         × monthly_index[month(t)] / 100
         × event_multiplier(t)
```

**Score enrichi (live) :**
```
score(t) = hourly[h] × weekly[d] × monthly[m] / 10000
         × event_multiplier(t)
         × weather_modifier(t)
         × trend_modifier(t)
```

### 2.6 Mapping score → UX DateDetox

| Score | Label DateDetox | Couleur | Action |
|---|---|---|---|
| 0-15 | 🔴 **RED LIGHT** | Rouge | "Ferme l'app. Zéro activité. Reviens à [prochain pic]." |
| 16-35 | 🔴 **RED LIGHT** | Rouge foncé | "Pas maintenant. [X]h avant le prochain bon créneau." |
| 36-55 | 🟡 **AMBER** | Jaune | "Activité correcte. Si tu as 15 min, pourquoi pas." |
| 56-75 | 🟢 **GREEN LIGHT** | Vert | "Bon moment. Session de 15-20 min recommandée." |
| 76-90 | 🟢 **GREEN LIGHT+** | Vert vif | "Excellent créneau ! 15 minutes suffisent." |
| 91-100 | 🟢🔥 **PEAK** | Vert + animation | "Moment optimal. Fonce ! Ta session compte double." |

**Changement clé vs DatePulse** : en dessous de 35, le message est un **STOP** actif, pas une info passive. L'écran est rouge. Le frame est "ne fais pas ça" plutôt que "c'est calme".

---

## 3. Features — Vue d'ensemble

### 3.0 Matrice features × phases

| Feature | Phase 1 (MVP) | Phase 2 | Phase 3 | Monétisation |
|---|---|---|---|---|
| F1 — Red Light / Green Light | ✅ | | | Free |
| F2 — Heatmap + Best Times | ✅ (existant) | | | Free |
| F3 — AI Profile Audit | ✅ | Amélioré | | Freemium |
| F4 — Session Timer | ✅ | | | Free |
| F5 — Weekly Detox Report | ✅ | | | Freemium |
| F6 — Boost Optimizer | | ✅ | | Pro |
| F7 — Smart Nudge (email) | | ✅ | | Pro |
| F8 — Message Coach | | ✅ | | Pro+ |
| F9 — Dating Wrapped | | ✅ | Enrichi | Free (acquisition) |
| F10 — Dating Forecast Newsletter | | | ✅ | Sponsoring |
| F11 — Détox Streak | | | ✅ | Gamification |

---

## 4. Features — Spécifications détaillées

### F1 — Red Light / Green Light (refonte du Score Live)

**Ce que l'utilisateur voit :**

Quand score < 35 (RED LIGHT) :
- Écran dominé par un fond rouge/sombre avec pulsation lente
- Score en grand + label "RED LIGHT — NE SWIPE PAS"
- Message : "Activité quasi-nulle. Tu vas juste scroller dans le vide."
- Countdown proéminent : "Prochain Green Light dans 2h14"
- Suggestion alternative : "Profite-en pour améliorer ton profil →" (lien vers Profile Audit)

Quand score ≥ 35 (AMBER/GREEN) :
- Fond vert/dynamique, énergie positive
- Score en grand + label "GREEN LIGHT — C'EST MAINTENANT"
- Timer suggéré : "Session recommandée : 15 minutes"
- Bouton "Lancer ma session" (démarre le Session Timer)

**Logique** : Exactement le scoring DatePulse existant. Seul le rendu UX change — le même `computeScore()` mais avec deux "modes" visuels distincts (red/green) au lieu d'un dégradé continu.

**Effort** : ~1 jour (refonte UI, pas de nouvelle logique).

### F2 — Heatmap + Best Times (existant, reframé)

**Inchangé techniquement.** Seuls les labels changent :
- "Tes 3 fenêtres de la semaine" (au lieu de "Best times")
- "Le reste = temps gagné sur ta vie" (nouveau subtitle)
- Heatmap : les zones rouges sont visuellement marquées "zone morte — ne pas swiper"

**Effort** : ~2h (copie existante, changement labels/couleurs).

### F3 — AI Profile Audit 🆕

**Ce que l'utilisateur fait :**
1. Clique "Audite mon profil"
2. Upload 3-6 screenshots de son profil (photos + bio) — via drag & drop ou bouton
3. Reçoit en ~5 secondes un rapport structuré

**Ce que l'utilisateur voit :**

```
📊 Score profil : 62/100

🔴 Problèmes critiques (3)
1. Photo principale : mauvais éclairage, visage à 40% du cadre
   → "Recadre pour que ton visage occupe 60% de l'image. Lumière naturelle."
2. Bio vide
   → "Une bio augmente les matches de 30% (source: Hinge). Essaie : [suggestion personnalisée]"
3. 4 photos sur 6 sont des selfies
   → "Diversifie : 1 portrait, 1 activité, 1 social, 1 voyage. Pas plus d'1 selfie."

🟡 Améliorations (2)
4. Ordre des photos sous-optimal
   → "Mets ta photo [X] en premier — c'est ta plus forte."
5. Aucun prompt Hinge utilisé
   → "Les prompts augmentent l'engagement de 60%. Suggestion : [...]"

✅ Points forts (2)
6. Bonne variété de contextes
7. Sourire visible sur la photo 2

💡 Score potentiel après corrections : ~81/100
```

**Logique technique :**
- Les screenshots sont convertis en base64 côté client
- Un appel API vers DeepSeek V3 via OpenRouter (vision model) avec un prompt structuré
- Le prompt demande un JSON structuré : `{ score, critiques[], améliorations[], points_forts[], score_potentiel }`
- Le résultat est parsé et affiché dans un composant React stylisé
- **Aucune image n'est stockée** — tout est traité en mémoire, rien ne quitte la session navigateur sauf l'appel API

**Prompt système (draft) :**
```
Tu es un expert en optimisation de profils de dating apps. 
Analyse les screenshots du profil et fournis :

1. Un score /100 basé sur : qualité des photos (40%), bio (20%), 
   variété/contextes (20%), ordre des photos (10%), utilisation 
   des prompts/fonctionnalités de l'app (10%)

2. Jusqu'à 3 problèmes critiques avec recommandation concrète
3. Jusqu'à 3 améliorations avec suggestion
4. Les points forts à garder

Sois direct, honnête, et actionnable. Pas de compliments vides.
Réfère-toi aux études Hinge/Tinder quand pertinent.

Réponds en JSON : { score, critical[], improvements[], strengths[], potential_score }
```

**Contraintes :**
- Vision model requis (DeepSeek V3 supporte la vision via OpenRouter)
- Coût estimé : ~$0.005-0.01 par audit (6 images + prompt + réponse)
- Latence : 3-8 secondes selon le nombre d'images
- Rate limit : 1 audit gratuit par mois (basé sur localStorage timestamp), illimité en Pro

**Monétisation :**
- **Free** : 1 audit / mois
- **Detox Pro** ($5.99/mois) : audits illimités + historique des scores

**Effort** : ~4-5 jours (UI upload, appel API, parsing résultat, affichage stylisé, gestion free/pro).

### F4 — Session Timer 🆕

**Ce que l'utilisateur fait :**
1. Clique "Lancer ma session" (apparaît quand Green Light)
2. Choisit la durée : 10 / 15 / 20 / 30 minutes (défaut: 15)
3. Swipe pendant que le timer tourne
4. Reçoit une notification douce à mi-temps ("7 min restantes")
5. Reçoit un signal de fin ("Session terminée. Bien joué ! 🎉 Ferme l'app.")
6. Peut logger ses matches de la session (intégration Match Tracker existant)

**Ce que l'utilisateur voit pendant la session :**
- Timer circulaire avec le temps restant (style Pomodoro)
- Score DateDetox actuel (continue de se mettre à jour)
- Compteur de matches ajoutés pendant cette session
- Bouton "Arrêter la session" (avec micro-confirmation)

**Ce que l'utilisateur voit après la session :**
- Résumé : "15 min — Score moyen 78 — 2 matches — Efficacité : 🔥"
- Comparaison : "Mieux que 73% de tes sessions précédentes"
- Incitation au prochain créneau : "Prochaine fenêtre verte : demain 21h"

**Stockage des sessions** : localStorage (même pattern que Match Tracker)
```json
{
  "sessions": [
    {
      "id": "session-001",
      "date": "2026-02-27T21:00:00",
      "duration_planned": 15,
      "duration_actual": 14.5,
      "score_start": 82,
      "score_avg": 79,
      "matches": 2,
      "app": "tinder",
      "completed": true
    }
  ]
}
```

**Logique** : 100% client-side. `setInterval` pour le countdown, vibration API pour la notification (mobile), son optionnel. Le timer continue même si l'utilisateur switch d'onglet (enregistre le `startTime` et compare avec `Date.now()`).

**Effort** : ~2-3 jours (UI timer, flow start/stop, résumé post-session, stockage).

### F5 — Weekly Detox Report 🆕

**Ce que l'utilisateur voit (chaque lundi) :**

Page récap accessible via un badge "📊 Ton bilan" sur la Home :

```
📊 Semaine du 17-23 février

⏱️ Temps total : 1h45 (vs 3h20 la semaine dernière) ↓47%
🎯 Sessions : 7 (toutes en Green Light ✅)
💕 Matches : 5 (vs 3 la semaine dernière) ↑67%
⚡ Efficacité : 2.9 matches/heure (vs 0.9 avant DateDetox)

📈 Tendance 4 semaines :
[mini bar chart — temps en baisse, matches en hausse]

💡 Insight : "Tu matches 3× plus quand tu suis les créneaux DateDetox.
             Continue comme ça — tu économises 6h/mois."
```

**Logique** : Agrégation des données Session Timer (localStorage). Calcul côté client. L'insight est un template conditionnel basé sur les ratios, pas un appel LLM.

**Templates d'insights :**
- Si `matches_per_hour` cette semaine > semaine précédente : "Ton efficacité s'améliore ! [X] matches/heure cette semaine."
- Si `total_time` < semaine précédente : "Tu as passé [X]% de temps en moins sur les apps. Temps récupéré : [Y]h."
- Si `pct_green_light_sessions` > 80% : "100% de tes sessions en Green Light. Tu maîtrises le timing."
- Si `pct_green_light_sessions` < 50% : "Tu swibes encore en Red Light. Essaie les notifications Smart Nudge."

**Monétisation** :
- **Free** : résumé basique (temps total + matches)
- **Detox Pro** : rapport complet + tendances 4 semaines + insights + export

**Effort** : ~2 jours (agrégation données, UI rapport, templates insights).

### F6 — Boost Optimizer 🆕 (Phase 2)

**Le problème** : Un Boost Tinder coûte 3-5€ et dure 30 minutes. Utilisé à 15h un vendredi, il touche ~55% de l'audience potentielle. Utilisé à 21h un dimanche, il touche ~100%. C'est littéralement jeter de l'argent par les fenêtres.

**Ce que l'utilisateur voit :**
- Section dédiée "Boost Optimizer" sous la heatmap
- "Ton prochain Boost sera 4× plus efficace dimanche à 21h qu'à ton horaire actuel."
- Heatmap spéciale "Boost ROI" : score pondéré par le ratio score/coût
- Notification (via Smart Nudge) : "C'est le moment d'utiliser ton Boost ! Score: 94."

**Logique** : Aucune nouvelle data nécessaire. C'est une couche de présentation au-dessus du scoring existant, spécifiquement framée autour de l'économie de Boosts.

**Calcul ROI Boost :**
```
boost_efficiency(t) = score(t) / score_moyen_semaine
```
Un boost à score 94 quand la moyenne est 50 = efficacité 1.88× (88% plus efficace qu'un boost au hasard).

**Monétisation** : Detox Pro ($5.99/mois).

**Effort** : ~1-2 jours.

### F7 — Smart Nudge (email) 🆕 (Phase 2)

**Le problème** : L'utilisateur ne pense pas à regarder DateDetox avant d'ouvrir Tinder. Il faut l'intercepter AVANT.

**Solution** : Email quotidien à 20h45 (15 min avant le pic typique) via Beehiiv.

**Contenu de l'email :**
```
Objet : 🟢 Score DateDetox : 87/100 dans 15 min

Hey,

Ce soir c'est un bon soir pour swiper.
Score prévu à 21h : 87/100 (dimanche = pic hebdomadaire)

Ta fenêtre optimale : 21h - 22h
Session recommandée : 15 min

[Ouvrir DateDetox]

---
Si tu veux aussi que ton profil soit au top :
[Lancer un Profile Audit gratuit →]
```

**Logique** : 
- Beehiiv (gratuit jusqu'à 2500 abonnés) pour l'envoi
- Le contenu de l'email est semi-statique : le score du jour est prévisible (lookup tables), pas besoin d'API dynamique
- Un script Python (cron quotidien) génère le score du soir et pousse vers Beehiiv via leur API
- Alternative sans cron : l'email contient un lien vers DateDetox qui calcule le score live à l'ouverture

**Monétisation** : Detox Pro ($5.99/mois).

**Effort** : ~2 jours (intégration Beehiiv API + script de génération + page d'inscription email).

### F8 — Message Coach 🆕 (Phase 2)

**Ce que l'utilisateur fait :**
1. Clique "Message Coach"
2. Colle une conversation (screenshots ou copier-coller texte)
3. Indique le contexte : "Conversation qui stagne" / "Envie de proposer un date" / "Comment relancer"
4. Reçoit 3 suggestions de messages avec explication

**Ce que l'utilisateur voit :**

```
💬 Analyse de ta conversation avec [prénom]

Diagnostic : La conversation est en mode "interview" — questions-réponses 
sans profondeur. Tu dois créer une connexion émotionnelle.

Suggestion 1 — Créer du lien (recommandée ✅)
"Ahah tu fais du bouldering aussi ? Attends, faut qu'on règle un truc 
d'abord — Fontainebleau ou salle ?"
→ Pourquoi : Rebondit sur un intérêt commun + micro-débat = engagement

Suggestion 2 — Proposer un date directement
"Écoute, on a clairement les mêmes goûts. Un verre cette semaine ? 
Je connais un super endroit à [quartier]."
→ Pourquoi : Après 5+ messages, proposer un date montre de la confiance.

Suggestion 3 — Relance légère
"Bon, ton silence me dit soit que t'es en plein binge Netflix, 
soit que t'as oublié que le meilleur conversateur de Tinder attend ta réponse 😄"
→ Pourquoi : Humour + auto-dérision = low pressure.
```

**Logique technique :**
- Appel LLM (DeepSeek V3 via OpenRouter) avec le contexte de la conversation
- Si screenshots : vision model pour extraire le texte, puis analyse
- Si texte copié-collé : prompt direct
- Prompt structuré qui demande diagnostic + 3 suggestions avec justification
- **Aucune conversation n'est stockée** — traitement en mémoire uniquement

**Prompt système (draft) :**
```
Tu es un coach en communication dating. Analyse cette conversation et fournis :

1. Un diagnostic en 1-2 phrases (le problème principal)
2. 3 suggestions de messages (du plus conservateur au plus audacieux)
3. Pour chaque suggestion : le texte exact + pourquoi ça fonctionne

Règles :
- Ton naturel, pas robotique. Adapté au style de l'utilisateur.
- Suggestions réalistes (pas des phrases de pick-up artist)
- Si la conversation est morte (>48h sans réponse), le dire honnêtement
- Toujours une option "proposer un date" si >5 messages échangés

Réponds en JSON : { diagnostic, suggestions: [{ text, strategy, explanation }] }
```

**Monétisation** : Detox+ Coach ($14.99/mois). 3 conversations gratuites pour essayer.

**Coût** : ~$0.003-0.005/analyse (texte only), ~$0.01-0.02/analyse (avec screenshots).

**Effort** : ~3-4 jours.

### F9 — Dating Wrapped 🆕 (Phase 2) ⭐ KILLER FEATURE

**Le concept** : L'utilisateur uploade son fichier de données RGPD (que toute app est obligée de fournir sous 30 jours) et reçoit un bilan visuel complet de son comportement dating — comme Spotify Wrapped, mais pour Tinder/Bumble/Hinge.

**Ce que l'utilisateur fait :**
1. Demande ses données RGPD à l'app (Tinder : Settings → Download my Data, délai ~48h-30j)
2. Reçoit un fichier .json ou .zip par email
3. L'uploade sur DateDetox
4. Reçoit un rapport visuel interactif en ~2 secondes

**Ce que l'utilisateur voit :**

```
🎬 TON DATING WRAPPED 2025

📱 Tu as ouvert Tinder 1,847 fois en 2025
   → C'est 5× par jour en moyenne

👆 Tu as swipé 34,291 profils
   → 78% à droite (moyenne : 30-50%)
   ⚠️ "Tinder pénalise les mass-swipers dans son algorithme"

💕 Tu as eu 247 matches
   → Taux de conversion : 0.72% (1 match pour 139 swipes)

💬 Tu as initié 89 conversations (36% de tes matches)
   → 158 matches = jamais contactés. Pourquoi matcher si c'est pour rien ?

📏 Tes conversations durent en moyenne 4.2 messages
   → Seulement 12 ont dépassé 20 messages

⏰ Tu swibes le plus : Vendredi 23h (score DateDetox : 45 🔴)
   Tu matches le plus : Dimanche 21h (score DateDetox : 94 🟢)
   → "Tu perds 40% de ton temps aux mauvais moments."

📊 Ton mois le plus actif : Janvier (post-cuffing season)
   Ton mois le moins actif : Août

⏱️ Temps total estimé : ~312 heures en 2025
   → 13 jours complets de ta vie
   → 6h40 par match. 26h par conversation de plus de 20 messages.

💡 VERDICT DATEDETOX
"Tu swibes beaucoup mais de manière inefficace. Ton taux de swipe droit
(78%) est trop élevé — Tinder baisse ta visibilité. Tes sessions sont
mal timées. Avec DateDetox, on estime que tu pourrais obtenir les mêmes
résultats en 80h au lieu de 312h — soit 230 heures récupérées."

[📤 Partager mon Wrapped]  [🔄 Commencer ma Détox]
```

**Données exploitables par app (structure connue/estimée) :**

| Donnée | Tinder | Bumble | Hinge |
|---|---|---|---|
| Swipes droite/gauche | ✅ | ✅ | ✅ (likes) |
| Matches avec timestamps | ✅ | ✅ | ✅ |
| Messages envoyés/reçus | ✅ | ✅ | ✅ |
| App opens / sessions | ✅ (usage data) | ❓ | ❓ |
| Photos profil historique | ✅ | ❓ | ❓ |
| Bio historique | ✅ | ❓ | ❓ |
| Préférences de recherche | ✅ | ✅ | ✅ |

> ⚠️ Les structures exactes seront reverse-engineerées quand on recevra le fichier RGPD Tinder. Le CDC sera mis à jour avec les champs réels.

**Logique technique :**
```
1. Upload fichier (FileReader API, client-side)
2. JSON.parse le contenu
3. Parser adapté à l'app (TinderParser, BumbleParser, HingeParser)
4. Calcul des métriques en Web Worker (si fichier > 5MB)
5. Génération des visualisations (Recharts, déjà dans le projet)
6. Bouton "Share" → canvas capture → image partageable
```

**Métriques calculées :**

| Catégorie | Métriques |
|---|---|
| **Volume** | Total swipes, swipes/jour moyen, jours actifs |
| **Sélectivité** | % swipe droite, ratio droite vs gauche |
| **Conversion** | Swipe→match rate, match→conversation rate, conversation→longue conversation rate |
| **Timing** | Heures de swipe les plus fréquentes, corrélation avec score DateDetox |
| **Conversations** | Longueur moyenne, % initiées, temps de réponse moyen, taux de ghost |
| **Tendances** | Évolution mensuelle de chaque métrique, meilleur/pire mois |
| **Estimation temps** | Heures totales estimées (basé sur sessions × durée moyenne) |

**Corrélation avec DateDetox :**
- Pour chaque match : calculer le score DateDetox au timestamp du match
- Montrer : "X% de tes matches sont tombés en Green Light"
- Montrer : "Tu aurais eu ~Y% de matches en plus en suivant DateDetox"

**Viralité :**
- Bouton "Partager mon Wrapped" génère une image story-ready (1080×1920) avec les stats clés
- Design Instagram/TikTok friendly (fond dégradé, typographie impact, stats en gros)
- Lien vers DateDetox intégré dans l'image (QR code ou handle)
- Le partage EST la distribution. Pas besoin de marketing.

**RGPD compliance :**
- **Aucune donnée ne quitte le navigateur.** Tout le parsing et le calcul sont côté client.
- Le fichier est lu en mémoire, traité, et libéré. Aucun upload serveur.
- Affichage explicite : "🔒 Tes données restent sur ton appareil. Rien n'est envoyé."
- Pas de fingerprinting, pas de tracking, pas de stockage sauf si l'utilisateur choisit de sauver ses stats (localStorage)

**Benchmarks anonymisés (Phase 3) :**
- Si l'utilisateur accepte (opt-in explicite) : ses stats anonymisées (pas de données personnelles, juste les métriques agrégées) sont envoyées pour construire des benchmarks
- "Ton match rate est dans le top 30% des utilisateurs DateDetox"
- Ceci crée un effet réseau passif et un moat data

**Monétisation** : Gratuit. C'est le **magnet d'acquisition** qui nourrit le funnel vers Pro.

**Effort** : ~5-7 jours (parser Tinder, calcul métriques, visualisations, share image generator). +2-3 jours par app supplémentaire.

### F10 — Dating Forecast Newsletter (Phase 3)

**Le concept** : Newsletter hebdomadaire "The Dating Forecast" alimentée automatiquement par le data engine DateDetox.

**Contenu type :**
```
📊 THE DATING FORECAST — Semaine du 3 mars

🔥 Cette semaine : Bumble en hausse (+8% vs moyenne saisonnière)
📉 Tinder : stable
📈 Hinge : léger rebond post-février

⏰ Meilleurs créneaux cette semaine :
1. Dimanche 21h (score 94) — Le classique
2. Lundi 21h (score 88) — Momentum post-weekend
3. Jeudi 21h (score 82) — Pré-weekend spike

💡 Tip de la semaine :
"Les profils avec un prompt Hinge ont 60% plus d'engagement 
que ceux sans. Le meilleur prompt cette saison : [...]"

🌤️ Météo dating : pluie prévue mardi → activité +10% (les gens 
restent chez eux et swipent)
```

**Stack** : Beehiiv (gratuit <2500 subs) + script Python auto-génération du contenu.

**Monétisation** : Sponsoring par dating apps / produits lifestyle. CPM élevé (niche lifestyle 25-40).

**Effort** : ~2-3 jours (template + script auto-génération + setup Beehiiv).

### F11 — Détox Streak (Phase 3)

**Le concept** : Gamification du comportement "healthy dating".

**Critères de streak quotidien :**
- ✅ N'a pas ouvert d'app de dating en Red Light
- ✅ Session limitée à ≤ 20 minutes
- ✅ A utilisé DateDetox pour vérifier le timing avant de swiper

**Ce que l'utilisateur voit :**
- "🔥 Streak : 7 jours de dating intentionnel"
- "Record : 23 jours"
- Badge partageable sur les réseaux

**Effort** : ~1-2 jours. Logique 100% client-side (localStorage).

---

## 5. Features héritées de DatePulse V3.3

Les features suivantes sont conservées telles quelles (ou avec un rebranding cosmétique) :

| Feature DatePulse | Statut DateDetox | Changements |
|---|---|---|
| Scoring Engine (lookup tables + events) | ✅ Conservé | Aucun — c'est le cœur du produit |
| Heatmap Semaine | ✅ Conservé | Rebranding labels ("zones mortes" vs "fenêtres") |
| Best Times | ✅ Conservé | Rebranding ("Tes 3 fenêtres de la semaine") |
| Countdown Next | ✅ Conservé | Amplifié en Red Light mode |
| App Selector (Tinder/Bumble/Hinge/Happn) | ✅ Conservé | Aucun |
| Yearly Chart (Recharts) | ✅ Conservé | Aucun |
| Météo temps réel (wttr.in) | ✅ Conservé | Aucun |
| Google Trends live modifier | ✅ Conservé | Aucun |
| Match Tracker inline | ✅ Conservé | Intégré au Session Timer |
| PWA + Offline | ✅ Conservé | Aucun |
| Page Méthodologie | ✅ Conservé | Enrichie avec explication DateDetox |
| Pool Freshness | ✅ Conservé | Aucun |
| Auto Swiper (scripts Python) | ⚠️ Conservé mais PRIVÉ | Supprimé de l'UI publique. Scripts locaux uniquement. |

---

## 6. Architecture technique

### 6.1 Stack

| Couche | Techno | Justification |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | SPA légère, héritage DatePulse |
| Styling | Tailwind CSS | Rapide, dark mode natif |
| Animations | Framer Motion | Jauge, timer, transitions |
| PWA | vite-plugin-pwa + Workbox | Installable, offline |
| Stockage local | localStorage | Sessions, matches, settings. 0 backend |
| LLM API | OpenRouter → DeepSeek V3 | Profile Audit + Message Coach. Vision + texte |
| Email | Beehiiv (gratuit <2500 subs) | Smart Nudge + Newsletter |
| Deploy | Vercel | Zero-config, gratuit tier hobby |
| Automation locale | Python 3.11+ | Scripts cron existants (trends, auto-trigger) |

### 6.2 Structure projet

```
DateDetox/
├── CLAUDE.md                          # Instructions Claude Code
├── CDC_DATEDETOX_V1.md                # Ce document
│
├── frontend/                          # SPA React (déployée sur Vercel)
│   ├── src/
│   │   ├── App.tsx                    # Routing (/, /methodology, /wrapped, /audit)
│   │   ├── main.tsx                   # Entry point
│   │   │
│   │   ├── lib/
│   │   │   ├── data.ts               # Lookup tables (hérité DatePulse)
│   │   │   ├── scoring.ts            # computeScore(), heatmap, best times
│   │   │   ├── franceTime.ts         # Helpers timezone Europe/Paris
│   │   │   ├── matchTracker.ts       # Match Tracker CRUD localStorage
│   │   │   ├── sessionTracker.ts     # 🆕 Session Timer CRUD localStorage
│   │   │   ├── weeklyReport.ts       # 🆕 Agrégation + insights templates
│   │   │   ├── wrappedParser.ts      # 🆕 Parser RGPD (Tinder, Bumble, Hinge)
│   │   │   ├── wrappedMetrics.ts     # 🆕 Calcul métriques Dating Wrapped
│   │   │   ├── llmService.ts         # 🆕 Appels OpenRouter (Profile Audit + Coach)
│   │   │   └── shareImage.ts         # 🆕 Génération image partageable (canvas)
│   │   │
│   │   ├── components/
│   │   │   ├── ScoreGauge.tsx         # Jauge circulaire (hérité + mode red/green)
│   │   │   ├── ScoreLabel.tsx         # Label contextuel (reframé DateDetox)
│   │   │   ├── RedLightScreen.tsx     # 🆕 Écran Red Light (score < 35)
│   │   │   ├── GreenLightScreen.tsx   # 🆕 Écran Green Light (score ≥ 35)
│   │   │   ├── HeatmapWeek.tsx        # Grille 7j × 24h (hérité)
│   │   │   ├── BestTimes.tsx          # Top créneaux (hérité, rebranding)
│   │   │   ├── CountdownNext.tsx      # Countdown (hérité)
│   │   │   ├── AppSelector.tsx        # Sélecteur apps (hérité)
│   │   │   ├── YearlyChart.tsx        # Courbes annuelles (hérité)
│   │   │   ├── PoolFreshness.tsx      # Fraîcheur pool (hérité)
│   │   │   ├── MatchTrackerInline.tsx # Match Tracker (hérité)
│   │   │   ├── SessionTimer.tsx       # 🆕 Timer Pomodoro-style
│   │   │   ├── SessionSummary.tsx     # 🆕 Résumé post-session
│   │   │   ├── ProfileAudit.tsx       # 🆕 Upload + résultat audit
│   │   │   ├── MessageCoach.tsx       # 🆕 Input conversation + suggestions
│   │   │   ├── BoostOptimizer.tsx     # 🆕 Heatmap ROI boost
│   │   │   ├── WeeklyReport.tsx       # 🆕 Bilan hebdomadaire
│   │   │   ├── DetoxStreak.tsx        # 🆕 Streak counter + badge
│   │   │   ├── WrappedUpload.tsx      # 🆕 Zone upload fichier RGPD
│   │   │   ├── WrappedReport.tsx      # 🆕 Visualisation Dating Wrapped
│   │   │   ├── WrappedShare.tsx       # 🆕 Générateur image partageable
│   │   │   └── EmailSignup.tsx        # 🆕 Inscription Smart Nudge / Newsletter
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Page principale (Red/Green Light + heatmap)
│   │   │   ├── Methodology.tsx        # Page méthodologie (hérité + enrichi)
│   │   │   ├── Wrapped.tsx            # 🆕 Page Dating Wrapped
│   │   │   └── Audit.tsx              # 🆕 Page Profile Audit
│   │   │
│   │   └── styles/
│   │       └── globals.css            # Tailwind base (hérité)
│   │
│   ├── public/
│   │   ├── weather.json               # Fallback météo (hérité)
│   │   ├── trends.json                # Google Trends modifier (hérité)
│   │   └── ...                        # Icônes, OG image, etc.
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel.json
│
├── scripts/                           # Automation locale (hérité + enrichi)
│   ├── scoring_engine.py              # Port Python scoring (hérité)
│   ├── trends_live.py                 # Google Trends modifier (hérité)
│   ├── auto_trigger.py                # Auto Swiper (hérité, PRIVÉ)
│   ├── nudge_email.py                 # 🆕 Génération email quotidien → Beehiiv
│   └── newsletter_generator.py        # 🆕 Génération contenu newsletter hebdo
│
└── docs/
    ├── CDC_DATEPULSE_Vlight.md        # Archive CDC DatePulse
    └── WRAPPED_SCHEMA.md              # 🆕 Documentation structure RGPD par app
```

### 6.3 Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Vercel)                                           │
│  React SPA — calcul score côté client                        │
│  + Météo temps réel (wttr.in)                                │
│  + Google Trends modifier (trends.json)                      │
│  + Session Timer + Weekly Report (localStorage)              │
│  + Dating Wrapped parser (100% client-side, Web Worker)      │
│  + Profile Audit / Message Coach → appels OpenRouter API     │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               │ HTTPS                │ HTTPS (LLM calls)
               │                      │
┌──────────────▼────────┐  ┌─────────▼─────────────────────┐
│  Beehiiv               │  │  OpenRouter API                │
│  Smart Nudge emails    │  │  DeepSeek V3 (vision + texte)  │
│  Newsletter hebdo      │  │  ~$0.005/call                  │
│  Gratuit <2500 subs    │  │  Pas de stockage côté API      │
└────────────────────────┘  └───────────────────────────────┘
               ▲
┌──────────────┴────────────────────────────────────────────┐
│  SCRIPTS LOCAUX (PC Windows)                               │
│  trends_live.py — cron 2h → trends.json (hérité)           │
│  nudge_email.py — cron quotidien 20h → Beehiiv API         │
│  newsletter_generator.py — cron hebdo lundi → Beehiiv      │
│  auto_trigger.py — automation swipe PRIVÉE (hérité)         │
└───────────────────────────────────────────────────────────┘
```

### 6.4 Gestion des appels LLM

**Sécurité de la clé API :**
- L'appel OpenRouter se fait côté client (pas de backend)
- La clé API OpenRouter est en variable d'environnement Vercel (`VITE_OPENROUTER_KEY`)
- Rate limiting côté OpenRouter (budget mensuel configurable)
- Alternative Phase 2 : API route Vercel Edge Function pour masquer la clé

**Coûts estimés :**

| Feature | Coût/appel | Usage estimé/mois | Coût mensuel |
|---|---|---|---|
| Profile Audit | ~$0.01 | 200 audits (free + pro) | $2 |
| Message Coach | ~$0.005 | 300 analyses | $1.50 |
| **Total** | | | **~$3.50/mois** |

Largement couvert par quelques abonnés Pro.

### 6.5 Pas de base de données

Principe conservé de DatePulse : **zéro serveur, zéro BDD**. Tout est calculé côté client ou stocké en localStorage. Les seuls appels réseau sont :
- wttr.in (météo, gratuit, pas de clé)
- OpenRouter (LLM, clé API, pay-per-use)
- Beehiiv (email, via scripts locaux)

---

## 7. Sprint Roadmap

### Phase 1 — MVP DateDetox (3 semaines)

#### Semaine 1 : Rebranding + Red/Green Light + Session Timer

| Jour | Tâches | Livrables |
|---|---|---|
| **J1** | Rebranding : nom, logo, couleurs, meta tags, OG image | Identité DateDetox |
| **J1** | Refonte ScoreGauge → mode Red Light / Green Light | Composant dual-mode |
| **J2** | Refonte ScoreLabel → messages DateDetox (stop/go) | Labels reframés |
| **J2** | Rebranding HeatmapWeek, BestTimes (labels seulement) | Cohérence branding |
| **J3** | `sessionTracker.ts` — CRUD sessions localStorage | Data layer sessions |
| **J3** | `SessionTimer.tsx` — Timer circulaire Pomodoro-style | Timer fonctionnel |
| **J4** | `SessionSummary.tsx` — Résumé post-session | Flow complet start→stop→résumé |
| **J4** | Intégration Match Tracker existant dans le flow session | Lien matches↔sessions |
| **J5** | Tests + polish responsive | MVP Red/Green + Timer stable |

#### Semaine 2 : AI Profile Audit

| Jour | Tâches | Livrables |
|---|---|---|
| **J6** | `llmService.ts` — Wrapper OpenRouter (call, parse, error handling) | Service LLM réutilisable |
| **J6** | Config env : `VITE_OPENROUTER_KEY` + budget alert | Sécurité API |
| **J7** | `ProfileAudit.tsx` — UI upload (drag & drop, preview images) | Upload fonctionnel |
| **J7** | Prompt engineering Profile Audit (itérations sur résultats) | Prompt optimisé |
| **J8** | Affichage résultat structuré (score, critiques, améliorations) | Rapport audit |
| **J8** | Rate limiting free tier (1/mois, localStorage timestamp) | Gating freemium |
| **J9** | Page `/audit` + navigation + responsive | Page complète |
| **J9** | Tests + edge cases (images trop grandes, formats incorrects, timeout API) | Robustesse |

#### Semaine 3 : Weekly Report + Polish + Deploy

| Jour | Tâches | Livrables |
|---|---|---|
| **J10** | `weeklyReport.ts` — Agrégation sessions + insights templates | Logique rapport |
| **J10** | `WeeklyReport.tsx` — UI rapport (stats + mini charts + insights) | Rapport visuel |
| **J11** | `EmailSignup.tsx` — Composant inscription email (Beehiiv embed) | Collecte emails |
| **J11** | Landing reframée : hero Red/Green + "Swipe less. Match more." | Nouvelle home |
| **J12** | Polish global : dark mode, responsive, animations, micro-interactions | UX premium |
| **J12** | Page Methodology enrichie (explication DateDetox + sources) | Crédibilité |
| **J13** | SEO : meta tags, sitemap, robots.txt, structured data | Discoverability |
| **J13** | Deploy Vercel + domaine datedetox.app (ou .io) | 🚀 PROD LIVE |
| **J14** | README GitHub + screenshots | Open source ready |
| **J14** | Buffer : tests finaux, bugfixes | Stabilité |

**Validation Phase 1** : Le produit est live avec Score Red/Green + Heatmap + Session Timer + Profile Audit + Weekly Report + inscription email.

### Phase 2 — Monétisation + Features avancées (3 semaines)

#### Semaine 4 : Message Coach + Boost Optimizer

| Tâches | Effort |
|---|---|
| `MessageCoach.tsx` — UI input conversation + affichage suggestions | 2j |
| Prompt engineering Message Coach (itérations) | 1j |
| `BoostOptimizer.tsx` — Heatmap ROI boost + recommandation | 1.5j |
| Intégration paywall Detox Pro (Stripe Checkout ou LemonSqueezy) | 1j |

#### Semaine 5 : Smart Nudge + Dating Wrapped (début)

| Tâches | Effort |
|---|---|
| `nudge_email.py` — Script génération email quotidien | 1j |
| Setup Beehiiv + templates email | 0.5j |
| `wrappedParser.ts` — Parser RGPD Tinder (basé sur fichier reçu) | 2j |
| `wrappedMetrics.ts` — Calcul métriques Wrapped | 1.5j |

#### Semaine 6 : Dating Wrapped (fin) + Polish

| Tâches | Effort |
|---|---|
| `WrappedReport.tsx` — Visualisations complètes (Recharts) | 2j |
| `WrappedShare.tsx` — Génération image partageable (canvas) | 1j |
| Page `/wrapped` + flow upload → rapport → share | 1j |
| Tests E2E + edge cases | 1j |

**Validation Phase 2** : Monétisation active (Stripe), Message Coach, Boost Optimizer, Smart Nudge email, Dating Wrapped Tinder fonctionnel.

### Phase 3 — Growth + Media (ongoing)

| Tâche | Effort | Impact |
|---|---|---|
| Parser Bumble pour Dating Wrapped | 2-3j | +1 app |
| Parser Hinge pour Dating Wrapped | 2-3j | +1 app |
| Newsletter "The Dating Forecast" (Beehiiv + script auto) | 2j setup | Sponsoring revenue |
| Détox Streak (gamification) | 1-2j | Rétention |
| Benchmarks anonymisés (opt-in) | 3-4j | Moat data |
| Contenu TikTok/Reels (Wrapped + Profile Audit) | Ongoing | Distribution |

---

## 8. Monétisation

### 8.1 Tiers

| Tier | Prix | Features | Cible |
|---|---|---|---|
| **Free** | 0€ | Score Red/Green, Heatmap, Best Times, Session Timer, 1 Profile Audit/mois, Dating Wrapped, Weekly Report basique | Acquisition, viralité |
| **Detox Pro** | $5.99/mois | Tout Free + Audits illimités + Boost Optimizer + Weekly Report complet + Smart Nudge email | Utilisateurs réguliers |
| **Detox+ Coach** | $14.99/mois | Tout Pro + Message Coach illimité | Utilisateurs premium / frustrés |

### 8.2 Positionnement prix

- Tinder Gold : $14.99-29.99/mois → DateDetox Pro est **moins cher qu'UN boost Tinder** et rend tous les boosts plus efficaces
- Hinge Preferred : $34.99/mois → DateDetox Coach à $14.99 est perçu comme un deal
- Headspace/Calm : $12.99/mois → Référent mental pour le pricing wellbeing

### 8.3 Coûts

| Poste | Coût/mois |
|---|---|
| Vercel (hobby tier) | $0 |
| OpenRouter (LLM calls) | ~$3-10 (scaling avec usage) |
| Domaine | ~$1 |
| Beehiiv (<2500 subs) | $0 |
| **Total** | **< $15/mois** |

### 8.4 Projection réaliste

| Mois | Visiteurs uniques | Abonnés email | Paying users | MRR |
|---|---|---|---|---|
| M1 | 1,000-3,000 (Reddit + viral Profile Audit) | 200 | 0 (free only) | $0 |
| M3 | 3,000-8,000 (SEO + UGC Wrapped) | 800 | 20-40 Pro + 5-10 Coach | $200-400 |
| M6 | 8,000-20,000 (SEO compound + newsletter) | 2,000 | 60-120 Pro + 20-40 Coach | $660-1,320 |
| M12 | 20,000-50,000 | 5,000 | 150-300 Pro + 50-100 Coach | $1,650-3,300 |

**Break-even** : ~3 abonnés Pro couvrent les coûts d'infra ($18/mois). Atteint dès M1-M2.

---

## 9. Distribution

### 9.1 Lancement Phase 1 (Semaine 3-4)

**Canal 1 — Reddit (priorité #1)**

| Subreddit | Angle | Post type |
|---|---|---|
| r/Tinder (4M+) | "I analyzed 50+ official dating app publications. Here's when you should actually swipe." | Data-driven, valeur intrinsèque, pas de lien direct |
| r/dating_advice (5M+) | "I built an app that tells you when NOT to open Tinder. Here's why most of your swiping is wasted." | Wellbeing angle |
| r/datascience | "I used correlation analysis on published dating app data to build a timing model (r=0.995)" | Technique |
| r/OnlineDating | "Your Dating Wrapped: I built a tool to analyze your Tinder GDPR data export" | Wrapped tease |

**Canal 2 — TikTok / Reels**
- "L'IA a noté mon profil Tinder — résultat choquant" (capture écran Profile Audit)
- "J'ai analysé mes données Tinder RGPD et voici ce que j'ai découvert" (Dating Wrapped)
- "Le pire moment pour swiper sur Tinder (la data le prouve)" (Score engine)

**Canal 3 — Hacker News**
- "Show HN: DateDetox – The app that tells you to STOP swiping"

**Canal 4 — Presse tech FR**
- Pitch Konbini, Madmoizelle, Numerama : "L'app anti-Tinder qui te dit de MOINS swiper"
- Angle mental health + data science = story media naturelle

### 9.2 Long-terme (SEO)

**Articles blog ciblés :**
- "Meilleure heure pour Tinder en France" (volume de recherche élevé, peu de concurrence FR)
- "Quand ouvrir Bumble pour avoir plus de matchs"
- "Comment demander ses données RGPD Tinder (et ce que vous allez découvrir)"
- "Votre profil Tinder est-il bon ? L'IA répond"
- "Dating app addiction : comment reprendre le contrôle"

### 9.3 Boucle virale

```
Dating Wrapped → Partage stats sur réseaux → Ami curieux → Upload son Wrapped 
→ Découvre DateDetox → Essaie Profile Audit → Partage son score → Viralité
```

Chaque feature a un potentiel de partage intégré :
- Wrapped → image story-ready
- Profile Audit → "Mon profil a eu 62/100, et toi ?"
- Weekly Report → "J'ai économisé 3h de swipe cette semaine"
- Streak → "14 jours de dating intentionnel 🔥"

---

## 10. KPIs

### Lancement (semaine 1)

| KPI | Cible | Mesure |
|---|---|---|
| Visiteurs uniques J1-J7 | 1,000+ | Vercel Analytics |
| Reddit post upvotes (r/Tinder) | 100+ | Reddit |
| Profile Audits réalisés | 200+ | Event tracking |
| Inscriptions email | 100+ | Beehiiv |
| Temps moyen sur page | >2min | Analytics |

### Court-terme (M1-M3)

| KPI | Cible | Mesure |
|---|---|---|
| Visiteurs uniques / mois | 5,000+ | Analytics |
| **Taux de retour J7** | **20%+** | Analytics (métrique de validation #1) |
| Sessions Timer lancées / semaine | 500+ | Event tracking |
| Profile Audits / mois | 1,000+ | Event tracking |
| Abonnés email | 500+ | Beehiiv |
| Paying users | 20+ | Stripe/LemonSqueezy |
| Position SEO "meilleure heure tinder" | Top 10 | Google Search Console |

### Moyen-terme (M3-M12)

| KPI | Cible | Mesure |
|---|---|---|
| MRR | $500+ | Stripe |
| Dating Wrapped uploads / mois | 500+ | Event tracking |
| Newsletter subscribers | 2,000+ | Beehiiv |
| Taux de conversion free → pro | 3-5% | Funnel analytics |

---

## 11. Risques et mitigations

| Risque | Prob. | Impact | Mitigation |
|---|---|---|---|
| **Reddit downvote / perçu comme spam** | Moyenne | Moyen | Post data-first sans lien. Valeur intrinsèque. Karma farming préalable. |
| **Clé API OpenRouter exposée côté client** | Haute | Moyen | Budget cap OpenRouter + migration vers Edge Function Vercel en Phase 2 |
| **Structure RGPD Tinder change sans prévenir** | Faible | Moyen | Parser avec fallbacks, message "format non reconnu, contacte-nous" |
| **Concurrents copient le concept** | Moyenne | Faible | First mover + UGC = moat. Le concept est facile à copier, l'audience non. |
| **WTP plus faible que prévu** | Moyenne | Moyen | Free tier très généreux → audience large → monétisation alternative (newsletter sponsoring) |
| **Profile Audit résultats incohérents (LLM hallucination)** | Moyenne | Haut | Prompt engineering itératif + disclaimer "suggestions IA, pas de vérité absolue" |
| **RGPD : l'utilisateur s'inquiète de ses données** | Moyenne | Haut | Architecture 100% client-side est le meilleur argument. Badge "Tes données ne quittent jamais ton appareil." proéminent. |
| **Auto Swiper découvert = bad PR** | Faible | Haut | Dissociation complète : pas de mention publique, pas dans le repo GitHub, scripts privés. |
| **Dating apps bloquent/dénoncent** | Très faible | Faible | Aucune API privée utilisée. Tout est basé sur publications officielles + données RGPD de l'utilisateur lui-même. |

---

## 12. Hors scope V1

- ❌ Backend / base de données (tout reste client-side + API calls)
- ❌ App mobile native (PWA suffit)
- ❌ Comptes utilisateur / authentification (pas nécessaire grâce à localStorage)
- ❌ Multi-langues (FR only au lancement, EN en Phase 3)
- ❌ Matching algorithm analysis (on ne touche pas aux algos des apps)
- ❌ Auto Swiper dans l'UI publique (reste privé)
- ❌ Benchmarks communautaires (Phase 3, besoin de volume)
- ❌ Intégration directe avec les APIs dating (aucune app n'en offre de publique)

---

## 13. Domaine & Branding

### Options de domaine (à vérifier)

| Domaine | Extension | Estimation dispo |
|---|---|---|
| datedetox.app | .app | Probablement disponible |
| datedetox.io | .io | À vérifier |
| datedetox.co | .co | À vérifier |
| getdatedetox.com | .com | Probablement disponible |
| swipeless.app | .app | Alternative |

### Direction design

- **Palette** : Vert (go) / Rouge (stop) / Fond sombre (hérité DatePulse dark mode)
- **Typographie** : Inter ou Satoshi (moderne, lisible, tech-wellbeing)
- **Tone of voice** : Direct, bienveillant, data-driven. Pas moralisateur.
- **Logo** : Icône feu tricolore (red/amber/green) stylisé + texte "DateDetox"

---

## 14. Prompt Claude Code — Phase 1

```
Lis CDC_DATEDETOX_V1.md — c'est le cahier des charges complet.

CONTEXTE : DateDetox est une évolution de DatePulse V3.3. 
Le codebase DatePulse existe déjà — on ne repart PAS de zéro.
On refactorise et on ajoute des features.

RÉSUMÉ : App de "dating intentionnel" qui combine :
- Score Red Light / Green Light (hérité DatePulse, refonte UX)
- Session Timer (nouveau, localStorage)
- AI Profile Audit (nouveau, OpenRouter API)
- Weekly Detox Report (nouveau, agrégation localStorage)

SEMAINE 1 — Rebranding + Red/Green Light + Session Timer :

1. Rebranding global :
   - Renommer DatePulse → DateDetox partout
   - Nouveau titre, tagline "Swipe less. Match more."
   - Palette : rouge (stop, score < 35) / vert (go, score ≥ 35)
   - Garder le dark mode comme base

2. Refonte ScoreGauge :
   - Mode RED LIGHT (score < 35) : fond rouge pulsant, message STOP
   - Mode GREEN LIGHT (score ≥ 35) : fond vert, message GO
   - Le composant existant est conservé, on ajoute un wrapper conditionnel

3. Session Timer :
   - Nouveau fichier src/lib/sessionTracker.ts (CRUD localStorage)
   - Nouveau composant SessionTimer.tsx (timer circulaire, countdown)
   - Nouveau composant SessionSummary.tsx (résumé post-session)
   - Le timer se lance via un bouton visible uniquement en Green Light
   - Durées : 10/15/20/30 min, défaut 15
   - Intégration avec Match Tracker existant

4. Ne PAS toucher au scoring engine, aux lookup tables, ni aux 
   features existantes (heatmap, yearly chart, météo, trends).
   Seuls les labels/messages changent.

Design : Dark mode, palette red/green, animations Framer Motion,
responsive mobile-first. Premium mais pas over-designed.

Ne fais que la Semaine 1. On valide avant de continuer.
```

---

## 15. Post-mortem template

### Ce qui a bien fonctionné
- [ ] ...

### Ce qui n'a pas fonctionné
- [ ] ...

### Métriques de lancement
- Temps total de dev :
- Visiteurs J1 :
- Profile Audits J1-J7 :
- Reddit upvotes :
- Inscriptions email :
- Position SEO à M1 :

### Décision : continuer / pivoter / abandonner
- [ ] ...

### Apprentissages
- [ ] ...
