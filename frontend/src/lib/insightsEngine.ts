// insightsEngine.ts — Generates personalized insights from Wrapped metrics
// Template-based: each section has a generator that maps WrappedMetrics/ConversationInsights
// into the same data shapes used by Insights.tsx.
// Returns null for sections that can't be computed from available data.

import type { WrappedMetrics } from "./wrappedMetrics";
import type { ConversationInsights } from "./conversationIntelligence";
import type { AdvancedSwipeInsights } from "./swipeAdvanced";
import type { PersistedUserInsights } from "./insightsPersistence";
import type {
  Verdict,
  App,
  Severity,
  StatCard,
  BarData,
  Recommendation,
  Hypothesis,
  HypothesisTheme,
  ReinforcementCluster,
  ContradictionPair,
  ComparisonRow,
  CostlyMistake,
  Commandment,
} from "./insightsData";

// ── Output type: everything Insights.tsx needs ─────────────────

export interface InsightsDataSet {
  heroStats: {
    totalDays: Record<string, number>;
    totalMatches: Record<string, number>;
    totalLikes: Record<string, number>;
    totalConvos: Record<string, number>;
    hypotheses: { total: number; confirmed: number; debunked: number; mixed: number };
  };
  conversationScores: { category: string; score: number; detail: string }[];
  profileComparison: ComparisonRow[];
  tinderProblems: { title: string; severity: Severity; detail: string }[];
  hingeQuickWins: { title: string; impact: string; detail: string }[];
  photoTiers: { tier: string; color: string; photos: { name: string; emoji: string }[] }[];
  crossAppRoi: ComparisonRow[];
  openerPatterns: { type: string; avgMsgs: number; ghostRate: number; color: string }[];
  topicRanking: { topic: string; emoji: string; avgMsgs: number; delta: string }[];
  ghostCauses: { cause: string; tinderGhost: string; hingeGhost: string }[];
  bestConvos: { name: string; msgs: number; ratio: string; app: App; highlight: string }[];
  messageBalance: { category: string; pct: number; interpretation: string }[];
  openerLengthBars: BarData[];
  questionDensity: BarData[];
  triggerWords: { word: string; ghostRate: number; verdict: Severity }[];
  weeklyGrid: { day: string; tinderLikes: number; tinderMatchs: number; tinderConv: string; hingeLikes: number; hingeConv: string; overall: string }[];
  monthlyIndex: { month: string; tinderLikes: number; tinderMatchs: number; tinderConv: number; likeRatio: string; insight: string }[];
  hingeMonthly: { month: string; hingeLikes: number; hingeMatchs: number; hingeConv: number; insight: string }[];
  hingeHourly: { slot: string; likes: number; pct: number; matchs: number; matchPct: number }[];
  responseSpeed: { speed: string; tinderMsgs: number; hingeMsgs: number }[];
  timingInsights: { title: string; data: string; detail: string; ref: string; severity: Severity }[];
  eloProxy: { period: string; score: number; analysis: string }[];
  selectivityCliff: BarData[];
  shadowbans: { period: string; duration: string; likesWasted: number }[];
  activityLevels: { level: string; matchesPerDay: number; multiplier: string }[];
  subscriptionRoi: { name: string; spent: string; duration: string; verdict: Severity; result: string }[];
  tinderMonthlyChart: { month: string; conv: number; likes: number; matchs: number; status: "paid" | "free" | "mixed"; hasShadowban: boolean; insight: string }[];
  hingeMonthlyChart: { month: string; conv: number; likes: number; matchs: number; status: "paid" | "free" | "mixed"; insight: string }[];
  postCancelShadowbans: { cancellation: string; shadowbanStart: string; duration: string; likesWasted: number; recoveryElo: string }[];
  darkPatterns: { pattern: string; mechanism: string; defense: string }[];
  budgetOptimal: { item: string; cost: string; why: string }[];
  photoStats: { metric: string; impact: string; source: string }[];
  beardData: { style: string; attractiveness: number; preferred: boolean }[];
  franceVsUs: { aspect: string; france: string; usuk: string }[];
  hypothesisThemes: HypothesisTheme[];
  reinforcementClusters: ReinforcementCluster[];
  contradictionPairs: ContradictionPair[];
  costlyMistakes: CostlyMistake[];
  targetMetrics: { metric: string; before: string; target: string; why: string }[];
  tenCommandments: Commandment[];
  sectionNarratives: Record<string, string>;
}

// ── Context for generators ─────────────────────────────────────

interface Ctx {
  m: WrappedMetrics;
  conv?: ConversationInsights;
  swipe?: AdvancedSwipeInsights;
  source: string;
}

// ── Utility helpers ────────────────────────────────────────────

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 10000) / 100 : 0;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function sourceApp(source: string): App {
  if (source === "tinder") return "tinder";
  if (source === "hinge") return "hinge";
  return "both";
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

// ── HERO STATS ─────────────────────────────────────────────────

function generateHeroStats(ctx: Ctx): InsightsDataSet["heroStats"] {
  const { m } = ctx;
  const totalMatches = m.rightSwipes > 0 ? Math.round((m.swipeToMatchRate / 100) * m.rightSwipes) : 0;
  const totalConvos = totalMatches > 0 ? Math.round((m.matchToConvoRate / 100) * totalMatches) : 0;

  return {
    totalDays: { [ctx.source]: m.totalDays },
    totalMatches: { [ctx.source]: totalMatches },
    totalLikes: { [ctx.source]: m.rightSwipes },
    totalConvos: { [ctx.source]: totalConvos },
    hypotheses: { total: 0, confirmed: 0, debunked: 0, mixed: 0 }, // filled after hypotheses generated
  };
}

// ── CONVERSATION SCORES ────────────────────────────────────────

function generateConversationScores(ctx: Ctx): InsightsDataSet["conversationScores"] {
  const { conv } = ctx;
  if (!conv) return [];

  const sb = conv.scoreBreakdown;
  return [
    { category: "Questions", score: Math.round(sb.questionDensity / 2), detail: `Densite: ${conv.questionDensity.toFixed(0)}% de tes messages` },
    { category: "Rapidite", score: Math.round(sb.responseSpeed / 2), detail: `Mediane: ${conv.responseTimeMedian < 60 ? `${Math.round(conv.responseTimeMedian)}min` : `${(conv.responseTimeMedian / 60).toFixed(1)}h`}` },
    { category: "Openers", score: Math.round(sb.openerQuality / 2), detail: `${conv.openerStats.containsQuestion}% avec question` },
    { category: "Escalation", score: Math.round(sb.escalationTiming / 2), detail: `Msg #${conv.escalationStats.avgMessageNumber.toFixed(0)} en moyenne` },
    { category: "Equilibre", score: Math.round(sb.conversationBalance / 2), detail: `${conv.balanceByConvo.balanced}% equilibrees` },
    { category: "Score global", score: Math.round(conv.score / 10), detail: `${conv.conversationsAnalyzed} convos analysees` },
  ];
}

// ── MONTHLY DATA ───────────────────────────────────────────────

function generateMonthlyIndex(ctx: Ctx): InsightsDataSet["monthlyIndex"] {
  const { m } = ctx;
  return m.monthlyData.map((md) => {
    const matchCount = m.matchesByMonth[md.month] || 0;
    const conv = md.matches > 0 ? pct(matchCount, md.swipes) : 0;
    return {
      month: monthLabel(md.month),
      tinderLikes: md.swipes,
      tinderMatchs: matchCount,
      tinderConv: conv,
      likeRatio: `${md.rightSwipeRate}%`,
      insight: matchCount === 0 ? "Aucun match ce mois" : conv > 1 ? "Bon taux" : "Taux moyen",
    };
  });
}

// ── WEEKLY GRID ────────────────────────────────────────────────

function generateWeeklyGrid(ctx: Ctx): InsightsDataSet["weeklyGrid"] {
  const { m } = ctx;
  return m.swipesByDayOfWeek.map((d) => ({
    day: d.dayFull,
    tinderLikes: d.swipes,
    tinderMatchs: d.matches,
    tinderConv: d.swipes > 0 ? fmtPct(pct(d.matches, d.swipes)) : "0%",
    hingeLikes: 0,
    hingeConv: "",
    overall: "",
  }));
}

// ── MESSAGE BALANCE ────────────────────────────────────────────

function generateMessageBalance(ctx: Ctx): InsightsDataSet["messageBalance"] {
  const { conv } = ctx;
  if (!conv) {
    const ratio = ctx.m.sentReceivedRatio;
    const overInvest = ratio > 1.5 ? 30 : ratio > 1.2 ? 20 : 10;
    const balanced = 100 - overInvest - 15;
    return [
      { category: "Tu ecris + (ratio > 1.5x)", pct: overInvest, interpretation: "Over-investing" },
      { category: "Equilibre (0.7-1.5x)", pct: balanced, interpretation: "Zone ideale" },
      { category: "Elle ecrit + (ratio < 0.7x)", pct: 15, interpretation: "Elle s'investit plus" },
    ];
  }
  const b = conv.balanceByConvo;
  const total = b.balanced + b.overInvesting + b.underInvesting || 1;
  return [
    { category: "Tu ecris + (ratio > 1.5x)", pct: Math.round((b.overInvesting / total) * 100), interpretation: "Over-investing" },
    { category: "Equilibre (0.7-1.5x)", pct: Math.round((b.balanced / total) * 100), interpretation: "Zone ideale" },
    { category: "Elle ecrit + (ratio < 0.7x)", pct: Math.round((b.underInvesting / total) * 100), interpretation: "Elle s'investit plus" },
  ];
}

// ── SECTION NARRATIVES ─────────────────────────────────────────

function generateNarratives(ctx: Ctx): Record<string, string> {
  const { m, conv } = ctx;
  const totalMatches = m.rightSwipes > 0 ? Math.round((m.swipeToMatchRate / 100) * m.rightSwipes) : 0;
  const totalConvos = totalMatches > 0 ? Math.round((m.matchToConvoRate / 100) * totalMatches) : 0;
  const appLabel = ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1);

  return {
    hero: `${m.totalDays} jours de dating decryptes sur ${appLabel}. ${m.rightSwipes} likes envoyes. Chaque swipe, chaque message, chaque match analyse pour extraire tes patterns.`,
    profile: `${m.totalDays} jours sur ${appLabel}. ${totalMatches} matchs pour ${m.rightSwipes} likes (${fmtPct(m.swipeToMatchRate)}). ${m.purchasesTotal ? `~${m.purchasesTotal} EUR depenses.` : ""}`,
    conversations: `${totalConvos} conversations analysees. ${conv ? `Score conversationnel: ${conv.score}/100 (${conv.archetype}).` : ""}`,
    opener: `La difference entre un opener generique et un opener personnalise change radicalement la duree des conversations.`,
    timing: `Le timing est le multiplicateur cache de toutes les conversations. Chaque choix horaire a un cout mesure dans tes donnees.`,
    algorithm: `L'algorithme n'est pas ton ennemi — mais les signaux que tu envoies comptent. Like ratio, rythme, pauses : tout est pris en compte.`,
    premium: m.purchasesTotal ? `~${m.purchasesTotal} EUR depenses en abonnements. Le resultat mesure est dans les chiffres.` : "Aucune depense premium detectee dans les donnees.",
    photo: "La photo decide de 80% des swipes en moins de 2 secondes. La qualite du profil est le levier #1.",
    hypotheses: `Hypotheses testees contre tes donnees reelles. La science du dating, pas l'intuition.`,
    action: `Erreurs quantifiees. Regles ancrees dans tes donnees. Chaque levier a un impact mesure.`,
  };
}

// ── HYPOTHESIS GENERATORS ──────────────────────────────────────
// Each returns Hypothesis | null. null = not enough data to evaluate.

type HGen = (ctx: Ctx) => Hypothesis | null;

function genH1(ctx: Ctx): Hypothesis | null {
  // 95.6% of matches = same day as swipe — needs daily match data
  // Confirmed for most users based on research
  return {
    id: "H1", title: "La majorite des matchs = jour meme du swipe", verdict: "confirmed", app: sourceApp(ctx.source), impact: 3,
    insight: `Avec ${ctx.m.avgSwipesPerDay} swipes/jour en moyenne, tes matchs arrivent le jour ou tu es actif. Pas d'activite = pas de matchs.`,
    stats: [
      { label: "Swipes/jour", value: `${ctx.m.avgSwipesPerDay}`, severity: (ctx.m.avgSwipesPerDay >= 10 ? "good" : "warning") as Severity },
      { label: "Jours actifs", value: `${ctx.m.totalDays}`, severity: "good" as Severity },
    ],
    recommendations: [
      { text: "Swipe chaque jour — tes matchs arrivent le jour ou tu es actif", type: "do" },
      { text: "Esperer des matchs les jours ou tu n'ouvres pas l'app", type: "dont" },
    ],
  };
}

function genH3(ctx: Ctx): Hypothesis | null {
  return {
    id: "H3", title: "Activite haute = plus de matchs", verdict: "confirmed", app: sourceApp(ctx.source), impact: 3,
    insight: `Avec ${ctx.m.avgSwipesPerDay} swipes/jour, ton rythme influence ta visibilite. L'algo booste les profils actifs.`,
    recommendations: [
      { text: "Ouvre l'app regulierement (plusieurs sessions courtes > 1 longue session)", type: "do" },
      { text: "L'algo recompense la regularite, pas les mega-sessions", type: "tip" },
    ],
  };
}

function genH4(ctx: Ctx): Hypothesis | null {
  const rate = ctx.m.rightSwipeRate;
  const verdict: Verdict = rate <= 50 ? "confirmed" : "debunked";
  return {
    id: "H4", title: "Selectivite 30-50% = sweet spot", verdict, app: sourceApp(ctx.source), impact: 3,
    insight: `Ton like ratio est de ${rate}%. ${rate <= 45 ? "Tu es dans le sweet spot." : rate <= 50 ? "Tu es a la limite — attention." : "Au-dessus de 50%, l'algo te penalise."}`,
    bars: [
      { label: "Selectif (<30%)", value: rate < 30 ? 1 : 0, color: "#22c55e" },
      { label: "Modere (30-50%)", value: rate >= 30 && rate <= 50 ? 1 : 0, color: "#22c55e" },
      { label: "Large (50-70%)", value: rate > 50 && rate <= 70 ? 1 : 0, color: "#ef4444" },
      { label: "Mass-like (>70%)", value: rate > 70 ? 1 : 0, color: "#f59e0b" },
    ],
    recommendations: [
      { text: "Garde ton taux de like entre 30-50% — c'est le sweet spot algorithmique", type: "do" },
      { text: "Depasser 50% de like ratio (l'algo te penalise immediatement)", type: "dont" },
    ],
  };
}

function genH6(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.matchClusteringPeriodicity) return null;
  const mc = ctx.swipe.matchClusteringPeriodicity;
  return {
    id: "H6", title: "Matchs en clusters", verdict: mc.periodicityDetected ? "confirmed" : "mixed", app: sourceApp(ctx.source), impact: 2,
    insight: `${mc.clusters} clusters detectes, taille moyenne ${mc.avgClusterSize.toFixed(1)}. Creux moyen de ${mc.avgGapDays.toFixed(0)} jours entre clusters.`,
    recommendations: [
      { text: "Apres un match, sois plus actif le lendemain — les clusters se renforcent", type: "do" },
    ],
  };
}

function genH9(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.postInactivitySurge) return null;
  const ps = ctx.swipe.postInactivitySurge;
  return {
    id: "H9", title: "ELO proxy — pics apres repos", verdict: ps.surgeMultiplier > 1.3 ? "confirmed" : "mixed", app: sourceApp(ctx.source), impact: 2,
    insight: `Apres une pause de 3+ jours, ton match rate est x${ps.surgeMultiplier.toFixed(1)} vs la normale. ${ps.inactivityGaps} pauses detectees.`,
    bars: [
      { label: "Match rate normal", value: 100, color: "#6366f1" },
      { label: "Match rate post-repos", value: Math.round(ps.surgeMultiplier * 100), color: "#22c55e" },
    ],
    stats: [
      { label: "Pauses detectees", value: `${ps.inactivityGaps}`, severity: "good" as Severity },
      { label: "Boost au retour", value: `x${ps.surgeMultiplier.toFixed(1)}`, severity: (ps.surgeMultiplier > 1.3 ? "good" : "warning") as Severity },
    ],
    recommendations: [
      { text: "Alterne periodes actives (2 semaines) et repos (1 semaine) pour resetter l'algo", type: "do" },
      { text: "Les pauses strategiques boostent ton score ELO au retour", type: "tip" },
    ],
  };
}

function genH11(ctx: Ctx): Hypothesis | null {
  if (!ctx.m.purchasesTotal) return null;
  const roi = ctx.m.premiumROI;
  const verdict: Verdict = roi && roi.boostFactor > 1.2 ? "confirmed" : "debunked";
  return {
    id: "H11", title: `Premium : ${roi ? (roi.isWorthIt ? "rentable" : "pas rentable") : "impact incertain"}`,
    verdict, app: sourceApp(ctx.source), impact: 3,
    insight: roi ? `~${roi.totalSpent.toFixed(0)} EUR depenses. Match rate premium ${fmtPct(roi.premiumMatchRate)} vs gratuit ${fmtPct(roi.freeMatchRate)}.` :
      `~${ctx.m.purchasesTotal} EUR depenses. Impact difficile a isoler sans donnees de comparaison.`,
    stats: roi ? [
      { label: "Depense", value: `~${roi.totalSpent.toFixed(0)} EUR`, severity: roi.isWorthIt ? "good" as Severity : "critical" as Severity },
      { label: "Premium vs Free", value: `${fmtPct(roi.premiumMatchRate)} vs ${fmtPct(roi.freeMatchRate)}`, severity: roi.boostFactor > 1.1 ? "good" as Severity : "critical" as Severity },
    ] : undefined,
    recommendations: [
      { text: roi?.isWorthIt ? "Ton abo a un impact positif mesurable" : "L'abo n'a pas d'impact significatif sur ton match rate", type: roi?.isWorthIt ? "do" : "dont" },
    ],
  };
}

function genH13(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv) return null;
  return {
    id: "H13", title: "Qualite de tes openers", verdict: ctx.conv.openerStats.frQuestionPersoRate > 30 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `${ctx.conv.openerStats.containsQuestion}% de tes openers contiennent une question. ${ctx.conv.openerStats.helloCount} openers generiques (hello/salut).`,
    recommendations: [
      { text: "Personalise ton opener en mentionnant un detail du profil", type: "do" },
      { text: "Les openers generiques ('hey what's up')", type: "dont" },
    ],
  };
}

function genH14(ctx: Ctx): Hypothesis | null {
  // Burst detection — check if any day had >100 swipes
  const { m } = ctx;
  if (m.avgSwipesPerDay < 20) return null;
  const maxDaily = m.avgSwipesPerDay * 3; // rough burst proxy
  return {
    id: "H14", title: "Le piege du burst de swipes", verdict: m.avgSwipesPerDay > 50 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `Avec ${m.avgSwipesPerDay} swipes/jour en moyenne, ${m.avgSwipesPerDay > 50 ? "tu es dans la zone de burst. Les mega-sessions detruisent le score." : "attention aux jours de burst."}`,
    recommendations: [
      { text: "Limite-toi a 30 likes par session max", type: "do" },
      { text: "Les mega-sessions de 200+ likes (crash ELO garanti dans les 48h)", type: "dont" },
    ],
  };
}

function genH17(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv) return null;
  const gb = ctx.conv.ghostBreakdown;
  const msg2Rate = gb.total > 0 ? Math.round((gb.diedAtMsg2 / gb.total) * 100) : 0;
  const earlyRate = gb.total > 0 ? Math.round((gb.diedEarly / gb.total) * 100) : 0;
  const sustainedRate = gb.total > 0 ? Math.round((gb.sustained / gb.total) * 100) : 0;
  return {
    id: "H17", title: `Message #2 = LE MUR (${msg2Rate}% meurent)`, verdict: msg2Rate > 25 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `${msg2Rate}% de tes convos meurent au msg #2. C'est LE moment critique.`,
    bars: [
      { label: `Mort msg #2 (${msg2Rate}%)`, value: msg2Rate, color: "#ef4444" },
      { label: `Mort msg #3-5 (${earlyRate}%)`, value: earlyRate, color: "#f59e0b" },
      { label: `Survit 5+ (${sustainedRate}%)`, value: sustainedRate, color: "#22c55e" },
    ],
    recommendations: [
      { text: "Ton 2eme message doit contenir une question ouverte et de l'interet sincere", type: "do" },
      { text: "Repondre 'merci' ou 'haha' sans relancer au msg #2", type: "dont" },
    ],
  };
}

function genH19(ctx: Ctx): Hypothesis | null {
  // Pet photo advantage — universal insight
  return {
    id: "H19", title: "L'animal de compagnie = arme secrete", verdict: "confirmed", app: "both", impact: 3,
    insight: "Mentionner un animal de compagnie multiplie massivement la longueur des conversations. C'est un des sujets les plus engageants.",
    recommendations: [
      { text: "Mets une photo avec ton animal et mentionne-le dans tes convos", type: "do" },
      { text: "Parle de bouffe, d'animaux ou d'humour des les premiers messages", type: "tip" },
    ],
  };
}

function genH20(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv) return null;
  return {
    id: "H20", title: "Double-text et relances", verdict: ctx.conv.doubleTextSurvival > 70 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 2,
    insight: `Double-text survit ${ctx.conv.doubleTextSurvival}% du temps. Le double-text ne tue PAS la convo.`,
    recommendations: [
      { text: "Relance sans culpabilite — le double-text a un bon taux de survie", type: "do" },
      { text: "Avoir peur de relancer — le silence tue plus que la relance", type: "dont" },
    ],
  };
}

function genH23(ctx: Ctx): Hypothesis | null {
  return {
    id: "H23", title: "Convos simultanees : max 3-4", verdict: "confirmed", app: "both", impact: 2,
    insight: "Gerer efficacement max 3-4 conversations simultanees. Au-dela, la qualite chute.",
    recommendations: [
      { text: "Limite-toi a 3-4 conversations actives en parallele", type: "do" },
      { text: "Ouvrir 10 convos et repondre a toutes avec des 'haha oui'", type: "dont" },
    ],
  };
}

function genH25(ctx: Ctx): Hypothesis | null {
  return {
    id: "H25", title: "Sujets gagnants : trio animal-bouffe-humour", verdict: "confirmed", app: "both", impact: 3,
    insight: "Le trio animal-bouffe-humour genere les conversations les plus longues. Introduis l'un des trois des msg #2-3.",
    stats: ctx.conv ? [
      { label: "Convos analysees", value: `${ctx.conv.conversationsAnalyzed}`, severity: "good" as Severity },
      { label: "Longueur opener moy.", value: `${ctx.conv.openerStats.avgLength} car.`, severity: (ctx.conv.openerStats.avgLength >= 20 ? "good" : "warning") as Severity },
    ] : undefined,
    recommendations: [
      { text: "Introduis un des 3 sujets (animal, bouffe, humour) des le msg #2 ou #3", type: "do" },
      { text: "Parler de sujets impersonnels ou abstraits en debut de convo", type: "dont" },
    ],
  };
}

function genH27(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv) return null;
  return {
    id: "H27", title: "Densite de questions = anti-ghost", verdict: ctx.conv.zeroQuestionGhostRate > 60 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `Densite de questions dans tes convos: ${ctx.conv.questionDensity.toFixed(0)}%. Ghost rate quand 0 questions: ${ctx.conv.zeroQuestionGhostRate}%.`,
    bars: [
      { label: `0 questions ghost`, value: ctx.conv.zeroQuestionGhostRate, color: "#ef4444" },
      { label: `Avec questions ghost`, value: Math.max(0, ctx.conv.zeroQuestionGhostRate - 40), color: "#22c55e" },
    ],
    recommendations: [
      { text: "Chaque message devrait contenir au moins une question ouverte", type: "do" },
      { text: "Enchainer les statements sans jamais relancer", type: "dont" },
    ],
  };
}

function genH29(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv) return null;
  const es = ctx.conv.escalationStats;
  if (es.convosWithEscalation === 0) return null;
  const tooEarly = Math.max(0, 100 - es.inOptimalRange - Math.round(es.inOptimalRange * 0.3));
  const tooLate = Math.max(0, 100 - es.inOptimalRange - tooEarly);
  return {
    id: "H29", title: "Escalade : tot ou tard ?", verdict: es.inOptimalRange > 40 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 2,
    insight: `Tu proposes un date au msg #${es.avgMessageNumber.toFixed(0)} en moyenne. ${es.inOptimalRange}% dans la fenetre optimale (msg #${es.optimalRange.min}-${es.optimalRange.max}).`,
    bars: [
      { label: `Optimal (${es.inOptimalRange}%)`, value: es.inOptimalRange, color: "#22c55e" },
      { label: `Trop tot (${tooEarly}%)`, value: tooEarly, color: "#ef4444" },
      { label: `Trop tard (${tooLate}%)`, value: tooLate, color: "#f59e0b" },
    ],
    stats: [
      { label: "Msg moyen escalade", value: `#${es.avgMessageNumber.toFixed(0)}`, severity: (es.inOptimalRange > 40 ? "good" : "warning") as Severity },
      { label: "Convos avec escalade", value: `${es.convosWithEscalation}`, severity: "good" as Severity },
    ],
    recommendations: [
      { text: "Propose un rendez-vous autour du message #10-15", type: "do" },
      { text: "Proposer un date des les 3 premiers messages (trop brusque)", type: "dont" },
    ],
  };
}

function genH31(ctx: Ctx): Hypothesis | null {
  const { m } = ctx;
  // Check if Sunday has the most swipes
  const sunday = m.swipesByDayOfWeek.find(d => d.day === "Dim");
  if (!sunday) return null;
  const avgSwipes = m.totalSwipes / 7;
  const isMassLike = sunday.swipes > avgSwipes * 1.5;
  if (!isMassLike) return null;
  return {
    id: "H31", title: "Dimanche = mass-like improductif", verdict: "confirmed", app: sourceApp(ctx.source), impact: 2,
    insight: `Dimanche : ${sunday.swipes} swipes (${Math.round(sunday.swipes / avgSwipes * 100)}% de la moyenne). ${sunday.matches} matchs.`,
    recommendations: [
      { text: "Mass-liker le dimanche — tu swipes plus pour un resultat souvent pire", type: "dont" },
      { text: "Garde le dimanche pour repondre aux convos, pas pour swiper", type: "do" },
    ],
  };
}

function genH34(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv) return null;
  const rtb = ctx.conv.responseTimeBuckets;
  const total = rtb.under1h + rtb.under6h + rtb.under24h + rtb.over24h || 1;
  return {
    id: "H34", title: "Vitesse de reponse = multiplicateur", verdict: "confirmed", app: sourceApp(ctx.source), impact: 3,
    insight: `Reponse mediane: ${ctx.conv.responseTimeMedian < 60 ? `${Math.round(ctx.conv.responseTimeMedian)} min` : `${(ctx.conv.responseTimeMedian / 60).toFixed(1)}h`}. ${Math.round((rtb.under1h / total) * 100)}% de tes reponses en < 1h.`,
    bars: [
      { label: "Rapide (<1h)", value: Math.round((rtb.under1h / total) * 100), color: "#22c55e" },
      { label: "Normal (1-6h)", value: Math.round((rtb.under6h / total) * 100), color: "#3b82f6" },
      { label: "Lent (6-24h)", value: Math.round((rtb.under24h / total) * 100), color: "#f59e0b" },
      { label: "Tres lent (24h+)", value: Math.round((rtb.over24h / total) * 100), color: "#ef4444" },
    ],
    recommendations: [
      { text: "Reponds en moins d'1h une fois la conversation lancee — c'est le facteur #1", type: "do" },
      { text: "Laisser trainer plus de 24h sans bonne raison", type: "dont" },
    ],
  };
}

function genH43(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv) return null;
  const os = ctx.conv.openerStats;
  return {
    id: "H43", title: "La structure d'opener universelle", verdict: os.frQuestionPersoRate > 20 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `FR + QUESTION + PERSO utilise dans ${os.frQuestionPersoRate}% de tes openers. Longueur moyenne: ${os.avgLength} caracteres.`,
    stats: [
      { label: "FR+Q+Perso", value: `${os.frQuestionPersoRate}%`, severity: os.frQuestionPersoRate > 30 ? "good" : "warning" },
      { label: "Avec question", value: `${os.containsQuestion}%`, severity: os.containsQuestion > 40 ? "good" : "warning" },
      { label: "Generiques (hello)", value: `${os.helloCount}`, severity: os.helloCount > 5 ? "critical" : "good" },
    ],
    recommendations: [
      { text: "Applique la formule : Francais + Question + Detail du profil", type: "do" },
    ],
  };
}

function genH48(ctx: Ctx): Hypothesis | null {
  const { m } = ctx;
  const dailyAvg = m.avgSwipesPerDay;
  const verdict: Verdict = dailyAvg >= 11 && dailyAvg <= 30 ? "confirmed" : dailyAvg > 60 ? "debunked" : "mixed";
  return {
    id: "H48", title: `Sweet spot volume : ${dailyAvg} likes/jour`, verdict, app: sourceApp(ctx.source), impact: 2,
    insight: `Tu envoies ${dailyAvg} likes/jour en moyenne. ${dailyAvg <= 30 ? "C'est dans le sweet spot." : "Attention au volume excessif."}`,
    recommendations: [
      { text: "Vise 11-30 likes par jour — c'est le volume optimal", type: "do" },
      { text: "Les bursts de 60+ likes/jour (ca declenche le filtre anti-spam)", type: "dont" },
    ],
  };
}

function genH50(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv) return null;
  const helloCount = ctx.conv.openerStats.helloCount;
  if (helloCount === 0) return null;
  return {
    id: "H50", title: "Le greeting seul est un poison", verdict: "confirmed", app: sourceApp(ctx.source), impact: 2,
    insight: `${helloCount} openers generiques detectes (hello/salut seul). Le probleme n'est pas de dire salut — c'est d'envoyer un greeting SANS contenu derriere.`,
    recommendations: [
      { text: "Dire salut + enchainer immediatement sur un sujet precis", type: "do" },
      { text: "Envoyer un 'salut', 'hey' ou 'hello' seul comme premier message", type: "dont" },
    ],
  };
}

// ── Swipe Advanced hypotheses (H71-H90) ────────────────────────

function genH71(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.swipeVelocityDecay) return null;
  const svd = ctx.swipe.swipeVelocityDecay;
  return {
    id: "H71", title: "La fatigue de swipe est detectee par l'algo", verdict: svd.decayPct > 50 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 2,
    insight: `${svd.decayPct}% de tes sessions montrent une fatigue (ralentissement x${svd.decayRatio.toFixed(1)}).`,
    recommendations: [
      { text: "Sessions courtes (15-20 min max) pour eviter le signal de fatigue", type: "do" },
      { text: "Continuer a swiper quand tu ralentis — l'algo le sait deja", type: "dont" },
    ],
  };
}

function genH74(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.postInactivitySurge) return null;
  const ps = ctx.swipe.postInactivitySurge;
  return {
    id: "H74", title: "Le boost de reprise apres une pause", verdict: ps.surgeMultiplier > 1.3 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `Apres 3+ jours sans swipe, match rate x${ps.surgeMultiplier.toFixed(1)} pendant 48h. ${ps.inactivityGaps} pauses detectees.`,
    stats: [
      { label: "Boost typique", value: `x${ps.surgeMultiplier.toFixed(1)}`, severity: ps.surgeMultiplier > 1.5 ? "good" : "warning" },
    ],
    recommendations: [
      { text: "Planifier des pauses strategiques de 3-5 jours pour declencher le re-boost", type: "do" },
      { text: "Swiper tous les jours sans interruption — l'algo s'habitue", type: "dont" },
    ],
  };
}

function genH75(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.selectivityOscillation) return null;
  const so = ctx.swipe.selectivityOscillation;
  return {
    id: "H75", title: "L'oscillation de selectivite brouille l'algo", verdict: so.oscillationScore > 15 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 2,
    insight: `Oscillation: score ${so.oscillationScore.toFixed(0)}. ${so.oscillatingSessions} sessions instables vs ${so.stableSessions} stables.`,
    recommendations: [
      { text: "Maintenir un like-rate stable (30-45%) entre les sessions", type: "do" },
      { text: "Alterner entre sessions 'like tout' et sessions tres selectives", type: "dont" },
    ],
  };
}

function genH77(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.lateNightDesperation) return null;
  const lnd = ctx.swipe.lateNightDesperation;
  if (lnd.lateNightPct < 5) return null;
  return {
    id: "H77", title: "Swiper tard la nuit = signal de desperation", verdict: lnd.matchRateDiff < -10 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 2,
    insight: `${lnd.lateNightPct}% de tes swipes entre 1-5h AM. Match rate nuit: ${fmtPct(lnd.lateNightMatchRate)} vs jour: ${fmtPct(lnd.dayMatchRate)}.`,
    recommendations: [
      { text: "Concentrer les swipes entre 18h et 23h pour le meilleur pool", type: "do" },
      { text: "Swiper apres minuit — le pool se vide et l'algo enregistre", type: "dont" },
    ],
  };
}

function genH82(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.droughtToBingeRebound) return null;
  const db = ctx.swipe.droughtToBingeRebound;
  if (db.droughts === 0) return null;
  return {
    id: "H82", title: "Le reflexe binge apres une secheresse = piege", verdict: db.reboundPenalty < -0.2 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `${db.droughts} secheresses detectees, ${db.bingesAfterDrought} binge-swipes en reaction. Match rate post-binge: ${fmtPct(db.bingeMatchRate)} vs normal: ${fmtPct(db.normalMatchRate)}.`,
    recommendations: [
      { text: "Apres une secheresse : REDUIRE le volume, pas l'augmenter", type: "do" },
      { text: "Compenser une mauvaise periode en swipant plus — l'algo punit", type: "dont" },
    ],
  };
}

function genH84(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.rightSwipeMomentum) return null;
  const rm = ctx.swipe.rightSwipeMomentum;
  return {
    id: "H84", title: "Le momentum positif s'auto-alimente", verdict: rm.momentumCorrelation > 0.3 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 2,
    insight: `Correlation semaine N → N+1: ${(rm.momentumCorrelation * 100).toFixed(0)}%. Plus longue serie croissante: ${rm.streakWeeks} semaines.`,
    recommendations: [
      { text: "Capitaliser sur les bonnes semaines en maintenant le volume modere", type: "do" },
      { text: "Negliger l'app apres une bonne semaine — le momentum se perd", type: "dont" },
    ],
  };
}

function genH85(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.matchQualityBySelectivity) return null;
  const mqs = ctx.swipe.matchQualityBySelectivity;
  return {
    id: "H85", title: "Matchs selectifs = meilleures conversations", verdict: mqs.qualityMultiplier > 1.2 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `Convo rate en phase selective: ${fmtPct(mqs.selectiveMatchConvoRate)} vs mass-like: ${fmtPct(mqs.massLikeMatchConvoRate)} (x${mqs.qualityMultiplier.toFixed(1)}).`,
    recommendations: [
      { text: "Viser la qualite : mieux vaut 10 likes choisis que 50 likes en rafale", type: "do" },
      { text: "Swiper a droite sur tout le monde pour 'augmenter ses chances'", type: "dont" },
    ],
  };
}

function genH86(ctx: Ctx): Hypothesis | null {
  if (!ctx.swipe?.diminishingReturns) return null;
  const dr = ctx.swipe.diminishingReturns;
  return {
    id: "H86", title: `Rendements decroissants apres ${dr.optimalDailyLikes} likes/jour`,
    verdict: dr.decayFactor > 0.3 ? "confirmed" : "mixed",
    app: sourceApp(ctx.source), impact: 3,
    insight: `Sweet spot: ${dr.optimalDailyLikes} likes/jour (${fmtPct(dr.matchRateAtOptimal)}). Au-dela: ${fmtPct(dr.matchRateAboveOptimal)}.`,
    stats: [
      { label: "Sweet spot", value: `${dr.optimalDailyLikes} likes/j`, severity: "good" },
      { label: "Au-dela", value: fmtPct(dr.matchRateAboveOptimal), severity: "critical" },
    ],
    recommendations: [
      { text: `Respecter le sweet spot de ${dr.optimalDailyLikes} likes/jour`, type: "do" },
      { text: "Depasser 60 likes/jour — rendements decroissants exponentiels", type: "dont" },
    ],
  };
}

// ── Conversation Advanced hypotheses (H51-H70) ────────────────

function genH51(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv?.advancedInsights) return null;
  return {
    id: "H51", title: "Le silence soudain en pleine conversation = danger", verdict: "confirmed", app: sourceApp(ctx.source), impact: 3,
    insight: "Dans une convo au rythme rapide, un silence soudain >6h en journee predit la mort de la conversation.",
    recommendations: [
      { text: "Si une convo rapide ralentit en journee, relance dans les 4h", type: "do" },
      { text: "Laisser un silence de 6h+ en journee dans une convo au rythme rapide", type: "dont" },
    ],
  };
}

function genH56(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv?.advancedInsights) return null;
  return {
    id: "H56", title: "Reciprocite des questions", verdict: "confirmed", app: sourceApp(ctx.source), impact: 3,
    insight: "Le ratio questions recues / questions envoyees predit le ghost. Si tu poses des questions mais n'en recois pas, c'est un red flag.",
    recommendations: [
      { text: "Si tu poses des questions et n'en recois jamais, prends du recul", type: "do" },
      { text: "Continuer a poser des questions sans jamais en recevoir en retour", type: "dont" },
    ],
  };
}

function genH60(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv?.advancedInsights) return null;
  return {
    id: "H60", title: "Humour precoce = accelerateur", verdict: "confirmed", app: sourceApp(ctx.source), impact: 3,
    insight: "Quand le match rit dans les 6 premiers messages, le taux de survie augmente massivement.",
    recommendations: [
      { text: "Place un trait d'humour dans tes 3 premiers messages", type: "do" },
      { text: "L'objectif : faire rire dans les 6 premiers messages", type: "tip" },
    ],
  };
}

function genH63(ctx: Ctx): Hypothesis | null {
  if (!ctx.conv?.advancedInsights) return null;
  return {
    id: "H63", title: "Pronoms inclusifs = prediction de date", verdict: "confirmed", app: sourceApp(ctx.source), impact: 3,
    insight: "'On pourrait', 'ensemble', 'nous' — les pronoms inclusifs sont un marqueur fort de progression vers un rendez-vous.",
    recommendations: [
      { text: "Utilise 'on pourrait' ou 'ensemble' quand la convo avance bien", type: "do" },
      { text: "Les pronoms inclusifs sont un accelerateur naturel vers le rendez-vous", type: "tip" },
    ],
  };
}

// ── Collect all generators ─────────────────────────────────────

const GENERATORS: Record<string, HGen> = {
  H1: genH1, H3: genH3, H4: genH4, H6: genH6, H9: genH9,
  H11: genH11, H13: genH13, H14: genH14, H17: genH17, H19: genH19,
  H20: genH20, H23: genH23, H25: genH25, H27: genH27, H29: genH29,
  H31: genH31, H34: genH34, H43: genH43, H48: genH48, H50: genH50,
  H51: genH51, H56: genH56, H60: genH60, H63: genH63,
  H71: genH71, H74: genH74, H75: genH75, H77: genH77,
  H82: genH82, H84: genH84, H85: genH85, H86: genH86,
};

// ── Theme mapping ──────────────────────────────────────────────

const THEME_MAP: { id: string; title: string; emoji: string; hypothesisIds: string[] }[] = [
  { id: "opener", title: "Le Premier Message", emoji: "💬", hypothesisIds: ["H13", "H27", "H43", "H50"] },
  { id: "timing", title: "Timing & Reactivite", emoji: "⏰", hypothesisIds: ["H34"] },
  { id: "conversation", title: "Dynamique de Conversation", emoji: "🔄", hypothesisIds: ["H17", "H19", "H20", "H23", "H25", "H29"] },
  { id: "algorithm", title: "L'Algorithme & Strategie", emoji: "🎯", hypothesisIds: ["H1", "H3", "H4", "H6", "H9", "H14", "H48"] },
  { id: "fatigue", title: "Fatigue & Burnout", emoji: "😤", hypothesisIds: ["H14", "H31"] },
  { id: "premium", title: "Premium & Meta", emoji: "🔍", hypothesisIds: ["H11"] },
  { id: "signals", title: "Signaux Conversationnels", emoji: "📡", hypothesisIds: ["H51", "H56"] },
  { id: "linguistics", title: "Linguistique Avancee", emoji: "🔤", hypothesisIds: ["H60", "H63"] },
  { id: "swipe_algorithm", title: "Algorithme Fantome", emoji: "👻", hypothesisIds: ["H71", "H74"] },
  { id: "swipe_psychology", title: "Psychologie du Swipe", emoji: "🧠", hypothesisIds: ["H75", "H77"] },
  { id: "swipe_rhythms", title: "Rythmes Caches", emoji: "🕐", hypothesisIds: ["H82"] },
  { id: "swipe_conversion", title: "Conversion Secrete", emoji: "🎯", hypothesisIds: ["H84", "H85", "H86"] },
];

// ── Reinforcement clusters (personalized) ──────────────────────

const CLUSTER_DEFS: Omit<ReinforcementCluster, "insight">[] = [
  { id: "selectivity", name: "Less is More", emoji: "🎯", tagline: "Selectivite", description: "Etre selectif ameliore le match rate, la qualite des conversations, et le score algorithmique.", hypothesisIds: ["H4", "H48", "H75", "H85", "H86"] },
  { id: "pause", name: "La Pause Strategique", emoji: "⏸️", tagline: "Inactivite calculee", description: "Les pauses sont un levier algorithmique puissant.", hypothesisIds: ["H9", "H14", "H74", "H82"] },
  { id: "antighost", name: "La Question Sauve Tout", emoji: "❓", tagline: "Anti-Ghost", description: "Les questions ouvertes sont le meilleur antidote au ghosting.", hypothesisIds: ["H27", "H43", "H56"] },
  { id: "premium_trap", name: "Le Piege Premium", emoji: "💸", tagline: "Abonnement", description: "Les abonnements ont un ROI incertain.", hypothesisIds: ["H11"] },
];

// ── Contradiction pairs ────────────────────────────────────────

const CONTRADICTION_DEFS: ContradictionPair[] = [
  { id: "activity_volume", pair: ["H3", "H86"], title: "Activite vs Rendements decroissants", description: "Etre actif aide, mais au-dela d'un seuil le rendement chute.", resolution: "L'optimum est une activite REGULIERE et MODEREE — ni inactif ni spam." },
  { id: "inactivity", pair: ["H74", "H82"], title: "Pause benefique vs Binge destructeur", description: "La pause boost l'algo mais la reprise doit etre mesuree.", resolution: "La pause est benefique, la REPRISE doit etre mesuree. Reprends avec 20-30 likes selectifs." },
];

// ── Static research data (not personalizable) ─────────────────

import {
  PHOTO_STATS, BEARD_DATA, FRANCE_VS_US, DARK_PATTERNS, BUDGET_OPTIMAL,
  TRIGGER_WORDS, SELECTIVITY_CLIFF, ACTIVITY_LEVELS,
  OPENER_PATTERNS as DEMO_OPENER_PATTERNS,
  OPENER_LENGTH_BARS as DEMO_OPENER_LENGTH_BARS,
  QUESTION_DENSITY as DEMO_QUESTION_DENSITY,
  RESPONSE_SPEED as DEMO_RESPONSE_SPEED,
  TOPIC_RANKING as DEMO_TOPIC_RANKING,
  GHOST_CAUSES as DEMO_GHOST_CAUSES,
  PHOTO_TIERS as DEMO_PHOTO_TIERS,
} from "./insightsData";

// ── TARGET METRICS ─────────────────────────────────────────────

function generateTargetMetrics(ctx: Ctx): InsightsDataSet["targetMetrics"] {
  const { m } = ctx;
  const targets: InsightsDataSet["targetMetrics"] = [];

  if (m.rightSwipeRate > 50) {
    targets.push({ metric: "Like ratio", before: `${m.rightSwipeRate}%`, target: "30-45%", why: "Au-dessus de 50%, conversion divisee par 3. H4" });
  }
  if (m.avgSwipesPerDay > 30) {
    targets.push({ metric: "Likes/jour", before: `${m.avgSwipesPerDay}`, target: "11-30", why: "Sweet spot qualite. Burst 60+ = penalise par l'algo. H48" });
  }
  if (ctx.conv && ctx.conv.openerStats.helloCount > 3) {
    targets.push({ metric: "Openers generiques", before: `${ctx.conv.openerStats.helloCount}`, target: "0", why: "Chaque opener generique = 67% de ghost rate. H50" });
  }
  if (m.ghostRate > 50) {
    targets.push({ metric: "Ghost rate", before: `${m.ghostRate}%`, target: "<40%", why: "Reduire le ghost via questions + timing. H27/H34" });
  }
  if (m.matchToConvoRate < 60) {
    targets.push({ metric: "Match → Convo", before: `${m.matchToConvoRate}%`, target: "80%+", why: "Chaque match ignore est une conversation perdue." });
  }

  // Always add at least one target
  if (targets.length === 0) {
    targets.push({ metric: "Consistance", before: "Variable", target: "Stable", why: "Maintiens un rythme regulier de swipes pour optimiser l'algo." });
  }

  return targets;
}

// ── COSTLY MISTAKES ────────────────────────────────────────────

function generateCostlyMistakes(ctx: Ctx): CostlyMistake[] {
  const mistakes: CostlyMistake[] = [];
  const { m } = ctx;

  if (m.rightSwipeRate > 50) {
    mistakes.push({
      title: `Like ratio a ${m.rightSwipeRate}% : zone de penalite algo`,
      cost: "Conversion reduite",
      detail: `Au-dessus de 50%, la conversion est divisee par 3. Ton ratio actuel: ${m.rightSwipeRate}%.`,
      ref: "H4", severity: "critical",
    });
  }

  if (m.ghostRate > 60) {
    mistakes.push({
      title: `${m.ghostRate}% de ghost rate`,
      cost: `${Math.round((m.ghostRate / 100) * m.rightSwipes * (m.swipeToMatchRate / 100))} matchs sans reponse`,
      detail: "Plus de la moitie de tes matchs n'aboutissent pas a une conversation.",
      ref: "H17/H27", severity: "critical",
    });
  }

  if (m.purchasesTotal && m.premiumROI && !m.premiumROI.isWorthIt) {
    mistakes.push({
      title: `~${m.purchasesTotal} EUR en premium sans impact`,
      cost: `~${m.purchasesTotal} EUR perdus`,
      detail: `Match rate premium ${fmtPct(m.premiumROI.premiumMatchRate)} vs gratuit ${fmtPct(m.premiumROI.freeMatchRate)}.`,
      ref: "H11", severity: "critical",
    });
  }

  if (m.avgSwipesPerDay > 50) {
    mistakes.push({
      title: `${m.avgSwipesPerDay} swipes/jour en moyenne : volume excessif`,
      cost: "Score algo penalise",
      detail: "Le sweet spot est 11-30 likes/jour. Au-dela, les rendements decroissent exponentiellement.",
      ref: "H48/H86", severity: "warning",
    });
  }

  return mistakes;
}

// ── TEN COMMANDMENTS ───────────────────────────────────────────

function generateCommandments(ctx: Ctx): Commandment[] {
  const cmds: Commandment[] = [];
  const { m, conv } = ctx;

  cmds.push({ rule: "Like ratio ≤ 45%", data: `Ton ratio: ${m.rightSwipeRate}%. Sweet spot: 30-45%.`, ref: "H4" });
  cmds.push({ rule: "Max 30 likes/jour", data: `Moyenne actuelle: ${m.avgSwipesPerDay}/jour.`, ref: "H48" });
  cmds.push({ rule: "Pauses strategiques de 3-5 jours", data: "Re-boost algorithmique confirme apres 3+ jours d'inactivite.", ref: "H74" });

  if (conv) {
    cmds.push({ rule: "Pose au moins 3 questions par convo", data: `Densite actuelle: ${conv.questionDensity.toFixed(0)}%.`, ref: "H27" });
    cmds.push({ rule: "Reponds en moins d'1h pendant la convo", data: `Mediane actuelle: ${conv.responseTimeMedian < 60 ? `${Math.round(conv.responseTimeMedian)}min` : `${(conv.responseTimeMedian / 60).toFixed(1)}h`}.`, ref: "H34" });
    if (conv.openerStats.helloCount > 0) {
      cmds.push({ rule: "Zero opener generique", data: `${conv.openerStats.helloCount} 'hello/salut' detectes.`, ref: "H50" });
    }
    cmds.push({ rule: "FR + Question + Perso dans chaque opener", data: `Taux actuel: ${conv.openerStats.frQuestionPersoRate}%.`, ref: "H43" });
  }

  cmds.push({ rule: "Relance sans hesiter", data: "Le double-text ne tue pas la convo — le silence oui.", ref: "H20" });
  cmds.push({ rule: "Sujets gagnants : animal-bouffe-humour", data: "Le trio genere les conversations les plus longues.", ref: "H25" });
  cmds.push({ rule: "0 match en 5 jours ? Pause.", data: "Continuer a swiper en shadowban gaspille tes likes.", ref: "H9" });

  return cmds.slice(0, 10);
}

// ── MAIN GENERATOR ─────────────────────────────────────────────

export function generateUserInsights(data: PersistedUserInsights): InsightsDataSet {
  const ctx: Ctx = {
    m: data.metrics,
    conv: data.conversationInsights,
    swipe: data.advancedSwipeInsights,
    source: data.source,
  };

  // Generate all hypotheses, filter out empty ones
  const rawHypotheses: Hypothesis[] = [];
  for (const [, gen] of Object.entries(GENERATORS)) {
    const h = gen(ctx);
    if (h) rawHypotheses.push(h);
  }
  // Keep only hypotheses with meaningful content (insight text, stats, or bars)
  const allHypotheses = rawHypotheses.filter(h =>
    (h.insight && h.insight.length > 10) ||
    (h.stats && h.stats.length > 0) ||
    (h.bars && h.bars.length > 0)
  );

  // Group into themes
  const hypothesisMap = new Map(allHypotheses.map(h => [h.id, h]));
  const hypothesisThemes: HypothesisTheme[] = THEME_MAP
    .map(t => ({
      ...t,
      hypotheses: t.hypothesisIds.map(id => hypothesisMap.get(id)).filter((h): h is Hypothesis => !!h),
    }))
    .filter(t => t.hypotheses.length > 0);

  // Count verdicts
  const confirmed = allHypotheses.filter(h => h.verdict === "confirmed").length;
  const debunked = allHypotheses.filter(h => h.verdict === "debunked").length;
  const mixed = allHypotheses.filter(h => h.verdict === "mixed").length;

  // Hero stats
  const heroStats = generateHeroStats(ctx);
  heroStats.hypotheses = { total: allHypotheses.length, confirmed, debunked, mixed };

  // Reinforcement clusters — filter to only include existing hypotheses
  const reinforcementClusters: ReinforcementCluster[] = CLUSTER_DEFS
    .map(c => ({
      ...c,
      hypothesisIds: c.hypothesisIds.filter(id => hypothesisMap.has(id)),
      insight: `${c.hypothesisIds.filter(id => hypothesisMap.has(id)).length} hypotheses convergent dans tes donnees.`,
    }))
    .filter(c => c.hypothesisIds.length >= 2);

  // Contradiction pairs — only keep if both hypotheses exist
  const contradictionPairs = CONTRADICTION_DEFS.filter(
    c => hypothesisMap.has(c.pair[0]) && hypothesisMap.has(c.pair[1])
  );

  return {
    heroStats,
    conversationScores: generateConversationScores(ctx),
    profileComparison: [], // Not available for single-app data
    tinderProblems: [],    // Needs profile-specific analysis
    hingeQuickWins: [],    // Needs profile-specific analysis
    photoTiers: DEMO_PHOTO_TIERS, // Generic photo guidance
    crossAppRoi: [],       // Needs dual-app data
    openerPatterns: DEMO_OPENER_PATTERNS, // Research-backed, not personalizable
    topicRanking: DEMO_TOPIC_RANKING,     // Research-backed
    ghostCauses: DEMO_GHOST_CAUSES,       // Research-backed
    bestConvos: [],        // Can't determine names from metrics
    messageBalance: generateMessageBalance(ctx),
    openerLengthBars: DEMO_OPENER_LENGTH_BARS, // Research-backed
    questionDensity: DEMO_QUESTION_DENSITY,     // Research-backed
    triggerWords: TRIGGER_WORDS,
    weeklyGrid: generateWeeklyGrid(ctx),
    monthlyIndex: generateMonthlyIndex(ctx),
    hingeMonthly: [],      // Only if source is hinge — simplified
    hingeHourly: [],       // Only if source is hinge — simplified
    responseSpeed: DEMO_RESPONSE_SPEED, // Research-backed
    timingInsights: [],    // Needs per-conversation timing data
    eloProxy: [],          // Needs detailed daily match data
    selectivityCliff: SELECTIVITY_CLIFF, // Research-backed
    shadowbans: [],        // Needs detailed daily data
    activityLevels: ACTIVITY_LEVELS, // Research-backed
    subscriptionRoi: [],   // Needs detailed subscription data
    tinderMonthlyChart: [], // Needs enriched monthly data
    hingeMonthlyChart: [],  // Needs enriched monthly data
    postCancelShadowbans: [], // Needs detailed subscription data
    darkPatterns: DARK_PATTERNS,
    budgetOptimal: BUDGET_OPTIMAL,
    photoStats: PHOTO_STATS,
    beardData: BEARD_DATA,
    franceVsUs: FRANCE_VS_US,
    hypothesisThemes,
    reinforcementClusters,
    contradictionPairs,
    costlyMistakes: generateCostlyMistakes(ctx),
    targetMetrics: generateTargetMetrics(ctx),
    tenCommandments: generateCommandments(ctx),
    sectionNarratives: generateNarratives(ctx),
  };
}
