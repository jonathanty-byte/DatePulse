# DateDetox — Prompts Claude Code Phase 1

> **Usage** : Copier-coller chaque prompt dans une session Claude Code séparée.
> Suivre l'ordre — chaque session dépend de la précédente.
> Activer **Plan Mode** (`shift+tab+tab`) au début de chaque session.

---

## Session 1/6 — Rebranding DatePulse → DateDetox

**Prérequis** : Codebase DatePulse V3.3 fonctionnelle.
**Durée estimée** : 2-3h
**Validation** : `npm run build` passe, l'app s'affiche avec le nouveau branding.

```
Lis CDC_DATEDETOX_V1.md — sections 0 et 13 (Genèse + Branding).

CONTEXTE : On renomme DatePulse → DateDetox. Le codebase DatePulse V3.3 
existe et fonctionne. On ne casse rien, on rebrand.

TÂCHES :

1. Renommage global :
   - Toutes les occurrences "DatePulse" → "DateDetox" dans le code, 
     les commentaires, les titres, les meta tags
   - Titre : "DateDetox — Swipe less. Match more."
   - Description meta : "La seule app de dating qui te dit de MOINS 
     utiliser les apps de dating. Score temps réel, AI Profile Audit, 
     Session Timer."

2. Palette de couleurs (Tailwind config) :
   - Nouvelle palette sémantique :
     - `redlight` : rouge profond (#DC2626 / red-600) — score < 35
     - `amber` : jaune (#F59E0B / amber-500) — score 36-55
     - `greenlight` : vert vif (#16A34A / green-600) — score ≥ 56
     - `peak` : vert éclatant (#22C55E / green-500) + glow — score ≥ 91
   - Garder le dark mode comme base (bg-gray-900/950)
   - L'ancienne palette rose/violet dating est remplacée par red/green

3. Labels UX — Remplacer les messages du scoring :
   - Score 0-15 : "🔴 RED LIGHT — Zéro activité. Ferme l'app."
   - Score 16-35 : "🔴 RED LIGHT — Pas maintenant. Reviens à [prochain pic]."
   - Score 36-55 : "🟡 AMBER — Activité correcte. 15 min si tu veux."
   - Score 56-75 : "🟢 GREEN LIGHT — Bon moment. Session de 15 min recommandée."
   - Score 76-90 : "🟢 GREEN LIGHT+ — Excellent créneau !"
   - Score 91-100 : "🟢🔥 PEAK — Moment optimal. Fonce !"

4. Rebranding des composants existants (labels seulement) :
   - BestTimes : "Top 5 créneaux" → "Tes 3 fenêtres de la semaine"
   - HeatmapWeek : colorisation red/green au lieu du dégradé actuel,
     les zones < 35 marquées visuellement comme "zones mortes"
   - CountdownNext : "Prochain pic" → "Prochain Green Light"

5. Meta tags & SEO :
   - index.html : title, description, OG tags, Twitter cards
   - Texte OG : "DateDetox — Swipe less. Match more."

6. NE PAS toucher :
   - scoring.ts, data.ts, franceTime.ts (moteur intact)
   - La logique des composants (seulement les labels/couleurs)
   - Les features météo, trends, match tracker, yearly chart

Commence par Plan Mode pour lister tous les fichiers impactés,
puis exécute les changements fichier par fichier.
Fais un `npm run build` à la fin pour vérifier que rien n'est cassé.
```

---

## Session 2/6 — Red Light / Green Light (refonte UX Score)

**Prérequis** : Session 1 terminée (rebranding OK).
**Durée estimée** : 3-4h
**Validation** : L'écran change visuellement entre rouge et vert selon le score. Responsive mobile.

```
Lis CDC_DATEDETOX_V1.md — section 4, feature F1 (Red Light / Green Light).

CONTEXTE : Le scoring engine est intact. On refond l'UI de la page 
principale pour avoir deux "modes" visuels distincts selon le score.

TÂCHES :

1. Créer `src/components/RedLightScreen.tsx` :
   - S'affiche quand score < 35
   - Fond avec gradient rouge sombre (from-red-950 to-gray-950)
   - Pulsation lente du fond (animation Framer Motion, 4s cycle)
   - ScoreGauge existant avec anneau ROUGE
   - Label STOP en gros : "NE SWIPE PAS"
   - Message contextuel : "Activité quasi-nulle. Tu vas juste 
     scroller dans le vide."
   - Countdown proéminent vers le prochain Green Light (>= 56)
     en utilisant la logique countdown existante mais recalculée
     pour le seuil 56 au lieu du prochain "pic"
   - CTA secondaire : "Profite-en pour améliorer ton profil →" 
     (lien vers /audit, désactivé pour l'instant)
   - Pas de bouton "Lancer session" (inutile en Red Light)

2. Créer `src/components/GreenLightScreen.tsx` :
   - S'affiche quand score >= 35
   - Fond avec gradient vert (from-green-950 to-gray-950 pour score 35-55,
     plus saturé pour 56+, glow effect pour 91+)
   - ScoreGauge avec anneau VERT (intensité liée au score)
   - Label GO : "C'EST MAINTENANT" pour >= 56, 
     "Activité correcte" pour 35-55
   - Session recommandée : "15 minutes suffisent"
   - Bouton "🎯 Lancer ma session" (proéminent, prépare le Session Timer)
     → Pour l'instant ce bouton affiche un toast "Session Timer — bientôt"
   - Énergie positive : micro-animations d'entrée, scale-in des éléments

3. Modifier `src/pages/Home.tsx` :
   - Wrapper conditionnel : score < 35 → RedLightScreen, sinon GreenLightScreen
   - Le reste de la page (heatmap, best times, yearly chart, etc.) 
     reste en dessous, inchangé
   - Transition fluide entre les deux modes (AnimatePresence Framer Motion)

4. Adapter `ScoreGauge.tsx` :
   - Accepter une prop `mode: 'red' | 'amber' | 'green' | 'peak'`
   - L'anneau de la jauge change de couleur selon le mode
   - Le pulse (glow) existant s'adapte : rouge en red light, vert en green
   - Garder la compatibilité avec l'usage actuel

5. Responsive :
   - Mobile-first : le Red/Green Light doit être immédiat et impactant 
     sur un écran 375px
   - Le message STOP/GO doit être lisible sans scroller
   - Le countdown/CTA session en dessous de la jauge

6. Tests visuels :
   - Tester avec des scores hardcodés : 10, 30, 45, 70, 95
   - Vérifier les transitions quand le score change (auto-refresh 1min)
   - Vérifier le dark mode (seul mode supporté)

NE PAS implémenter le Session Timer dans cette session — 
le bouton "Lancer ma session" est un placeholder.
```

---

## Session 3/6 — Session Timer + Résumé post-session

**Prérequis** : Session 2 terminée (Red/Green Light fonctionnel).
**Durée estimée** : 4-5h
**Validation** : Le timer se lance, compte à rebours, affiche un résumé, et stocke la session en localStorage.

```
Lis CDC_DATEDETOX_V1.md — section 4, feature F4 (Session Timer).

CONTEXTE : Le bouton "Lancer ma session" existe dans GreenLightScreen 
mais est un placeholder. On implémente le flow complet.

APPROCHE TDD : Écrire les tests du sessionTracker d'abord, 
puis implémenter.

TÂCHES :

1. Créer `src/lib/sessionTracker.ts` — Data layer :

   Interface :
   ```typescript
   interface DetoxSession {
     id: string;              // "session-" + timestamp
     date: string;            // ISO 8601
     app: AppName;            // tinder | bumble | hinge | happn
     duration_planned: number; // minutes (10, 15, 20, 30)
     duration_actual: number;  // minutes (réel)
     score_start: number;     // score au démarrage
     score_end: number;       // score à la fin
     score_avg: number;       // moyenne pendant la session
     matches: number;         // matches ajoutés pendant la session
     completed: boolean;      // true si timer arrivé à 0, false si arrêt manuel
   }
   ```

   Fonctions CRUD (localStorage, clé "datedetox_sessions") :
   - `startSession(app, duration, score): DetoxSession`
   - `endSession(id, matches, completed): DetoxSession`
   - `getSessions(): DetoxSession[]`
   - `getSessionsThisWeek(): DetoxSession[]`
   - `getSessionStats(): { totalTime, totalMatches, avgScore, 
     matchesPerHour, sessionsCount, completionRate }`
   - `getActiveSession(): DetoxSession | null`

   Écrire les tests unitaires AVANT l'implémentation.
   Edge cases : pas de sessions, session en cours, localStorage vide.

2. Créer `src/components/SessionTimer.tsx` :

   Flow UX :
   a) État IDLE (bouton dans GreenLightScreen) :
      - Sélecteur de durée : 10 / 15 / 20 / 30 min (pills, défaut 15)
      - App actuellement sélectionnée (via AppSelector existant)
      - Bouton "🎯 Lancer ma session" (vert, large)

   b) État RUNNING :
      - Timer circulaire (SVG arc, même style que ScoreGauge)
      - Countdown : "12:34" restantes
      - Score DateDetox actuel (continue de se rafraîchir)
      - Mini compteur de matches : "💕 2 matches" avec bouton "+" 
        pour incrémenter (simplifié par rapport au Match Tracker complet)
      - Bouton "⏹ Arrêter" (avec confirmation : "Sûr ? Ta session 
        sera marquée comme incomplète")
      - Notification mi-temps : animation flash douce + texte 
        "Mi-temps ! [X] min restantes"
      - Notification fin : animation + vibration (navigator.vibrate si 
        disponible) + son optionnel

   c) Le timer doit survivre au changement d'onglet :
      - Stocker `startTime` et `plannedDuration` dans localStorage
      - Au re-render, calculer le temps restant via Date.now() - startTime
      - Si le temps est écoulé pendant l'absence, afficher directement 
        le résumé

   d) Le timer prend toute la zone hero (remplace temporairement 
      le Red/Green Light screen pendant qu'il tourne)

3. Créer `src/components/SessionSummary.tsx` :

   S'affiche quand le timer se termine (ou arrêt manuel) :
   - Résumé visuel :
     "✅ Session terminée !
      ⏱️ 15 min — Score moyen 78 — 💕 2 matches
      ⚡ Efficacité : 8 matches/heure (estimé)"
   - Comparaison si sessions précédentes existent :
     "📈 Mieux que 73% de tes sessions" (percentile simple)
   - Prochain créneau : "Prochaine fenêtre verte : demain 21h"
   - Deux boutons : "Fermer" (retour à Home) et "Nouvelle session" 
     (si encore en Green Light)
   - Animation d'entrée célébratoire (confetti subtil ou scale-in)

4. Intégration dans Home.tsx :
   - Le flow est : GreenLightScreen → click "Lancer" → SessionTimer 
     → timer fin → SessionSummary → retour Home
   - Gérer les 3 états dans Home.tsx avec un state machine simple :
     `'idle' | 'session_active' | 'session_complete'`
   - Si l'utilisateur revient sur la page avec une session active 
     (localStorage), reprendre le timer automatiquement

5. Intégration Match Tracker existant :
   - Le bouton "+" dans le SessionTimer incrémente un compteur local
   - À la fin de la session, le nombre de matches est sauvegardé 
     dans la DetoxSession
   - Les matches sont AUSSI ajoutés au Match Tracker existant 
     (matchTracker.ts) pour garder la compatibilité

Tests à écrire :
- sessionTracker : CRUD, stats, edge cases
- Timer : countdown correct, survie changement onglet, arrêt manuel
```

---

## Session 4/6 — AI Profile Audit

**Prérequis** : Session 3 terminée. Clé API OpenRouter configurée.
**Durée estimée** : 5-6h
**Validation** : Upload de screenshots → appel LLM → résultat structuré affiché. Rate limit 1/mois en free.

```
Lis CDC_DATEDETOX_V1.md — section 4, feature F3 (AI Profile Audit) 
et section 6.4 (Gestion des appels LLM).

PRÉREQUIS TECHNIQUE :
- Créer un compte OpenRouter (openrouter.ai)
- Ajouter la clé API dans .env.local : VITE_OPENROUTER_KEY=sk-or-...
- Budget cap recommandé : $5/mois sur OpenRouter dashboard
- Modèle : deepseek/deepseek-chat-v3-0324 (vision + texte, ~$0.01/call)
  OU anthropic/claude-3.5-sonnet si DeepSeek vision unavailable
  → Vérifier la disponibilité des modèles vision sur OpenRouter

APPROCHE : Architecture service d'abord, puis UI, puis intégration.

TÂCHES :

1. Créer `src/lib/llmService.ts` — Service LLM réutilisable :

   ```typescript
   interface LLMCallOptions {
     model?: string;
     systemPrompt: string;
     userContent: (TextContent | ImageContent)[];
     maxTokens?: number;
     temperature?: number;
   }

   interface TextContent { type: 'text'; text: string; }
   interface ImageContent { 
     type: 'image_url'; 
     image_url: { url: string }; // base64 data URL
   }

   async function callLLM(options: LLMCallOptions): Promise<string>
   ```

   - Appel fetch vers https://openrouter.ai/api/v1/chat/completions
   - Headers : Authorization Bearer, HTTP-Referer (datedetox.app),
     X-Title (DateDetox)
   - Error handling : timeout 30s, retry 1x sur 429/500, 
     message utilisateur clair sur erreur
   - Parse la réponse JSON, extraire le contenu text
   - Ne PAS stocker les images/conversations (privacy)

2. Créer `src/lib/profileAudit.ts` — Logique métier audit :

   ```typescript
   interface AuditResult {
     score: number;           // 0-100
     critical: AuditItem[];   // max 3
     improvements: AuditItem[];// max 3
     strengths: AuditItem[];  // max 3
     potential_score: number;  // score estimé après corrections
   }

   interface AuditItem {
     title: string;
     detail: string;
     recommendation: string;
   }

   async function analyzeProfile(
     images: string[], // base64 data URLs
     app: AppName
   ): Promise<AuditResult>
   ```

   Prompt système (intégré dans le code) :
   ```
   Tu es un expert en optimisation de profils de dating apps 
   ({app}). Analyse les screenshots du profil et fournis un 
   audit structuré.

   Scoring (score /100) :
   - Qualité des photos : 40% (éclairage, cadrage, résolution, 
     variété de contextes, sourire, contact visuel)
   - Bio / prompts : 20% (originalité, longueur, humour, 
     conversation starters)
   - Variété / storytelling : 20% (mix activités, social, 
     voyage, lifestyle — pas que des selfies)
   - Ordre des photos : 10% (la plus forte en premier, 
     progression logique)
   - Utilisation des features de l'app : 10% (prompts Hinge, 
     Spotify anthem, intérêts)

   Fournis en JSON strict (pas de markdown, pas de backticks) :
   {
     "score": number,
     "critical": [{"title": "...", "detail": "...", 
       "recommendation": "..."}],
     "improvements": [{"title": "...", "detail": "...", 
       "recommendation": "..."}],
     "strengths": [{"title": "...", "detail": "..."}],
     "potential_score": number
   }

   Règles :
   - Sois direct et honnête. Pas de compliments vides.
   - Maximum 3 items par catégorie.
   - Chaque recommandation doit être concrète et actionnable.
   - Réfère-toi aux études publiées (Hinge, Tinder) quand 
     pertinent.
   - Score moyen attendu : 40-60. Un 80+ est rare.
   - Langue : français.
   ```

   - Parser le JSON du LLM avec try/catch + fallback si malformé
   - Valider les ranges (score 0-100, max 3 items par catégorie)

3. Créer `src/components/ProfileAudit.tsx` — UI complète :

   États du composant :
   a) UPLOAD :
      - Zone drag & drop (react-dropzone ou natif) 
      - Accepte : jpg, png, webp. Max 6 images, max 5MB chacune.
      - Preview des images uploadées (thumbnails)
      - Bouton ajouter + bouton supprimer par image
      - Sélecteur d'app (pour quel profil ? Tinder/Bumble/Hinge)
      - Bouton "🔍 Analyser mon profil" (désactivé si < 1 image)
      - Note : "🔒 Tes photos ne sont pas stockées. 
        Elles sont envoyées à l'IA pour analyse puis supprimées."

   b) LOADING :
      - Skeleton/shimmer du résultat
      - Messages alternés pendant l'attente (3-8 sec) :
        "Analyse des photos en cours..."
        "Évaluation de la bio..."
        "Comparaison avec les meilleures pratiques..."
      - Barre de progression indéterminée

   c) RESULT :
      - Score circulaire en haut (même style que ScoreGauge, 
        couleur selon le score : rouge < 40, orange 40-60, 
        vert 60-80, vert vif > 80)
      - Section "🔴 Problèmes critiques" : cards rouges, 
        chaque card a titre + détail + recommandation
      - Section "🟡 Améliorations" : cards jaunes
      - Section "✅ Points forts" : cards vertes
      - Score potentiel : "💡 Après corrections : ~81/100"
      - Bouton "Refaire un audit" (si Pro) ou 
        "Prochain audit gratuit dans X jours" (si free)
      - Bouton "Partager mon score" (capture screenshot, 
        Phase 2 — placeholder pour l'instant)

   d) ERROR :
      - Message clair : "L'analyse a échoué. Réessaie dans 
        quelques secondes."
      - Bouton retry

   e) RATE_LIMITED (free tier) :
      - "Tu as utilisé ton audit gratuit ce mois-ci."
      - "Prochain audit gratuit : [date]"
      - CTA : "Passe à Detox Pro pour des audits illimités →"
        (lien mort pour l'instant, Phase 2 paywall)

4. Rate limiting free tier :
   - localStorage key : "datedetox_last_audit"
   - Valeur : timestamp ISO du dernier audit
   - Logique : si < 30 jours depuis le dernier audit → RATE_LIMITED
   - Pas de vérification côté serveur (facilement contournable, 
     c'est OK pour le MVP — le but est le nudge, pas le blocage)

5. Créer `src/pages/Audit.tsx` :
   - Page dédiée /audit
   - Header : "🔍 AI Profile Audit" + subtitle "Ton profil est-il 
     au niveau ? L'IA te donne un score et des recommandations."
   - Composant ProfileAudit centré
   - Lien retour vers Home
   - Si l'utilisateur arrive via le CTA Red Light, afficher un 
     message : "Profite de ce moment calme pour améliorer ton profil."

6. Navigation :
   - Ajouter /audit dans App.tsx (route)
   - Lien dans le CTA Red Light ("Améliore ton profil →")
   - Lien dans le header/nav si il existe

7. Conversion des images :
   - Les images uploadées sont converties en base64 data URLs 
     côté client (FileReader.readAsDataURL)
   - Redimensionner les images > 1920px de large à 1920px avant 
     l'envoi (canvas resize) pour réduire les tokens
   - Format envoyé au LLM : data:image/jpeg;base64,...

8. Sécurité :
   - La clé API est dans VITE_OPENROUTER_KEY (exposée côté client)
   - C'est un risque connu et accepté pour le MVP
   - Ajouter un commentaire TODO : migrer vers Vercel Edge Function
   - Le budget cap OpenRouter est la protection principale

Tests :
- llmService : mock fetch, test error handling, test timeout
- profileAudit : mock LLM response, test parsing JSON, 
  test validation ranges, test fallback si JSON malformé
- Rate limiting : test localStorage, test expiration 30j
```

---

## Session 5/6 — Weekly Detox Report

**Prérequis** : Session 3 terminée (Session Timer avec données en localStorage).
**Durée estimée** : 3-4h
**Validation** : La page rapport affiche les stats de la semaine avec insights contextuels.

```
Lis CDC_DATEDETOX_V1.md — section 4, feature F5 (Weekly Detox Report).

CONTEXTE : Le Session Timer (session 3) stocke des DetoxSession dans 
localStorage. On agrège ces données pour produire un bilan hebdomadaire.

TÂCHES :

1. Créer `src/lib/weeklyReport.ts` — Logique d'agrégation :

   ```typescript
   interface WeeklyReport {
     weekStart: string;        // ISO lundi
     weekEnd: string;          // ISO dimanche
     totalTime: number;        // minutes
     sessionsCount: number;
     completedSessions: number;
     totalMatches: number;
     avgScore: number;
     matchesPerHour: number;
     bestDay: string;          // "Dimanche"
     bestHour: number;         // 21
     pctGreenLight: number;    // % sessions lancées en score >= 56
     // Comparaison semaine précédente
     prevWeek: {
       totalTime: number;
       totalMatches: number;
       matchesPerHour: number;
     } | null;
     // Deltas
     timeDelta: number;        // % change
     matchesDelta: number;     // % change
     efficiencyDelta: number;  // % change
   }

   function generateWeeklyReport(
     sessions: DetoxSession[], 
     weekOffset?: number  // 0 = cette semaine, -1 = semaine dernière
   ): WeeklyReport

   function getInsight(report: WeeklyReport): string
   ```

   Templates d'insights (retourne LE meilleur insight applicable) :
   - Si matchesDelta > 0 ET timeDelta < 0 : 
     "🎯 Moins de temps, plus de matches ! Tu as gagné [X]h 
     cette semaine avec [Y] matches de plus."
   - Si pctGreenLight > 80% : 
     "✅ [X]% de tes sessions en Green Light. Tu maîtrises le timing."
   - Si pctGreenLight < 50% : 
     "⚠️ Tu swibes encore en Red Light. Les créneaux Green Light 
     donnent [X]× plus de matches."
   - Si matchesPerHour > prevWeek.matchesPerHour : 
     "📈 Ton efficacité s'améliore : [X] matches/heure vs [Y] 
     la semaine dernière."
   - Si sessionsCount == 0 : 
     "😴 Aucune session cette semaine. Lance ta première session 
     pendant un Green Light !"
   - Si sessionsCount >= 7 : 
     "🔥 [X] sessions cette semaine ! Continue sur ta lancée."
   - Fallback : "💡 Astuce : les sessions de 15 min en Green Light 
     sont les plus efficaces."

2. Créer `src/components/WeeklyReport.tsx` :

   Layout :
   - Header : "📊 Bilan de la semaine — [date début] au [date fin]"
   - 4 stat cards en grid (2×2 mobile, 4×1 desktop) :
     - ⏱️ Temps total : "[X]h[Y]min" + delta vs semaine précédente
     - 🎯 Sessions : "[X] sessions ([Y]% complètes)"
     - 💕 Matches : "[X]" + delta
     - ⚡ Efficacité : "[X] matches/heure" + delta
   - Les deltas sont colorés : vert si amélioration, rouge si régression
     (ATTENTION : pour le temps, MOINS = mieux, donc delta négatif = vert)
   - Mini bar chart (Recharts BarChart) : 
     matches par jour de la semaine, couleur = score moyen du jour
     (réutiliser les couleurs red/amber/green)
   - Section insight : card mise en avant avec le message contextuel
   - Sélecteur de semaine : chevrons ← → pour naviguer entre les semaines
   - Si aucune donnée : message encourageant + CTA "Lance ta première session"

   Style : cohérent avec le reste de DateDetox (dark mode, 
   palette red/green, Framer Motion pour les animations d'entrée).

3. Intégration dans Home.tsx :
   - Nouvelle section sous la heatmap (ou sous le yearly chart)
   - Affichée seulement si au moins 1 session existe
   - Titre : "📊 Ton bilan" avec un badge "Nouveau" la première fois
   - Collapsed par défaut en mobile (expandable)
   - Toujours visible en desktop

4. Badge notification :
   - Chaque lundi, si des sessions existent pour la semaine passée,
     afficher un badge sur la section "📊 Ton bilan" 
   - Le badge disparaît quand l'utilisateur scroll jusqu'au rapport

Tests :
- weeklyReport : agrégation correcte, semaine vide, une seule session,
  comparaison avec semaine précédente, calcul des deltas
- getInsight : chaque template testé avec des données mock
- Edge cases : début d'utilisation (pas de semaine précédente),
  localStorage vide
```

---

## Session 6/6 — Email Signup + Polish + Deploy

**Prérequis** : Sessions 1-5 terminées. Compte Beehiiv créé. Domaine acheté.
**Durée estimée** : 4-5h
**Validation** : App déployée sur Vercel, responsive, performante, inscription email fonctionnelle.

```
Lis CDC_DATEDETOX_V1.md — sections 6.1, 9, 13 (Stack, Distribution, 
Branding) et section 14 (prompt Phase 1 résumé).

CONTEXTE : Toutes les features Phase 1 sont implémentées. 
Cette session est le polish final + deploy.

TÂCHES :

1. Créer `src/components/EmailSignup.tsx` :
   - Section "Reçois ton Green Light par email" 
   - Subtitle : "Un email par jour à 20h45 avec ton score du soir 
     et tes meilleurs créneaux."
   - Input email + bouton "S'inscrire"
   - Intégration Beehiiv : embed form ou API POST vers Beehiiv
     (utiliser le form embed HTML de Beehiiv, converti en React)
   - Message post-inscription : "✅ C'est fait ! Premier email ce soir."
   - Positionnement : en bas de la Home, avant le footer
   - Style : card mise en avant, légèrement contrastée du fond

2. Landing / Hero reframée :
   - La Home EST la landing (pas de page séparée)
   - Hero = Red Light ou Green Light (déjà fait, sessions 1-2)
   - Scroll down → Heatmap → Best Times → Weekly Report → Email Signup
   - Ajouter une section "Comment ça marche" entre le Hero et la Heatmap :
     3 étapes visuelles (icônes + texte) :
     1. "📊 Vérifie ton score" — "Red Light = attends. Green Light = fonce."
     2. "⏱️ Lance une session" — "15 min chrono. Pas de doomscroll."
     3. "🔍 Audite ton profil" — "L'IA analyse et te dit quoi améliorer."
   - Cette section n'apparaît que pour les nouveaux visiteurs 
     (localStorage flag "datedetox_onboarded")

3. Navigation :
   - Header minimal : Logo "DateDetox" (gauche) + liens (droite) :
     Accueil | Audit | Méthodologie
   - Mobile : hamburger menu ou bottom nav (3 items)
   - Le header doit être sticky et compact

4. Page Methodology enrichie :
   - Ajouter une section "Pourquoi DateDetox ?" en haut :
     - Le problème du doomscroll dating
     - L'approche data-driven
     - Pourquoi "moins = mieux"
   - Garder tout le contenu DatePulse existant (sources, formule, etc.)
   - Ajouter la section Profile Audit : "Comment fonctionne l'audit IA"

5. Footer :
   - "DateDetox — Swipe less. Match more."
   - Liens : Méthodologie | GitHub | Contact (@EvolvedMonkey)
   - "Made with 📊 by Evolved Monkey"
   - Mention : "Aucune donnée personnelle stockée sur nos serveurs."

6. SEO & Meta :
   - Vérifier/compléter : title, description, OG image, Twitter card
   - Structured data (JSON-LD) : WebApplication schema
   - Sitemap.xml (/, /audit, /methodology)
   - robots.txt
   - Canonical URLs

7. Performance :
   - Vérifier le bundle size (`npm run build` + analyser dist/)
   - Lazy load des pages /audit et /methodology (React.lazy)
   - Les images de l'audit sont traitées en mémoire, pas de fuite
   - Lighthouse audit : viser > 90 en Performance, Accessibility, SEO

8. PWA update :
   - Mettre à jour le manifest.json avec le nouveau branding
   - Nouveau nom : "DateDetox"
   - Nouvelles icônes (garder les SVG existants, changer les couleurs 
     si nécessaire — rouge/vert au lieu de rose/violet)

9. Responsive final check :
   - Tester sur 375px (iPhone SE), 390px (iPhone 14), 
     768px (iPad), 1024px+
   - Chaque feature doit être utilisable en mobile
   - Le Profile Audit upload doit fonctionner en mobile 
     (sélection photo depuis galerie)

10. Deploy :
    - Vercel : connecter le repo GitHub
    - Environment variable : VITE_OPENROUTER_KEY
    - Domaine custom si disponible
    - Vérifier : HTTPS, headers security, SW serving correct
    - Tester en prod : score, audit, timer, rapport

11. README.md :
    - Description : "DateDetox — Swipe less. Match more."
    - Features listées
    - Screenshots (3-4)
    - Tech stack
    - "Privacy: All data stays in your browser. No server, no database."
    - License MIT
    - Lien vers le site live

CHECKLIST PRE-DEPLOY :
[ ] npm run build — 0 erreurs
[ ] Lighthouse > 90 (Perf + A11y + SEO)
[ ] Score affiché correctement (tester différentes heures)
[ ] Red Light / Green Light transition fluide
[ ] Session Timer : start → run → finish → summary → retour
[ ] Profile Audit : upload → loading → result (tester avec 
    des screenshots réels de profil)
[ ] Weekly Report : affiché si sessions existent
[ ] Email signup : inscription fonctionne via Beehiiv
[ ] Mobile responsive : toutes les pages
[ ] Dark mode : aucun élément blanc perdu
[ ] PWA : installable, manifest correct
[ ] Meta tags : OG image, description, title
[ ] 404 : redirige vers Home (Vercel rewrites)
```

---

## Checklist globale Phase 1

```
SEMAINE 1 :
[ ] Session 1 — Rebranding ✓ (npm run build OK)
[ ] Session 2 — Red/Green Light ✓ (visuellement distinct)
[ ] Session 3 — Session Timer ✓ (flow complet + localStorage)

SEMAINE 2 :
[ ] Session 4 — AI Profile Audit ✓ (LLM call + résultat)

SEMAINE 3 :
[ ] Session 5 — Weekly Report ✓ (stats + insights)
[ ] Session 6 — Polish + Deploy ✓ (prod live)

POST-DEPLOY :
[ ] Post Reddit r/Tinder rédigé (data-driven, pas promo)
[ ] Post Reddit r/dating_advice rédigé (wellbeing angle)
[ ] Tweet thread avec screenshots
[ ] Vercel Analytics activé
[ ] Budget OpenRouter vérifié
```
