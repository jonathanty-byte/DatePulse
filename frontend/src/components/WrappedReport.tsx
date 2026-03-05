import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
} from "recharts";
import type { WrappedMetrics, FunnelData } from "../lib/wrappedMetrics";
import { getVerdict } from "../lib/wrappedMetrics";
import { getBenchmark, BENCHMARK_DISCLAIMER } from "../lib/benchmarks";
import type { Gender, BenchmarkResult } from "../lib/benchmarks";
import type { ConversationInsights } from "../lib/conversationIntelligence";
import { getConversationScoreLabel } from "../lib/conversationIntelligence";
import { trackCPEngagement } from "../lib/featureFlags";
import type { AdvancedSwipeInsights, SwipeArchetype } from "../lib/swipeAdvanced";
import {
  AnimatedCounter,
  SpotlightCard,
  NarrativeIntro,
  MiniBar,
  ExpandToggle,
  SectionTitle,
  ProgressRing,
  SectionNav,
  ChartBadges,
} from "./SharedInsightComponents";

// ── Types ───────────────────────────────────────────────────────

interface WrappedReportProps {
  metrics: WrappedMetrics;
  conversationInsights?: ConversationInsights;
  advancedSwipeInsights?: AdvancedSwipeInsights;
  onShareClick?: () => void;
}

// ── App-source color theming ────────────────────────────────────

const APP_COLORS: Record<string, { primary: string; gradient: string; bg: string }> = {
  tinder: { primary: "#ec4899", gradient: "from-pink-400 to-pink-600", bg: "rgba(236,72,153,0.06)" },
  bumble: { primary: "#f59e0b", gradient: "from-amber-400 to-amber-600", bg: "rgba(245,158,11,0.06)" },
  hinge: { primary: "#8b5cf6", gradient: "from-violet-400 to-violet-600", bg: "rgba(139,92,246,0.06)" },
};

// ── Helpers ─────────────────────────────────────────────────────

/** Format a Date to a French-readable period string. */
function formatPeriod(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    year: "numeric",
  };
  const s = start.toLocaleDateString("fr-FR", opts);
  const e = end.toLocaleDateString("fr-FR", opts);
  return s === e ? s : `${s} — ${e}`;
}

/** Format month key "2025-01" to "Jan 25". */
function formatMonth(key: string): string {
  const [y, m] = key.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Aout", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[Number(m) - 1]} ${y.slice(2)}`;
}

/** Format hour (0-23) to "XXh" label. */
function formatHour(h: number): string {
  return `${h}h`;
}

// ── Shared card wrapper ─────────────────────────────────────────

function Card({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={`border border-gray-200 bg-white p-5 sm:p-6 shadow-sm ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** Big number stat display with dynamic color. */
function BigStat({
  value,
  label,
  size = "lg",
  color,
}: {
  value: string | number;
  label: string;
  size?: "lg" | "sm";
  color?: string;
}) {
  return (
    <div className="text-center">
      <p
        className={`font-extrabold ${
          size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"
        }`}
        style={color ? { color } : undefined}
      >
        {!color && (
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            {value}
          </span>
        )}
        {color && value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

// ── Funnel visualization ────────────────────────────────────────

function FunnelChart({ funnel, color, weMet }: { funnel: FunnelData; color: string; weMet: boolean }) {
  const steps = [
    { label: "Likes", value: funnel.likes, pct: 100 },
    { label: "Matches", value: funnel.matches, pct: funnel.likeToMatchPct },
    { label: "Convos", value: funnel.conversations, pct: funnel.matchToConvoPct },
    ...(weMet ? [{ label: "Dates", value: funnel.dates, pct: funnel.convoToDatePct }] : []),
  ];
  const maxVal = Math.max(funnel.likes, 1);

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const widthPct = Math.max(4, (step.value / maxVal) * 100);
        return (
          <div key={step.label} className="flex items-center gap-3">
            <span className="w-14 text-xs text-slate-500 text-right font-medium">{step.label}</span>
            <div className="flex-1 h-7 rounded-md bg-gray-50 overflow-hidden relative">
              <motion.div
                className="h-full rounded-md flex items-center px-2"
                style={{ backgroundColor: color, opacity: 1 - i * 0.15 }}
                initial={{ width: 0 }}
                whileInView={{ width: `${widthPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <span className="text-[11px] font-bold text-white whitespace-nowrap">
                  {step.value.toLocaleString("fr-FR")}
                </span>
              </motion.div>
            </div>
            <span className="w-12 text-[11px] text-slate-400 text-right">
              {i === 0 ? "" : `${step.pct}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Custom Recharts tooltip ─────────────────────────────────────

function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-slate-800">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-2 text-xs font-medium"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-500">{entry.name}</span>
          <span className="ml-auto text-slate-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/** ComposedChart tooltip — swipes, matches, taux + best/worst badge. */
function MonthlyTooltip({
  active,
  payload,
  label,
  bestMonth,
  worstMonth,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ name: string; value: number; color: string; dataKey: string; payload?: any }>;
  label?: string;
  bestMonth?: string;
  worstMonth?: string;
}) {
  if (!active || !payload?.length) return null;
  const sw = payload.find((p) => p.dataKey === "swipes");
  const ma = payload.find((p) => p.dataKey === "matches");
  const rt = payload.find((p) => p.dataKey === "rate");
  const isBest = label === bestMonth;
  const isWorst = label === worstMonth;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg min-w-[160px]">
      <p className="mb-1 text-sm font-bold text-slate-800">
        {label}
        {isBest && <span className="ml-2 text-[11px] font-medium text-emerald-400">★ BEST</span>}
        {isWorst && <span className="ml-2 text-[11px] font-medium text-red-500">▼ WORST</span>}
      </p>
      <div className="flex flex-col gap-0.5 text-[13px]">
        {sw && (
          <div className="flex justify-between items-center" style={{ color: "#6C7AE0" }}>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#6C7AE0" }} />
              Swipes
            </span>
            <span className="font-bold ml-4">{sw.value.toLocaleString("fr-FR")}</span>
          </div>
        )}
        {ma && (
          <div className="flex justify-between items-center" style={{ color: "#F5A623" }}>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3" style={{ height: 2, background: "#F5A623", borderRadius: 1 }} />
              Matches
            </span>
            <span className="font-bold ml-4">{ma.value}</span>
          </div>
        )}
        {rt && (
          <div className="flex justify-between border-t border-gray-200 mt-1 pt-1" style={{ color: "#34d399" }}>
            <span>Taux</span>
            <span className="font-bold ml-4">{rt.value}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

// Quintile → color mapping for benchmark badges
const QUINTILE_COLORS: Record<string, string> = {
  top: "#34d399",       // emerald-400
  above_avg: "#6ee7b7", // emerald-300
  average: "#9ca3af",   // gray-400
  below_avg: "#fbbf24",  // amber-400
  bottom: "#ef4444",    // red-500
};

// ── Confidence Badge ─────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: "population" | "hypothesis" }) {
  const [showDetail, setShowDetail] = React.useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="text-[10px] text-slate-400 hover:text-slate-500 transition cursor-help"
        title={level === "population" ? "Basé sur des données populationnelles (n=1209)" : "Basé sur des hypothèses validées (n=1)"}
      >
        {level === "population" ? "📊" : "🔬"}
      </button>
      {showDetail && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 rounded-lg bg-white border border-gray-200 px-3 py-2 text-[10px] text-slate-500 shadow-lg z-10">
          {level === "population"
            ? "Benchmark base sur 1 209 profils internationaux (SwipeStats)"
            : "Insights bases sur des patterns conversationnels valides"}
        </span>
      )}
    </span>
  );
}

// ── CP Section Observer hook ────────────────────────────────────

function useCPTracking(sectionName: string) {
  const ref = React.useRef<HTMLDivElement>(null);
  const tracked = React.useRef(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || tracked.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          trackCPEngagement(sectionName);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionName]);
  return ref;
}

// ── CP Premium Components (shared from SharedInsightComponents) ──

function BenchmarkBadge({ benchmark }: { benchmark: BenchmarkResult }) {
  const color = QUINTILE_COLORS[benchmark.quintile] || "#9ca3af";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border"
      style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}
    >
      {benchmark.emoji} {benchmark.label}
    </span>
  );
}

const CP_NAV_ITEMS = [
  { id: "cp-hero", emoji: "💬", label: "Vue" },
  { id: "cp-ghost", emoji: "👻", label: "Ghosting" },
  { id: "cp-questions", emoji: "❓", label: "Questions" },
  { id: "cp-tempo", emoji: "⏱️", label: "Tempo" },
  { id: "cp-openers", emoji: "✉️", label: "Openers" },
  { id: "cp-escalation", emoji: "📅", label: "Escalade" },
  { id: "cp-double-text", emoji: "📱", label: "Relance" },
  { id: "cp-balance", emoji: "⚖️", label: "Equilibre" },
  { id: "cp-fatigue", emoji: "🔋", label: "Fatigue" },
  { id: "cp-signals", emoji: "📡", label: "Signaux" },
  { id: "cp-mirroring", emoji: "🪞", label: "Miroir" },
  { id: "cp-language", emoji: "🔤", label: "Langage" },
  { id: "cp-timing", emoji: "⏰", label: "Timing" },
  { id: "cp-patterns", emoji: "🔮", label: "Patterns" },
  { id: "cp-verdict", emoji: "🏆", label: "Verdict" },
];

// ── Conversation Pulse Screens ──────────────────────────────────

type CPScreenProps = {
  insights: ConversationInsights;
  appColor: { primary: string; gradient: string; bg: string };
  benchmarkGender: Gender;
  onShareClick?: () => void;
};

/** CP Section 0 — Hero: 3 SpotlightCards overview */
function CPSectionHero({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp0_hero");
  const ghostPct = insights.ghostBreakdown.total > 0
    ? Math.round(((insights.ghostBreakdown.neverReplied + insights.ghostBreakdown.diedAtMsg2) / insights.ghostBreakdown.total) * 100)
    : 0;
  const scoreColor = insights.score >= 80 ? "#34d399" : insights.score >= 60 ? "#818cf8" : insights.score >= 40 ? "#fbbf24" : "#ef4444";

  return (
    <section id="cp-hero" className="scroll-mt-28 space-y-6" ref={ref}>
      <SectionTitle emoji="💬" title="Conversation Pulse" />
      <NarrativeIntro text={`Analyse de ${insights.conversationsAnalyzed} conversations sur ${insights.ghostBreakdown.total} matchs. Voici ce que tes messages revelent.`} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SpotlightCard
          value={<AnimatedCounter target={ghostPct} suffix="%" className="text-4xl sm:text-5xl font-extrabold" />}
          label="Ghost rate"
          sublabel="meurent avant le 2eme message"
          color="#ef4444"
          icon="👻"
        />
        <SpotlightCard
          value={<AnimatedCounter target={insights.score} suffix="/100" className="text-4xl sm:text-5xl font-extrabold" />}
          label="Score CDS"
          sublabel={getConversationScoreLabel(insights.score)}
          color={scoreColor}
          icon="🎯"
        />
        <SpotlightCard
          value={insights.archetype}
          label="Ton archetype"
          color={appColor.primary}
          icon="🧬"
        />
      </div>
    </section>
  );
}

/** CP Section 1 — Le Mur: ghost breakdown + survival curve */
function CPSectionGhost({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp1_ghost");
  const gb = insights.ghostBreakdown;
  const curveData = insights.survivalCurve;

  const ghostBars = [
    { label: "Jamais repondu", value: gb.neverReplied, color: "#ef4444" },
    { label: "Mort au msg #2", value: gb.diedAtMsg2, color: "#f97316" },
    { label: "Mort 3-10 msgs", value: gb.diedEarly, color: "#fbbf24" },
    { label: "10+ messages", value: gb.sustained, color: "#34d399" },
  ];

  return (
    <section id="cp-ghost" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="👻" title="Le Mur" subtitle="Ou meurent tes conversations — et pourquoi" />
      <NarrativeIntro text={`Sur ${gb.total} matchs, voici comment se repartissent tes conversations.`} />

      <Card>
        <MiniBar bars={ghostBars} />
      </Card>

      {curveData.length > 0 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Courbe de survie</p>
          <div className="h-44 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData}>
                <defs>
                  <linearGradient id="gradSurvival" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={appColor.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={appColor.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="messageNumber"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  label={{ value: "Messages", position: "insideBottom", fill: "#6b7280", fontSize: 10, offset: -5 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={(v: number) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip content={<DarkTooltip />} />
                <ReferenceArea x1={1} x2={3} fill="#ef4444" fillOpacity={0.08} />
                <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="5 4" strokeWidth={1} label={{ value: "50%", fill: "#6b7280", fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="survivingPct"
                  name="Survie"
                  stroke={appColor.primary}
                  fill="url(#gradSurvival)"
                  strokeWidth={2.5}
                  dot={(props: { cx: number; cy: number; payload: { survivingPct: number; messageNumber: number }; index: number }) => {
                    const { cx, cy, payload, index } = props;
                    const prevPct = index > 0 ? curveData[index - 1]?.survivingPct ?? 100 : 100;
                    const drop = prevPct - payload.survivingPct;
                    const c = drop > 20 ? "#ef4444" : "#34d399";
                    return <circle key={payload.messageNumber} cx={cx} cy={cy} r={3} fill={c} />;
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 text-center">
            Zone rouge = les 3 premiers messages, ou la majorite des conversations meurent
          </p>
        </Card>
      )}

      <ExpandToggle title="Detail du ghosting">
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-200 bg-white">
              <th className="px-3 py-2 text-left text-slate-500">Categorie</th>
              <th className="px-3 py-2 text-right text-slate-500">Nombre</th>
              <th className="px-3 py-2 text-right text-slate-500">%</th>
            </tr></thead>
            <tbody>
              {ghostBars.map((b) => (
                <tr key={b.label} className="border-b border-gray-200 last:border-0">
                  <td className="px-3 py-1.5 text-slate-800">{b.label}</td>
                  <td className="px-3 py-1.5 text-right text-slate-800">{b.value}</td>
                  <td className="px-3 py-1.5 text-right" style={{ color: b.color }}>
                    {gb.total > 0 ? Math.round((b.value / gb.total) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandToggle>
    </section>
  );
}

/** CP Section 2 — Tes Questions */
function CPSectionQuestions({ insights, benchmarkGender }: CPScreenProps) {
  const ref = useCPTracking("cp2_questions");
  const qDensityPct = Math.round(insights.questionDensity * 100);
  const bench = getBenchmark("question_density", insights.questionDensity, benchmarkGender);

  // Build question distribution buckets from questionsByConvo
  const buckets = [
    { label: "0 questions", value: 0, color: "#ef4444" },
    { label: "1-2 questions", value: 0, color: "#fbbf24" },
    { label: "3-5 questions", value: 0, color: "#818cf8" },
    { label: "6+ questions", value: 0, color: "#34d399" },
  ];
  for (const q of insights.questionsByConvo) {
    if (q === 0) buckets[0].value++;
    else if (q <= 2) buckets[1].value++;
    else if (q <= 5) buckets[2].value++;
    else buckets[3].value++;
  }

  return (
    <section id="cp-questions" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="❓" title="Tes Questions" subtitle="La densite de questions predit la survie d'une conversation (H27)" />
      <NarrativeIntro text={`Quand tu poses 0 questions, ${insights.zeroQuestionGhostRate}% de tes convos meurent.`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SpotlightCard
          value={<>{insights.zeroQuestionGhostRate}%</>}
          label="Ghost rate sans question"
          sublabel="0 question = conversation morte"
          color="#ef4444"
          icon="👻"
        />
        <Card className="flex flex-col items-center justify-center gap-3 py-4">
          <ProgressRing value={qDensityPct} max={50} size={70} label="Densite de questions" color={qDensityPct >= 20 ? "#34d399" : "#fbbf24"} />
          <BenchmarkBadge benchmark={bench} />
        </Card>
      </div>

      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Distribution des questions par conversation</p>
        <MiniBar bars={buckets} />
      </Card>
    </section>
  );
}

/** CP Section 3 — Ton Tempo: response time analysis */
function CPSectionTempo({ insights, benchmarkGender }: CPScreenProps) {
  const ref = useCPTracking("cp3_tempo");
  const median = insights.responseTimeMedian;
  const buckets = insights.responseTimeBuckets;
  const totalBuckets = buckets.under1h + buckets.under6h + buckets.under24h + buckets.over24h;
  const bench = getBenchmark("response_time_minutes", median, benchmarkGender);

  const tempoColor = median <= 60 ? "#34d399" : median <= 360 ? "#fbbf24" : "#ef4444";

  // Format median nicely
  const medianLabel = median < 60 ? `${median}min` : median < 1440 ? `${Math.round(median / 60)}h` : `${Math.round(median / 1440)}j`;

  const tempoBars = [
    { label: "< 1 heure", value: buckets.under1h, color: "#34d399" },
    { label: "1-6 heures", value: buckets.under6h, color: "#818cf8" },
    { label: "6-24 heures", value: buckets.under24h, color: "#fbbf24" },
    { label: "> 24 heures", value: buckets.over24h, color: "#ef4444" },
  ];

  return (
    <section id="cp-tempo" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="⏱️" title="Ton Tempo" subtitle="La vitesse de reponse multiplie tes chances (H34)" />
      <NarrativeIntro text={`Ton temps de reponse median est de ${medianLabel}. ${median <= 60 ? "Tu es reactif — c'est un atout majeur." : "Les reponses rapides multiplient tes chances par 3."}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SpotlightCard
          value={medianLabel}
          label="Temps de reponse median"
          color={tempoColor}
          icon="⚡"
        />
        <Card className="flex flex-col items-center justify-center gap-3 py-4">
          <BenchmarkBadge benchmark={bench} />
          <p className="text-[11px] text-slate-400 text-center">
            {totalBuckets > 0 ? `${Math.round((buckets.under1h / totalBuckets) * 100)}% de tes reponses en moins d'1h` : "Pas assez de donnees"}
          </p>
        </Card>
      </div>

      {totalBuckets > 0 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Repartition des temps de reponse</p>
          <MiniBar bars={tempoBars} />
        </Card>
      )}
    </section>
  );
}

/** CP Section 4 — Tes Openers */
function CPSectionOpeners({ insights, appColor, benchmarkGender }: CPScreenProps) {
  const ref = useCPTracking("cp4_openers");
  if (insights.openerStats.avgLength === 0) return null;

  const bench = getBenchmark("opener_length", insights.openerStats.avgLength, benchmarkGender);

  return (
    <section id="cp-openers" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="✉️" title="Tes Openers" subtitle="Le premier message decide de tout (H43, H50)" />
      <NarrativeIntro text="La qualite de ton premier message determine si la conversation vivra ou mourra." />

      {/* 3 mini-stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-3">
          <p className="text-2xl font-bold" style={{ color: appColor.primary }}>{insights.openerStats.avgLength}</p>
          <p className="text-[10px] text-slate-500 mt-1">car. en moyenne</p>
          <div className="mt-2"><BenchmarkBadge benchmark={bench} /></div>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold" style={{ color: insights.openerStats.containsQuestion >= 40 ? "#34d399" : "#fbbf24" }}>
            {insights.openerStats.containsQuestion}%
          </p>
          <p className="text-[10px] text-slate-500 mt-1">avec question</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold" style={{ color: insights.openerStats.helloCount > 0 ? "#ef4444" : "#34d399" }}>
            {insights.openerStats.helloCount}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">"salut/hey"</p>
          {insights.openerStats.helloCount > 0 && (
            <p className="text-[9px] text-red-500 mt-0.5">generiques detectes</p>
          )}
        </Card>
      </div>

      {/* La Formule FR+?+Perso */}
      <SpotlightCard
        value={<>{insights.openerStats.frQuestionPersoRate}%</>}
        label="Francais + Question + Personnalise"
        sublabel="La formule gagnante pour tes openers"
        color="#f59e0b"
        icon="🎯"
      />

      <ExpandToggle title="Impact des openers generiques (H50)">
        <p className="text-xs text-slate-400 leading-relaxed">
          Les openers generiques ("Salut", "Hey", "Coucou") ont un taux de reponse 3 a 5x inferieur
          aux messages personnalises. Un opener ideal combine : langue naturelle (francais),
          une question ouverte, et un element specifique au profil de la personne.
        </p>
      </ExpandToggle>
    </section>
  );
}

/** CP Section 5 — L'Escalade: escalation timing */
function CPSectionEscalation({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp5_escalation");
  const es = insights.escalationStats;
  if (es.convosWithEscalation === 0) return null;

  const inRange = es.avgMessageNumber >= es.optimalRange.min && es.avgMessageNumber <= es.optimalRange.max;
  const escColor = inRange ? "#34d399" : "#fbbf24";

  // Build the visual range bar
  const rangeMax = Math.max(es.optimalRange.max + 10, es.avgMessageNumber + 5);
  const optStartPct = (es.optimalRange.min / rangeMax) * 100;
  const optWidthPct = ((es.optimalRange.max - es.optimalRange.min) / rangeMax) * 100;
  const userPct = (es.avgMessageNumber / rangeMax) * 100;

  return (
    <section id="cp-escalation" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="📅" title="L'Escalade" subtitle="Quand proposer un rendez-vous — le timing change tout (H29)" />
      <NarrativeIntro text={`Tu proposes un rendez-vous en moyenne au message #${es.avgMessageNumber}. ${inRange ? "C'est dans la fenetre optimale !" : "C'est en dehors de la fenetre optimale."}`} />

      <SpotlightCard
        value={<>Message #{es.avgMessageNumber}</>}
        label="Premiere escalation en moyenne"
        sublabel={`${es.inOptimalRange}% dans la fenetre optimale`}
        color={escColor}
        icon="📅"
      />

      {/* Visual range bar */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Fenetre optimale d'escalation</p>
        <div className="relative h-8 rounded-full bg-gray-50 overflow-hidden">
          {/* Optimal zone (green) */}
          <div
            className="absolute inset-y-0 rounded-full bg-emerald-500/20 border border-emerald-500/30"
            style={{ left: `${optStartPct}%`, width: `${optWidthPct}%` }}
          />
          {/* User marker */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
            style={{ backgroundColor: escColor, borderColor: "#fff", left: `${userPct}%`, marginLeft: -6 }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, type: "spring" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
          <span>Msg #1</span>
          <span className="text-emerald-400">#{es.optimalRange.min}-{es.optimalRange.max} optimal</span>
          <span>#{rangeMax}</span>
        </div>
        {insights.source === "hinge" ? (
          <p className="mt-2 text-[10px] text-slate-400 text-center">Hinge : escalation tot (msg #3-8) fonctionne mieux</p>
        ) : (
          <p className="mt-2 text-[10px] text-slate-400 text-center">Tinder/Bumble : escalation msg #8-20 recommandee</p>
        )}
      </Card>
    </section>
  );
}

/** CP Section 6 — Le Double-Text */
function CPSectionDoubleText({ insights }: CPScreenProps) {
  const ref = useCPTracking("cp6_double_text");

  return (
    <section id="cp-double-text" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="📱" title="Le Double-Text" subtitle="Relancer apres un silence — ca marche ? (H20)" />
      <NarrativeIntro text="Le double-text, c'est quand tu envoies un 2eme message sans avoir recu de reponse. Parfois ca relance, parfois ca tue." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SpotlightCard
          value={<>{insights.doubleTextRate}%</>}
          label="de tes convos ont un double-text"
          color="#818cf8"
          icon="📱"
        />
        <SpotlightCard
          value={<>{insights.doubleTextSurvival}%</>}
          label="survivent apres la relance"
          color={insights.doubleTextSurvival >= 40 ? "#34d399" : "#ef4444"}
          icon={insights.doubleTextSurvival >= 40 ? "✅" : "❌"}
        />
      </div>

      <Card>
        <p className="text-xs text-center" style={{ color: insights.doubleTextSurvival >= 40 ? "#34d399" : "#ef4444" }}>
          {insights.doubleTextSurvival >= 40
            ? "Le double-text t'aide — tes relances ont un bon taux de survie."
            : "Peu efficace dans ton cas — tes relances ne sauvent pas les conversations."}
        </p>
      </Card>
    </section>
  );
}

/** CP Section 7 — L'Equilibre */
function CPSectionBalance({ insights }: CPScreenProps) {
  const ref = useCPTracking("cp7_balance");
  const b = insights.balanceByConvo;
  const total = b.balanced + b.overInvesting + b.underInvesting;
  if (total === 0) return null;

  const balanceBars = [
    { label: "Equilibre", value: b.balanced, color: "#34d399" },
    { label: "Sur-investissement", value: b.overInvesting, color: "#ef4444" },
    { label: "Sous-investissement", value: b.underInvesting, color: "#fbbf24" },
  ];

  return (
    <section id="cp-balance" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="⚖️" title="L'Equilibre" subtitle="L'investissement asymetrique tue les conversations" />
      <NarrativeIntro text={`Sur ${total} conversations avec echanges, voici la repartition de ton investissement.`} />

      <Card>
        <MiniBar bars={balanceBars} />
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {balanceBars.map((bar) => (
            <span key={bar.label} className="text-[10px] text-slate-400">
              {bar.label}: <span className="font-medium" style={{ color: bar.color }}>{total > 0 ? Math.round((bar.value / total) * 100) : 0}%</span>
            </span>
          ))}
        </div>
      </Card>

      {b.overInvesting > b.balanced && (
        <Card className="border-red-200">
          <p className="text-xs text-red-500 text-center">
            Tu investis plus que tu ne recois dans la majorite de tes conversations.
            Laisse de la place — l'equilibre attire plus que l'insistance.
          </p>
        </Card>
      )}
    </section>
  );
}

/** CP Section 8 — La Fatigue */
function CPSectionFatigue({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp8_fatigue");
  const trend = insights.fatigueTrend;
  const hasTrend = trend && trend.monthlyOpenerLength.length >= 3;

  return (
    <section id="cp-fatigue" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="🔋" title="La Fatigue" subtitle="Quand l'energie baisse, les conversations s'en ressentent (H31)" />
      <NarrativeIntro text="L'effort que tu mets dans tes premiers messages evolue-t-il avec le temps ?" />

      {hasTrend ? (
        <>
          <Card>
            <p className="text-xs font-medium text-slate-800 mb-3">Longueur moyenne des openers par mois</p>
            <div className="h-44 sm:h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.monthlyOpenerLength}>
                  <defs>
                    <linearGradient id="gradOpener" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={appColor.primary} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={appColor.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v: string) => { const [, m] = v.split("-"); const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"]; return months[Number(m) - 1] || v; }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Tooltip content={<DarkTooltip />} />
                  <ReferenceLine y={trend.monthlyOpenerLength.reduce((s, d) => s + d.avgLength, 0) / trend.monthlyOpenerLength.length} stroke="#6b7280" strokeDasharray="5 4" strokeWidth={1} />
                  <Area type="monotone" dataKey="avgLength" name="Longueur" stroke={appColor.primary} fill="url(#gradOpener)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <p className="text-xs font-medium text-slate-800 mb-3">Taux de ghosting par mois</p>
            <div className="h-44 sm:h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.monthlyGhostRate}>
                  <defs>
                    <linearGradient id="gradGhost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v: string) => { const [, m] = v.split("-"); const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"]; return months[Number(m) - 1] || v; }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="rate" name="Ghost rate" stroke="#ef4444" fill="url(#gradGhost)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-xs text-slate-400 text-center py-4">
            Pas assez de donnees pour detecter une tendance (minimum 3 mois requis).
          </p>
        </Card>
      )}

      {insights.fatigueDetected && (
        <motion.div
          className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs text-violet-600">
            Signe de fatigue detecte — tes openers raccourcissent ces derniers mois.
            C'est normal apres plusieurs mois d'utilisation. Prends une pause et reviens plus fort.
          </p>
        </motion.div>
      )}
    </section>
  );
}

/** CP Section 10 — Les Signaux: H51, H52, H54, H70 */
function CPSectionSignals({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp10_signals");
  if (!insights.advancedInsights) return null;
  const adv = insights.advancedInsights;

  const gapSurvivalColor = adv.criticalGap.survivalAfterGap >= 40 ? "#34d399" : "#ef4444";
  const syncDiff = adv.temporalSync.syncSurvivalRate - adv.temporalSync.unsyncSurvivalRate;
  const asymDiff = adv.responseTimeAsymmetry.asymmetricGhostRate - adv.responseTimeAsymmetry.symmetricGhostRate;

  return (
    <section id="cp-signals" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji={"📡"} title="Les Signaux" subtitle="Les indicateurs caches qui predisent la mort d'une conversation (H51-H70)" />
      <NarrativeIntro text={`Sur ${adv.criticalGap.totalAnalyzed} conversations analysees, voici les signaux invisibles qui determinent la survie de tes echanges.`} />

      {/* H51 — Critical Gap */}
      <SpotlightCard
        value={<>{adv.criticalGap.survivalAfterGap}%</>}
        label="survivent apres un silence de 6h+"
        sublabel={`${adv.criticalGap.convosWithGap} convos touchees sur ${adv.criticalGap.totalAnalyzed}`}
        color={gapSurvivalColor}
        icon={"⏳"}
      />

      {/* H52 — Rhythm Acceleration */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Rythme de tes conversations (H52)</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-400">{adv.rhythmAcceleration.accelerating}</p>
            <p className="text-[10px] text-slate-500 mt-1">en acceleration</p>
            <p className="text-[10px] text-slate-400">{adv.rhythmAcceleration.accelerationEscalationRate}% escalation</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{adv.rhythmAcceleration.decelerating}</p>
            <p className="text-[10px] text-slate-500 mt-1">en deceleration</p>
            <p className="text-[10px] text-slate-400">{adv.rhythmAcceleration.decelerationEscalationRate}% escalation</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-500">{adv.rhythmAcceleration.stable}</p>
            <p className="text-[10px] text-slate-500 mt-1">stables</p>
          </div>
        </div>
      </Card>

      {/* H54 — Temporal Sync */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Synchronisation temporelle (H54)</p>
        <MiniBar bars={[
          { label: "Synchronises", value: adv.temporalSync.synced, color: "#34d399" },
          { label: "Desynchronises", value: adv.temporalSync.unsynced, color: "#ef4444" },
        ]} />
        <p className="mt-3 text-xs text-center" style={{ color: syncDiff > 0 ? "#34d399" : "#ef4444" }}>
          {syncDiff > 0
            ? `Les convos synchronisees survivent ${syncDiff}pts de plus`
            : `La synchronisation ne fait pas de difference significative`}
          <span className="text-slate-400"> ({adv.temporalSync.syncSurvivalRate}% vs {adv.temporalSync.unsyncSurvivalRate}%)</span>
        </p>
      </Card>

      {/* H70 — Response Time Asymmetry */}
      <SpotlightCard
        value={<>{adv.responseTimeAsymmetry.asymmetricGhostRate}%</>}
        label="ghost rate quand le tempo diverge (ratio 3:1+)"
        sublabel={`${adv.responseTimeAsymmetry.asymmetricConvos} convos avec asymetrie · ratio moyen ${adv.responseTimeAsymmetry.avgAsymmetryRatio.toFixed(1)}x`}
        color={asymDiff > 10 ? "#ef4444" : "#fbbf24"}
        icon={"⚠️"}
      />
      {adv.responseTimeAsymmetry.symmetricGhostRate > 0 && (
        <Card>
          <p className="text-xs text-center" style={{ color: asymDiff > 10 ? "#ef4444" : "#34d399" }}>
            {asymDiff > 10
              ? `L'asymetrie de tempo multiplie le ghosting : ${adv.responseTimeAsymmetry.asymmetricGhostRate}% vs ${adv.responseTimeAsymmetry.symmetricGhostRate}% quand le rythme est aligne.`
              : `Le tempo asymetrique a peu d'impact : ${adv.responseTimeAsymmetry.asymmetricGhostRate}% vs ${adv.responseTimeAsymmetry.symmetricGhostRate}% quand aligne.`}
          </p>
        </Card>
      )}
    </section>
  );
}

/** CP Section 11 — L'Effet Miroir: H55, H56, H57 */
function CPSectionMirroring({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp11_mirroring");
  if (!insights.advancedInsights) return null;
  const adv = insights.advancedInsights;

  const mirrorScore = Math.round(adv.lengthMirroring.avgMirrorScore * 100);
  const mirrorColor = mirrorScore >= 60 ? "#34d399" : mirrorScore >= 40 ? "#fbbf24" : "#ef4444";
  const mirrorDiff = adv.lengthMirroring.highMirrorSurvival - adv.lengthMirroring.lowMirrorSurvival;
  const recipDiff = adv.questionReciprocity.highReciprocityGhostRate - adv.questionReciprocity.lowReciprocityGhostRate;
  const totalBreaks = adv.initiativeRatio.userBreaks + adv.initiativeRatio.matchBreaks;
  const userInitPct = totalBreaks > 0 ? Math.round((adv.initiativeRatio.userBreaks / totalBreaks) * 100) : 50;

  return (
    <section id="cp-mirroring" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji={"🪞"} title="L'Effet Miroir" subtitle="La symetrie conversationnelle predit la qualite du lien (H55-H57)" />
      <NarrativeIntro text="Quand les deux personnes s'adaptent l'une a l'autre — en longueur, en questions, en initiative — la conversation vit plus longtemps." />

      {/* H55 — Length Mirroring */}
      <Card className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 py-4">
        <ProgressRing value={mirrorScore} max={100} size={80} label="Score miroir" color={mirrorColor} />
        <div className="text-center sm:text-left flex-1">
          <p className="text-sm text-slate-800 font-medium">Convergence de longueur (H55)</p>
          <p className="text-xs text-slate-400 mt-1">
            Survie haute convergence : <span className="font-medium text-emerald-400">{adv.lengthMirroring.highMirrorSurvival}%</span>
            {" "}vs basse : <span className="font-medium text-red-500">{adv.lengthMirroring.lowMirrorSurvival}%</span>
          </p>
          <p className="text-[10px] mt-1" style={{ color: mirrorDiff > 0 ? "#34d399" : "#ef4444" }}>
            {mirrorDiff > 0 ? `+${mirrorDiff}pts quand tu miroires la longueur` : "Le mirroring n'a pas d'impact significatif"}
          </p>
        </div>
      </Card>

      {/* H56 — Question Reciprocity */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Reciprocite des questions (H56)</p>
        <MiniBar bars={[
          { label: "Basse reciprocite", value: adv.questionReciprocity.lowReciprocityGhostRate, color: "#ef4444" },
          { label: "Haute reciprocite", value: adv.questionReciprocity.highReciprocityGhostRate, color: "#34d399" },
        ]} maxOverride={100} />
        <p className="mt-2 text-[10px] text-slate-400 text-center">
          Ratio moyen de reciprocite : {adv.questionReciprocity.avgRatio.toFixed(2)}
          {" "}· {recipDiff < 0 ? "La reciprocite reduit le ghosting" : "Pas de difference significative"}
        </p>
      </Card>

      {/* H57 — Initiative Ratio */}
      <SpotlightCard
        value={<>{userInitPct}% / {100 - userInitPct}%</>}
        label="Toi vs l'autre — qui brise le silence"
        sublabel={`${adv.initiativeRatio.overInitiatingPct}% de tes convos : tu inities 80%+ des reprises`}
        color={adv.initiativeRatio.overInitiatingPct > 50 ? "#ef4444" : appColor.primary}
        icon={"🏓"}
      />
      {adv.initiativeRatio.overInitiatingGhostRate > 0 && (
        <Card>
          <p className="text-xs text-center" style={{ color: adv.initiativeRatio.overInitiatingGhostRate > 60 ? "#ef4444" : "#fbbf24" }}>
            Quand tu inities trop : <span className="font-medium">{adv.initiativeRatio.overInitiatingGhostRate}%</span> de ghost rate
          </p>
        </Card>
      )}
    </section>
  );
}

/** CP Section 12 — Le Langage: H53, H58, H59, H60 */
function CPSectionLanguage({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp12_language");
  if (!insights.advancedInsights) return null;
  const adv = insights.advancedInsights;

  const ttrScore = Math.round(adv.lexicalRichness.avgTTR * 100);
  const ttrColor = ttrScore >= 50 ? "#34d399" : ttrScore >= 30 ? "#fbbf24" : "#ef4444";
  const emojiDrop = adv.emojiDynamics.avgDensityFirst3 - adv.emojiDynamics.avgDensityLast3;
  const humorDiff = adv.earlyHumor.earlyLaughSurvival - adv.earlyHumor.noEarlyLaughSurvival;

  return (
    <section id="cp-language" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji={"🔤"} title="Le Langage" subtitle="Ce que tes mots revelent sur la qualite de tes conversations (H53-H60)" />
      <NarrativeIntro text="Le choix des mots, la diversite du vocabulaire et le registre emotionnel predisent la survie de tes conversations." />

      {/* H53 — Formality Shift */}
      {adv.formalityShift && (
        <SpotlightCard
          value={<>{adv.formalityShift.convosWithShift}</>}
          label={`convos passees du "vous" au "tu" (sur ${adv.formalityShift.convosWithVous} en vous)`}
          sublabel={`Transition en moyenne au message #${adv.formalityShift.avgShiftMsgNumber} · Survie ${adv.formalityShift.shiftSurvivalRate}% vs ${adv.formalityShift.noShiftSurvivalRate}%`}
          color={adv.formalityShift.shiftSurvivalRate > adv.formalityShift.noShiftSurvivalRate ? "#34d399" : "#fbbf24"}
          icon={"🇨🇭"}
        />
      )}

      {/* H58 — Lexical Richness */}
      <Card className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 py-4">
        <ProgressRing value={ttrScore} max={100} size={80} label="Richesse lexicale" color={ttrColor} />
        <div className="text-center sm:text-left flex-1">
          <p className="text-sm text-slate-800 font-medium">Diversite du vocabulaire (H58)</p>
          <p className="text-xs text-slate-400 mt-1">
            TTR eleve : survie <span className="font-medium text-emerald-400">{adv.lexicalRichness.highTTRsurvival}%</span>
            {" "}vs faible : <span className="font-medium text-red-500">{adv.lexicalRichness.lowTTRsurvival}%</span>
          </p>
        </div>
      </Card>

      {/* H59 — Emoji Dynamics */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Dynamique des emojis (H59)</p>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold" style={{ color: appColor.primary }}>{adv.emojiDynamics.avgDensityFirst3.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">densite 3 premiers msgs</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: emojiDrop > 0.05 ? "#ef4444" : "#34d399" }}>{adv.emojiDynamics.avgDensityLast3.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">densite 3 derniers msgs</p>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs" style={{ color: emojiDrop > 0.05 ? "#ef4444" : "#34d399" }}>
            {emojiDrop > 0.05
              ? `Chute d'emojis detectee — ghost rate ${adv.emojiDynamics.densityDropGhostRate}% vs ${adv.emojiDynamics.densityStableGhostRate}% quand stable`
              : `Densite stable — ghost rate ${adv.emojiDynamics.densityStableGhostRate}%`}
          </p>
        </div>
      </Card>

      {/* H60 — Early Humor */}
      <SpotlightCard
        value={<>{adv.earlyHumor.earlyLaughSurvival}%</>}
        label="survie quand un rire arrive dans les 3 premiers echanges"
        sublabel={`${adv.earlyHumor.convosWithEarlyLaugh} convos avec humour precoce · Sans humour : ${adv.earlyHumor.noEarlyLaughSurvival}%`}
        color={humorDiff > 0 ? "#34d399" : "#fbbf24"}
        icon={"😂"}
      />
    </section>
  );
}

/** CP Section 13 — Le Timing: H61, H62, H64, H65 */
function CPSectionTimingAdv({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp13_timing");
  if (!insights.advancedInsights) return null;
  const adv = insights.advancedInsights;

  const msg3QDiff = adv.message3Quality.questionSurvival - adv.message3Quality.noQuestionSurvival;
  const shapes = [
    { label: "Diamant", value: adv.conversationShapes.diamond, color: "#34d399", survival: adv.conversationShapes.diamondSurvival },
    { label: "Plateau", value: adv.conversationShapes.plateau, color: "#818cf8" },
    { label: "Erratique", value: adv.conversationShapes.erratic, color: "#fbbf24" },
    { label: "Falaise", value: adv.conversationShapes.cliff, color: "#ef4444", survival: adv.conversationShapes.cliffSurvival },
  ];
  const trendLabel = adv.learningCurve.trend === "improving" ? "En progression" : adv.learningCurve.trend === "declining" ? "En declin" : "Stable";
  const trendColor = adv.learningCurve.trend === "improving" ? "#34d399" : adv.learningCurve.trend === "declining" ? "#ef4444" : "#818cf8";

  return (
    <section id="cp-timing" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji={"⏰"} title="Le Timing" subtitle="Le moment exact ou une conversation se joue (H61-H65)" />
      <NarrativeIntro text="Le message #3, la forme de tes conversations et ta capacite a gerer plusieurs convos en parallele — tout se mesure." />

      {/* H61 — Message #3 Quality */}
      <SpotlightCard
        value={<>{adv.message3Quality.avgLength} car.</>}
        label="longueur moyenne de ton message #3"
        sublabel={`${adv.message3Quality.withQuestionPct}% contiennent une question`}
        color={appColor.primary}
        icon={"✉️"}
      />
      <Card>
        <p className="text-xs text-center" style={{ color: msg3QDiff > 0 ? "#34d399" : "#ef4444" }}>
          {msg3QDiff > 0
            ? `Avec question au msg #3 : ${adv.message3Quality.questionSurvival}% de survie vs ${adv.message3Quality.noQuestionSurvival}% sans (+${msg3QDiff}pts)`
            : `La question au msg #3 n'a pas d'impact significatif ici : ${adv.message3Quality.questionSurvival}% vs ${adv.message3Quality.noQuestionSurvival}%`}
        </p>
      </Card>

      {/* H62 — Conversation Shapes */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Forme de tes conversations (H62)</p>
        <MiniBar bars={shapes.map((s) => ({ label: s.label, value: s.value, color: s.color }))} />
        <div className="mt-3 flex flex-wrap gap-3 justify-center text-[10px]">
          <span className="text-emerald-400">Diamant : {adv.conversationShapes.diamondSurvival}% survie</span>
          <span className="text-slate-400">|</span>
          <span className="text-red-500">Falaise : {adv.conversationShapes.cliffSurvival}% survie</span>
        </div>
      </Card>

      {/* H64 — Learning Curve */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Courbe d'apprentissage (H64)</p>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-bold" style={{ color: trendColor }}>{trendLabel}</span>
          <span className="text-[10px] text-slate-400">
            {adv.learningCurve.trend === "improving" ? "Tes openers s'ameliorent" : adv.learningCurve.trend === "declining" ? "Tes openers se degradent" : "Tes openers sont constants"}
          </span>
        </div>
        {adv.learningCurve.quintiles.length > 0 && (
          <div className="space-y-1.5">
            {adv.learningCurve.quintiles.map((q, i) => {
              const maxScore = Math.max(...adv.learningCurve.quintiles.map((qq) => qq.avgOpenerScore), 1);
              const widthPct = Math.max(4, (q.avgOpenerScore / maxScore) * 100);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[10px] text-slate-500 truncate">{q.period}</span>
                  <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-white">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: trendColor }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${widthPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.1 }}
                    />
                  </div>
                  <span className="w-16 text-right text-[10px] text-slate-400">{q.survivalRate}% survie</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* H65 — Simultaneity */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Conversations simultanees (H65)</p>
        <div className="grid grid-cols-2 gap-4 text-center mb-3">
          <div>
            <p className="text-2xl font-bold" style={{ color: appColor.primary }}>{adv.simultaneity.avgActiveConvos.toFixed(1)}</p>
            <p className="text-[10px] text-slate-500 mt-1">convos actives en moyenne</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: adv.simultaneity.overloadThreshold > 0 ? "#fbbf24" : "#34d399" }}>
              {adv.simultaneity.overloadThreshold > 0 ? adv.simultaneity.overloadThreshold : "N/A"}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">seuil de surcharge</p>
          </div>
        </div>
        {adv.simultaneity.qualityByLoad.length > 0 && (
          <ExpandToggle title="Detail par nombre de convos actives">
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-200 bg-white">
                  <th className="px-3 py-2 text-left text-slate-500">Actives</th>
                  <th className="px-3 py-2 text-right text-slate-500">Reponse moy.</th>
                  <th className="px-3 py-2 text-right text-slate-500">Long. msg moy.</th>
                </tr></thead>
                <tbody>
                  {adv.simultaneity.qualityByLoad.map((row) => (
                    <tr key={row.active} className="border-b border-gray-200 last:border-0">
                      <td className="px-3 py-1.5 text-slate-800">{row.active} convos</td>
                      <td className="px-3 py-1.5 text-right text-slate-800">{row.avgResponseMin}min</td>
                      <td className="px-3 py-1.5 text-right text-slate-800">{row.avgMsgLength} car.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ExpandToggle>
        )}
      </Card>
    </section>
  );
}

/** CP Section 14 — Les Patterns: H63, H66, H67, H68, H69 */
function CPSectionPatterns({ insights, appColor }: CPScreenProps) {
  const ref = useCPTracking("cp14_patterns");
  if (!insights.advancedInsights) return null;
  const adv = insights.advancedInsights;

  const inclDiff = adv.inclusivePronouns.inclusiveEscalationRate - adv.inclusivePronouns.noInclusiveEscalationRate;
  const gifDiff = adv.gifDisengagement.gifIncreaseGhostRate - adv.gifDisengagement.noGifChangeGhostRate;
  const shortDiff = adv.shortMessageKill.shortEarlyGhostRate - adv.shortMessageKill.normalGhostRate;

  // Find best and worst day from dayOfWeekConvos
  const bestDay = adv.dayOfWeekConvos.length > 0
    ? adv.dayOfWeekConvos.reduce((a, b) => a.escalationRate > b.escalationRate ? a : b)
    : null;
  const maxEsc = Math.max(...adv.dayOfWeekConvos.map((d) => d.escalationRate), 1);

  return (
    <section id="cp-patterns" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji={"🔮"} title="Les Patterns" subtitle="Les habitudes invisibles qui separent les conversations qui vivent de celles qui meurent (H63-H69)" />
      <NarrativeIntro text="Pronoms, jours de la semaine, GIFs, temps de reaction — chaque pattern raconte une histoire." />

      {/* H63 — Inclusive Pronouns */}
      <Card>
        <p className="text-xs font-medium text-slate-800 mb-3">Pronoms inclusifs : "on", "nous", "ensemble" (H63)</p>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-400">{adv.inclusivePronouns.inclusiveEscalationRate}%</p>
            <p className="text-[10px] text-slate-500 mt-1">escalation avec pronoms inclusifs</p>
            <p className="text-[10px] text-slate-400">{adv.inclusivePronouns.convosWithInclusive} convos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-500">{adv.inclusivePronouns.noInclusiveEscalationRate}%</p>
            <p className="text-[10px] text-slate-500 mt-1">escalation sans</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-center" style={{ color: inclDiff > 0 ? "#34d399" : "#fbbf24" }}>
          {inclDiff > 0
            ? `+${inclDiff}pts d'escalation avec des pronoms inclusifs · 1er usage en moy. au msg #${adv.inclusivePronouns.avgFirstInclusiveMsg}`
            : "Pas de difference significative dans tes donnees"}
        </p>
      </Card>

      {/* H66 — Day-of-Week */}
      {adv.dayOfWeekConvos.length > 0 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Escalation par jour de la semaine (H66)</p>
          <MiniBar
            bars={adv.dayOfWeekConvos.map((d) => ({
              label: d.day,
              value: d.escalationRate,
              color: d === bestDay ? "#34d399" : "#818cf8",
            }))}
            maxOverride={maxEsc}
          />
          {bestDay && (
            <p className="mt-2 text-[10px] text-slate-400 text-center">
              Meilleur jour : <span className="text-emerald-400 font-medium">{bestDay.day}</span> ({bestDay.escalationRate}% escalation)
            </p>
          )}
        </Card>
      )}

      {/* H67 — GIF Disengagement */}
      <SpotlightCard
        value={<>{adv.gifDisengagement.gifIncreaseGhostRate}%</>}
        label="ghost rate quand les GIFs augmentent en fin de convo"
        sublabel={`${adv.gifDisengagement.convosWithGifIncrease} convos detectees · sans augmentation : ${adv.gifDisengagement.noGifChangeGhostRate}%`}
        color={gifDiff > 10 ? "#ef4444" : "#fbbf24"}
        icon={"🎥"}
      />

      {/* H68 — Match-to-Message Window */}
      {adv.matchToMessageWindow.buckets.length > 0 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Delai avant le 1er message (H68)</p>
          <MiniBar
            bars={adv.matchToMessageWindow.buckets.map((b) => ({
              label: b.label,
              value: b.survivalRate,
              color: b.survivalRate >= 50 ? "#34d399" : b.survivalRate >= 30 ? "#fbbf24" : "#ef4444",
            }))}
            maxOverride={100}
          />
          <p className="mt-2 text-[10px] text-slate-400 text-center">
            % = taux de survie par fenetre de temps
          </p>
        </Card>
      )}

      {/* H69 — Short Message Kill */}
      <SpotlightCard
        value={<>{adv.shortMessageKill.shortEarlyGhostRate}%</>}
        label="ghost rate avec messages ultra-courts (positions 2-5)"
        sublabel={`${adv.shortMessageKill.convosWithShortEarly} convos detectees · taux normal : ${adv.shortMessageKill.normalGhostRate}%`}
        color={shortDiff > 10 ? "#ef4444" : "#fbbf24"}
        icon={"✂️"}
      />
      {shortDiff > 10 && (
        <Card>
          <p className="text-xs text-center text-red-500">
            Les messages ultra-courts en debut de conversation augmentent le ghosting de +{shortDiff}pts. Investis un peu plus tot.
          </p>
        </Card>
      )}
    </section>
  );
}

/** CP Section 9 — Le Verdict: final score + breakdown */
function CPSectionVerdict({ insights, appColor, onShareClick }: CPScreenProps) {
  const ref = useCPTracking("cp9_verdict");
  const label = getConversationScoreLabel(insights.score);
  const scoreColor = insights.score >= 80 ? "#34d399" : insights.score >= 60 ? "#818cf8" : insights.score >= 40 ? "#fbbf24" : "#ef4444";

  // Determine next archetype progression
  const totalScore = insights.score;
  const nextThreshold = totalScore >= 80 ? null : totalScore >= 60 ? 80 : totalScore >= 40 ? 60 : 40;
  const nextLabel = nextThreshold === 80 ? "Conversationnel Elite" : nextThreshold === 60 ? "Solide" : nextThreshold === 40 ? "En Developpement" : null;
  const pointsToNext = nextThreshold ? nextThreshold - totalScore : 0;

  const ringColor = (val: number) => val >= 15 ? "#34d399" : val >= 10 ? "#818cf8" : val >= 5 ? "#fbbf24" : "#ef4444";

  return (
    <section id="cp-verdict" className="scroll-mt-28 space-y-5" ref={ref}>
      <SectionTitle emoji="🏆" title="Le Verdict" subtitle="Ton score conversationnel global, base sur 5 dimensions" />
      <NarrativeIntro text={`${insights.conversationsAnalyzed} conversations analysees, 5 axes evalues. Voici ton bilan.`} />

      <Card className="border-brand-200 bg-brand-50">
        {/* Score geant */}
        <div className="text-center py-6">
          <div style={{ color: scoreColor }}>
            <AnimatedCounter
              target={insights.score}
              suffix="/100"
              className="text-6xl sm:text-7xl font-black"
              duration={1800}
            />
          </div>
          <p className="mt-2 text-sm font-semibold" style={{ color: scoreColor }}>{label}</p>
        </div>

        {/* 5 ProgressRings */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-2">
          <ProgressRing value={insights.scoreBreakdown.questionDensity} label="Questions" color={ringColor(insights.scoreBreakdown.questionDensity)} />
          <ProgressRing value={insights.scoreBreakdown.responseSpeed} label="Reactivite" color={ringColor(insights.scoreBreakdown.responseSpeed)} />
          <ProgressRing value={insights.scoreBreakdown.openerQuality} label="Openers" color={ringColor(insights.scoreBreakdown.openerQuality)} />
          <ProgressRing value={insights.scoreBreakdown.escalationTiming} label="Escalation" color={ringColor(insights.scoreBreakdown.escalationTiming)} />
          <ProgressRing value={insights.scoreBreakdown.conversationBalance} label="Equilibre" color={ringColor(insights.scoreBreakdown.conversationBalance)} />
        </div>

        {/* Archetype */}
        <div className="mt-6 text-center">
          <motion.p
            className="text-2xl sm:text-3xl font-extrabold"
            style={{ color: appColor.primary }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {insights.archetype}
          </motion.p>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            {insights.archetypeDescription}
          </p>
          {nextLabel && pointsToNext > 0 && (
            <p className="mt-2 text-[11px] text-slate-400">
              Tu es a <span className="text-slate-900 font-medium">{pointsToNext} pts</span> de devenir <span style={{ color: scoreColor }} className="font-medium">{nextLabel}</span>
            </p>
          )}
        </div>

        {/* Share button */}
        {onShareClick && (
          <motion.button
            onClick={onShareClick}
            className={`mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${appColor.gradient} px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110`}
            whileTap={{ scale: 0.98 }}
          >
            Partager mon Conversation Pulse
          </motion.button>
        )}
      </Card>

      <ExpandToggle title="Comment le score est calcule">
        <div className="space-y-2 text-xs text-slate-400">
          <p>Le score CDS (Conversation Dating Score) est base sur 5 axes, chacun note sur 20 :</p>
          <ul className="space-y-1 pl-4">
            <li><span className="text-slate-800 font-medium">Questions (0-20)</span> — densite de "?" dans tes messages envoyes (H27)</li>
            <li><span className="text-slate-800 font-medium">Reactivite (0-20)</span> — temps de reponse median (H34)</li>
            <li><span className="text-slate-800 font-medium">Openers (0-20)</span> — longueur + question + personnalisation (H43, H50)</li>
            <li><span className="text-slate-800 font-medium">Escalation (0-20)</span> — timing de proposition de rendez-vous (H29)</li>
            <li><span className="text-slate-800 font-medium">Equilibre (0-20)</span> — ratio messages envoyes vs recus</li>
          </ul>
          <p className="text-[10px] text-slate-400 mt-2">
            Base sur {insights.conversationsAnalyzed} conversations analysees · 100% client-side · Confiance: {insights.confidenceLevel}
          </p>
        </div>
      </ExpandToggle>
    </section>
  );
}

// ── Main report nav items ────────────────────────────────────

const WRAPPED_NAV_ITEMS = [
  { id: "wr-overview", emoji: "📊", label: "Vue" },
  { id: "wr-timing", emoji: "⏰", label: "Timing" },
  { id: "wr-conversion", emoji: "🎯", label: "Conversion" },
  { id: "wr-conversations", emoji: "💬", label: "Conversations" },
  { id: "wr-dna", emoji: "🧬", label: "ADN" },
  { id: "wr-verdict", emoji: "🏆", label: "Verdict" },
];

// ══════════════════════════════════════════════════════════════
// ═══ SWIPE PULSE — H71-H90 Advanced Swipe Analysis ═══
// ══════════════════════════════════════════════════════════════

const SP_NAV_ITEMS = [
  { id: "sp-algo", emoji: "👻", label: "Algo" },
  { id: "sp-psycho", emoji: "🧠", label: "Psycho" },
  { id: "sp-rhythms", emoji: "🕐", label: "Rythmes" },
  { id: "sp-conversion", emoji: "🎯", label: "Conversion" },
  { id: "sp-archetype", emoji: "🧬", label: "ADN Swipe" },
];


type SPScreenProps = {
  insights: AdvancedSwipeInsights;
  appColor: { primary: string; gradient: string; bg: string };
};

const ARCHETYPE_LABELS: Record<SwipeArchetype, { emoji: string; name: string; description: string }> = {
  stratege: { emoji: "♟️", name: "Le Stratege", description: "Selectif, regulier, et strategique. Tu optimises chaque swipe." },
  boulimique: { emoji: "🌪️", name: "Le Boulimique", description: "Volume massif, fatigue rapide. L'algo te penalise." },
  fantome: { emoji: "👻", name: "Le Fantome", description: "Longues absences suivies de retours — l'algo te re-booste a chaque fois." },
  nocturne: { emoji: "🌙", name: "Le Nocturne", description: "Actif quand les autres dorment. Ton pool est reduit mais captif." },
  methodique: { emoji: "⚙️", name: "Le Methodique", description: "Rythme stable, horaires fixes. L'algo adore ta previsibilite." },
  rebelle: { emoji: "⚡", name: "Le Rebelle", description: "Imprevisible dans tes patterns. Ca perturbe les signaux algorithmiques." },
};

/** SP Section 1 — L'Algorithme Fantome: H71-H74 */
function SPSectionAlgorithm({ insights, appColor }: SPScreenProps) {
  const h71 = insights.swipeVelocityDecay;
  const h72 = insights.matchClusteringPeriodicity;
  const h73 = insights.likeToMatchLatencyDrift;
  const h74 = insights.postInactivitySurge;
  if (!h71 && !h72 && !h73 && !h74) return null;

  return (
    <section id="sp-algo" className="scroll-mt-28 space-y-5">
      <SectionTitle emoji={"👻"} title="L'Algorithme Fantome" subtitle="Comment l'algo controle secretement tes matchs (H71-H74)" />
      <NarrativeIntro text="Derriere chaque match se cache un algorithme. Tes patterns de swipe lui envoient des signaux — et il reagit." />

      {h71 && (
        <SpotlightCard
          value={<>{h71.decayPct}%</>}
          label="de tes sessions montrent un ralentissement"
          sublabel={`Gap moyen x${h71.decayRatio} entre debut et fin de session (${h71.sessionsAnalyzed} sessions)`}
          color={h71.decayPct > 50 ? "#ef4444" : "#fbbf24"}
          icon={"⏳"}
        />
      )}

      {h72 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Periodisation des matchs (H72)</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold" style={{ color: appColor.primary }}>{h72.clusters}</p>
              <p className="text-[10px] text-slate-500 mt-1">clusters detectes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{h72.avgClusterSize}</p>
              <p className="text-[10px] text-slate-500 mt-1">matchs/cluster moy.</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{h72.maxGapDays}j</p>
              <p className="text-[10px] text-slate-500 mt-1">plus long drought</p>
            </div>
          </div>
          {h72.periodicityDetected && (
            <p className="mt-3 text-xs text-center text-emerald-400">Periodicite detectee — l'algo distribue tes matchs en batch</p>
          )}
        </Card>
      )}

      {h73 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Derive du delai like → match (H73)</p>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{h73.earlyAvgHours}h</p>
              <p className="text-[10px] text-slate-400">debut</p>
            </div>
            <span className="text-slate-400 text-xl">{h73.driftDirection === "slower" ? "→" : h73.driftDirection === "faster" ? "←" : "↔"}</span>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: h73.driftDirection === "slower" ? "#ef4444" : "#34d399" }}>{h73.lateAvgHours}h</p>
              <p className="text-[10px] text-slate-400">fin</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-center text-slate-400">
            {h73.driftDirection === "slower" ? `Latence +${h73.driftPct}% — possible decay ELO` :
             h73.driftDirection === "faster" ? `Latence -${h73.driftPct}% — recovery ELO detecte` :
             "Latence stable dans le temps"}
          </p>
        </Card>
      )}

      {h74 && h74.inactivityGaps > 0 && (
        <SpotlightCard
          value={<>x{h74.surgeMultiplier}</>}
          label="match rate apres une pause de 3+ jours"
          sublabel={`${h74.inactivityGaps} pauses detectees · ${h74.surgeMatchRate}% vs ${h74.normalMatchRate}% normal`}
          color={h74.surgeMultiplier > 1.2 ? "#34d399" : "#9ca3af"}
          icon={"🔄"}
        />
      )}
    </section>
  );
}

/** SP Section 2 — Psychologie du Swipe: H75-H78 */
function SPSectionPsychology({ insights, appColor }: SPScreenProps) {
  const h75 = insights.selectivityOscillation;
  const h76 = insights.passStreakMomentum;
  const h77 = insights.lateNightDesperation;
  const h78 = insights.superlikeEfficiency;
  if (!h75 && !h76 && !h77 && !h78) return null;

  return (
    <section id="sp-psycho" className="scroll-mt-28 space-y-5">
      <SectionTitle emoji={"🧠"} title="Psychologie du Swipe" subtitle="Tes biais comportementaux trahis par tes donnees (H75-H78)" />
      <NarrativeIntro text="Chaque session de swipe revele ta psychologie. L'algo le sait — et l'exploite." />

      {h75 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Oscillation de selectivite (H75)</p>
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-amber-600">{h75.oscillationScore}</p>
              <p className="text-[10px] text-slate-500 mt-1">score d'oscillation</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">{h75.stableSessions}</p>
              <p className="text-[10px] text-slate-500 mt-1">sessions stables</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{h75.oscillatingSessions}</p>
              <p className="text-[10px] text-slate-500 mt-1">sessions instables</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-center text-slate-400">
            {h75.oscillationScore > 20 ? "Forte oscillation — l'algo recalcule ton profil a chaque session" : "Selectivite relativement stable"}
          </p>
        </Card>
      )}

      {h76 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Momentum apres passes (H76)</p>
          <MiniBar bars={[
            { label: "Apres 5+ passes", value: h76.postStreakMatchRate, color: "#34d399" },
            { label: "Match rate normal", value: h76.normalMatchRate, color: "#6366f1" },
          ]} />
          <p className="mt-2 text-xs text-center text-slate-400">
            {h76.streaksFound} streaks de passes detectes (moy. {h76.avgStreakLength} passes)
          </p>
        </Card>
      )}

      {h77 && (
        <SpotlightCard
          value={<>{h77.lateNightPct}%</>}
          label="de tes swipes entre 1h et 5h du matin"
          sublabel={`Match rate nuit: ${h77.lateNightMatchRate}% vs jour: ${h77.dayMatchRate}%`}
          color={h77.matchRateDiff > 0.5 ? "#ef4444" : "#fbbf24"}
          icon={"🌙"}
        />
      )}

      {h78 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Efficacite des Superlikes (H78)</p>
          <MiniBar bars={[
            { label: "Super Likes", value: h78.superlikeMatchRate, color: "#3b82f6" },
            { label: "Likes normaux", value: h78.normalMatchRate, color: "#6366f1" },
          ]} />
          <p className="mt-2 text-xs text-center" style={{ color: h78.paradoxDetected ? "#ef4444" : "#34d399" }}>
            {h78.paradoxDetected
              ? `Paradoxe detecte : tes superlikes convertissent MOINS que tes likes normaux (${h78.superlikesSent} envoyes)`
              : `Superlikes ${h78.efficiencyRatio > 1 ? "plus" : "aussi"} efficaces que les likes normaux`}
          </p>
        </Card>
      )}
    </section>
  );
}

/** SP Section 3 — Rythmes Caches: H79-H82 */
function SPSectionRhythms({ insights, appColor }: SPScreenProps) {
  const h79 = insights.circadianSignature;
  const h80 = insights.weeklyMicroCycles;
  const h81 = insights.monthStartRenewal;
  const h82 = insights.droughtToBingeRebound;
  if (!h79 && !h80 && !h81 && !h82) return null;

  return (
    <section id="sp-rhythms" className="scroll-mt-28 space-y-5">
      <SectionTitle emoji={"🕐"} title="Rythmes Caches" subtitle="Les cycles invisibles qui gouvernent tes resultats (H79-H82)" />
      <NarrativeIntro text="Ton corps a un rythme circadien. Ton profil dating aussi. L'algo le detecte." />

      {h79 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Empreinte circadienne (H79)</p>
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-lg font-bold" style={{ color: appColor.primary }}>
                {h79.signatureHours.map((h) => `${h}h`).join(", ")}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">heures signature</p>
            </div>
            <ProgressRing value={Math.round(h79.stabilityScore * 100)} max={100} size={70} label="Stabilite" color={h79.stabilityScore > 0.7 ? "#34d399" : "#fbbf24"} />
          </div>
          {h79.weeksAnalyzed >= 3 && (
            <p className="mt-3 text-xs text-center text-slate-400">
              {h79.normalMatchRate > h79.deviationMatchRate
                ? `Rester dans ton pattern = ${h79.normalMatchRate} matchs/sem vs ${h79.deviationMatchRate} hors pattern`
                : "Devier de ton pattern n'a pas d'impact significatif"}
            </p>
          )}
        </Card>
      )}

      {h80 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Micro-cycles hebdo (H80)</p>
          <MiniBar bars={[
            { label: "Semaines normales", value: h80.normalWeekMatchRate, color: "#34d399" },
            { label: "Semaines cassees", value: h80.brokenWeekMatchRate, color: "#ef4444" },
          ]} />
          <p className="mt-2 text-xs text-center text-slate-400">
            {h80.brokenWeeks} semaines "cassees" ({">"}50% deviation) sur {h80.brokenWeeks + h80.normalWeeks}
            {h80.cyclePenalty > 0 && ` · penalite: -${h80.cyclePenalty} matchs/sem`}
          </p>
        </Card>
      )}

      {h81 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Effet debut de mois (H81)</p>
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{h81.monthStartMatchRate}%</p>
              <p className="text-[10px] text-slate-500 mt-1">jours 1-3</p>
            </div>
            <span className="text-slate-400">vs</span>
            <div>
              <p className="text-2xl font-bold text-slate-500">{h81.monthRestMatchRate}%</p>
              <p className="text-[10px] text-slate-500 mt-1">jours 4-31</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-center text-slate-400">
            {h81.renewalBoost > 1.2 ? `Boost de x${h81.renewalBoost} en debut de mois (renouvellements d'abos)` : "Pas de difference significative"}
          </p>
        </Card>
      )}

      {h82 && h82.droughts > 0 && (
        <SpotlightCard
          value={<>{h82.reboundPenalty}%</>}
          label="de penalite quand tu binge-swipes apres une secheresse"
          sublabel={`${h82.droughts} secheresses detectees · ${h82.bingesAfterDrought} binges · ${h82.bingeMatchRate}% vs ${h82.normalMatchRate}%`}
          color={h82.reboundPenalty > 30 ? "#ef4444" : "#fbbf24"}
          icon={"🌵"}
        />
      )}
    </section>
  );
}

/** SP Section 4 — Conversion Secrete: H83-H86 */
function SPSectionConversion({ insights, appColor }: SPScreenProps) {
  const h83 = insights.firstSwipeBonus;
  const h84 = insights.rightSwipeMomentum;
  const h85 = insights.matchQualityBySelectivity;
  const h86 = insights.diminishingReturns;
  if (!h83 && !h84 && !h85 && !h86) return null;

  return (
    <section id="sp-conversion" className="scroll-mt-28 space-y-5">
      <SectionTitle emoji={"🎯"} title="Conversion Secrete" subtitle="Les mecaniques cachees de la conversion swipe → match (H83-H86)" />
      <NarrativeIntro text="Tous les likes ne se valent pas. Le timing, le contexte, et le volume changent radicalement la conversion." />

      {h83 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Bonus 1er swipe de session (H83)</p>
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{h83.firstSwipeMatchRate}%</p>
              <p className="text-[10px] text-slate-500 mt-1">1er like</p>
            </div>
            <span className="text-slate-400">vs</span>
            <div>
              <p className="text-2xl font-bold text-slate-500">{h83.restMatchRate}%</p>
              <p className="text-[10px] text-slate-500 mt-1">les suivants</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-center text-slate-400">
            {h83.bonusMultiplier > 1.3 ? `x${h83.bonusMultiplier} — ton 1er like de session est privilegie` : "Pas de bonus significatif"}
            {` (${h83.sessionsAnalyzed} sessions)`}
          </p>
        </Card>
      )}

      {h84 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Momentum hebdo (H84)</p>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: h84.momentumCorrelation > 0.3 ? "#34d399" : h84.momentumCorrelation > 0 ? "#fbbf24" : "#ef4444" }}>
              {h84.momentumCorrelation > 0 ? "+" : ""}{Math.round(h84.momentumCorrelation * 100)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">correlation semaine N → N+1</p>
          </div>
          <p className="mt-2 text-xs text-center text-slate-400">
            {h84.momentumCorrelation > 0.3 ? "Fort momentum : une bonne semaine predit la suivante" :
             h84.momentumCorrelation > 0 ? "Momentum modere" :
             "Pas de momentum — tes resultats sont independants semaine a semaine"}
            {h84.streakWeeks > 1 && ` · plus longue serie: ${h84.streakWeeks} semaines`}
          </p>
        </Card>
      )}

      {h85 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Qualite par selectivite (H85)</p>
          <MiniBar bars={[
            { label: `Selectif (<${h85.selectivityThreshold}%)`, value: h85.selectiveMatchConvoRate, color: "#34d399" },
            { label: "Mass-like (>60%)", value: h85.massLikeMatchConvoRate, color: "#ef4444" },
          ]} maxOverride={100} />
          <p className="mt-2 text-xs text-center text-slate-400">
            {h85.qualityMultiplier > 1.3
              ? `x${h85.qualityMultiplier} — les matchs en phase selective menent ${h85.qualityMultiplier}x plus a une conversation`
              : "La selectivite n'a pas d'impact significatif sur la qualite des matchs"}
          </p>
        </Card>
      )}

      {h86 && (
        <SpotlightCard
          value={<>{h86.optimalDailyLikes}</>}
          label="likes/jour = sweet spot optimal"
          sublabel={`Taux a l'optimal: ${h86.matchRateAtOptimal}% · Au-dessus: ${h86.matchRateAboveOptimal}% (${h86.decayFactor > 0 ? `-${h86.decayFactor}%` : "stable"})`}
          color={h86.decayFactor > 30 ? "#ef4444" : "#fbbf24"}
          icon={"📉"}
        />
      )}
    </section>
  );
}

/** SP Section 5 — ADN Swipe (Archetype): H87-H90 */
function SPSectionArchetype({ insights, appColor }: SPScreenProps) {
  const h87 = insights.activeVsPassiveDays;
  const h88 = insights.appOpenDecisiveness;
  const h89 = insights.subscriptionTimingImpact;
  const h90 = insights.swipePersonalityArchetype;
  if (!h87 && !h88 && !h89 && !h90) return null;

  return (
    <section id="sp-archetype" className="scroll-mt-28 space-y-5">
      <SectionTitle emoji={"🧬"} title="ADN Swipe" subtitle="Ton profil comportemental complet — de H71 a H90" />
      <NarrativeIntro text="Tes patterns de swipe racontent une histoire. Voici ton archetype." />

      {h90 && (
        <motion.div
          className="relative overflow-hidden rounded-2xl border p-6 sm:p-8 text-center"
          style={{
            background: `linear-gradient(135deg, ${appColor.primary}15 0%, transparent 60%)`,
            borderColor: `${appColor.primary}40`,
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-6xl mb-3">{ARCHETYPE_LABELS[h90.archetype].emoji}</p>
          <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: appColor.primary }}>
            {ARCHETYPE_LABELS[h90.archetype].name}
          </p>
          <p className="mt-2 text-sm text-slate-500">{ARCHETYPE_LABELS[h90.archetype].description}</p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {h90.dominantTraits.map((trait) => (
              <span key={trait} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-slate-800">
                {trait}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">
            Base sur {h90.hypothesesUsed} hypotheses analysees
          </p>
        </motion.div>
      )}

      {h87 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Jours actifs vs passifs (H87)</p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
              <p className="text-2xl font-bold text-emerald-400">{h87.activeDays}</p>
              <p className="text-[10px] text-slate-500 mt-1">jours avec match</p>
              <p className="text-[10px] text-slate-400">{h87.activeAvgSwipes} swipes/j · {h87.activeAvgLikeRate}% like rate</p>
            </div>
            <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3">
              <p className="text-2xl font-bold text-red-500">{h87.passiveDays}</p>
              <p className="text-[10px] text-slate-500 mt-1">jours sans match</p>
              <p className="text-[10px] text-slate-400">{h87.passiveAvgSwipes} swipes/j · {h87.passiveAvgLikeRate}% like rate</p>
            </div>
          </div>
        </Card>
      )}

      {h88 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Decisivite d'utilisation (H88)</p>
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-lg font-bold text-slate-800">{h88.avgOpensPerDay}</p>
              <p className="text-[10px] text-slate-500">ouvertures/jour</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: appColor.primary }}>{h88.avgSwipesPerOpen}</p>
              <p className="text-[10px] text-slate-500">swipes/ouverture</p>
            </div>
          </div>
          {h88.decisivenessPenalty > 20 && (
            <p className="mt-2 text-xs text-center text-amber-600">
              Beaucoup d'ouvertures, peu de swipes = "browsing" — penalite de {h88.decisivenessPenalty}%
            </p>
          )}
        </Card>
      )}

      {h89 && (
        <Card>
          <p className="text-xs font-medium text-slate-800 mb-3">Impact timing abonnement (H89)</p>
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{h89.first7dMatchRate}</p>
              <p className="text-[10px] text-slate-500 mt-1">matchs/jour (7 premiers j)</p>
            </div>
            <span className="text-slate-400 text-xl">→</span>
            <div>
              <p className="text-2xl font-bold text-red-500">{h89.last7dMatchRate}</p>
              <p className="text-[10px] text-slate-500 mt-1">matchs/jour (7 derniers j)</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-center text-slate-400">
            {h89.frontLoadingRatio > 1.5
              ? `Front-loading detecte (x${h89.frontLoadingRatio}) — l'app te montre plus de profils au debut pour te retenir`
              : "Distribution uniforme sur la duree de l'abonnement"}
            {` · ${h89.subscriptionPeriods} periode(s) analysee(s)`}
          </p>
        </Card>
      )}

      {h90 && (
        <ExpandToggle title="Scores detailles par archetype">
          <div className="space-y-1.5">
            {(Object.entries(h90.scores) as [SwipeArchetype, number][])
              .sort(([, a], [, b]) => b - a)
              .map(([arch, score]) => (
                <div key={arch} className="flex items-center gap-2">
                  <span className="w-6 text-center">{ARCHETYPE_LABELS[arch].emoji}</span>
                  <span className="w-24 text-[11px] text-slate-500">{ARCHETYPE_LABELS[arch].name}</span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: arch === h90.archetype ? appColor.primary : "#4b5563" }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(score / Math.max(...Object.values(h90.scores), 1)) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <span className="w-6 text-right text-[11px] font-medium text-slate-800">{score}</span>
                </div>
              ))}
          </div>
        </ExpandToggle>
      )}
    </section>
  );
}

export default function WrappedReport({ metrics, conversationInsights, advancedSwipeInsights, onShareClick }: WrappedReportProps) {
  const [benchmarkGender, setBenchmarkGender] = React.useState<Gender>("men");
  const appColor = APP_COLORS[metrics.source] ?? APP_COLORS.tinder;

  // Prepare hour chart data
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: formatHour(h),
    swipes: metrics.swipesByHour[h] || 0,
  }));

  // Prepare monthly chart data for ComposedChart (bars + line)
  const monthlyData = metrics.monthlyData.map((d) => {
    const likes = Math.round(d.swipes * d.rightSwipeRate / 100);
    const rate = likes > 0 ? Math.round((d.matches / likes) * 1000) / 10 : 0;
    return { month: formatMonth(d.month), swipes: d.swipes, matches: d.matches, rate };
  });
  // Compute best/worst from chart-ready data (by rate) for guaranteed consistency
  const ratedMonths = monthlyData.filter((d) => d.rate > 0);
  const bestMonthLabel = ratedMonths.length > 0
    ? ratedMonths.reduce((best, curr) => curr.rate > best.rate ? curr : best).month
    : "";
  const worstMonthLabel = ratedMonths.length > 0
    ? ratedMonths.reduce((worst, curr) => curr.rate < worst.rate ? curr : worst).month
    : "";
  const avgRate = monthlyData.length > 0
    ? Math.round(monthlyData.reduce((s, d) => s + d.rate, 0) / monthlyData.length * 10) / 10
    : 0;

  // Determine verdict
  const verdict = getVerdict(metrics);

  // Total matches
  const totalMatches =
    metrics.totalSwipes > 0
      ? Math.round(
          (metrics.swipeToMatchRate / 100) * metrics.rightSwipes
        )
      : 0;

  // Day-of-week chart data
  const dayData = metrics.swipesByDayOfWeek;
  const maxDaySwipes = Math.max(...dayData.map((d) => d.swipes), 1);

  // Source display name
  const sourceName = metrics.source.charAt(0).toUpperCase() + metrics.source.slice(1);

  return (
    <div className="space-y-16">
      {/* ─── Hero section ─── */}
      <motion.div
        className="text-center py-6 sm:py-8 space-y-3"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
          <span className={`bg-gradient-to-r ${appColor.gradient} bg-clip-text text-transparent`}>
            TON DATING WRAPPED
          </span>
        </h2>
        <p className="text-sm sm:text-base text-slate-500">
          {formatPeriod(metrics.periodStart, metrics.periodEnd)}
        </p>
        <p className="text-xs text-slate-400">
          {sourceName} — {metrics.totalDays} jours d'activite
          {metrics.tenureMonths && (
            <span className="ml-1">
              · Sur {sourceName} depuis {metrics.tenureMonths} mois
            </span>
          )}
        </p>
      </motion.div>

      {/* ─── Main Section Nav ─── */}
      <SectionNav items={WRAPPED_NAV_ITEMS} />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ VUE D'ENSEMBLE ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="wr-overview" className="scroll-mt-28 space-y-6">
        <SectionTitle emoji={"📊"} title="Vue d'ensemble" subtitle={`${metrics.totalDays} jours d'activite sur ${sourceName}`} />
        <NarrativeIntro text={`${metrics.totalSwipes.toLocaleString("fr-FR")} swipes, ${totalMatches} matchs, ${metrics.estimatedTotalHours}h investies. Voici ce que tes donnees revelent.`} />

        {/* 3 SpotlightCards — key stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SpotlightCard
            value={<AnimatedCounter target={metrics.totalSwipes} className="text-4xl sm:text-5xl font-extrabold" />}
            label="swipes au total"
            sublabel={metrics.source === "hinge" ? `${metrics.avgSwipesPerDay}/jour en moy.` : `${metrics.rightSwipeRate}% de likes`}
            color={appColor.primary}
            icon={"💜"}
          />
          <SpotlightCard
            value={<AnimatedCounter target={totalMatches} className="text-4xl sm:text-5xl font-extrabold" />}
            label="matchs obtenus"
            sublabel={`${metrics.swipeToMatchRate}% de conversion`}
            color="#8b5cf6"
            icon={"🔥"}
          />
          <SpotlightCard
            value={<>{metrics.hoursPerMatch > 0 ? `${metrics.hoursPerMatch}h` : `${metrics.estimatedTotalHours}h`}</>}
            label={metrics.hoursPerMatch > 0 ? "par match obtenu" : "temps total estime"}
            sublabel={metrics.hoursPerMatch > 0 ? `${metrics.estimatedTotalHours}h au total` : `${metrics.totalDays > 0 ? Math.round((metrics.estimatedTotalHours / metrics.totalDays) * 10) / 10 : 0}h/jour en moy.`}
            color="#ec4899"
            icon={"⏳"}
          />
        </div>

        {/* Selectivity warning */}
        {metrics.rightSwipeRate > 70 && metrics.source !== "hinge" && (
          <motion.div
            className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-xs text-amber-600 flex items-start gap-2">
              <span className="shrink-0">&#x26A0;&#xFE0F;</span>
              Tu likes trop ! Sois plus selectif pour de meilleurs matches. Les profils avec un taux de like &lt;30% ont 3x plus de matches.
            </p>
          </motion.div>
        )}

        {metrics.estimatedTotalHours > 100 && (
          <p className="text-xs text-amber-600 text-center">
            C'est plus de {Math.round(metrics.estimatedTotalHours / 24)} jours complets passes a swiper...
          </p>
        )}

        {/* Funnel */}
        {metrics.funnel && metrics.funnel.likes > 0 && (
          <Card delay={0.12}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Ton funnel
            </h3>
            <FunnelChart funnel={metrics.funnel} color={appColor.primary} weMet={!!metrics.funnel.dates} />
            <p className="mt-3 text-xs text-slate-400 text-center">
              {metrics.funnel.dates > 0
                ? `Sur ${metrics.funnel.likes.toLocaleString("fr-FR")} likes, ${metrics.funnel.dates} date${metrics.funnel.dates > 1 ? "s" : ""} en vrai`
                : `Sur ${metrics.funnel.likes.toLocaleString("fr-FR")} likes, ${metrics.funnel.conversations} conversation${metrics.funnel.conversations > 1 ? "s" : ""}`}
            </p>
          </Card>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ TIMING ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="wr-timing" className="scroll-mt-28 space-y-6">
        <SectionTitle emoji={"⏰"} title="Timing" subtitle="Tes jours, tes heures, ton evolution" />
        <NarrativeIntro text="Quand swipes-tu le plus ? Quand tes matchs arrivent-ils ? L'analyse temporelle de ton activite." />

      {/* Tes meilleurs jours (day-of-week) */}
      <Card delay={0.15}>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Tes meilleurs jours
          </h3>
          <ChartBadges items={[
            { label: "Total", value: dayData.reduce((s, d) => s + d.swipes, 0), color: appColor.primary },
            { label: "Peak", value: metrics.bestDay || dayData.reduce((best, d) => d.swipes > best.swipes ? d : best, dayData[0]).day, color: "#F5A623" },
          ]} />
        </div>
        <div className="h-48 sm:h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData} barSize={28}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip
                content={<DarkTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="swipes" name="Swipes" radius={[6, 6, 0, 0]}>
                {dayData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={appColor.primary}
                    opacity={entry.swipes === maxDaySwipes ? 1 : 0.35}
                  />
                ))}
                <LabelList
                  dataKey="matches"
                  position="top"
                  fill="#F5A623"
                  fontSize={10}
                  fontWeight={600}
                  offset={6}
                  formatter={(v: number) => v > 0 ? v : ""}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {metrics.bestDay && (
          <p className="mt-2 text-xs text-center text-slate-500">
            <span className="font-semibold" style={{ color: appColor.primary }}>{metrics.bestDay}</span>
            {" "}= ton jour de chance
          </p>
        )}
        <p className="mt-3 text-[11px] text-slate-400 text-center">
          DatePulse te dit aussi a quelle <strong className="text-slate-500">heure</strong> swiper →{" "}
          <a href="/" className="underline hover:text-slate-800 transition">Voir les fenetres</a>
        </p>
      </Card>

      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ CONVERSION ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="wr-conversion" className="scroll-mt-28 space-y-6">
        <SectionTitle emoji={"🎯"} title="Conversion" subtitle="De like a match — ton entonnoir de conversion" />

      {/* Impact du commentaire (Hinge only) */}
      {metrics.commentImpact && (
        <Card delay={0.18}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Impact du commentaire
          </h3>
          <div className="text-center mb-4">
            <p className="text-4xl sm:text-5xl font-extrabold" style={{ color: appColor.primary }}>
              x{metrics.commentImpact.boostFactor}
            </p>
            <p className="mt-1 text-sm text-slate-800">boost commentaire</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-lg font-bold text-emerald-400">{metrics.commentImpact.commentedMatchRate}%</p>
              <p className="text-xs text-slate-500">match rate</p>
              <p className="mt-1 text-[11px] text-slate-400">{metrics.commentImpact.commentedLikes} likes avec commentaire</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-lg font-bold text-slate-500">{metrics.commentImpact.plainMatchRate}%</p>
              <p className="text-xs text-slate-500">match rate</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {metrics.funnel ? metrics.funnel.likes - metrics.commentImpact.commentedLikes : "?"} likes sans commentaire
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 text-center">
            Tu commentes {metrics.commentImpact.commentRate}% de tes likes.
            {metrics.commentImpact.boostFactor > 1
              ? " Les profils qui commentent toujours matchent encore plus."
              : ""}
          </p>
          <motion.a
            href="/coach"
            className="mt-3 block text-center text-[11px] font-medium transition"
            style={{ color: appColor.primary }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Le Coach DatePulse t'aide a ecrire le premier message parfait →
          </motion.a>
        </Card>
      )}

      {/* ─── 7. Conversion + Purchases ─── */}
      <Card delay={0.2}>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          {metrics.purchasesTotal ? "Conversion & Depenses" : "Matches"}
        </h3>

        {/* Purchases block */}
        {metrics.purchasesTotal != null && metrics.purchasesTotal > 0 && (
          <div className="mb-5 text-center">
            <p className="text-4xl sm:text-5xl font-extrabold text-red-500">
              {metrics.purchasesTotal}&euro;
            </p>
            <p className="mt-1 text-sm text-slate-500">depenses sur {sourceName}</p>
            {metrics.costPerMatch != null && metrics.costPerMatch > 0 && (
              <p className="mt-2 text-xs text-red-500/80">
                soit {metrics.costPerMatch}&euro; par match obtenu
              </p>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              L'Audit DatePulse coute moins qu'un seul match sur {sourceName}
            </p>
            <div className="my-4 h-px bg-gray-50" />
          </div>
        )}

        {/* Matches stats (always shown) */}
        <div className="flex items-center justify-around">
          <BigStat value={totalMatches} label="matches obtenus" color={appColor.primary} />
          <div className="h-12 w-px bg-white/10" />
          <BigStat
            value={`${metrics.swipeToMatchRate}%`}
            label="taux de conversion"
            size="sm"
          />
        </div>
      </Card>

      {/* ─── 8. Premium vs Free ─── */}
      {metrics.premiumROI && (
        <Card delay={0.22}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Premium vs Free
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">
                Premium ({metrics.premiumROI.premiumMonths} mois)
              </p>
              <p className="text-2xl font-bold" style={{ color: appColor.primary }}>
                {metrics.premiumROI.premiumMatchRate}%
              </p>
              <p className="text-xs text-slate-500">match rate</p>
              <p className="mt-2 text-[11px] text-slate-400">
                {metrics.premiumROI.totalSpent}&euro; depenses
              </p>
              {metrics.premiumROI.costPerPremiumMatch > 0 && (
                <p className="text-[11px] text-slate-400">
                  {metrics.premiumROI.costPerPremiumMatch}&euro;/match
                </p>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">
                Free ({metrics.premiumROI.freeMonths} mois)
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {metrics.premiumROI.freeMatchRate}%
              </p>
              <p className="text-xs text-slate-500">match rate</p>
              <p className="mt-2 text-[11px] text-slate-400">0&euro;</p>
            </div>
          </div>
          {/* Worth-it badge */}
          <div className="text-center">
            {metrics.premiumROI.isWorthIt ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-400">
                Le premium vaut le coup (x{metrics.premiumROI.boostFactor})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs text-red-500">
                Le premium ne change rien pour toi
              </span>
            )}
          </div>
          <p className="mt-3 text-[11px] text-slate-400 text-center">
            L'Audit DatePulse coute 9.99&euro; — moins qu'un mois de {sourceName} Premium
          </p>
        </Card>
      )}

      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ CONVERSATIONS ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="wr-conversations" className="scroll-mt-28 space-y-6">
        <SectionTitle emoji={"💬"} title="Conversations" subtitle="Ghost rate, tempo de reponse, et equilibre" />

      {/* Conversations (enriched with ghost empathy + sent/received) */}
      <Card delay={0.25}>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Conversations
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <BigStat
            value={`${metrics.ghostRate}%`}
            label="taux de ghost"
            size="sm"
          />
          <BigStat
            value={metrics.avgConvoLength}
            label="messages en moy."
            size="sm"
          />
          <BigStat
            value={metrics.longestConvo}
            label="plus longue convo"
            size="sm"
          />
        </div>

        {/* Ghost empathy message */}
        {metrics.ghostRate > 0 && (
          <p className="mt-3 text-xs text-slate-400 text-center">
            {metrics.ghostRate}% de tes matches n'ont jamais mene a un echange.{" "}
            {metrics.ghostRate <= 60
              ? "C'est normal — la moyenne est de ~60%."
              : "C'est au-dessus de la moyenne (~60%)."}
          </p>
        )}

        {/* Sent/Received ratio */}
        {metrics.sentReceivedRatio > 0 && (
          <p className="mt-2 text-xs text-slate-400 text-center">
            Tu envoies <span className="text-slate-900 font-medium">{metrics.sentReceivedRatio}x</span> plus de messages que tu n'en recois
          </p>
        )}

        {/* CTA coach */}
        {metrics.ghostRate > 50 && (
          <motion.a
            href="/coach"
            className="mt-4 block text-center text-xs font-medium underline transition"
            style={{ color: appColor.primary }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Le Coach DatePulse peut t'aider →
          </motion.a>
        )}
      </Card>

      </section>

      {/* ═══ CONVERSATION PULSE — 10 premium sections ═══ */}
      {conversationInsights && conversationInsights.conversationsAnalyzed >= 5 && (
        <div className="space-y-12">
          <SectionNav items={CP_NAV_ITEMS} badgeLabel="Conversation Pulse" />
          <CPSectionHero insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionGhost insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionQuestions insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionTempo insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionOpeners insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionEscalation insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionDoubleText insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionBalance insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionFatigue insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionSignals insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionMirroring insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionLanguage insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionTimingAdv insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionPatterns insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionVerdict insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} onShareClick={onShareClick} />
        </div>
      )}

      {/* ═══ SWIPE PULSE — 5 advanced sections (H71-H90) ═══ */}
      {advancedSwipeInsights && (
        <div className="space-y-12">
          <SectionNav items={SP_NAV_ITEMS} badgeLabel="Swipe Pulse" />
          <SPSectionAlgorithm insights={advancedSwipeInsights} appColor={appColor} />
          <SPSectionPsychology insights={advancedSwipeInsights} appColor={appColor} />
          <SPSectionRhythms insights={advancedSwipeInsights} appColor={appColor} />
          <SPSectionConversion insights={advancedSwipeInsights} appColor={appColor} />
          <SPSectionArchetype insights={advancedSwipeInsights} appColor={appColor} />
        </div>
      )}

      {/* ─── Boost Intelligence & Super Likes (Tinder only) ─── */}
      {metrics.boostDates && metrics.boostDates.length > 0 && (
        <Card delay={0.26}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Boost Intelligence
          </h3>
          <div className="flex items-center justify-around">
            <BigStat
              value={metrics.boostDates.length}
              label="boosts utilises"
              color={appColor.primary}
            />
            <div className="h-12 w-px bg-white/10" />
            <BigStat
              value={`${metrics.boostMatchRate ?? 0}%`}
              label="match rate boost"
              size="sm"
            />
          </div>
          {metrics.boostMatchRate != null && metrics.swipeToMatchRate > 0 && (
            <p className="mt-3 text-xs text-slate-400 text-center">
              {metrics.boostMatchRate > metrics.swipeToMatchRate
                ? `Tes boosts performent ${Math.round(metrics.boostMatchRate / metrics.swipeToMatchRate)}x mieux que ton taux normal`
                : "Tes boosts n'ameliorent pas significativement ton taux de match"}
            </p>
          )}
        </Card>
      )}

      {/* ─── 9c. Super Likes ─── */}
      {metrics.superLikesSent != null && metrics.superLikesSent > 0 && (
        <Card delay={0.26}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Super Likes
          </h3>
          <div className="flex items-center justify-around">
            <BigStat
              value={metrics.superLikesSent}
              label="super likes envoyes"
              color={appColor.primary}
            />
            {metrics.superLikeMatchRate != null && (
              <>
                <div className="h-12 w-px bg-white/10" />
                <BigStat
                  value={`${metrics.superLikeMatchRate}%`}
                  label="taux de conversion"
                  size="sm"
                />
              </>
            )}
          </div>
        </Card>
      )}

      {/* ─── Response Time + Match Survival (inside Conversations section continued) ─── */}
      {metrics.responseTime && (
        <Card delay={0.27}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Temps de reponse
          </h3>
          <BigStat
            value={`${metrics.responseTime.medianHours}h`}
            label="temps de reponse median"
            color={appColor.primary}
          />
          <div className="mt-4 space-y-2">
            {[
              { label: "< 1h", count: metrics.responseTime.under1h, badge: "⚡" },
              { label: "1-6h", count: metrics.responseTime.under6h, badge: undefined },
              { label: "6-24h", count: metrics.responseTime.under24h, badge: undefined },
              { label: "> 24h", count: metrics.responseTime.over24h, badge: "\u{1F422}" },
            ].map((bucket) => {
              const total = metrics.responseTime!.under1h + metrics.responseTime!.under6h + metrics.responseTime!.under24h + metrics.responseTime!.over24h;
              const pct = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
              return (
                <div key={bucket.label} className="flex items-center gap-3 text-xs">
                  <span className="w-10 text-slate-500 text-right font-medium">{bucket.label}</span>
                  <div className="flex-1 h-4 rounded-full bg-gray-50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: appColor.primary,
                        opacity: 0.6 + (pct / 100) * 0.4,
                      }}
                    />
                  </div>
                  <span className="w-16 text-slate-400 text-right">
                    {bucket.count} ({pct}%) {bucket.badge ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400 text-center">
            {metrics.responseTime.medianHours < 6
              ? "Tu es reactif ! Repondre vite augmente tes chances de 3x."
              : "Les matchs qui repondent dans l'heure ont 3x plus de chances de mener a un date."}
          </p>
        </Card>
      )}

      {/* ─── 11. Survie des matchs (Hinge only) ─── */}
      {metrics.unmatchData && metrics.unmatchData.totalUnmatched > 0 && (
        <Card delay={0.29}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Survie des matchs
          </h3>
          <BigStat
            value={`${metrics.unmatchData.survivalRate}%`}
            label="de matchs encore actifs"
            color={appColor.primary}
          />
          <p className="mt-2 text-xs text-slate-400 text-center">
            {metrics.unmatchData.totalUnmatched} unmatch{metrics.unmatchData.totalUnmatched > 1 ? "s" : ""}
            {" "}(duree moy. {metrics.unmatchData.avgDurationDays}j)
          </p>
          <p className="mt-2 text-[11px] text-slate-400 text-center">
            C'est normal — sur Hinge, la majorite des matchs finissent par etre supprimes.
          </p>
        </Card>
      )}

      {/* ─── Evolution mensuelle (back to Timing section visually) ─── */}
      {monthlyData.length > 1 && (
        <Card delay={0.3}>
          {/* Header + stat pills */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Evolution mensuelle
            </h3>
            <ChartBadges items={[
              { label: "Swipes", value: metrics.totalSwipes, color: "#6C7AE0" },
              { label: "Matches", value: metrics.monthlyData.reduce((s, d) => s + d.matches, 0), color: "#F5A623" },
              { label: "Moy.", value: `${avgRate}%`, color: "#34d399" },
            ]} />
          </div>

          {/* Legend */}
          <div className="flex justify-end gap-5 text-[11px] mb-3 pr-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#6C7AE0" }} />
              <span className="text-slate-400">Swipes</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3.5 rounded-sm" style={{ height: 2.5, background: "#34d399" }} />
              <span className="text-slate-400">Taux de match</span>
            </span>
          </div>

          {/* ComposedChart — swipes bars + rate line */}
          <div className="h-56 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b7085", fontSize: 11 }}
                />
                {/* Left axis — swipes */}
                <YAxis
                  yAxisId="swipes"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b7085", fontSize: 10 }}
                  width={42}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${v}`
                  }
                />
                {/* Right axis — rate % */}
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#34d399", fontSize: 10 }}
                  width={38}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  content={<MonthlyTooltip bestMonth={bestMonthLabel} worstMonth={worstMonthLabel} />}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                {/* Average rate dashed line */}
                <ReferenceLine
                  yAxisId="rate"
                  y={avgRate}
                  stroke="#6b7085"
                  strokeDasharray="5 4"
                  strokeWidth={1}
                />
                {/* Swipes bars with match count labels */}
                <Bar yAxisId="swipes" dataKey="swipes" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill="rgba(108,122,224,0.5)" />
                  ))}
                  <LabelList
                    dataKey="matches"
                    position="top"
                    fill="#F5A623"
                    fontSize={10}
                    fontWeight={600}
                    offset={6}
                  />
                </Bar>
                {/* Rate line with best/worst dots */}
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="rate"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={(props: { cx: number; cy: number; payload: { month: string; rate: number }; key?: string }) => {
                    const { cx, cy, payload } = props;
                    const isBest = payload.month === bestMonthLabel;
                    const isWorst = payload.month === worstMonthLabel;
                    if (isBest || isWorst) {
                      const c = isBest ? "#34d399" : "#ef4444";
                      return (
                        <g key={props.key}>
                          <circle cx={cx} cy={cy} r={7} fill={c} opacity={0.15} />
                          <circle cx={cx} cy={cy} r={4} fill={c} />
                          <text x={cx} y={cy - 14} textAnchor="middle" fill={c} fontSize={11} fontWeight={700}>
                            {payload.rate}%
                          </text>
                        </g>
                      );
                    }
                    return <circle key={props.key} cx={cx} cy={cy} r={2.5} fill="#34d399" opacity={0.5} />;
                  }}
                  activeDot={{ r: 5, fill: "#34d399", stroke: "#181a20", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom annotations */}
          {bestMonthLabel && (
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span>
                Meilleur mois : <strong className="text-emerald-400">{bestMonthLabel}</strong>
                <span className="text-slate-400"> ({monthlyData.find((d) => d.month === bestMonthLabel)?.rate ?? 0}%)</span>
              </span>
              {worstMonthLabel && worstMonthLabel !== bestMonthLabel && (
                <>
                  <span className="text-slate-400">—</span>
                  <span>
                    Pire mois : <strong className="text-red-500">{worstMonthLabel}</strong>
                    <span className="text-slate-400"> ({monthlyData.find((d) => d.month === worstMonthLabel)?.rate ?? 0}%)</span>
                  </span>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ ADN DATING ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="wr-dna" className="scroll-mt-28 space-y-6">
        <SectionTitle emoji={"🧬"} title="Ton ADN Dating" subtitle="Ou tu te situes par rapport aux autres" />

      {/* Benchmarks: Ou tu te situes */}
      {metrics.source === "tinder" && (
        <Card delay={0.32}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ou tu te situes
            </h3>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400">Je suis</span>
              <button
                onClick={() => setBenchmarkGender("men")}
                className={`px-2 py-0.5 rounded-md transition ${
                  benchmarkGender === "men"
                    ? "bg-gray-100 text-slate-900 font-medium"
                    : "text-slate-400 hover:text-slate-800"
                }`}
              >
                Homme
              </button>
              <button
                onClick={() => setBenchmarkGender("women")}
                className={`px-2 py-0.5 rounded-md transition ${
                  benchmarkGender === "women"
                    ? "bg-gray-100 text-slate-900 font-medium"
                    : "text-slate-400 hover:text-slate-800"
                }`}
              >
                Femme
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: "match_rate", label: "Taux de match", value: metrics.swipeToMatchRate, unit: "%" },
              { key: "like_rate", label: "Taux de like", value: metrics.rightSwipeRate, unit: "%" },
              { key: "ghosting_rate", label: "Taux de ghosting", value: metrics.ghostRate, unit: "%" },
              { key: "avg_convo_length", label: "Longueur moy. convo", value: metrics.avgConvoLength, unit: " msgs" },
              { key: "sent_received_ratio", label: "Ratio msg envoi/recu", value: metrics.sentReceivedRatio, unit: "x" },
            ].map((item) => {
              const bench = getBenchmark(item.key, item.value, benchmarkGender);
              return (
                <div key={item.key} className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm text-slate-800 font-medium">{item.label}</p>
                    <p className="text-lg font-bold text-slate-900">
                      {item.value}{item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border"
                      style={{
                        color: QUINTILE_COLORS[bench.quintile],
                        borderColor: `${QUINTILE_COLORS[bench.quintile]}30`,
                        backgroundColor: `${QUINTILE_COLORS[bench.quintile]}10`,
                      }}
                    >
                      {bench.emoji} {bench.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[10px] text-slate-400 text-center">
            {BENCHMARK_DISCLAIMER}
          </p>
        </Card>
      )}

      {/* ─── 8. Ton ADN Dating (RadarChart) ─── */}
      <Card delay={0.35}>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Ton ADN Dating
        </h3>
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="h-64 w-64 sm:h-80 sm:w-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metrics.adnDating}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar
                  dataKey="value"
                  stroke={appColor.primary}
                  fill={appColor.primary}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
          {metrics.adnDating.map((a) => (
            <div key={a.axis} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: appColor.primary, opacity: a.value / 100 }}
              />
              <span>{a.axis}</span>
              <span className="ml-auto font-semibold text-slate-800">{a.value}</span>
            </div>
          ))}
        </div>
      </Card>

      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══ VERDICT ═══ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="wr-verdict" className="scroll-mt-28 space-y-6">
        <SectionTitle emoji={"🏆"} title="Verdict" subtitle="Le bilan final de ton activite dating" />

      {/* Verdict */}
      <Card delay={0.4} className="border-brand-200 bg-brand-50">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Verdict
        </h3>
        <div className="text-center">
          <span className="text-3xl">{verdict.icon}</span>
          <p className="mt-3 text-sm sm:text-base font-medium text-slate-900">
            {verdict.title}
          </p>
          <p className="mt-2 text-sm text-slate-500">{verdict.message}</p>
          <motion.a
            href={verdict.ctaHref}
            className={`mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${appColor.gradient} px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]`}
            whileTap={{ scale: 0.98 }}
          >
            {verdict.ctaLabel}
            <span>&#x2192;</span>
          </motion.a>
        </div>
      </Card>

      {/* ─── Hourly activity (moved down, optional) ─── */}
      {(!metrics.dailyOnly || metrics.hourlyFromMessages) && (
        <Card delay={0.45}>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tes horaires d'activite
            </h3>
            <ChartBadges items={[
              { label: "Pic", value: formatHour(metrics.peakSwipeHour), color: appColor.primary },
              ...(!metrics.hourlyFromMessages ? [{ label: "Pic matchs", value: formatHour(metrics.peakMatchHour), color: "#F5A623" }] : []),
            ]} />
          </div>
          <div className="flex items-center justify-around mb-4">
            <BigStat
              value={formatHour(metrics.peakSwipeHour)}
              label="pic d'activite"
              size="sm"
            />
            {!metrics.hourlyFromMessages && (
              <>
                <div className="h-12 w-px bg-white/10" />
                <BigStat
                  value={formatHour(metrics.peakMatchHour)}
                  label="pic de matches"
                  size="sm"
                />
              </>
            )}
          </div>
          <div className="h-40 sm:h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData} barSize={8}>
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  interval={3}
                />
                <YAxis hide />
                <Tooltip
                  content={<DarkTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar
                  dataKey="swipes"
                  name={metrics.hourlyFromMessages ? "Messages" : "Swipes"}
                  fill={appColor.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {metrics.hourlyFromMessages && (
            <p className="mt-2 text-[10px] text-slate-400 text-center">
              Base sur tes messages envoyes — l'export Tinder ne fournit pas l'heure exacte des swipes
            </p>
          )}
        </Card>
      )}

      </section>

      {/* ─── Opt-in dormant checkbox ─── */}
      <div className="text-center py-2">
        <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-not-allowed">
          <input type="checkbox" disabled className="opacity-50 rounded" />
          Contribuer au benchmark FR (bientot disponible)
        </label>
      </div>

      {/* Share button */}
      {onShareClick && (
        <motion.button
          onClick={onShareClick}
          className={`w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r ${appColor.gradient} px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]`}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="4" r="2" />
            <circle cx="4" cy="8" r="2" />
            <circle cx="12" cy="12" r="2" />
            <path d="M6 9l4 2M6 7l4-2" />
          </svg>
          Partager mon Wrapped
        </motion.button>
      )}
    </div>
  );
}
