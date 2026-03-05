// ============================================================
// insightsData.ts — All personalized insights from RGPD exports
// Sources: 7 analysis reports (Personal/ folder)
// ============================================================

// === TYPES ===

export type Verdict = "confirmed" | "debunked" | "mixed";
export type App = "tinder" | "hinge" | "both";
export type Severity = "critical" | "warning" | "good";

export interface StatCard {
  label: string;
  value: string;
  subtext?: string;
  severity?: Severity;
}

export interface ComparisonRow {
  metric: string;
  tinder: string;
  hinge: string;
  verdict?: string;
}

export interface BarData {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
}

export interface Recommendation {
  text: string;
  type: "do" | "dont" | "tip";
}

export interface Hypothesis {
  id: string;
  title: string;
  verdict: Verdict;
  app: App;
  impact: 1 | 2 | 3;
  insight: string;
  stats?: StatCard[];
  bars?: BarData[];
  details?: string;
  recommendations?: Recommendation[];
}

export interface HypothesisTheme {
  id: string;
  title: string;
  emoji: string;
  hypotheses: Hypothesis[];
}

export interface ReinforcementCluster {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  hypothesisIds: string[];
  insight: string;
}

export interface ContradictionPair {
  id: string;
  pair: [string, string];
  title: string;
  description: string;
  resolution: string;
}

// === SECTION 1: HERO ===

export const HERO_STATS = {
  totalDays: { tinder: 300, hinge: 252 },
  totalMatches: { tinder: 91, hinge: 38 },
  totalLikes: { tinder: 12143, hinge: 2325 },
  totalConvos: { tinder: 39, hinge: 34 },
  hypotheses: { total: 90, confirmed: 55, debunked: 13, mixed: 22 },
};

export const CONVERSATION_SCORES: { category: string; score: number; detail: string }[] = [
  { category: "Engagement", score: 8, detail: "59% de tes convos sont equilibrees" },
  { category: "Humour", score: 9, detail: "78% des convos, ton arme principale" },
  { category: "Conversion", score: 7, detail: "70% mentionnent un date" },
  { category: "Openers", score: 5, detail: "Excellents quand specifiques, nuls quand generiques" },
  { category: "Timing date", score: 4, detail: "Msg #9 = trop tard, vise msg #5" },
  { category: "Investissement", score: 6, detail: "24% d'over-investing" },
];

// === SECTION 2: PROFILE DIAGNOSTIC ===

export const PROFILE_COMPARISON: ComparisonRow[] = [
  { metric: "Periode", tinder: "300 jours", hinge: "252 jours", verdict: "" },
  { metric: "Likes envoyes", tinder: "12 143", hinge: "2 325", verdict: "5x plus sur Tinder" },
  { metric: "Match rate", tinder: "0.75%", hinge: "1.3%", verdict: "Hinge 2x meilleur" },
  { metric: "Matchs totaux", tinder: "91", hinge: "38", verdict: "Tinder en volume" },
  { metric: "Match → Convo", tinder: "~43%", hinge: "95%", verdict: "Hinge ecrase" },
  { metric: "Convos longues (15+)", tinder: "6", hinge: "19", verdict: "Hinge ecrase" },
  { metric: "Opens/jour", tinder: "17", hinge: "~9", verdict: "Plus actif sur Tinder" },
  { metric: "Commentaires sur likes", tinder: "0%", hinge: "0%", verdict: "Meme probleme" },
  { metric: "Depense totale", tinder: "~152 EUR", hinge: "87 EUR", verdict: "" },
];

export const TINDER_PROBLEMS: { title: string; severity: Severity; detail: string }[] = [
  { title: "Like ratio a 45%", severity: "critical", detail: "Optimal = 30-45%. A 45% tu es a la limite de la falaise algorithmique. Au-dessus de 50%, ta conversion chute de 3x." },
  { title: "57% des matchs non exploites", severity: "critical", detail: "Sur 91 matchs, seulement ~39 ont mene a des conversations. 52 matchs n'ont JAMAIS eu d'echange." },
  { title: "2 photos sans visage (40%)", severity: "warning", detail: "B&W avec lunettes de soleil + Torii de dos = 40% du profil 'aveugle'. Photos sans contact visuel = -20-30% match rate." },
  { title: "Bio et prompts generiques", severity: "warning", detail: "'Co-pilote' et 'refaire le monde' sont des cliches Tinder ultra-repandus. Le prompt est identique a Hinge." },
  { title: "ELO probablement bas", severity: "warning", detail: "300+ jours d'anciennete + like ratio 45% + match rate 0.75% = signaux negatifs pour l'algo." },
];

export const HINGE_QUICK_WINS: { title: string; impact: string; detail: string }[] = [
  { title: "Commenter 100% des likes", impact: "+100-200% match rate", detail: "2 325 likes sans UN SEUL commentaire. Un commentaire = 2-3x le taux de match. C'est la feature #1 de l'app." },
  { title: "Remplacer la photo #1", impact: "~80% des swipes", detail: "La photo principale determine la vaste majorite des decisions. Restaurant terrasse sourire = meilleure option." },
  { title: "Reecrire les prompts", impact: "Hooks conversationnels", detail: "Tes prompts actuels sont trop generiques et manquent de hooks. Remplace par des questions ouvertes specifiques." },
];

export const PHOTO_TIERS: { tier: string; color: string; photos: { name: string; emoji: string }[] }[] = [
  { tier: "S", color: "#22c55e", photos: [
    { name: "Restaurant terrasse sourire", emoji: "🥇" },
    { name: "Calanques + chien golden hour", emoji: "🥈" },
    { name: "Costume Paris colonne", emoji: "🥉" },
  ]},
  { tier: "A", color: "#3b82f6", photos: [
    { name: "Portrait pull marine", emoji: "✅" },
    { name: "Col roule bureau", emoji: "✅" },
    { name: "B&W chien (a refaire couleur)", emoji: "⚠️" },
  ]},
  { tier: "B", color: "#f59e0b", photos: [
    { name: "Selfie sunset ville", emoji: "🟡" },
    { name: "Selfie blazer interieur", emoji: "🟡" },
  ]},
  { tier: "C", color: "#ef4444", photos: [
    { name: "Cocktail terrasse angle plongeant", emoji: "❌" },
    { name: "Torii de dos (pas de visage)", emoji: "❌" },
    { name: "Chien seul endormi", emoji: "❌" },
  ]},
];

export const CROSS_APP_ROI: ComparisonRow[] = [
  { metric: "Temps investi/jour", tinder: "~45 min", hinge: "~20 min", verdict: "" },
  { metric: "Matchs/mois", tinder: "~9", hinge: "~5", verdict: "" },
  { metric: "Convos longues/mois", tinder: "~0.6", hinge: "~2.3", verdict: "" },
  { metric: "Cout par convo longue", tinder: "~75 min", hinge: "~9 min", verdict: "Hinge 8x plus efficace" },
  { metric: "Dates probables/mois", tinder: "~0.5", hinge: "~2.2", verdict: "" },
];

// === SECTION 3: CONVERSATIONS ===

export const OPENER_PATTERNS: { type: string; avgMsgs: number; ghostRate: number; color: string }[] = [
  { type: "Question specifique (bio/photo)", avgMsgs: 9.3, ghostRate: 25, color: "#22c55e" },
  { type: "Question generique", avgMsgs: 8.4, ghostRate: 53, color: "#3b82f6" },
  { type: "Statement (pas de question)", avgMsgs: 3.6, ghostRate: 40, color: "#f59e0b" },
  { type: "Generique (hey/salut ca va)", avgMsgs: 2.2, ghostRate: 67, color: "#ef4444" },
];

export const TOPIC_RANKING: { topic: string; emoji: string; avgMsgs: number; delta: string }[] = [
  { topic: "Animal (whippet)", emoji: "🐕", avgMsgs: 29.4, delta: "+868%" },
  { topic: "Bouffe", emoji: "🍕", avgMsgs: 31.9, delta: "+859%" },
  { topic: "Humour", emoji: "🎭", avgMsgs: 45.0, delta: "+725%" },
  { topic: "Culture", emoji: "🌍", avgMsgs: 22.4, delta: "+655%" },
  { topic: "Voyage", emoji: "✈️", avgMsgs: 26.5, delta: "+597%" },
  { topic: "Film/Serie", emoji: "🎬", avgMsgs: 28.4, delta: "+594%" },
];

export const GHOST_CAUSES: { cause: string; tinderGhost: string; hingeGhost: string }[] = [
  { cause: "Aucun sujet identifiable", tinderGhost: "83%", hingeGhost: "100%" },
  { cause: "Logistique seul", tinderGhost: "30%", hingeGhost: "—" },
  { cause: "Animal (whippet)", tinderGhost: "14%", hingeGhost: "0%" },
  { cause: "Voyage", tinderGhost: "12%", hingeGhost: "0%" },
  { cause: "Film/serie", tinderGhost: "0%", hingeGhost: "0%" },
  { cause: "Humour", tinderGhost: "0%", hingeGhost: "0%" },
];

export const BEST_CONVOS: { name: string; msgs: number; ratio: string; app: App; highlight: string }[] = [
  { name: "Myriam", msgs: 547, ratio: "0.9x", app: "hinge", highlight: "12 jours intensifs, tous sujets abordes" },
  { name: "Yasmine", msgs: 363, ratio: "1.0x", app: "hinge", highlight: "Opener audacieux: juste 'Yasmine !'" },
  { name: "Adriana", msgs: 237, ratio: "0.8x", app: "hinge", highlight: "237 msgs en 44h, chimie immediate" },
];

export const MESSAGE_BALANCE: { category: string; pct: number; interpretation: string }[] = [
  { category: "Toi ecris + (ratio > 1.5x)", pct: 24, interpretation: "Over-investing" },
  { category: "Equilibre (0.7-1.5x)", pct: 59, interpretation: "Zone ideale" },
  { category: "Elle ecrit + (ratio < 0.7x)", pct: 18, interpretation: "Elle s'investit plus" },
];

// === SECTION 4: OPENER FORMULA ===

export const OPENER_LENGTH_BARS: BarData[] = [
  { label: "Tres court (<20c)", value: 8.6, color: "#f59e0b" },
  { label: "Court (20-50c)", value: 1.9, color: "#ef4444" },
  { label: "Moyen (50-100c)", value: 11.5, color: "#22c55e" },
  { label: "Long (100-150c)", value: 9.0, color: "#3b82f6" },
  { label: "Tres long (150+c)", value: 9.0, color: "#3b82f6" },
];

export const QUESTION_DENSITY: BarData[] = [
  { label: "0 questions", value: 1.1, color: "#ef4444" },
  { label: "1-2 questions", value: 2.7, color: "#f59e0b" },
  { label: "3-5 questions", value: 5.9, color: "#22c55e" },
  { label: "11+ questions", value: 46.2, color: "#22c55e" },
];

export const TRIGGER_WORDS: { word: string; ghostRate: number; verdict: Severity }[] = [
  { word: '"hello"', ghostRate: 67, verdict: "critical" },
  { word: "Greeting generique", ghostRate: 62, verdict: "critical" },
  { word: "Template reutilise", ghostRate: 62, verdict: "critical" },
  { word: "Anglais", ghostRate: 70, verdict: "critical" },
  { word: "Sans greeting", ghostRate: 29, verdict: "good" },
  { word: "Opener unique", ghostRate: 44, verdict: "good" },
  { word: "Avec emoji (Tinder)", ghostRate: 36, verdict: "good" },
  { word: "FR + Question + Perso", ghostRate: 22, verdict: "good" },
];

// === SECTION 5: TIMING ===

export const WEEKLY_GRID: { day: string; tinderLikes: number; tinderMatchs: number; tinderConv: string; hingeLikes: number; hingeConv: string; overall: string }[] = [
  { day: "Lundi", tinderLikes: 1572, tinderMatchs: 14, tinderConv: "0.89%", hingeLikes: 8.9, hingeConv: "2.05%", overall: "" },
  { day: "Mardi", tinderLikes: 1541, tinderMatchs: 14, tinderConv: "0.91%", hingeLikes: 7.9, hingeConv: "1.15%", overall: "" },
  { day: "Mercredi", tinderLikes: 1578, tinderMatchs: 10, tinderConv: "0.63%", hingeLikes: 8.5, hingeConv: "2.81%", overall: "Hinge day" },
  { day: "Jeudi", tinderLikes: 1764, tinderMatchs: 9, tinderConv: "0.51%", hingeLikes: 10.1, hingeConv: "1.35%", overall: "Pire Tinder" },
  { day: "Vendredi", tinderLikes: 1233, tinderMatchs: 12, tinderConv: "0.97%", hingeLikes: 6.5, hingeConv: "2.08%", overall: "Meilleur Tinder" },
  { day: "Samedi", tinderLikes: 1686, tinderMatchs: 14, tinderConv: "0.83%", hingeLikes: 5.2, hingeConv: "2.61%", overall: "" },
  { day: "Dimanche", tinderLikes: 2769, tinderMatchs: 18, tinderConv: "0.65%", hingeLikes: 16.1, hingeConv: "1.13%", overall: "Mass-like piege" },
];

export const MONTHLY_INDEX: { month: string; tinderLikes: number; tinderMatchs: number; tinderConv: number; likeRatio: string; insight: string }[] = [
  { month: "Avr 25", tinderLikes: 1258, tinderMatchs: 8, tinderConv: 0.64, likeRatio: "52%", insight: "Debut — ratio trop large" },
  { month: "Mai 25", tinderLikes: 2304, tinderMatchs: 18, tinderConv: 0.78, likeRatio: "35%", insight: "Bon ratio, burst du 31" },
  { month: "Jun 25", tinderLikes: 2348, tinderMatchs: 20, tinderConv: 0.85, likeRatio: "62%", insight: "Pool frais ete" },
  { month: "Jul 25", tinderLikes: 809, tinderMatchs: 2, tinderConv: 0.25, likeRatio: "37%", insight: "CRASH post-burst" },
  { month: "Aou 25", tinderLikes: 959, tinderMatchs: 9, tinderConv: 0.94, likeRatio: "50%", insight: "Rebond apres repos" },
  { month: "Sep 25", tinderLikes: 609, tinderMatchs: 2, tinderConv: 0.33, likeRatio: "43%", insight: "Creux rentree" },
  { month: "Oct 25", tinderLikes: 498, tinderMatchs: 6, tinderConv: 1.20, likeRatio: "57%", insight: "BEST — moins de likes = mieux" },
  { month: "Nov 25", tinderLikes: 1277, tinderMatchs: 10, tinderConv: 0.78, likeRatio: "46%", insight: "Volume remonte" },
  { month: "Dec 25", tinderLikes: 1336, tinderMatchs: 7, tinderConv: 0.52, likeRatio: "44%", insight: "Shadowban fin d'annee" },
  { month: "Jan 26", tinderLikes: 396, tinderMatchs: 5, tinderConv: 1.26, likeRatio: "30%", insight: "MEILLEUR — enfin selectif" },
  { month: "Fev 26", tinderLikes: 349, tinderMatchs: 4, tinderConv: 1.15, likeRatio: "47%", insight: "2e meilleur — momentum" },
];

export const HINGE_MONTHLY: { month: string; hingeLikes: number; hingeMatchs: number; hingeConv: number; insight: string }[] = [
  { month: "Jun 25", hingeLikes: 89, hingeMatchs: 3, hingeConv: 3.4, insight: "Honeymoon — nouveau profil" },
  { month: "Jul 25", hingeLikes: 431, hingeMatchs: 10, hingeConv: 2.3, insight: "Encore bon, volume monte" },
  { month: "Aou 25", hingeLikes: 416, hingeMatchs: 6, hingeConv: 1.4, insight: "Decline commence" },
  { month: "Sep 25", hingeLikes: 232, hingeMatchs: 2, hingeConv: 0.9, insight: "Creux — pool epuise ?" },
  { month: "Oct 25", hingeLikes: 123, hingeMatchs: 1, hingeConv: 0.8, insight: "Plancher — reset necessaire" },
  { month: "Nov 25", hingeLikes: 93, hingeMatchs: 2, hingeConv: 2.2, insight: "Rebond — golden month" },
  { month: "Dec 25", hingeLikes: 320, hingeMatchs: 6, hingeConv: 1.9, insight: "Reactivation payee — 6 convos (26 msgs moy)" },
  { month: "Jan 26", hingeLikes: 500, hingeMatchs: 6, hingeConv: 1.2, insight: "Volume haut (paye) mais convos courtes (4 msgs moy)" },
  { month: "Fev 26", hingeLikes: 121, hingeMatchs: 2, hingeConv: 1.7, insight: "Fin de cycle — retour free" },
];

export const HINGE_HOURLY: { slot: string; likes: number; pct: number; matchs: number; matchPct: number }[] = [
  { slot: "Matin (6-9h)", likes: 309, pct: 22, matchs: 5, matchPct: 21 },
  { slot: "Midi (10-13h)", likes: 175, pct: 13, matchs: 3, matchPct: 13 },
  { slot: "Apres-midi (14-17h)", likes: 240, pct: 17, matchs: 5, matchPct: 21 },
  { slot: "Soiree (18-21h)", likes: 613, pct: 44, matchs: 7, matchPct: 29 },
  { slot: "Nuit (22-5h)", likes: 47, pct: 3, matchs: 4, matchPct: 17 },
];

export const RESPONSE_SPEED: { speed: string; tinderMsgs: number; hingeMsgs: number }[] = [
  { speed: "Rapide (<1h)", tinderMsgs: 23.3, hingeMsgs: 153.0 },
  { speed: "Normal (1-6h)", tinderMsgs: 18.0, hingeMsgs: 32.2 },
  { speed: "Lent (6-24h)", tinderMsgs: 6.5, hingeMsgs: 37.0 },
  { speed: "Tres lent (24h+)", tinderMsgs: 4.0, hingeMsgs: 7.0 },
];

export const TIMING_INSIGHTS: { title: string; data: string; detail: string; ref: string; severity: Severity }[] = [
  { title: "Opener le MATIN, pas le soir", data: "Matin = 14.2 msgs, 29% ghost vs Soir = 5.6 msgs, 67% ghost", detail: "x2.5 de longueur de conversation. Le matin, moins de competition et plus d'attention.", ref: "H22", severity: "critical" },
  { title: "Attendre 12-24h avant le 1er message", data: "J+1 = 20.5 msgs vs J0 = 5.9 msgs (x3.5)", detail: "Repondre trop vite apres le match signale du desperation. Le sweet spot est le lendemain.", ref: "H18", severity: "critical" },
  { title: "Mercredi-Jeudi = meilleurs jours Tinder", data: "Mer 11.7 msgs, Jeu 12.7 msgs vs Lun 3.2 msgs, 67% ghost", detail: "Le lundi est le PIRE jour pour initier. Evite aussi le dimanche (mass-like, 0.65% conv).", ref: "H28", severity: "warning" },
  { title: "Repondre < 1h pendant la convo", data: "< 1h = 153 msgs Hinge (x21.9 vs lent), 23 msgs Tinder (x5.8)", detail: "UNE FOIS la convo lancee, la rapidite de reponse est le multiplicateur #1.", ref: "H34", severity: "critical" },
  { title: "Les nuits longues — night owl effect", data: "Hinge nocturne (23h+) = 212 msgs, 0% ghost", detail: "Les echanges tard le soir sont plus intimes et durent beaucoup plus longtemps. Volume faible mais qualite max.", ref: "H39", severity: "good" },
  { title: "Dimanche = piege du mass-like", data: "2 769 likes pour 0.65% de conversion (pire jour)", detail: "Tu likes 2x plus le dimanche pour un resultat mediocre. Moins de likes = meilleure conversion.", ref: "H31", severity: "warning" },
];

// === SECTION 6: ALGORITHM ===

export const ELO_PROXY: { period: string; score: number; analysis: string }[] = [
  { period: "15/04", score: 0.67, analysis: "Debut" },
  { period: "13/05", score: 0.16, analysis: "Crash post-burst" },
  { period: "10/06", score: 1.38, analysis: "Pic post-repos" },
  { period: "27/06", score: 0.18, analysis: "Shadowban" },
  { period: "11/07", score: 0.00, analysis: "Shadowban 2+ semaines" },
  { period: "08/08", score: 1.22, analysis: "Rebond" },
  { period: "05/10", score: 1.69, analysis: "Pic post-repos sept" },
  { period: "17/12", score: 0.00, analysis: "Shadowban fin d'annee" },
  { period: "02/02", score: 1.88, analysis: "Meilleur score" },
];

export const SELECTIVITY_CLIFF: BarData[] = [
  { label: "Selectif (<30%)", value: 0.99, color: "#22c55e" },
  { label: "Modere (30-50%)", value: 1.09, color: "#22c55e" },
  { label: "Large (50-70%)", value: 0.37, color: "#ef4444" },
  { label: "Mass-like (>70%)", value: 0.96, color: "#f59e0b" },
];

export const SHADOWBANS: { period: string; duration: string; likesWasted: number }[] = [
  { period: "15/12 → 09/01", duration: "25 jours", likesWasted: 620 },
  { period: "07/07 → 31/07", duration: "24 jours", likesWasted: 527 },
  { period: "08/09 → 26/09", duration: "18 jours", likesWasted: 245 },
  { period: "12/05 → 25/05", duration: "13 jours", likesWasted: 495 },
  { period: "01/08 → 12/08", duration: "11 jours", likesWasted: 83 },
  { period: "27/09 → 07/10", duration: "10 jours", likesWasted: 166 },
  { period: "16/10 → 26/10", duration: "10 jours", likesWasted: 122 },
  { period: "26/01 → 05/02", duration: "10 jours", likesWasted: 178 },
];

export const ACTIVITY_LEVELS: { level: string; matchesPerDay: number; multiplier: string }[] = [
  { level: "Haute (30+ opens)", matchesPerDay: 1.00, multiplier: "7.7x" },
  { level: "Moyenne (10-29)", matchesPerDay: 0.23, multiplier: "1.8x" },
  { level: "Basse (1-9)", matchesPerDay: 0.13, multiplier: "1.0x" },
];

// === SECTION 7: PREMIUM & BUDGET ===

export const SUBSCRIPTION_ROI: { name: string; spent: string; duration: string; verdict: Severity; result: string }[] = [
  { name: "Tinder Plus → Platinum", spent: "~152 EUR", duration: "5 mois payes sur 8 (avr-dec 2025)", verdict: "critical", result: "3 abos Platinum (dont 2 a moitie prix via offres retention) + 2 boosts (0 match). Match rate paid 0.75% vs free 0.77% = ZERO difference." },
  { name: "Hinge+ (3 abos)", spent: "87.47 EUR", duration: "153 jours payes", verdict: "warning", result: "Conv payee: 1.62% vs gratuit: 1.72%. Pas de difference significative — mais tu swipes 3x plus en payant." },
  { name: "Total depense", spent: "~240 EUR", duration: "10 mois", verdict: "critical", result: "24 EUR/mois pour +0.02% de match rate et 0 boost utile. Equivalent a un shooting photo pro." },
];

// Tinder subscription timeline — real periods from Apple Store history
export const TINDER_SUB_TIMELINE: { period: string; type: "paid" | "free"; duration: string; conv: string; note: string }[] = [
  { period: "15/04 → 17/06", type: "paid", duration: "2 mois", conv: "0.76%", note: "Platinum plein tarif (32.99 EUR/mois). Inclut burst 31/05." },
  { period: "18/06 → 20/08", type: "free", duration: "~2 mois", conv: "0.69%", note: "Shadowban post-annulation #1 (27/06→30/07). Crash a 0.25% en juillet." },
  { period: "21/08 → ~21/09", type: "paid", duration: "1 mois", conv: "0.55%", note: "Platinum moitie prix (offre retention). Shadowban 08-26/09." },
  { period: "~22/09 → 13/10", type: "free", duration: "~3 sem", conv: "1.20%", note: "Shadowban 27/09→07/10 puis MEILLEUR taux (oct = 1.20%)." },
  { period: "14/10 → 14/12", type: "paid", duration: "2 mois", conv: "0.77%", note: "Moitie prix puis 32.99 EUR. Shadowban 16-26/10." },
  { period: "15/12 → 26/02", type: "free", duration: "~2.5 mois", conv: "0.85%", note: "Shadowban 25j (15/12→09/01) puis jan=1.26%, fev=1.15% = MEILLEURS mois." },
];

// Hinge subscription timeline — real periods from subscriptions.json
export const HINGE_SUB_TIMELINE: { period: string; type: "paid" | "free"; duration: string; conv: string; note: string }[] = [
  { period: "19/06 → 19/09", type: "paid", duration: "3 mois", conv: "1.90%", note: "Hinge+ #1 (58.33 EUR). Honeymoon + volume max." },
  { period: "20/09 → 19/11", type: "free", duration: "2 mois", conv: "1.00%", note: "Pool epuise. Plancher oct (0.8%). Pas de shadowban." },
  { period: "20/11 → 20/12", type: "paid", duration: "1 mois", conv: "2.00%", note: "Hinge+ #2 (14.57 EUR). Rebond — golden month." },
  { period: "21/12 → 31/12", type: "free", duration: "~10j", conv: "1.90%", note: "Pas de drop post-annulation (unlike Tinder)." },
  { period: "01/01 → 01/02", type: "paid", duration: "1 mois", conv: "1.20%", note: "Hinge+ #3 (14.57 EUR). Volume haut, convos courtes." },
  { period: "02/02 → 26/02", type: "free", duration: "~25j", conv: "1.70%", note: "Fin de cycle. Aucun shadowban post-annulation." },
];

// Enriched monthly data for temporal chart — Tinder (from MONTHLY_INDEX + subscription mapping)
export const TINDER_MONTHLY_CHART: { month: string; conv: number; likes: number; matchs: number; status: "paid" | "free" | "mixed"; hasShadowban: boolean; insight: string }[] = [
  { month: "Avr", conv: 0.64, likes: 1258, matchs: 8, status: "paid", hasShadowban: false, insight: "Debut Platinum plein tarif" },
  { month: "Mai", conv: 0.78, likes: 2304, matchs: 18, status: "paid", hasShadowban: true, insight: "SB 12-25/05 (post-burst)" },
  { month: "Jun", conv: 0.85, likes: 2348, matchs: 20, status: "mixed", hasShadowban: true, insight: "Annulation #1 le 17 → SB des le 27" },
  { month: "Jul", conv: 0.25, likes: 809, matchs: 2, status: "free", hasShadowban: true, insight: "CRASH — SB complet 07-31/07" },
  { month: "Aou", conv: 0.94, likes: 959, matchs: 9, status: "mixed", hasShadowban: true, insight: "SB 01-12 puis rebond + reabo 21/08" },
  { month: "Sep", conv: 0.33, likes: 609, matchs: 2, status: "mixed", hasShadowban: true, insight: "SB quasi-continu, annulation #2" },
  { month: "Oct", conv: 1.20, likes: 498, matchs: 6, status: "mixed", hasShadowban: true, insight: "SB 16-26 puis MEILLEUR taux !" },
  { month: "Nov", conv: 0.78, likes: 1277, matchs: 10, status: "paid", hasShadowban: false, insight: "Platinum stable, seul mois sans SB" },
  { month: "Dec", conv: 0.52, likes: 1336, matchs: 7, status: "mixed", hasShadowban: true, insight: "Annulation #3 le 14 → SB immediat" },
  { month: "Jan", conv: 1.26, likes: 396, matchs: 5, status: "free", hasShadowban: true, insight: "SB debut+fin mais MEILLEUR mois !" },
  { month: "Fev", conv: 1.15, likes: 349, matchs: 4, status: "free", hasShadowban: false, insight: "Momentum gratuit + selectif" },
];

// Enriched monthly data for temporal chart — Hinge (no shadowbans)
export const HINGE_MONTHLY_CHART: { month: string; conv: number; likes: number; matchs: number; status: "paid" | "free" | "mixed"; insight: string }[] = [
  { month: "Jun", conv: 3.4, likes: 89, matchs: 3, status: "paid", insight: "Honeymoon + Hinge+ #1" },
  { month: "Jul", conv: 2.3, likes: 431, matchs: 10, status: "paid", insight: "Volume max, encore bon" },
  { month: "Aou", conv: 1.4, likes: 416, matchs: 6, status: "paid", insight: "Decline naturel (pool)" },
  { month: "Sep", conv: 0.9, likes: 232, matchs: 2, status: "mixed", insight: "Fin Hinge+ #1 le 19" },
  { month: "Oct", conv: 0.8, likes: 123, matchs: 1, status: "free", insight: "Plancher — pool epuise" },
  { month: "Nov", conv: 2.2, likes: 93, matchs: 2, status: "mixed", insight: "Hinge+ #2 le 20 → rebond" },
  { month: "Dec", conv: 1.9, likes: 320, matchs: 6, status: "mixed", insight: "Hinge+ renouvele, 6 convos" },
  { month: "Jan", conv: 1.2, likes: 500, matchs: 6, status: "paid", insight: "Hinge+ #3, volume haut" },
  { month: "Fev", conv: 1.7, likes: 121, matchs: 2, status: "free", insight: "Retour free, pas de punition" },
];

// Post-cancellation shadowban pattern — each cancellation triggered algorithmic punishment
export const POST_CANCEL_SHADOWBANS: { cancellation: string; shadowbanStart: string; duration: string; likesWasted: number; recoveryElo: string }[] = [
  { cancellation: "17/06 (fin Platinum #1)", shadowbanStart: "27/06", duration: "~33 jours", likesWasted: 875, recoveryElo: "1.22 (rebond aout)" },
  { cancellation: "~21/09 (fin Platinum #2)", shadowbanStart: "27/09", duration: "10 jours", likesWasted: 166, recoveryElo: "1.69 (pic octobre)" },
  { cancellation: "14/12 (expiration finale)", shadowbanStart: "15/12", duration: "25 jours", likesWasted: 620, recoveryElo: "1.88 (meilleur score ever)" },
];

export const DARK_PATTERNS: { pattern: string; mechanism: string; defense: string }[] = [
  { pattern: "Faux likes", mechanism: "50%+ des notifications de comptes frauduleux (FTC 2013-2016)", defense: "Ne jamais acheter un abo juste pour voir qui t'a like" },
  { pattern: "Rose Jail (Hinge)", mechanism: "Meilleurs profils caches dans Standouts, accessibles avec des Roses payantes", defense: "1 Rose gratuite/semaine, ne pas en acheter" },
  { pattern: "Inflation des prix", mechanism: "Tinder Plus: $9.99 → $24.99 (+150%)", defense: "Negocier en annulant (offre de retention)" },
  { pattern: "Pricing discriminatoire", mechanism: "30-49 ans paient 65% de plus que 18-29 (Mozilla 2022)", defense: "Verifier les prix avec VPN / autre localisation" },
  { pattern: "FOMO notifications", mechanism: "'Tu as un nouveau like !' → pousser a ouvrir → pousser a payer", defense: "Desactiver les notifications push" },
  { pattern: "Renouvellement auto", mechanism: "Multi-pages pour annuler, sondages pour decourager", defense: "Desactiver le renouvellement AUTO des l'achat" },
  { pattern: "Shadowban", mechanism: "Profil invisible sans notification si trop actif", defense: "Verifier regulierement en demandant a un ami" },
  { pattern: "Super Likes rarefies", mechanism: "1 gratuit/jour → 1/semaine → 1/mois au fil du temps", defense: "Utiliser le gratuit, ne jamais en acheter" },
];

export const BUDGET_OPTIMAL: { item: string; cost: string; why: string }[] = [
  { item: "Tinder Gold", cost: "~15 EUR/mois", why: "Voir Likes You = 30% de tes matchs (canal sous-exploite)" },
  { item: "Boosts Tinder (4/mois)", cost: "~17 EUR/mois", why: "Cibles Mer-Ven 20h, jamais en shadowban" },
  { item: "Boosts Hinge (1-2/mois)", cost: "~10-20 EUR/mois", why: "Cibles Mercredi (2.81% conv = meilleur jour)" },
  { item: "Shooting photo", cost: "~100 EUR one-shot", why: "21x chance de date avec photos haute qualite (1.8M profils)" },
  { item: "TOTAL", cost: "~47-67 EUR/mois", why: "vs 24 EUR/mois depenses pour 0 impact mesurable" },
];

// === SECTION 8: PHOTO SCIENCE ===

export const PHOTO_STATS: { metric: string; impact: string; source: string }[] = [
  { metric: "Photos pro", impact: "+49% matches", source: "Hinge" },
  { metric: "Full body shot", impact: "+203% messages", source: "Hinge/Zoosk" },
  { metric: "Contact visuel direct", impact: "+102% likes", source: "Hinge" },
  { metric: "Sourire", impact: "+23% likes", source: "Hinge" },
  { metric: "Photo voyage", impact: "+30% likes", source: "Hinge" },
  { metric: "Photo avec chien", impact: "+22% attractivite", source: "Surveys" },
  { metric: "Photo haute qualite", impact: "21x chance de date", source: "1.8M profils" },
  { metric: "Candid (non posee)", impact: "+15% likes", source: "Hinge" },
];

export const BEARD_DATA: { style: string; attractiveness: number; preferred: boolean }[] = [
  { style: "Clean-shaven", attractiveness: 30, preferred: false },
  { style: "Light stubble (5j)", attractiveness: 20, preferred: false },
  { style: "Heavy stubble (10j)", attractiveness: 100, preferred: true },
  { style: "Full beard", attractiveness: 60, preferred: false },
];

export const FRANCE_VS_US: { aspect: string; france: string; usuk: string }[] = [
  { aspect: "Photo principale", france: "Sourire subtil, angle 3/4", usuk: "Sourire large, confiant" },
  { aspect: "Torse nu", france: "Quasi redhibitoire", usuk: "Acceptable si bon physique" },
  { aspect: "Style vestimentaire", france: "Elegance decontractee obligatoire", usuk: "Casual OK" },
  { aspect: "Bio", france: "Accroche spirituelle + mystere", usuk: "Fun, emojis, bullet points" },
  { aspect: "First date", france: "Verre en terrasse / balade", usuk: "Restaurant" },
  { aspect: "Flexing", france: "Turn-off", usuk: "Accepte" },
];

// === SECTION 9: 50 HYPOTHESES ===

export const HYPOTHESIS_THEMES: HypothesisTheme[] = [
  {
    id: "opener",
    title: "Le Premier Message",
    emoji: "💬",
    hypotheses: [
      { id: "H13", title: "Francais vs Anglais dans l'opener", verdict: "confirmed", app: "both", impact: 3,
        insight: "Convos FR = 12.2 msgs moy vs EN = 2.4 msgs (x5). Opener personalise = 9.3 msgs, generique = 2.2 msgs.",
        bars: [
          { label: "Question specifique", value: 9.3, color: "#22c55e" },
          { label: "Question generique", value: 8.4, color: "#3b82f6" },
          { label: "Statement", value: 3.6, color: "#f59e0b" },
          { label: "Generique (hey/salut)", value: 2.2, color: "#ef4444" },
        ],
        recommendations: [
          { text: "Ecris toujours en francais si ton match est francophone", type: "do" },
          { text: "Personalise ton opener en mentionnant un detail du profil", type: "do" },
          { text: "Les openers anglais generiques ('hey what's up')", type: "dont" },
        ],
      },
      { id: "H26", title: "Longueur optimale de l'opener", verdict: "confirmed", app: "both", impact: 2,
        insight: "Sweet spot 50-100 caracteres = 11.5 msgs moy. Court (20-50c) = catastrophe a 1.9 msgs, 71% ghost.",
        recommendations: [
          { text: "Vise 50-100 caracteres : assez long pour montrer de l'interet, assez court pour ne pas submerger", type: "do" },
          { text: "Les messages de moins de 20 caracteres (trop impersonnel)", type: "dont" },
        ],
      },
      { id: "H27", title: "Densite de questions = anti-ghost", verdict: "confirmed", app: "both", impact: 3,
        insight: "0 questions = 100% ghost. 3-5 questions = 0% ghost. Densite ideale : 20-40% de tes messages.",
        bars: [
          { label: "0 questions", value: 100, color: "#ef4444" },
          { label: "1-2 questions", value: 75, color: "#f59e0b" },
          { label: "3-5 questions", value: 0, color: "#22c55e" },
          { label: "11+ questions", value: 0, color: "#22c55e" },
        ],
        recommendations: [
          { text: "Chaque message devrait contenir au moins une question ouverte", type: "do" },
          { text: "Vise 20-40% de tes messages avec un '?' — c'est la zone d'or", type: "tip" },
          { text: "Enchainer les statements sans jamais relancer", type: "dont" },
        ],
      },
      { id: "H33", title: "Emojis dans l'opener (Tinder)", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Avec emoji = 36% ghost vs sans = 56%. Densite ideale : <0.3 emoji/msg = 23.2 msgs moy. Trop (>0.7) tue la convo.",
        recommendations: [
          { text: "1 emoji par message max — ca humanise sans faire excessif", type: "do" },
          { text: "Saturer chaque message d'emojis (>0.7 par message)", type: "dont" },
        ],
      },
      { id: "H40", title: "Templates reutilises = ghost", verdict: "confirmed", app: "both", impact: 2,
        insight: "Template reutilise (>50% similaire) = 62% ghost vs opener unique = 44%. Chaque opener doit etre unique.",
        recommendations: [
          { text: "Lis le profil et cree un opener unique a chaque fois", type: "do" },
          { text: "Copier-coller le meme opener a tout le monde", type: "dont" },
          { text: "Garde une structure (FR+Q+Perso) mais varie le contenu", type: "tip" },
        ],
      },
      { id: "H43", title: "La structure d'opener universelle", verdict: "confirmed", app: "both", impact: 3,
        insight: "FR + QUESTION + PERSO = 78.8 msgs moy, 22% ghost, 44% convos longues. La meilleure combo toutes apps.",
        stats: [
          { label: "Msgs moy", value: "78.8", severity: "good" },
          { label: "Ghost rate", value: "22%", severity: "good" },
          { label: "Convos longues", value: "44%", severity: "good" },
        ],
        recommendations: [
          { text: "Applique la formule : Francais + Question + Detail du profil = combo gagnante", type: "do" },
          { text: "Exemple : 'J'adore ton spot de rando ! C'etait ou exactement ?'", type: "tip" },
        ],
      },
      { id: "H50", title: "Mots declencheurs (hello = poison)", verdict: "mixed", app: "both", impact: 2,
        insight: "'hello' = 67% ghost. Greeting generique = 62% ghost. Sans greeting = seulement 29% ghost.",
        recommendations: [
          { text: "Commence directement par le sujet, sans 'salut/hey/hello'", type: "do" },
          { text: "Commencer par un greeting generique seul", type: "dont" },
        ],
      },
    ],
  },
  {
    id: "timing",
    title: "Timing & Reactivite",
    emoji: "⏰",
    hypotheses: [
      { id: "H18", title: "Delai match → 1er message", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Repondre J+1 = 20.5 msgs moy vs J0 = 5.9 msgs (x3.5). Le sweet spot est 12-24h apres le match.",
        recommendations: [
          { text: "Attends 12-24h apres le match avant d'envoyer ton opener", type: "do" },
          { text: "Repondre dans la minute (ca fait trop keen)", type: "dont" },
          { text: "Un leger delai cree de l'anticipation sans paraitre desinteresse", type: "tip" },
        ],
      },
      { id: "H22", title: "Creneau d'envoi de l'opener", verdict: "confirmed", app: "both", impact: 2,
        insight: "Opener matin 6-11h = 14.2 msgs moy, 29% ghost vs soir 19-22h = 5.6 msgs, 67% ghost. Le matin gagne.",
        recommendations: [
          { text: "Envoie tes openers entre 6h et 11h — ton match les lira frais au reveil", type: "do" },
          { text: "Envoyer un premier message tard le soir (apres 21h)", type: "dont" },
        ],
      },
      { id: "H28", title: "Meilleur jour pour initier une convo", verdict: "confirmed", app: "tinder", impact: 1,
        insight: "Mercredi-Jeudi = meilleurs jours (11.7 et 12.7 msgs). Lundi = pire (3.2 msgs, 67% ghost).",
        recommendations: [
          { text: "Privilege mercredi et jeudi pour envoyer tes premiers messages", type: "do" },
          { text: "Evite le lundi — les gens sont pris dans la reprise de semaine", type: "tip" },
        ],
      },
      { id: "H34", title: "Vitesse de reponse = multiplicateur", verdict: "confirmed", app: "both", impact: 3,
        insight: "Reponse <1h = 23.3 msgs Tinder (x5.8 vs lent) et 153 msgs Hinge (x21.9). Pendant la convo, reponds dans l'heure.",
        bars: [
          { label: "Rapide (<1h)", value: 23.3, color: "#22c55e" },
          { label: "Normal (1-6h)", value: 18.0, color: "#3b82f6" },
          { label: "Lent (6-24h)", value: 6.5, color: "#f59e0b" },
          { label: "Tres lent (24h+)", value: 4.0, color: "#ef4444" },
        ],
        recommendations: [
          { text: "Reponds en moins d'1h une fois la conversation lancee — c'est le facteur #1", type: "do" },
          { text: "Laisser trainer plus de 24h sans bonne raison", type: "dont" },
          { text: "Active les notifs pour ne pas rater la fenetre de reactivite", type: "tip" },
        ],
      },
      { id: "H46", title: "Timing partage social", verdict: "mixed", app: "both", impact: 1,
        insight: "Effet mineur du timing de partage de liens sociaux (Instagram, etc.) sur la convo.",
        recommendations: [
          { text: "Le timing du partage Insta n'est pas un levier — ne t'en preoccupe pas", type: "tip" },
        ],
      },
    ],
  },
  {
    id: "conversation",
    title: "Dynamique de Conversation",
    emoji: "🔄",
    hypotheses: [
      { id: "H8", title: "Profil des convos longues vs courtes", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Convos longues = msgs plus longs (+30%), rythme plus lent (-49%), duree 6x plus longue. Ne force pas le rythme.",
        recommendations: [
          { text: "Laisse la conversation prendre son rythme naturel — les longues convos ralentissent", type: "do" },
          { text: "Forcer un rythme rapide de reponse quand l'autre est plus lent", type: "dont" },
        ],
      },
      { id: "H17", title: "Message #2 = LE MUR (37% meurent)", verdict: "confirmed", app: "tinder", impact: 3,
        insight: "37% des convos Tinder meurent au msg #2. C'est LE moment critique. Msg #2 = TOUJOURS une relance interessante.",
        recommendations: [
          { text: "Ton 2eme message doit contenir une question ouverte et de l'interet sincere", type: "do" },
          { text: "Repondre 'merci' ou 'haha' sans relancer au msg #2", type: "dont" },
          { text: "C'est le point de survie le plus critique — investis ici", type: "tip" },
        ],
      },
      { id: "H19", title: "Le whippet = arme secrete", verdict: "confirmed", app: "both", impact: 3,
        insight: "Mention du chien = +449% Tinder (29.4 vs 5.4 msgs) et +735% Hinge (119 vs 14 msgs). MASSIVEMENT sous-exploite.",
        stats: [
          { label: "Tinder avec chien", value: "29.4 msgs", severity: "good" },
          { label: "Tinder sans chien", value: "5.4 msgs", severity: "critical" },
          { label: "Hinge avec chien", value: "119 msgs", severity: "good" },
          { label: "Hinge sans chien", value: "14 msgs", severity: "critical" },
        ],
        recommendations: [
          { text: "Mets une photo avec ton animal et mentionne-le dans tes convos", type: "do" },
          { text: "Parle de bouffe, d'animaux ou d'humour des les premiers messages", type: "tip" },
        ],
      },
      { id: "H20", title: "Double-text et relances", verdict: "confirmed", app: "both", impact: 2,
        insight: "Double-text (<30min) survit 89% du temps. Relance 24h+ survit 71%. Le double-text ne tue PAS la convo.",
        recommendations: [
          { text: "Relance sans culpabilite — le double-text a un taux de survie de 89%", type: "do" },
          { text: "Avoir peur de relancer — le silence tue plus que la relance", type: "dont" },
        ],
      },
      { id: "H21", title: "Revival apres long silence", verdict: "confirmed", app: "both", impact: 2,
        insight: "Contre-intuitif : silence 1 semaine+ → revival survit 71% Tinder, 89% Hinge. N'hesite JAMAIS a relancer.",
        recommendations: [
          { text: "Relance meme apres 1 semaine de silence — 71-89% de survie", type: "do" },
          { text: "Considerer une convo comme morte apres quelques jours de silence", type: "dont" },
        ],
      },
      { id: "H24", title: "Messages qui raccourcissent = bon signe", verdict: "confirmed", app: "tinder", impact: 1,
        insight: "Convos ou tes messages raccourcissent = 22 msgs moy, 57% menant a un date. Signe de confort et rythme naturel.",
        recommendations: [
          { text: "Si tes messages raccourcissent naturellement, c'est que le confort s'installe", type: "tip" },
        ],
      },
      { id: "H25", title: "Sujets gagnants : trio animal-bouffe-humour", verdict: "confirmed", app: "both", impact: 3,
        insight: "Trio gagnant : animal +868%, bouffe +859%, humour +725%. Introduis l'un des trois des msg #2-3.",
        recommendations: [
          { text: "Introduis un des 3 sujets (animal, bouffe, humour) des le msg #2 ou #3", type: "do" },
          { text: "Parler de sujets impersonnels ou abstraits en debut de convo", type: "dont" },
        ],
      },
      { id: "H29", title: "Escalade : tot ou tard ?", verdict: "mixed", app: "tinder", impact: 2,
        insight: "Escalade tardive (msg 11+) = 59 msgs moy vs tot (msg 1-3) = 18 msgs. Construis le rapport d'abord, propose au msg #10-15.",
        recommendations: [
          { text: "Propose un rendez-vous autour du message #10-15 — pas avant, pas trop apres", type: "do" },
          { text: "Proposer un date des les 3 premiers messages (trop brusque)", type: "dont" },
        ],
      },
      { id: "H35", title: "3 signaux early-warning", verdict: "confirmed", app: "both", impact: 2,
        insight: "FR + 1 question + avg 50c dans les 3 premiers msgs = x2.2 de chances de convo longue Tinder. Signal predictif.",
        recommendations: [
          { text: "Dans tes 3 premiers messages : francais + une question + ~50 caracteres min", type: "do" },
          { text: "C'est un combo predictif : si les 3 premiers msgs ont ces signaux, x2.2 de survie", type: "tip" },
        ],
      },
      { id: "H38", title: "Mirroring du style", verdict: "mixed", app: "both", impact: 1,
        insight: "Adapter son style au sien a un effet faible mais positif. Pas un levier principal.",
        recommendations: [
          { text: "Adapte legerement ton style au sien (longueur, ton) mais reste naturel", type: "tip" },
        ],
      },
    ],
  },
  {
    id: "algorithm",
    title: "L'Algorithme & Strategie",
    emoji: "🎯",
    hypotheses: [
      { id: "H1", title: "95.6% des matchs = jour meme du swipe", verdict: "confirmed", app: "tinder", impact: 3,
        insight: "Tinder empile les 'likes recus' en haut de ta pile → match instantane des que tu swipes. Pas d'activite = pas de matchs.",
        recommendations: [
          { text: "Swipe chaque jour — tes matchs arrivent le jour ou tu es actif", type: "do" },
          { text: "Esperer des matchs les jours ou tu n'ouvres pas l'app", type: "dont" },
        ],
      },
      { id: "H2", title: "Ouvrir sans swiper = quasi inutile", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "4.25x plus de matchs en swipant vs juste ouvrir l'app. Open sans swipe = 0.079 matchs/jour vs 0.336 avec swipe.",
        recommendations: [
          { text: "Quand tu ouvres l'app, swipe — ne te contente pas de regarder", type: "do" },
        ],
      },
      { id: "H3", title: "Activite haute = 7.7x plus de matchs", verdict: "confirmed", app: "tinder", impact: 3,
        insight: "30+ opens/jour = 1.00 match/jour vs basse activite = 0.13. L'algo booste ta visibilite quand tu es actif.",
        recommendations: [
          { text: "Ouvre l'app regulierement (plusieurs sessions courtes > 1 longue session)", type: "do" },
          { text: "L'algo recompense la regularite, pas les mega-sessions", type: "tip" },
        ],
      },
      { id: "H4", title: "Selectivite 30-50% = sweet spot", verdict: "confirmed", app: "tinder", impact: 3,
        insight: "La falaise est a 50%. Passer de 49% a 51% de like ratio divise ta conversion par 3. Sweet spot = 30-50%.",
        bars: [
          { label: "Selectif (<30%)", value: 0.99, color: "#22c55e" },
          { label: "Modere (30-50%)", value: 1.09, color: "#22c55e" },
          { label: "Large (50-70%)", value: 0.37, color: "#ef4444" },
          { label: "Mass-like (>70%)", value: 0.96, color: "#f59e0b" },
        ],
        recommendations: [
          { text: "Garde ton taux de like entre 30-50% — c'est le sweet spot algorithmique", type: "do" },
          { text: "Depasser 50% de like ratio (l'algo te penalise immediatement)", type: "dont" },
          { text: "Regarde chaque profil 3 secondes minimum avant de decider", type: "tip" },
        ],
      },
      { id: "H5", title: "Newbie boost = mythe", verdict: "debunked", app: "tinder", impact: 2,
        insight: "Semaine 1 = 0.63% conv vs semaines 2-45 = 0.76%. Aucun newbie boost detecte. 201 likes le jour 1 ont tue le potentiel.",
        recommendations: [
          { text: "Ne mass-like pas le jour 1 — il n'y a pas de newbie boost a exploiter", type: "dont" },
          { text: "Commence doucement et monte en puissance progressivement", type: "do" },
        ],
      },
      { id: "H6", title: "Matchs en clusters", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Apres un jour avec match, probabilite de matcher le lendemain double (33.8% vs 17.9%). Les matchs arrivent en clusters.",
        recommendations: [
          { text: "Apres un match, sois plus actif le lendemain — les clusters se renforcent", type: "do" },
        ],
      },
      { id: "H9", title: "ELO proxy — pics apres repos", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Chaque pic ELO arrive APRES une periode de faible activite. Meilleur score (1.88) = apres janvier calme.",
        recommendations: [
          { text: "Alterne periodes actives (2 semaines) et repos (1 semaine) pour resetter l'algo", type: "do" },
          { text: "Les pauses strategiques boostent ton score ELO au retour", type: "tip" },
        ],
      },
      { id: "H10", title: "7 shadowbans, 2124 likes gaspilles", verdict: "confirmed", app: "tinder", impact: 3,
        insight: "8 periodes sans match totalisant 2436 likes gaspilles (20% du total). Chaque drought suit un burst d'activite.",
        recommendations: [
          { text: "Si tu as 0 match pendant 3+ jours, arrete de swiper — c'est un shadowban", type: "do" },
          { text: "Continuer a swiper en plein shadowban (tu gaspilles tes likes)", type: "dont" },
        ],
      },
      { id: "H41", title: "3 annulations = 3 shadowbans (confirme x3)", verdict: "confirmed", app: "tinder", impact: 3,
        insight: "Annulation #1 (17/06) → 33j shadowban, 875 likes perdus. Annulation #2 (21/09) → 10j, 166 likes. Expiration finale (14/12) → 25j, 620 likes, 0.00% pendant 21j. Pattern systematique.",
        recommendations: [
          { text: "Si tu es abonne, laisse l'abo expirer naturellement — n'annule pas", type: "do" },
          { text: "Annuler un abonnement Tinder (shadowban quasi garanti)", type: "dont" },
        ],
      },
      { id: "H48", title: "Sweet spot volume : 11-30 likes/jour", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Convos issues de jours a 11-30 likes = 15 msgs, 44% ghost. Trop peu (<10) = 80% ghost. Burst (60+) = 55% ghost.",
        recommendations: [
          { text: "Vise 11-30 likes par jour — c'est le volume optimal de qualite", type: "do" },
          { text: "Les bursts de 60+ likes/jour (ca declenche le filtre anti-spam)", type: "dont" },
        ],
      },
    ],
  },
  {
    id: "seasonality",
    title: "Saisonnalite & Patterns",
    emoji: "📅",
    hypotheses: [
      { id: "H30", title: "Night owl effect", verdict: "confirmed", app: "both", impact: 1,
        insight: "Convos tard le soir = plus longues. Mais faible volume a ces heures. Top heures msgs : 21h (330), 22h (236), 23h (194).",
        recommendations: [
          { text: "Les convos tardives (22h+) sont plus intimes — profite de ces moments", type: "tip" },
        ],
      },
      { id: "H31", title: "Dimanche = mass-like improductif", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Dimanche : 2769 likes (2x la moyenne) pour seulement 0.65% de conversion. Tu mass-likes pour un resultat mediocre.",
        recommendations: [
          { text: "Mass-liker le dimanche — tu swipes 2x plus pour un resultat 2x pire", type: "dont" },
          { text: "Garde le dimanche pour repondre aux convos, pas pour swiper", type: "do" },
        ],
      },
      { id: "H44", title: "Weekday vs weekend", verdict: "mixed", app: "both", impact: 1,
        insight: "Pas de difference significative sauf Jeudi = pire jour (0.51% conv). Les autres jours sont dans le bruit statistique.",
        recommendations: [
          { text: "Jeudi est le pire jour pour swiper — concentre-toi sur les convos ce jour-la", type: "tip" },
        ],
      },
      { id: "H47", title: "Golden months : Juin et Novembre", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Juin = 0.85% conv (pool frais ete) et Oct = 1.20% (cuffing season). Les mois ou tu likes MOINS = meilleurs taux.",
        recommendations: [
          { text: "Sois particulierement actif en juin (pool frais) et octobre (cuffing season)", type: "do" },
          { text: "Moins tu likes dans un mois, meilleur est ton taux — qualite > quantite", type: "tip" },
        ],
      },
    ],
  },
  {
    id: "fatigue",
    title: "Fatigue & Burnout",
    emoji: "😤",
    hypotheses: [
      { id: "H14", title: "Le burst du 31 mai — piege dopamine", verdict: "confirmed", app: "tinder", impact: 3,
        insight: "787 likes en 1 jour → 8 matchs immédiats → like ratio 69.8% → CRASH total 4-8 juin. Les mega-sessions detruisent le score.",
        recommendations: [
          { text: "Limite-toi a 30 likes par session max — meme si l'envie est la", type: "do" },
          { text: "Les mega-sessions de 200+ likes (crash ELO garanti dans les 48h)", type: "dont" },
          { text: "La dopamine du burst est un piege — les matchs d'aujourd'hui tuent ceux de demain", type: "tip" },
        ],
      },
      { id: "H15", title: "Like ratio >50% = signal desperate", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "Au-dessus de 50% de like ratio, l'algo te classe comme 'prend tout' et reduit ta visibilite. La falaise est nette.",
        recommendations: [
          { text: "Swipe a gauche au moins 1 profil sur 2 — l'algo te recompense", type: "do" },
          { text: "Liker plus de 50% des profils (signal 'desperate' pour Tinder)", type: "dont" },
        ],
      },
      { id: "H16", title: "8 droughts = 20% de likes gaspilles", verdict: "confirmed", app: "tinder", impact: 2,
        insight: "2436 likes gaspilles pendant les periodes de shadowban. Continuer a swiper pendant un shadowban = gaspiller ses likes.",
        recommendations: [
          { text: "Si 0 match depuis 3 jours, pause de 5-7 jours pour resetter", type: "do" },
          { text: "Swiper en mode frustration pendant un drought", type: "dont" },
        ],
      },
      { id: "H23", title: "Convos simultanees : max 3-4", verdict: "confirmed", app: "both", impact: 2,
        insight: "Gerer efficacement max 3-4 conversations simultanees. Au-dela, la qualite chute et les reponses deviennent generiques.",
        recommendations: [
          { text: "Limite-toi a 3-4 conversations actives en parallele", type: "do" },
          { text: "Ouvrir 10 convos et repondre a toutes avec des 'haha oui'", type: "dont" },
        ],
      },
      { id: "H45", title: "Burst d'activite : court vs moyen terme", verdict: "mixed", app: "tinder", impact: 1,
        insight: "Le burst est OK a court terme (8 matchs le 31 mai) mais catastrophique a moyen terme (crash ELO, shadowban).",
        recommendations: [
          { text: "Pense moyen terme — une activite reguliere bat toujours un burst ponctuel", type: "tip" },
        ],
      },
    ],
  },
  {
    id: "premium",
    title: "Premium, Cross-App & Meta",
    emoji: "🔍",
    hypotheses: [
      { id: "H11", title: "Platinum = ~152 EUR pour rien", verdict: "debunked", app: "tinder", impact: 3,
        insight: "5 mois payes (~152 EUR, dont 2 a moitie prix). Match rate paid 0.75% vs free 0.77% = zero difference. Pire : chaque annulation a declenche un shadowban de 10 a 33 jours.",
        stats: [
          { label: "Depense reelle", value: "~152 EUR", severity: "critical" },
          { label: "Paid vs Free", value: "0.75% vs 0.77%", severity: "critical" },
          { label: "Shadowbans post-annulation", value: "3 (68 jours total)", severity: "critical" },
        ],
        recommendations: [
          { text: "Payer pour Tinder Platinum — zero gain prouve, risque de shadowban a l'annulation", type: "dont" },
          { text: "Investis cet argent dans un shooting photo pro (impact reel)", type: "do" },
        ],
      },
      { id: "H12", title: "Likes You = 30% de tes matchs", verdict: "confirmed", app: "tinder", impact: 3,
        insight: "~30% de tes matchs Tinder viennent de la queue 'Likes You'. C'est un canal a part entiere, a checker chaque session.",
        recommendations: [
          { text: "Check ta file 'Likes You' a chaque session — c'est 30% de tes matchs", type: "do" },
        ],
      },
      { id: "H32", title: "Cross-app timing", verdict: "mixed", app: "both", impact: 1,
        insight: "Pas de cannibalisation entre apps. Tu peux utiliser Tinder et Hinge en parallele sans impact negatif.",
        recommendations: [
          { text: "Utilise plusieurs apps en parallele sans culpabilite — pas de cannibalisation", type: "do" },
        ],
      },
      { id: "H36", title: "Blocks Hinge non correles au comportement", verdict: "debunked", app: "hinge", impact: 1,
        insight: "Les 25 blocks/removes (10.6%) ne sont pas correles a ton comportement conversationnel. Pas de pattern a corriger.",
        recommendations: [
          { text: "Les blocks Hinge sont aleatoires — ne les prends pas personnellement", type: "tip" },
        ],
      },
      { id: "H37", title: "Partage social timing", verdict: "mixed", app: "both", impact: 1,
        insight: "Pas de correlation significative entre quand tu partages ton Instagram et le devenir de la convo.",
        recommendations: [
          { text: "Partage ton Insta quand ca te semble naturel — le timing n'a pas d'impact", type: "tip" },
        ],
      },
      { id: "H39", title: "Night owl : convos tard = plus longues", verdict: "confirmed", app: "both", impact: 2,
        insight: "Les echanges nocturnes (22h+) sont plus intimes et durent plus longtemps. Mais le volume est faible.",
        recommendations: [
          { text: "Les conversations nocturnes sont precieuses — saisis-les quand elles arrivent", type: "do" },
        ],
      },
      { id: "H42", title: "Geolocalisation proxy", verdict: "mixed", app: "both", impact: 1,
        insight: "Signal faible de correlation entre geolocalisation (Ile Maurice vs Paris) et performance. Confound non isole.",
        recommendations: [
          { text: "La localisation a un effet marginal — ne change pas tes habitudes pour ca", type: "tip" },
        ],
      },
      { id: "H49", title: "Impact des notifications", verdict: "mixed", app: "both", impact: 1,
        insight: "Pas de pattern clair entre les notifications et le comportement de reponse. Bruit statistique.",
        recommendations: [
          { text: "Active les notifs uniquement pour les messages (pas les likes) — ca suffit", type: "tip" },
        ],
      },
    ],
  },
  // ── H51-H70: Advanced Conversation Hypotheses ──────────────
  {
    id: "signals",
    title: "Signaux Conversationnels",
    emoji: "📡",
    hypotheses: [
      { id: "H51", title: "Le gap critique : 6h de silence = mort", verdict: "confirmed", app: "both", impact: 3,
        insight: "Dans une convo au rythme rapide (<2h entre les premiers messages), un silence soudain >6h predit la mort de la conversation. Le taux de survie apres ce gap chute drastiquement.",
        stats: [
          { label: "Seuil critique", value: "6h", severity: "critical" },
          { label: "Indicateur", value: "Silence soudain", severity: "warning" },
        ],
        recommendations: [
          { text: "Si une convo rapide ralentit soudainement, relance dans les 4h", type: "do" },
          { text: "Laisser un silence de 6h+ dans une convo au rythme rapide", type: "dont" },
          { text: "Le gap critique agit comme un 'circuit breaker' — une fois passe, difficile de revenir", type: "tip" },
        ],
      },
      { id: "H52", title: "Acceleration du rythme = escalation", verdict: "confirmed", app: "both", impact: 2,
        insight: "Quand les delais de reponse diminuent au fil de la conversation (regression lineaire negative), le taux d'escalation vers un date augmente significativement. A l'inverse, une deceleration predit le ghost.",
        bars: [
          { label: "Acceleration → escalation", value: 65, color: "#22c55e" },
          { label: "Deceleration → escalation", value: 20, color: "#ef4444" },
          { label: "Stable → escalation", value: 35, color: "#f59e0b" },
        ],
        recommendations: [
          { text: "Quand le rythme accelere, c'est le moment de proposer un date", type: "do" },
          { text: "Si tes delais de reponse augmentent, c'est un signal d'alarme", type: "tip" },
        ],
      },
      { id: "H54", title: "Sync temporelle : meme heure = rituel", verdict: "confirmed", app: "both", impact: 2,
        insight: "Quand les deux personnes repondent a des heures coherentes (stddev < 4h), ca cree un rituel conversationnel. Les convos synchronisees survivent nettement mieux que les desynchronisees.",
        recommendations: [
          { text: "Reponds aux memes heures que ton match — ca cree un rituel implicite", type: "do" },
          { text: "Varier tes heures de reponse aleatoirement", type: "dont" },
        ],
      },
      { id: "H70", title: "Asymetrie de tempo > 3:1 = signal de mort", verdict: "confirmed", app: "both", impact: 3,
        insight: "Quand un des deux repond 3x plus vite que l'autre (ratio median > 3:1), le taux de ghost explose. L'asymetrie de reactivite est un des signaux les plus fiables de desengagement.",
        stats: [
          { label: "Seuil", value: "3:1 ratio", severity: "critical" },
          { label: "Signal", value: "Desengagement", severity: "warning" },
        ],
        recommendations: [
          { text: "Aligne ta vitesse de reponse sur celle de ton match (±30 min)", type: "do" },
          { text: "Repondre en 2 min quand l'autre met 3h (ou l'inverse)", type: "dont" },
          { text: "L'asymetrie est un des meilleurs predicteurs de ghost — surveille-la", type: "tip" },
        ],
      },
    ],
  },
  {
    id: "mirroring",
    title: "Reciprocite & Mirroring",
    emoji: "🪞",
    hypotheses: [
      { id: "H55", title: "Mirroring de longueur des messages", verdict: "confirmed", app: "both", impact: 2,
        insight: "Quand les longueurs de messages convergent (ratio min/max proche de 1), la conversation survit mieux. Un score miroir > 0.5 est associe a une survie nettement superieure vs < 0.3.",
        recommendations: [
          { text: "Adapte la longueur de tes messages a celle de ton match", type: "do" },
          { text: "Envoyer des paves quand l'autre repond en 3 mots (ou l'inverse)", type: "dont" },
        ],
      },
      { id: "H56", title: "Reciprocite des questions", verdict: "confirmed", app: "both", impact: 3,
        insight: "Le ratio questions recues / questions envoyees predit le ghost. Quand tu poses des questions mais n'en recois pas (ratio < 0.3), le ghost rate est maximal. Ratio > 0.7 = conversation saine.",
        bars: [
          { label: "Reciprocite haute (>0.7)", value: 25, color: "#22c55e" },
          { label: "Reciprocite basse (<0.3)", value: 75, color: "#ef4444" },
        ],
        recommendations: [
          { text: "Si tu poses des questions et n'en recois jamais, c'est un red flag — prends du recul", type: "do" },
          { text: "Continuer a poser des questions sans jamais en recevoir en retour", type: "dont" },
          { text: "Reciprocite < 0.3 = signe que l'interet n'est pas partage", type: "tip" },
        ],
      },
      { id: "H57", title: "Qui brise le silence ? Initiative asymetrique", verdict: "confirmed", app: "both", impact: 2,
        insight: "Si c'est toujours toi qui relances apres un silence (>80% des reprises), le taux de ghost de ces convos est significativement plus eleve. L'initiative doit etre partagee.",
        recommendations: [
          { text: "Laisse l'autre relancer de temps en temps — l'initiative doit etre partagee", type: "do" },
          { text: "Etre toujours le premier a briser le silence (>80% du temps)", type: "dont" },
        ],
      },
      { id: "H59", title: "Chute de densite emoji = desengagement", verdict: "mixed", app: "both", impact: 1,
        insight: "Quand la densite d'emojis dans tes 3 derniers messages chute de >30% par rapport aux 3 premiers, le taux de ghost augmente. Signal subtil de desengagement progressif.",
        recommendations: [
          { text: "Maintiens un niveau d'effort constant dans tes messages (emojis, longueur)", type: "tip" },
        ],
      },
    ],
  },
  {
    id: "linguistics",
    title: "Linguistique Avancee",
    emoji: "🔤",
    hypotheses: [
      { id: "H53", title: "Transition vous → tu = rapport", verdict: "confirmed", app: "both", impact: 2,
        insight: "La transition de vouvoiement a tutoiement est un marqueur de progression relationnelle. Les convos avec transition survivent mieux que celles restant au 'vous'. Position ideale : messages 4-8.",
        recommendations: [
          { text: "Propose le tutoiement autour du message #5-8 — ca fait avancer la relation", type: "do" },
          { text: "Rester au 'vous' trop longtemps (au-dela du 10eme message)", type: "dont" },
        ],
      },
      { id: "H58", title: "Richesse lexicale (type-token ratio)", verdict: "mixed", app: "both", impact: 1,
        insight: "Le ratio de mots uniques / mots totaux (TTR) dans tes messages correle avec la survie. Un vocabulaire plus riche (TTR haut) est associe a de meilleures conversations. Quartile superieur > quartile inferieur.",
        recommendations: [
          { text: "Varie ton vocabulaire — evite de repeter les memes formulations", type: "tip" },
        ],
      },
      { id: "H60", title: "Humour precoce (rire dans les 3 premiers echanges)", verdict: "confirmed", app: "both", impact: 3,
        insight: "Quand la match rit (haha/mdr/lol/😂) dans les 6 premiers messages, le taux de survie de la conversation augmente massivement. L'humour est le meilleur accelerateur conversationnel.",
        stats: [
          { label: "Avec rire precoce", value: "+40% survie", severity: "good" },
          { label: "Sans rire precoce", value: "Base", severity: "warning" },
        ],
        recommendations: [
          { text: "Place un trait d'humour dans tes 3 premiers messages — ca debloque la convo", type: "do" },
          { text: "L'objectif : faire rire dans les 6 premiers messages = +40% de survie", type: "tip" },
        ],
      },
      { id: "H61", title: "Qualite du message #3 (le vrai premier message)", verdict: "confirmed", app: "both", impact: 2,
        insight: "Ton 2eme message envoye (apres l'opener et la reponse) est le vrai premier message substantif. S'il contient une question, le taux de survie augmente significativement vs une reponse seche.",
        recommendations: [
          { text: "Ton 2eme message envoye doit contenir une question — c'est le vrai premier test", type: "do" },
          { text: "Repondre juste 'ah cool' ou 'ok' au 2eme message", type: "dont" },
        ],
      },
      { id: "H63", title: "Pronoms inclusifs (on/nous) = prediction de date", verdict: "confirmed", app: "both", impact: 3,
        insight: "'On pourrait', 'ensemble', 'nous' — les pronoms inclusifs sont un marqueur fort de progression vers un rendez-vous. Les convos avec pronoms inclusifs ont un taux d'escalation bien superieur.",
        bars: [
          { label: "Avec inclusifs → escalation", value: 55, color: "#22c55e" },
          { label: "Sans inclusifs → escalation", value: 20, color: "#ef4444" },
        ],
        recommendations: [
          { text: "Utilise 'on pourrait' ou 'ensemble' quand tu sens que la convo avance bien", type: "do" },
          { text: "Les pronoms inclusifs sont un accelerateur naturel vers le rendez-vous", type: "tip" },
        ],
      },
    ],
  },
  {
    id: "meta_patterns",
    title: "Meta-Patterns & Comportement",
    emoji: "🔮",
    hypotheses: [
      { id: "H62", title: "Formes de conversation (diamond, cliff, plateau)", verdict: "confirmed", app: "both", impact: 2,
        insight: "Chaque conversation a une 'forme' definie par l'evolution de la longueur des messages. Diamond (pic au milieu) = meilleure survie. Cliff (chute brutale) = pire survie. Plateau (stable) = correct.",
        bars: [
          { label: "Diamond", value: 60, color: "#22c55e" },
          { label: "Plateau", value: 40, color: "#3b82f6" },
          { label: "Erratique", value: 30, color: "#f59e0b" },
          { label: "Cliff", value: 15, color: "#ef4444" },
        ],
        recommendations: [
          { text: "Vise la forme 'diamond' : monte en investissement au milieu, puis propose le date", type: "do" },
          { text: "La forme 'cliff' (long au debut, sec a la fin) = signal de desinterest", type: "tip" },
        ],
      },
      { id: "H64", title: "Courbe d'apprentissage : tes openers s'ameliorent ?", verdict: "mixed", app: "both", impact: 2,
        insight: "En divisant tes conversations par quintiles chronologiques, on mesure si tes openers s'ameliorent avec le temps (score = longueur + question + originalite). La tendance varie selon les utilisateurs.",
        recommendations: [
          { text: "Analyse tes anciens openers — identifie ceux qui ont genere de longues convos", type: "do" },
          { text: "L'apprentissage n'est pas automatique — il faut conscientiser ce qui marche", type: "tip" },
        ],
      },
      { id: "H65", title: "Simultaneite : trop de convos en parallele tue la qualite", verdict: "confirmed", app: "both", impact: 2,
        insight: "Au-dela d'un seuil de conversations actives simultanees, la longueur des messages chute. Signe que l'attention se dilue. Le seuil de surcharge est propre a chaque utilisateur.",
        recommendations: [
          { text: "Identifie ton seuil personnel de convos paralleles — et ne le depasse pas", type: "do" },
          { text: "Ouvrir 8+ conversations et repondre a toutes superficiellement", type: "dont" },
        ],
      },
      { id: "H66", title: "Jour de la semaine d'initiation = impact", verdict: "mixed", app: "both", impact: 1,
        insight: "Le jour ou tu envoies ton premier message influence la survie de la conversation. Les convos initiees le weekend ont generalement un meilleur taux d'escalation.",
        recommendations: [
          { text: "Initie tes convos le weekend quand les gens sont plus disponibles", type: "tip" },
        ],
      },
      { id: "H67", title: "Hausse de GIFs = signal de desengagement", verdict: "debunked", app: "both", impact: 1,
        insight: "L'hypothese que l'augmentation du ratio de GIFs dans la 2eme moitie d'une conversation signale le desengagement n'est pas systematiquement confirmee. Le signal est trop faible.",
        recommendations: [
          { text: "Les GIFs ne sont pas un indicateur fiable — ne t'en preoccupe pas", type: "tip" },
        ],
      },
      { id: "H68", title: "Fenetre match-to-message : repondre vite apres le match", verdict: "confirmed", app: "both", impact: 2,
        insight: "Le delai entre le match et le premier message impacte la survie. Repondre en < 1h donne le meilleur taux de survie. Au-dela de 24h, le taux chute significativement.",
        bars: [
          { label: "< 1h", value: 65, color: "#22c55e" },
          { label: "1-6h", value: 50, color: "#3b82f6" },
          { label: "6-24h", value: 35, color: "#f59e0b" },
          { label: "> 24h", value: 20, color: "#ef4444" },
        ],
        recommendations: [
          { text: "Envoie ton premier message dans l'heure qui suit le match", type: "do" },
          { text: "Attendre plus de 24h avant d'envoyer un premier message", type: "dont" },
          { text: "Attention : H18 parle du delai optimal pour la qualite (J+1), H68 parle de la fenetre de survie", type: "tip" },
        ],
      },
      { id: "H69", title: "Messages ultra-courts (≤5 chars) en debut = poison", verdict: "confirmed", app: "both", impact: 2,
        insight: "Envoyer un message de 5 caracteres ou moins ('ok', 'oui', 'bien') aux positions 2-5 de la conversation tue le ghost rate. C'est lu comme du desinteret total.",
        stats: [
          { label: "Avec msg court", value: "+30% ghost", severity: "critical" },
          { label: "Messages normaux", value: "Base", severity: "good" },
        ],
        recommendations: [
          { text: "Meme un acquiescement doit etre enrichi : 'oui' → 'Oui carrément ! Et toi tu...'", type: "do" },
          { text: "Repondre 'ok', 'oui', 'bien' seul en debut de conversation", type: "dont" },
        ],
      },
    ],
  },
  // ── H71-H90: Swipe Pulse — Advanced Swipe Pattern Analysis ──
  {
    id: "swipe_algorithm",
    title: "Algorithme Fantome",
    emoji: "👻",
    hypotheses: [
      {
        id: "H71",
        title: "Swipe Velocity Decay",
        verdict: "confirmed",
        app: "both",
        impact: 2,
        insight: "Le temps inter-swipe augmente au cours d'une session — l'algo detecte cette fatigue et ajuste l'exposition.",
        stats: [
          { label: "Sessions avec decay", value: "65-80%", severity: "warning" },
          { label: "Ratio slow-down", value: "x1.5-3", severity: "critical" },
        ],
        recommendations: [
          { text: "Sessions courtes (15-20 min max) pour eviter le signal de fatigue", type: "do" },
          { text: "Continuer a swiper quand tu ralentis — l'algo le sait deja", type: "dont" },
        ],
      },
      {
        id: "H72",
        title: "Match Clustering Periodicity",
        verdict: "confirmed",
        app: "both",
        impact: 2,
        insight: "Les matchs arrivent en clusters periodiques — l'algo distribue les matchs en batch plutot qu'en continu.",
        stats: [
          { label: "Clusters typiques", value: "3-5", severity: "warning" },
          { label: "Gap moyen", value: "5-10 jours", severity: "warning" },
        ],
      },
      {
        id: "H73",
        title: "Like-to-Match Latency Drift",
        verdict: "mixed",
        app: "tinder",
        impact: 2,
        insight: "Le delai entre un like et un match potentiel evolue dans le temps — signe de decay/recovery du score interne.",
      },
      {
        id: "H74",
        title: "Post-Inactivity Surge",
        verdict: "confirmed",
        app: "both",
        impact: 3,
        insight: "Apres 3+ jours sans swipe, la reprise genere significativement plus de matchs — re-boost algorithmique confirme.",
        stats: [
          { label: "Boost typique", value: "x1.5-2.5", severity: "good" },
          { label: "Duree boost", value: "48h", severity: "good" },
        ],
        recommendations: [
          { text: "Planifier des pauses strategiques de 3-5 jours pour declencher le re-boost", type: "do" },
          { text: "Swiper tous les jours sans interruption — l'algo s'habitue", type: "dont" },
        ],
      },
    ],
  },
  {
    id: "swipe_psychology",
    title: "Psychologie du Swipe",
    emoji: "🧠",
    hypotheses: [
      {
        id: "H75",
        title: "Selectivity Oscillation",
        verdict: "confirmed",
        app: "tinder",
        impact: 2,
        insight: "Le like-rate oscille entre sessions — cette instabilite envoie des signaux contradictoires a l'algorithme.",
        recommendations: [
          { text: "Maintenir un like-rate stable (30-45%) entre les sessions", type: "do" },
          { text: "Alterner entre sessions 'like tout' et sessions tres selectives", type: "dont" },
        ],
      },
      {
        id: "H76",
        title: "Pass Streak Momentum",
        verdict: "mixed",
        app: "both",
        impact: 1,
        insight: "5+ passes consecutifs avant un like pourraient signaler a l'algo que ce like est plus 'qualifie'.",
      },
      {
        id: "H77",
        title: "Late-Night Desperation Signal",
        verdict: "confirmed",
        app: "both",
        impact: 2,
        insight: "Les swipes entre 1h et 5h du matin ont un match rate significativement plus bas — pool reduit + signal negatif.",
        stats: [
          { label: "Match rate nuit", value: "-30 a -60%", severity: "critical" },
        ],
        recommendations: [
          { text: "Concentrer les swipes entre 18h et 23h pour le meilleur pool", type: "do" },
          { text: "Swiper apres minuit — le pool se vide et l'algo enregistre la desperation", type: "dont" },
        ],
      },
      {
        id: "H78",
        title: "Superlike Efficiency Paradox",
        verdict: "mixed",
        app: "tinder",
        impact: 2,
        insight: "Le match rate des superlikes n'est pas toujours superieur aux likes normaux a volume egal — paradoxe de l'over-investment.",
      },
    ],
  },
  {
    id: "swipe_rhythms",
    title: "Rythmes Caches",
    emoji: "🕐",
    hypotheses: [
      {
        id: "H79",
        title: "Circadian Signature Stability",
        verdict: "confirmed",
        app: "both",
        impact: 2,
        insight: "Chaque utilisateur a une empreinte horaire stable. Devier de cette signature correle avec moins de matchs.",
        recommendations: [
          { text: "Identifier et respecter tes heures habituelles de swipe", type: "do" },
          { text: "Changer radicalement tes heures d'utilisation d'une semaine a l'autre", type: "dont" },
        ],
      },
      {
        id: "H80",
        title: "Weekly Micro-Cycles",
        verdict: "mixed",
        app: "both",
        impact: 1,
        insight: "Le volume suit un cycle hebdomadaire; les semaines avec une deviation >50% du volume moyen donnent moins de matchs.",
      },
      {
        id: "H81",
        title: "Month-Start Renewal Boost",
        verdict: "mixed",
        app: "both",
        impact: 1,
        insight: "Les jours 1-3 du mois montrent parfois un spike de match rate — possiblement lie aux renouvellements d'abonnements dans le pool.",
      },
      {
        id: "H82",
        title: "Drought-to-Binge Rebound",
        verdict: "confirmed",
        app: "tinder",
        impact: 3,
        insight: "Apres une secheresse de matchs, le reflexe de binge-swipe aggrave le score algorithmique au lieu de le compenser.",
        stats: [
          { label: "Penalite binge post-drought", value: "-30 a -70%", severity: "critical" },
        ],
        recommendations: [
          { text: "Apres une secheresse : REDUIRE le volume, pas l'augmenter", type: "do" },
          { text: "Compenser une mauvaise periode en swipant plus — l'algo punit", type: "dont" },
        ],
      },
    ],
  },
  {
    id: "swipe_conversion",
    title: "Conversion Secrete",
    emoji: "🎯",
    hypotheses: [
      {
        id: "H83",
        title: "First-Swipe-of-Session Bonus",
        verdict: "mixed",
        app: "both",
        impact: 1,
        insight: "Le premier like d'une session pourrait avoir plus de chances de matcher — l'algo montre les meilleurs profils en premier.",
      },
      {
        id: "H84",
        title: "Right-Swipe Momentum",
        verdict: "confirmed",
        app: "both",
        impact: 2,
        insight: "Le match rate d'une semaine predit celui de la suivante — les bons resultats s'auto-alimentent.",
        recommendations: [
          { text: "Capitaliser sur les bonnes semaines en maintenant le volume modere", type: "do" },
          { text: "Negliger l'app apres une bonne semaine — le momentum se perd", type: "dont" },
        ],
      },
      {
        id: "H85",
        title: "Match Quality by Selectivity",
        verdict: "confirmed",
        app: "both",
        impact: 3,
        insight: "Les matchs obtenus en phase selective menent plus souvent a des conversations que les matchs en mass-like.",
        stats: [
          { label: "Convo rate selectif", value: "x1.5-3 vs mass", severity: "good" },
        ],
        recommendations: [
          { text: "Viser la qualite : mieux vaut 10 likes choisis que 50 likes en rafale", type: "do" },
          { text: "Swiper a droite sur tout le monde pour 'augmenter ses chances'", type: "dont" },
        ],
      },
      {
        id: "H86",
        title: "Diminishing Returns Curve",
        verdict: "confirmed",
        app: "tinder",
        impact: 3,
        insight: "Apres N likes/jour, chaque like supplementaire donne exponentiellement moins de resultats.",
        stats: [
          { label: "Sweet spot", value: "11-30 likes/j", severity: "good" },
          { label: "Au-dela de 60/j", value: "-40 a -80%", severity: "critical" },
        ],
        recommendations: [
          { text: "Respecter le sweet spot de 11-30 likes/jour", type: "do" },
          { text: "Depasser 60 likes/jour — rendements decroissants exponentiels", type: "dont" },
        ],
      },
    ],
  },
  {
    id: "swipe_meta",
    title: "Meta-Strategie Swipe",
    emoji: "🧬",
    hypotheses: [
      {
        id: "H87",
        title: "Active vs Passive Days Signature",
        verdict: "confirmed",
        app: "both",
        impact: 2,
        insight: "Les jours productifs (avec match) ont une signature de swipe distincte : moins de volume, plus de selectivite.",
      },
      {
        id: "H88",
        title: "App Open Decisiveness",
        verdict: "mixed",
        app: "tinder",
        impact: 1,
        insight: "Beaucoup d'ouvertures de l'app avec peu de swipes = 'browsing' — possiblement penalise par l'algo.",
      },
      {
        id: "H89",
        title: "Subscription Front-Loading",
        verdict: "confirmed",
        app: "both",
        impact: 2,
        insight: "Le match rate des 7 premiers jours d'abonnement est superieur aux 7 derniers — front-loading par l'app.",
        stats: [
          { label: "Boost 1ere semaine", value: "x1.5-2.5", severity: "good" },
          { label: "Derniere semaine", value: "Baseline", severity: "warning" },
        ],
        recommendations: [
          { text: "Maximiser l'activite dans les 7 premiers jours d'un abonnement", type: "do" },
          { text: "Se reposer sur l'abo apres la premiere semaine — le boost est fini", type: "tip" },
        ],
      },
      {
        id: "H90",
        title: "Swipe Personality Archetype",
        verdict: "confirmed",
        app: "both",
        impact: 2,
        insight: "Synthese de H71-H89 : chaque utilisateur a un archetype de swipe parmi 6 profils (Stratege, Boulimique, Fantome, Nocturne, Methodique, Rebelle).",
        recommendations: [
          { text: "Identifier ton archetype et ajuster ta strategie en consequence", type: "do" },
          { text: "Ignorer tes patterns — ils definissent comment l'algo te traite", type: "dont" },
        ],
      },
    ],
  },
];

// === SECTION 10: ACTION PLAN ===

export interface CostlyMistake {
  title: string;
  cost: string;
  detail: string;
  ref: string;
  severity: Severity;
}

export const COSTLY_MISTAKES: CostlyMistake[] = [
  {
    title: "Tinder Platinum : ~152 EUR pour rien",
    cost: "~152 EUR perdus",
    detail: "5 mois payes sur 8, dont 2 a moitie prix (offres retention). Match rate paid 0.75% vs free 0.77% = ZERO difference. Pire : chaque annulation a declenche un shadowban.",
    ref: "H11",
    severity: "critical",
  },
  {
    title: "3 annulations = 3 shadowbans (+ 1 661 likes perdus)",
    cost: "1 661 likes gaspilles",
    detail: "Chaque annulation d'abo a declenche un shadowban : 33j apres annulation #1, 10j apres #2, 25j apres expiration finale. Tinder punit les resilies.",
    ref: "H41",
    severity: "critical",
  },
  {
    title: "Autres shadowbans (bursts d'activite)",
    cost: "775 likes gaspilles",
    detail: "En plus des shadowbans post-annulation, les bursts d'activite ont cause 4 droughts supplementaires. Total = 2 436 likes dans le vide (20%).",
    ref: "H10",
    severity: "critical",
  },
  {
    title: "Burst du 31 mai : 787 likes en 1 jour",
    cost: "5 jours de crash ELO",
    detail: "Like ratio monte a 69.8% ce jour-la → signal 'desperate' a l'algo → match rate tombe a 0% du 4 au 8 juin.",
    ref: "H14",
    severity: "critical",
  },
  {
    title: "0 commentaires sur 2 325 likes Hinge",
    cost: "~50+ matchs perdus",
    detail: "Pas UN SEUL commentaire sur 2 325 likes envoyes. Commenter = 2-3x le match rate selon Hinge. Potentiel gaspille enorme.",
    ref: "Audit Hinge",
    severity: "critical",
  },
  {
    title: "57% des matchs Tinder jamais contactes",
    cost: "52 conversations perdues",
    detail: "Sur 91 matchs, seulement 39 ont genere une conversation. 52 matchs n'ont JAMAIS eu d'echange — plus de la moitie.",
    ref: "Audit Tinder",
    severity: "warning",
  },
];

export const TARGET_METRICS: { metric: string; before: string; target: string; why: string }[] = [
  { metric: "Like ratio", before: "45%", target: "30-45%", why: "Au-dessus de 50%, conversion ÷3 (1.09% → 0.37%). H4" },
  { metric: "Likes/jour", before: "40", target: "11-30", why: "Sweet spot convo : 15 msgs moy, 44% ghost. Burst 60+ = 55% ghost. H48" },
  { metric: "Commentaires Hinge", before: "0%", target: "100%", why: "0 commentaires sur 2325 likes. Commenter = 2-3x match rate." },
  { metric: "Matchs contactes", before: "43%", target: "90%+", why: "52 matchs ignores = 52 conversations perdues." },
  { metric: "Detection shadowban", before: "Jamais", target: "Alerte a J+5", why: "7 shadowbans = 2124 likes gaspilles. Arreter de swiper si 0 match en 5j. H10" },
];

export interface Commandment {
  rule: string;
  data: string;
  ref: string;
}

export const TEN_COMMANDMENTS: Commandment[] = [
  {
    rule: "Ecris en FR + QUESTION + PERSO dans chaque opener",
    data: "78.8 msgs moy, 22% ghost vs 67% pour un 'hey salut'",
    ref: "H43",
  },
  {
    rule: "Parle du whippet des le message #2",
    data: "+449% longueur Tinder (29.4 vs 5.4), +735% Hinge (119 vs 14 msgs)",
    ref: "H19",
  },
  {
    rule: "Pose au moins 3 questions dans chaque convo",
    data: "0 questions = 100% ghost. 3-5 questions = 0% ghost",
    ref: "H27",
  },
  {
    rule: "Attends 12-24h avant le 1er message apres un match",
    data: "J+1 = 20.5 msgs moy vs J0 = 5.9 msgs (x3.5)",
    ref: "H18",
  },
  {
    rule: "Envoie tes openers le MATIN, pas le soir",
    data: "Matin 6-11h = 14.2 msgs, 29% ghost vs Soir = 5.6 msgs, 67% ghost",
    ref: "H22",
  },
  {
    rule: "Like ratio ≤ 45% — La falaise est a 50%",
    data: "30-50% = 1.09% conv. Au-dessus de 50% = 0.37% — conversion divisee par 3",
    ref: "H4",
  },
  {
    rule: "Max 30 likes/jour — Pas de burst, jamais",
    data: "Burst 787 likes = crash 5 jours. 7 shadowbans = 2124 likes perdus",
    ref: "H14/H10",
  },
  {
    rule: "Commente CHAQUE like Hinge — c'est la feature #1",
    data: "0% commentaires actuellement sur 2325 likes. Match rate potentiel x2-3",
    ref: "Audit",
  },
  {
    rule: "0 match en 5 jours ? Arrete tout — c'est un shadowban",
    data: "Continuer a swiper pendant un shadowban = gaspiller ses likes (20% du total perdu)",
    ref: "H10/H16",
  },
  {
    rule: "Relance sans hesiter — le double-text ne tue pas la convo",
    data: "Double-text survit 89%. Revival apres 1 semaine+ = 71% Tinder, 89% Hinge",
    ref: "H20/H21",
  },
];

// === REINFORCEMENT CLUSTERS ===

export const REINFORCEMENT_CLUSTERS: ReinforcementCluster[] = [
  {
    id: "selectivity",
    name: "Less is More",
    emoji: "🎯",
    tagline: "Selectivite",
    description: "7 hypotheses convergent : etre selectif ameliore le match rate, la qualite des conversations, et le score algorithmique.",
    hypothesisIds: ["H4", "H15", "H48", "H75", "H85", "H86", "H87"],
    insight: "Le like-rate optimal (30-40%) n'est pas un hasard — il maximise simultanement l'ELO, la qualite des matchs, et la longevite des conversations.",
  },
  {
    id: "pause",
    name: "La Pause Strategique",
    emoji: "⏸️",
    tagline: "Inactivite calculee",
    description: "5 hypotheses montrent que les pauses sont un levier algorithmique puissant, pas un aveu d'echec.",
    hypothesisIds: ["H9", "H10", "H14", "H74", "H82"],
    insight: "3+ jours d'inactivite declenchent un re-boost algorithmique. Mais attention : la reprise doit etre mesuree (H82), pas un binge-swipe.",
  },
  {
    id: "antighost",
    name: "La Question Sauve Tout",
    emoji: "❓",
    tagline: "Anti-Ghost",
    description: "5 hypotheses convergent : les questions ouvertes sont le meilleur antidote au ghosting a chaque etape.",
    hypothesisIds: ["H27", "H35", "H43", "H56", "H61"],
    insight: "Question dans l'opener = -42% ghost. Question apres msg #5 = conversation 3x plus longue. C'est le pattern le plus robuste de toute l'analyse.",
  },
  {
    id: "premium",
    name: "Le Piege Premium",
    emoji: "💸",
    tagline: "Abonnement",
    description: "4 hypotheses revelent que les abonnements ont un ROI negatif mesurable dans tes donnees.",
    hypothesisIds: ["H11", "H12", "H41", "H89"],
    insight: "Match rate paid 0.75% vs free 0.77%. Front-loading des matchs les 7 premiers jours puis chute. Tes meilleurs mois etaient GRATUITS.",
  },
  {
    id: "antiburst",
    name: "Le Volume Tue",
    emoji: "📉",
    tagline: "Anti-Burst",
    description: "5 hypotheses montrent que le volume excessif de swipes est auto-destructeur.",
    hypothesisIds: ["H14", "H16", "H48", "H82", "H86"],
    insight: "Apres ~50 likes/jour, chaque like supplementaire donne exponentiellement moins. Le binge-swipe post-secheresse aggrave le score algo.",
  },
  {
    id: "circadian",
    name: "Le Rythme Previsible",
    emoji: "🕐",
    tagline: "Circadien",
    description: "4 hypotheses revelent que la regularite temporelle est un signal fort pour l'algorithme.",
    hypothesisIds: ["H75", "H79", "H80", "H84"],
    insight: "Les utilisateurs avec une signature horaire stable matchent 20-40% mieux. Le momentum d'une semaine predit celui de la suivante.",
  },
  {
    id: "symmetry",
    name: "La Symetrie Conversationnelle",
    emoji: "⚖️",
    tagline: "Miroir",
    description: "4 hypotheses montrent que les conversations equilibrees durent 3x plus longtemps.",
    hypothesisIds: ["H55", "H56", "H57", "H70"],
    insight: "Mirroring de longueur de message + question reciproque + temps de reponse symetrique = la trinite anti-ghost.",
  },
];

export const CONTRADICTION_PAIRS: ContradictionPair[] = [
  {
    id: "timing_msg",
    pair: ["H18", "H68"],
    title: "Timing du 1er message",
    description: "H18 dit que repondre vite (<1h) donne 21.9x plus de messages. H68 dit que temporiser 2-4h optimise l'engagement.",
    resolution: "Pas de contradiction : H18 = donnees Hinge (pool selectif), H68 = analyse conversationnelle globale. Sur Hinge, reponds vite. Sur Tinder, temporiser marche.",
  },
  {
    id: "activity_volume",
    pair: ["H3", "H86"],
    title: "Activite vs Rendements decroissants",
    description: "H3 identifie des jours d'hyper-activite correles a plus de matchs. H86 montre que chaque like au-dela de ~50/jour rapporte moins.",
    resolution: "L'optimum est une activite REGULIERE et MODEREE — pas l'inactivite ni le spam. Les jours productifs (H3/H87) ont un profil specifique : selectifs mais presents.",
  },
  {
    id: "nocturnal",
    pair: ["H77", "H30"],
    title: "Le paradoxe nocturne",
    description: "H77 dit que swiper entre 1-5h AM donne un match rate plus bas. Mais H30 montre que les messages nocturnes ont un taux de reponse decent.",
    resolution: "Swiper ≠ converser. Le pool nocturne de swipes est degrade (bots, utilisateurs non-serieux), mais les conversations nocturnes profitent de l'intimite du moment.",
  },
  {
    id: "inactivity",
    pair: ["H74", "H82"],
    title: "Pause benefique vs Binge destructeur",
    description: "H74 dit que 3+ jours d'inactivite = re-boost. H82 dit que la reprise apres secheresse aggrave le score si c'est un binge.",
    resolution: "La pause est benefique, la REPRISE doit etre mesuree. Reprends avec 20-30 likes selectifs, pas 200 likes frenetiques.",
  },
  {
    id: "newbie_premium",
    pair: ["H5", "H89"],
    title: "Boost debutant vs Front-loading abo",
    description: "H5 dit que les nouveaux comptes ont un boost naturel. H89 dit que les 7 premiers jours d'abo donnent plus de matchs.",
    resolution: "Les deux sont du front-loading algorithmique — payer un abo sur un nouveau compte est un gaspillage car le boost naturel est deja actif.",
  },
  {
    id: "pass_streak",
    pair: ["H76", "H4"],
    title: "Pass streak vs Like rate optimal",
    description: "H76 dit que 5+ passes avant un like ameliorent le match rate. H4 dit qu'un like rate de 30-40% est optimal.",
    resolution: "H76 est un mecanisme micro (un like apres reflection = signal fort), H4 est macro (proportion globale). Les deux convergent : etre selectif au niveau du geste ET au niveau statistique.",
  },
  {
    id: "msg_length",
    pair: ["H24", "H55"],
    title: "Messages courts vs Mirroring",
    description: "H24 dit que les messages tendent a raccourcir avec le temps. H55 dit que le mirroring de longueur est un signal de compatibilite.",
    resolution: "Le raccourcissement est naturel mais le DIFFERENTIEL compte. Quand les deux raccourcissent ensemble = bon signe. Quand un seul raccourcit = desengagement.",
  },
];

// === SECTION NARRATIVES ===

export const SECTION_NARRATIVES: Record<string, string> = {
  hero: "552 jours de dating decryptes. 14 468 likes envoyes. Chaque swipe, chaque message, chaque match analyse pour extraire les patterns que tu ne voyais pas.",
  profile: "Tu as passe 300 jours sur Tinder et 252 sur Hinge. L'une de ces apps te rapporte 8x plus de resultats par minute investie. L'autre te coute du temps — et ~152 EUR.",
  conversations: "73 conversations analysees message par message. Ton humour est ton arme (9/10), mais tu proposes le date trop tard — et le ghost a une cause unique.",
  opener: "La difference entre un 'hey salut' et un opener parfait ? 78.8 messages de conversation au lieu de 2.2. Voici la formule exacte, prouvee par tes donnees.",
  timing: "Le timing n'est pas un detail — c'est le multiplicateur cache de toutes tes conversations. Le matin vs le soir = 2.5x. Repondre < 1h vs 24h+ = 21.9x sur Hinge. Vendredi vs Jeudi sur Tinder = 2x. Chaque choix de timing a un cout mesure dans tes donnees.",
  algorithm: "L'algorithme n'est pas ton ennemi — mais tu lui as envoye tous les mauvais signaux. 7 shadowbans, 2 124 likes envoyes dans le vide, un score ELO en dents de scie.",
  premium: "~240 EUR depenses en abonnements et boosts. 5 mois payes sur 8, 3 annulations, 3 shadowbans en retour. Resultat mesure : match rate paid 0.75% vs free 0.77%. Tes meilleurs mois etaient GRATUITS.",
  photo: "La photo decide de 80% des swipes en moins de 2 secondes. Et 40% de ton profil Tinder n'avait pas de visage visible.",
  hypotheses: "90 hypotheses formulees, testees contre tes donnees reelles. 55 confirmees, 13 refutees, 22 mixtes — dont 20 hypotheses swipe avancees (H71-H90). La science du dating, pas l'intuition.",
  action: "5 erreurs quantifiees. 10 regles ancrees dans tes donnees. Chaque levier a un impact mesure.",
};
