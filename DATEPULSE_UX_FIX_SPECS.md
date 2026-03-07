# DatePulse — UX Fix Specs for Claude Code

> Ce fichier est un brief exécutable. Copie-le à la racine du repo DatePulse.
> Chaque tâche est autonome, testable, et ordonnée par impact.

---

## Contexte

DatePulse est un SPA React 18 / TypeScript / Vite / Tailwind 3 / Framer Motion / Recharts.
6 routes : `/`, `/score`, `/coach`, `/wrapped`, `/insights`, `/tracker`.
226+ tests Vitest. Ne PAS casser les tests existants.

L'audit UX a identifié un problème structurel : **le funnel est inversé**.
L'utilisateur arrive sur un dead-end (/wrapped) avant d'avoir vu la valeur (/insights).
Les fixes ci-dessous corrigent le parcours dans l'ordre de priorité.

---

## TÂCHE 1 — Ajouter un CTA "Voir un exemple" sur la Landing (P0)

**Fichier** : `src/pages/Landing.tsx` (ou équivalent)

**Problème** : Les CTA actuels ("Analyser mes données" + "Voir le score live") ne proposent aucun chemin pour l'utilisateur qui n'a pas encore ses données ET qui veut voir la valeur du produit avant d'agir.

**Spec** :

1. Garder le CTA primaire existant : **"Analyser mes données →"** → `/wrapped` (style violet plein gradient inchangé)
2. **Ajouter** un troisième CTA : **"Voir un exemple →"** → `/insights`
3. Garder le CTA "Voir le score live" existant

L'ordre des 3 boutons :
```tsx
// APRÈS — 3 CTA
<div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
  <Link to="/wrapped" className="btn-primary">
    Analyser mes données →
  </Link>
  <Link to="/insights" className="btn-secondary">
    Voir un exemple →
  </Link>
  <Link to="/score" className="btn-tertiary">
    Voir le score live
  </Link>
</div>
```

Le style du nouveau bouton "Voir un exemple" doit être distinct et visible — outline indigo ou style ghost avec bordure, pour attirer l'œil sans écraser le CTA primaire.

**Vérification** : Sur `/`, les 3 CTA sont visibles. "Voir un exemple" mène à `/insights`.

---

## TÂCHE 2 — Ajouter un CTA secondaire sur /wrapped (P0)

**Fichier** : `src/pages/Wrapped.tsx` (ou équivalent)

**Problème** : L'utilisateur sans données est bloqué. Aucune alternative.

**Spec** :

1. Au-dessus de la zone d'upload (drop zone), ajouter un composant :

```tsx
<div className="text-center mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
  <p className="text-gray-600 mb-2">
    Pas encore tes données ? Ça prend 1-3 jours.
  </p>
  <Link
    to="/insights"
    className="text-indigo-600 font-semibold hover:underline"
  >
    En attendant, regarde un exemple avec de vraies stats →
  </Link>
</div>
```

2. Ce composant doit être VISIBLE sans scroll (au-dessus de la drop zone, pas en dessous du guide RGPD).

**Vérification** : Sur `/wrapped`, le lien "regarde un exemple" est visible sans scroll et mène à `/insights`.

---

## TÂCHE 3 — Ajouter des CTA contextuels en fin de chaque section /insights (P0)

**Fichier** : `src/pages/Insights.tsx` et/ou `src/components/InsightsContent.tsx` (ou composants de section)

**Problème** : Après le WOW moment ("83% des ghosts"), la page est blanche. Le pic de motivation est gaspillé.

**Spec** :

1. Créer un composant réutilisable `InsightsCTA` :

```tsx
interface InsightsCTAProps {
  headline: string;    // ex: "Tes conversations font pareil ?"
  ctaText: string;     // ex: "Demande tes données →"
  ctaLink: string;     // ex: "/wrapped"
}

function InsightsCTA({ headline, ctaText, ctaLink }: InsightsCTAProps) {
  return (
    <div className="my-12 p-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-center">
      <p className="text-lg font-semibold text-gray-800 mb-3">{headline}</p>
      <Link
        to={ctaLink}
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
      >
        {ctaText}
      </Link>
    </div>
  );
}
```

2. Insérer ce composant à la fin de chaque tab/section de `/insights` avec du contenu contextualisé :

| Tab | headline | ctaText |
|-----|----------|---------|
| Vue globale | "Découvre ton propre ADN de dating" | "Analyser mes données →" |
| Conversations | "Tes conversations font pareil ?" | "Demande tes données →" |
| Profil | "Compare TES résultats" | "Analyser mes données →" |
| Opener | "Teste tes propres openers" | "Analyser mes données →" |
| Timing | "Découvre TON timing optimal" | "Analyser mes données →" |
| Algorithme | "Décode TON algorithme" | "Analyser mes données →" |

Tous les `ctaLink` pointent vers `/wrapped`.

**Vérification** : Chaque tab de `/insights` se termine par un CTA coloré visible (pas de page blanche).

---

## TÂCHE 4 — Remplacer "RGPD" par un langage accessible (P1)

**Fichiers** : tous les fichiers contenant le mot "RGPD" dans le texte visible par l'utilisateur.

**Problème** : "Export RGPD" est du jargon juridique. La cible (homme 25-40 non-juriste) ne comprend pas.

**Spec** :

Faire un find-and-replace contextuel :

| Avant | Après |
|-------|-------|
| "Upload ton export RGPD" | "Upload tes données Tinder / Bumble / Hinge" |
| "Glisse ton fichier RGPD ici" | "Glisse ton fichier ici" |
| "Comment obtenir tes données RGPD ?" | "Comment obtenir tes données ?" |
| "export RGPD" dans le sous-titre landing | "le fichier que ton app t'envoie" |

**Exception** : Garder "RGPD" dans le guide détaillé par app (Tinder, Hinge, Happn, Bumble) car c'est le contexte technique où le terme est pertinent. Mais le hero et les titres ne doivent pas l'utiliser.

**Vérification** : `grep -r "RGPD" src/` ne doit retourner le mot QUE dans les sections de guide détaillé, pas dans les titres, héros ou CTA.

---

## TÂCHE 5 — Remonter le bouton "Analyser" du Coach (P1)

**Fichier** : `src/pages/Coach.tsx` ou le composant du tab Messages

**Problème** : Le bouton "Analyser" est sous le fold. L'utilisateur pense que l'interface est cassée.

**Spec** — choisir UNE des deux options :

**Option A (préférée)** : Réduire la hauteur du textarea à 4-5 lignes max au lieu de ~8-10 actuellement :
```tsx
<textarea
  className="... h-32"  // au lieu de h-64 ou h-auto avec beaucoup de lignes
  rows={5}
  ...
/>
```

**Option B** : Rendre le bouton sticky en bas :
```tsx
<div className="sticky bottom-0 bg-white pt-4 pb-6">
  <button className="w-full ...">Analyser</button>
</div>
```

**Vérification** : Sur un viewport 1440×900, le bouton "Analyser" est visible sans scroll quand on arrive sur `/coach` tab Messages.

---

## TÂCHE 6 — Changer le tab par défaut de /insights (P1)

**Fichier** : `src/pages/Insights.tsx`

**Problème** : "Vue globale" est le tab par défaut mais affiche un radar quasi invisible + espace blanc. Mauvaise première impression.

**Spec** :

1. Changer le tab par défaut de "Vue globale" à "Conversations" (le contenu le plus impressionnant : "83% des ghosts").
2. OU ajouter une headline percutante au-dessus du radar dans "Vue globale". Ex : "Hinge est 8x plus efficace que Tinder — 9 min par conversation longue vs 75 min" (reprendre les données déjà présentes dans le comparatif).

**Vérification** : Arriver sur `/insights` montre immédiatement du contenu riche et accrocheur.

---

## TÂCHE 7 — Renommer "Exemple Insights" → "Insights" (P1)

**Fichiers** : Nav component + toute référence dans le router

**Problème** : "Exemple Insights" donne l'impression d'une démo jetable, pas d'une feature.

**Spec** :

1. Dans la nav principale : changer le label de "Exemple Insights" à "Insights"
2. Garder le banner jaune existant en haut de `/insights` qui explique que ce sont des données d'exemple
3. Si l'utilisateur a uploadé ses données via Wrapped, le banner disparaît et les insights sont personnalisés

**Vérification** : La nav affiche "Accueil | Wrapped | Score | Insights | Coach".

---

## TÂCHE 8 — Supprimer la route /tracker (P2)

**Fichier** : `src/App.tsx` (router)

**Problème** : `/tracker` affiche le même contenu que le tab Tracker dans Coach. Duplication confuse.

**Spec** :

1. Supprimer la route `/tracker` du router
2. Rediriger `/tracker` vers `/coach` (avec le tab Tracker pré-sélectionné si possible)
3. Supprimer le lien "Tracker" du footer s'il existe en tant que lien séparé

```tsx
// AVANT
<Route path="/tracker" element={<Tracker />} />

// APRÈS
<Route path="/tracker" element={<Navigate to="/coach" replace />} />
```

**Vérification** : Naviguer vers `/tracker` redirige vers `/coach`.

---

## TÂCHE 9 — Aligner le footer avec la nav (P2)

**Fichier** : Footer component

**Problème** : Le footer liste "Coach | Wrapped | Tracker | Insights | @EvolvedMonkey" avec des labels et un ordre différents de la nav.

**Spec** :

Le footer doit refléter exactement la nav :
```
Accueil | Wrapped | Score | Insights | Coach
```
Garder le lien @EvolvedMonkey séparé (social link, pas navigation).

**Vérification** : Les labels et l'ordre du footer matchent la nav.

---

## TÂCHE 10 — Clarifier le "2 minutes" de la landing (P2)

**Fichier** : Landing hero

**Problème** : "Découvre tes vrais stats en 2 minutes" est trompeur — obtenir les données prend 1-5 jours. L'analyse prend 2 min.

**Spec** :

Changer le sous-titre de :
```
"Upload ton export RGPD. Découvre tes vrais stats en 2 minutes."
```
à :
```
"Demande tes données à ton app (1-3 jours). L'analyse prend 2 minutes."
```
Ou plus simplement :
```
"Découvre ce que tes apps ne te montrent pas."
```

**Vérification** : Le sous-titre ne promet plus "2 minutes" sans contexte.

---

## Ordre d'exécution recommandé

```
Tâche 1 (CTA landing)      → 5 min  → Impact maximal
Tâche 2 (CTA /wrapped)     → 5 min  → Débouche le dead-end
Tâche 3 (CTA /insights)    → 15 min → Capture la motivation
Tâche 7 (renommer nav)     → 2 min  → Quick win
Tâche 4 (jargon RGPD)      → 10 min → Réduit friction
Tâche 6 (tab par défaut)   → 5 min  → Première impression
Tâche 5 (bouton Coach)     → 5 min  → Fix UX
Tâche 8 (suppr /tracker)   → 3 min  → Nettoyage
Tâche 9 (footer)           → 3 min  → Cohérence
Tâche 10 (sous-titre)      → 2 min  → Honnêteté

Total estimé : ~55 min
```

---

## Contraintes pour Claude Code

```
- React 18 + TypeScript + Vite + Tailwind 3 + Framer Motion + Recharts
- 100% client-side — ne PAS ajouter de backend
- Ne PAS casser les 226+ tests existants → lancer `npm test` après chaque tâche
- Garder le même design system (couleurs, fonts, spacing) — on change le FLOW, pas le LOOK
- Mobile responsive — vérifier que les CTA ajoutés fonctionnent en 375px
- Pas de nouvelles dépendances npm sauf si absolument nécessaire
```
