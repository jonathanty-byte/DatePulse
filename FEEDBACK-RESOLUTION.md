# DatePulse — Rapport de résolution des 35 points de feedback UI

**Date** : 2026-03-06
**Déploiement** : https://frontend-sigma-gules-59.vercel.app
**Tests** : 249/249 passent (8 suites, 0 régression)

---

## PARTIE 1 — Dashboard principal (points 1-8)

### 1. Carte temps par match — Affichage en minutes
- **Problème** : "0.5h" affiché au lieu de "30min" quand < 1h
- **Fichier** : `WrappedReport.tsx`
- **Correction** : `metrics.hoursPerMatch < 1 ? Math.round(metrics.hoursPerMatch * 60) + "min" : metrics.hoursPerMatch + "h"`
- **Correction V2** : Emojis retirés de toutes les tuiles (SpotlightCard `icon=` prop supprimé) et de tous les titres de section (SectionTitle `emoji=` prop supprimé)

### 2. Funnel — Redesign complet
- **Problème** : Design trapezoid pas assez premium ni moderne
- **Fichier** : `WrappedReport.tsx` (FunnelChart)
- **Correction V1** : Formule blendée 60% proportionnel + 40% fixe
- **Correction V2** : Redesign complet — barres horizontales proportionnelles avec labels à gauche, barre animée au centre (couleur app), chiffre en bout de barre, pourcentage de conversion à droite. Drop-off entre chaque étape avec flèche + "-X (Y%)"

### 3. Section "Conversion & Dépenses" — Conditionnée
- **Problème** : Affichait un total de dépenses Tinder alors que l'export GDPR Tinder ne contient pas cette donnée
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Bloc dépenses conditionné à `metrics.source === "hinge"` uniquement (seul export GDPR avec montants exacts en EUR via subscriptions.json)

### 4. Cartes Ghost Rate / Score / Archétype
- **Problème** : Icônes trop transparentes (0.07), "CDS" incompréhensible, texte archétype déborde
- **Fichiers** : `SharedInsightComponents.tsx`, `WrappedReport.tsx`, `shareImage.ts`
- **Corrections** :
  - Opacité icônes : `0.07` → `0.15`
  - "Score CDS" → "Score Conversation" (partout, y compris image de partage)
  - Texte archetype : `text-xl sm:text-2xl font-extrabold leading-tight`
- **Correction V2** : Emojis retirés de toutes les tuiles SpotlightCard (prop `icon` supprimé globalement, 19 occurrences dans WrappedReport + 4 dans PremiumInsightsSection)

### 5. Distribution des questions — Sous-titre explicatif
- **Problème** : Graphique pas compréhensible sans contexte
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Ajout `<p>Combien de questions tu poses par conversation, et l'impact sur le ghosting</p>`

### 6. Tempo "0min" — Corrigé (N/A si pas de données)
- **Problème** : Temps de réponse médian affiché 0min (timestamps identiques dans l'export GDPR)
- **Fichier** : `conversationIntelligence.ts` (`computeResponseTimes`), `WrappedReport.tsx`
- **Correction V1** : Filtre `deltaMs >= 5000` (ignore deltas < 5 secondes), plancher `Math.max(1, Math.round(median))`
- **Correction V2** : Quand `median === 0` (aucune paire sent/received exploitable), affiche "N/A" au lieu de "0min". NarrativeIntro remplacé par "Pas assez de données pour calculer ton temps de réponse. L'export ne contient pas de timestamps exploitables."
- **Explication** : `computeResponseTimes` retourne `median: 0` uniquement quand il n'y a aucune paire received→sent avec un delta >= 5 secondes. Ça signifie que l'export GDPR ne contient pas de timestamps différenciés entre messages. Ce n'est pas un bug — c'est une absence de données.
- **Impact scoring** : Le score de réactivité est déjà à 10/20 (neutre) quand median=0 (corrigé au point 24)

### 7. "car." → "caractères" + Openers génériques
- **Problème** : Abréviation "car." incompréhensible, regex openers trop stricte
- **Fichiers** : `WrappedReport.tsx`, `conversationIntelligence.ts`
- **Corrections** :
  - Remplacement global `car.` → `caractères`
  - Regex openers élargie : supporte emojis, ponctuation, variantes FR (`coucou`, `bjr`, `wesh`, `cc`, etc.)

### 8. Double-Text → "La Relance"
- **Problème** : Section "Double-Text" pas compréhensible pour un utilisateur lambda
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Renommé "La Relance", ajout d'un exemple concret et d'une explication accessible

---

## PARTIE 2 — Sections analytiques avancées (points 9-21)

### 9. Surinvestissement 100% — Calcul corrigé
- **Problème** : 100% de surinvestissement sur 38 conversations (comptait les ghosts)
- **Fichier** : `conversationIntelligence.ts` (`computeInvestmentBalance`)
- **Correction** : Exclusion des conversations unilatérales (`received === 0 || sent === 0`) et des conversations < 3 messages. Les ghosts ne sont plus comptabilisés comme "surinvestissement".
- **Test mis à jour** : `conversationIntelligence.test.ts`

### 10. Rythme des conversations — Guard + subtotal
- **Problème** : Incohérence des totaux (5+3+2=10 vs nombre annoncé)
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Guard `total > 0`, ajout texte explicite du sous-total

### 11. Synchronisation temporelle — Masquée si pas de données
- **Problème** : Affichait 0/0 sans intérêt
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Guard `synced + unsynced > 0`

### 12. Ghost rate tempo diverge — Masqué si pas de données
- **Problème** : 0% avec 0 convos
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Guard `asymmetricConvos > 0`

### 13. Score miroir — Masqué + reformulé
- **Problème** : Score 0, survie 0% vs 0% — pas compréhensible
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Guard `mirrorScore > 0`, reformulation en langage clair ("Quand vos messages font la même longueur...")

### 14. Initiative ratio — Restructuré
- **Problème** : "100% / 0%" puis "14% : tu inities 80%+" — chiffres contradictoires
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Restructuré avec nombres absolus, grille à 2 colonnes, explications séparées

### 15. TTR Vocabulaire — Reformulé
- **Problème** : "Survie haute convergence 0% vs basse 0%" incompréhensible
- **Fichier** : `WrappedReport.tsx`
- **Correction** : "Vocabulaire varié : X% de survie vs vocabulaire répétitif : Y%" + fallback "Pas assez de données"

### 16. Dynamique des emojis — Pourcentages
- **Problème** : 0.05 et 0.02 sans unité
- **Fichier** : `WrappedReport.tsx`
- **Correction** : `Math.round(value * 100)` → affiche "5%" et "2%", ajout subtitle

### 17. Humour précoce — Guard si 0 convos
- **Problème** : "0 convos avec humour précoce · Sans humour : 44%" incohérent
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Si 0 convos avec humour → message d'encouragement alternatif

### 18. Forme des conversations — Section supprimée
- **Problème** : Concept toujours pas compréhensible malgré ajout de légendes
- **Fichier** : `WrappedReport.tsx`
- **Correction V1** : Grille 4 items avec icône + description de chaque forme
- **Correction V2** : Section H62 (Diamant/Plateau/Erratique/Falaise) entièrement supprimée. Variable `shapes` nettoyée.

### 19. Conversations simultanées — Section supprimée
- **Problème** : Indicateur pas compréhensible, "0min" réponse, métriques trop techniques
- **Fichier** : `WrappedReport.tsx`
- **Correction V1** : Guards et remplacement "car." → "caractères"
- **Correction V2** : Section H65 (Simultaneity) entièrement supprimée. NarrativeIntro du Timing mise à jour.

### 20. Escalation par jour — Nombres absolus
- **Problème** : Parlait en pourcentage au lieu de nombres concrets
- **Fichier** : `WrappedReport.tsx`
- **Correction** : `Math.round(d.escalationRate * d.count / 100)` pour afficher le nombre de propositions

### 21. Section GIFs — Supprimée
- **Problème** : Section non pertinente
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Section H67 entièrement retirée, remplacée par un commentaire

---

## PARTIE 3 — Algorithme & scoring (points 22-29)

### 22. Délai avant le 1er message — Reformulé + pourcentage
- **Problème** : Seulement 18 conversations affichées, label/data incohérent (survivalRate affiché comme nombres absolus)
- **Fichier** : `WrappedReport.tsx`
- **Corrections** :
  - Titre reformulé : "Combien de temps avant ton 1er message ?"
  - Subtitle avec total des conversations analysées
  - Buckets vides (count=0) filtrés
  - Label par bucket : `"< 1h (12)"` avec count visible
  - Légende clarifiée : "Barre = % de conversations qui ont survécu par tranche de délai"
- **Correction V2** : Suffixe "%" ajouté à la fin de chaque barre via prop `suffix: "%"` sur MiniBar

### 23. Ghost rate messages ultra-courts — Reformulé
- **Problème** : "Ghost rate avec messages ultra-courts (positions 2-5)" trop technique
- **Fichier** : `WrappedReport.tsx`
- **Corrections** :
  - Label → "de ghosting quand tes premiers messages sont très courts"
  - Sublabel → "X conversations concernées · sans messages courts : Y%"
  - Conseil concret : "Quand tes 2e-5e messages font moins de 20 caractères, tu te fais ghoster X% de plus"
  - Section masquée si 0 conversations concernées

### 24. Score global — Cohérence du scoring + ProgressRing corrigé
- **Problème** : Réactivité 20/20 basée sur 0min (bug), scoring incohérent avec les indicateurs
- **Fichiers** : `conversationIntelligence.ts`, `WrappedReport.tsx`
- **Corrections** :
  - **Bug critique** : `responseTimeMedian === 0` (pas de données) donnait `rs = 20` car `0 <= 30`. Corrigé → `rs = 10` (score neutre)
  - Note dans l'explication du score : "(pas de données exploitables → score neutre 10/20)" quand median = 0
  - Impact : le score global baisse de ~10 points pour les utilisateurs sans timestamps fiables, ce qui est plus cohérent
- **Correction V2** : **Bug ProgressRing** — les 5 rings du verdict avaient `max=10` (défaut) alors que les scores vont de 0 à 20. Un score de 15/20 remplissait le cercle à 100%. Corrigé en passant `max={20}` aux 5 ProgressRing du verdict.

### 25. Périodisation des matchs — Vocabulaire simplifié
- **Problème** : "37 clusters détectés", "drought" incompréhensibles
- **Fichier** : `WrappedReport.tsx`
- **Corrections** :
  - "clusters" → "vagues de matchs"
  - "drought" → "pause"
  - "matchs/cluster moy." → "matchs/vague en moy."
  - Titre reformulé : "Tes matchs arrivent-ils par vagues ?"
  - Subtitle ajoutée expliquant le concept

### 26. Efficacité des Superlikes — Unités clarifiées + disclaimer
- **Problème** : Valeurs 48.57 et 0.61 sans unité compréhensible
- **Fichier** : `WrappedReport.tsx`
- **Corrections** :
  - Titre reformulé : "Tes Superlikes sont-ils rentables ?"
  - Labels des barres avec `%` explicite : `"Super Likes (X%)"` / `"Likes normaux (Y%)"`
  - Nombre de Super Likes envoyés en subtitle
  - `maxOverride` dynamique basé sur la valeur max réelle
  - Verdict explicite avec les deux taux comparés
- **Correction V2** : Disclaimer ajouté : "Estimation basée sur les matchs du même jour qu'un Super Like — taux approximatif". Le taux est une approximation car l'algo attribue les matchs du même jour aux super likes, ce qui peut gonfler le taux si d'autres matchs normaux arrivent le même jour.

### 27. Qualité par sélectivité — Labels corrigés + "%" ajouté
- **Problème** : Verdict "pas d'impact significatif" contredit par les chiffres (31 vs 28)
- **Fichiers** : `WrappedReport.tsx`, `swipeAdvanced.ts` (lecture)
- **Corrections** :
  - Verdict dynamique basé sur comparaison réelle des taux
  - 3 cas : sélectif > mass-like (vert), mass-like > sélectif (rouge, "paradoxe"), égalité (gris)
  - Subtitle ajoutée : "Pourcentage de matchs qui mènent à une conversation"
- **Correction V2** : Labels raccourcis (supprimé "like rate" redondant) : `"Jours sélectifs (<40%)"` / `"Jours mass-like (>60%)"`. Suffixe "%" ajouté aux valeurs. MiniBar passé de `w-28 truncate` à `w-40 leading-tight` pour éviter toute troncature.

### 28. Jours actifs vs passifs — Explication ajoutée
- **Problème** : Like rate identique (51% vs 51%) sans explication
- **Fichier** : `WrappedReport.tsx`
- **Corrections** :
  - Titre reformulé : "Qu'est-ce qui différencie tes bons jours ?"
  - Subtitle descriptive
  - Labels séparés (swipes/jour et % de likes sur lignes distinctes)
  - Paragraphe d'analyse contextuelle :
    - Si like rate ~identique : "La différence vient du volume, pas de ta sélectivité"
    - Si like rate différent : explication de la corrélation

### 29. Décisivité d'utilisation — Conseil actionnable
- **Problème** : "19.4 ouvertures/jour", "browsing", "pénalité 62%" incompréhensibles
- **Fichier** : `WrappedReport.tsx`
- **Corrections** :
  - Titre reformulé : "Comment tu utilises l'app au quotidien"
  - Subtitle dynamique : "Tu ouvres l'app X fois par jour et tu swipes Y profils à chaque fois"
  - Labels en toutes lettres : "ouvertures par jour" / "swipes par ouverture"
  - Conseil actionnable : "Tu ouvres souvent l'app sans vraiment swiper. Essaie de faire des sessions plus courtes mais plus engagées."
  - Message positif si bon ratio

---

## PARTIE 4 — Profil, premium & insights (points 30-35)

### 30. Scores détaillés par archétype — Descriptions ajoutées
- **Problème** : L'utilisateur ne sait pas ce que signifient les archétypes
- **Fichier** : `WrappedReport.tsx`
- **Correction** : Ajout de `ARCHETYPE_LABELS[arch].description` sous chaque barre dans le toggle "Scores détaillés". Les 6 archétypes sont maintenant documentés :
  - **Le Stratège** : Sélectif, régulier, et stratégique
  - **Le Boulimique** : Volume massif, fatigue rapide
  - **Le Fantôme** : Longues absences suivies de retours
  - **Le Nocturne** : Actif quand les autres dorment
  - **Le Méthodique** : Rythme stable, horaires fixes
  - **Le Rebelle** : Imprévisible dans ses patterns

### 31. Boost Intelligence — 0% clarifié
- **Problème** : "0% match rate boost" avec 2 boosts — bug ou donnée réelle ?
- **Fichiers** : `wrappedMetrics.ts` (lecture), `WrappedReport.tsx`
- **Analyse** : Le calcul est correct (matchs dans l'heure suivant un boost). 0% = donnée réelle (2 boosts, 0 match pendant la fenêtre boost).
- **Correction** : Message spécifique quand 0% : "Aucun match obtenu pendant tes X boosts. Les boosts augmentent ta visibilité mais ne garantissent pas un match." Comparaison boost vs normal dans tous les cas.

### 32. Super Likes — Ratio de matchs corrigé
- **Problème** : "35 super likes envoyés" sans nombre de matchs ni conversion
- **Fichier** : `WrappedReport.tsx`, `wrappedMetrics.ts`
- **Correction V1** : 3 BigStat au lieu de 2 : envoyés + matchs obtenus + taux de conversion. Phrase résumé : "X matchs pour Y Super Likes envoyés (Z% de conversion)". Message adapté si 0 match.
- **Correction V2** : **Bug identifié et corrigé** — quand `superLikeTracking` n'est pas disponible dans l'export GDPR (cas Tinder Format A/B), `superLikeMatchRate` restait `undefined` et le template ne montrait ni matchs ni conversion. Ajout d'une approximation par correspondance de date (même méthode que H78) dans le fallback path de `wrappedMetrics.ts`.

### 33. Radar "Ton ADN Dating" — Grille + labels
- **Problème** : Pas de grille visible, labels "Régularité", "Convers", "Engager" tronqués
- **Fichier** : `WrappedReport.tsx`
- **Corrections** :
  - `PolarGrid` : `stroke="rgba(99,102,241,0.15)"` + `gridType="polygon"` (grille visible en forme de toile)
  - `outerRadius` : `80%` → `65%` (plus d'espace pour les labels)
  - Conteneur : `h-64 w-64` → `h-72 w-full max-w-sm` (plus large, labels non tronqués)
  - Taille labels : `fontSize: 11` (plus compact, pas de troncature)

### 34. Verdict — Boutons CTA masqués
- **Problème** : CTA "Améliorer mes messages →" vers /coach (pas encore disponible)
- **Fichier** : `WrappedReport.tsx`
- **Corrections** : 3 boutons CTA masqués :
  1. Bouton principal du verdict (`verdict.ctaLabel` + `verdict.ctaHref`)
  2. CTA Coach dans la section commentaires
  3. CTA Coach dans la section ghost rate
- Remplacements par commentaires `{/* CTA Coach masqué */}`

### 35. "Hypothèses" → "Analyses approfondies"
- **Problème** : Terminologie "hypothèse" pas adaptée — il s'agit d'analyses approfondies, pas d'hypothèses scientifiques
- **Fichiers** : `PremiumInsightsSection.tsx`, `insightsEngine.ts`, `WrappedReport.tsx`
- **Correction V1** : Affichage "X hypothèses testées sur 90 possibles" + note explicative
- **Correction V2** : Remplacement complet de la terminologie user-facing :
  - Titre section : "X Hypothèses" → "X Analyses approfondies"
  - Hero stats label : "hypothèses testées" → "analyses réalisées"
  - Description : "hypothèses testées contre tes données" → "analyses approfondies réalisées sur tes données"
  - Note : "hypothèses non testables" → "analyses non réalisables"
  - Clusters : "hypothèses convergent" → "analyses convergent"
  - Contradictions : "Des hypothèses qui semblent se contredire" → "Des analyses qui semblent se contredire"
  - Métriques : "leviers identifiés dans tes hypothèses" → "leviers identifiés dans tes analyses"
  - Narrative insightsEngine : "Hypothèses testées contre tes données" → "Analyses approfondies réalisées sur tes données"
  - Nav label : "Hypothèses" → "Analyses"
  - WrappedReport h90 : "hypothèses analysées" → "analyses approfondies"
  - **Note** : Les noms de variables/types internes (`hypothesis`, `hypothesisFilter`, `HypothesisTheme`) restent inchangés — seul le texte visible par l'utilisateur a été modifié.

---

## Règles générales appliquées

| Règle | Statut | Détails |
|-------|--------|---------|
| **R1. Sections sans données** | Done | Guards sur H52-H70, H82 + H62 et H65 supprimés |
| **R2. "car." → "caractères"** | Done | 0 occurrence restante |
| **R3. "0min" bug global** | Done | Filtre >= 5s, plancher 1min, affichage "N/A" si 0, score neutre 10/20 |
| **R4. Cohérence des totaux** | Done | Subtotaux explicites, guards sur sections vides |
| **R5. Vocabulaire technique** | Done | H-codes retirés, "clusters"→"vagues", "drought"→"pause", "hypothèses"→"analyses approfondies" |
| **R6. Unités** | Done | "%" explicite sur H68, H85 ; suffixe "%" dans MiniBar ; disclaimer H78 |
| **R7. Labels tronqués** | Done | Radar outerRadius réduit, MiniBar w-28→w-40 sans truncate |
| **R8. Emojis retirés** | Done | 0 emoji dans SectionTitle (26+8 retirés), 0 emoji dans SpotlightCard (19+4 retirés) |
| **R9. ProgressRing proportionnel** | Done | max=20 sur les 5 rings du verdict (était max=10 par défaut) |

---

## Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `frontend/src/components/WrappedReport.tsx` | Points 1-8, 10-34, règles R1-R9 |
| `frontend/src/lib/conversationIntelligence.ts` | Points 6 (timestamps), 7 (openers), 9 (balance), 24 (scoring) |
| `frontend/src/components/SharedInsightComponents.tsx` | Point 4 (opacité), SectionTitle (emoji optionnel), MiniBar (w-40, suffix prop) |
| `frontend/src/lib/shareImage.ts` | Point 4 ("Score CDS" → "Score Conversation") |
| `frontend/src/components/PremiumInsightsSection.tsx` | Points 35 (terminologie analyses approfondies), emojis retirés |
| `frontend/src/lib/insightsEngine.ts` | Point 35 (narratives + cluster insight text) |
| `frontend/src/lib/wrappedMetrics.ts` | Point 32 (fallback superLikeMatchRate approximation) |
| `frontend/src/lib/__tests__/conversationIntelligence.test.ts` | Point 9 (test balance mis à jour) |

## Vérification

- **Build** : `npm run build` — 0 erreur TypeScript
- **Tests** : 249/249 passent (8 suites, 0 régression)
- **Déploiement** : Vercel production (`--force` pour invalider le cache PWA)
