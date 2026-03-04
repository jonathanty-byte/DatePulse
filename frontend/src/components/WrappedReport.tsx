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

// ── Types ───────────────────────────────────────────────────────

interface WrappedReportProps {
  metrics: WrappedMetrics;
  conversationInsights?: ConversationInsights;
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
      className={`rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 ${className}`}
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
      <p className="mt-1 text-sm text-gray-400">{label}</p>
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
            <span className="w-14 text-xs text-gray-400 text-right font-medium">{step.label}</span>
            <div className="flex-1 h-7 rounded-md bg-white/5 overflow-hidden relative">
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
            <span className="w-12 text-[11px] text-gray-500 text-right">
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
    <div className="rounded-xl border border-white/10 bg-gray-900/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <p className="mb-1.5 text-xs font-semibold text-gray-300">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-2 text-xs font-medium"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-400">{entry.name}</span>
          <span className="ml-auto text-white">{entry.value}</span>
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
    <div className="rounded-xl border border-white/10 bg-[#181a20]/95 px-4 py-3 shadow-2xl min-w-[160px]">
      <p className="mb-1 text-sm font-bold text-gray-200">
        {label}
        {isBest && <span className="ml-2 text-[11px] font-medium text-emerald-400">★ BEST</span>}
        {isWorst && <span className="ml-2 text-[11px] font-medium text-red-400">▼ WORST</span>}
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
          <div className="flex justify-between border-t border-white/10 mt-1 pt-1" style={{ color: "#34d399" }}>
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
        className="text-[10px] text-gray-600 hover:text-gray-400 transition cursor-help"
        title={level === "population" ? "Basé sur des données populationnelles (n=1209)" : "Basé sur des hypothèses validées (n=1)"}
      >
        {level === "population" ? "📊" : "🔬"}
      </button>
      {showDetail && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 rounded-lg bg-gray-900 border border-white/10 px-3 py-2 text-[10px] text-gray-400 shadow-xl z-10">
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

// ── CP Premium Components (Insights patterns) ───────────────────

const cpFadeIn = (delay: number = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.5 },
});

function CPAnimatedCounter({ target, duration = 1400, prefix = "", suffix = "", className = "" }: {
  target: number; duration?: number; prefix?: string; suffix?: string; className?: string;
}) {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const [started, setStarted] = React.useState(false);
  React.useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  React.useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);
  return <span ref={ref} className={className}>{prefix}{count.toLocaleString("fr-FR")}{suffix}</span>;
}

function CPSpotlightCard({ value, label, sublabel, color, icon }: {
  value: React.ReactNode; label: string; sublabel?: string; color: string; icon?: string;
}) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8 text-center"
      style={{ background: `linear-gradient(135deg, ${color}10 0%, transparent 60%)`, borderColor: `${color}30` }}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {icon && <span className="absolute top-3 right-4 text-4xl opacity-[0.07]">{icon}</span>}
      <div className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color }}>{value}</div>
      <div className="mt-2 text-sm font-medium text-gray-300">{label}</div>
      {sublabel && <div className="mt-1 text-xs text-gray-500">{sublabel}</div>}
    </motion.div>
  );
}

function CPNarrativeIntro({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.p
      className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-3xl"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      {text}
    </motion.p>
  );
}

function CPMiniBar({ bars, maxOverride }: { bars: { label: string; value: number; color?: string }[]; maxOverride?: number }) {
  const mx = maxOverride ?? Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="space-y-1.5">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-[11px] text-gray-400 truncate">{b.label}</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: b.color || "#6366f1" }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(b.value / mx) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="w-10 text-right text-[11px] font-medium text-gray-300">{b.value}</span>
        </div>
      ))}
    </div>
  );
}

function CPExpandToggle({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition">
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▸</span>{title}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CPSectionTitle({ emoji, title, subtitle, delay = 0 }: { emoji: string; title: string; subtitle?: string; delay?: number }) {
  return (
    <motion.div {...cpFadeIn(delay)} className="space-y-1">
      <h2 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
        <span className="text-3xl">{emoji}</span>
        <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{title}</span>
      </h2>
      {subtitle && <p className="text-xs text-gray-500 pl-12">{subtitle}</p>}
    </motion.div>
  );
}

function CPProgressRing({ value, max = 20, size = 60, label, color = "#6366f1" }: {
  value: number; max?: number; size?: number; label: string; color?: string;
}) {
  const strokeW = 4;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} className="text-white/[0.06]" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: circ * (1 - pct) }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[80px]">{label}</span>
    </div>
  );
}

function CPBenchmarkBadge({ benchmark }: { benchmark: BenchmarkResult }) {
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
  { id: "cp-hero", emoji: "\uD83D\uDCAC", label: "Vue" },
  { id: "cp-ghost", emoji: "\uD83D\uDC7B", label: "Ghosting" },
  { id: "cp-questions", emoji: "\u2753", label: "Questions" },
  { id: "cp-tempo", emoji: "\u23F1\uFE0F", label: "Tempo" },
  { id: "cp-openers", emoji: "\u2709\uFE0F", label: "Openers" },
  { id: "cp-escalation", emoji: "\uD83D\uDCC5", label: "Escalade" },
  { id: "cp-double-text", emoji: "\uD83D\uDCF1", label: "Relance" },
  { id: "cp-balance", emoji: "\u2696\uFE0F", label: "Equilibre" },
  { id: "cp-fatigue", emoji: "\uD83D\uDD0B", label: "Fatigue" },
  { id: "cp-verdict", emoji: "\uD83C\uDFC6", label: "Verdict" },
];

function CPSectionNav() {
  return (
    <div className="sticky top-[52px] z-40 -mx-4 bg-[#080b14]/90 backdrop-blur-md border-b border-white/5 px-4 py-2">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {CP_NAV_ITEMS.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition hover:bg-white/[0.06] hover:text-gray-200"
          >
            <span>{n.emoji}</span>
            <span className="hidden sm:inline">{n.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

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
      <CPSectionTitle emoji="\uD83D\uDCAC" title="Conversation Pulse" />
      <CPNarrativeIntro text={`Analyse de ${insights.conversationsAnalyzed} conversations sur ${insights.ghostBreakdown.total} matchs. Voici ce que tes messages revelent.`} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CPSpotlightCard
          value={<CPAnimatedCounter target={ghostPct} suffix="%" className="text-4xl sm:text-5xl font-extrabold" />}
          label="Ghost rate"
          sublabel="meurent avant le 2eme message"
          color="#ef4444"
          icon="\uD83D\uDC7B"
        />
        <CPSpotlightCard
          value={<CPAnimatedCounter target={insights.score} suffix="/100" className="text-4xl sm:text-5xl font-extrabold" />}
          label="Score CDS"
          sublabel={getConversationScoreLabel(insights.score)}
          color={scoreColor}
          icon="\uD83C\uDFAF"
        />
        <CPSpotlightCard
          value={insights.archetype}
          label="Ton archetype"
          color={appColor.primary}
          icon="\uD83E\uDDEC"
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
      <CPSectionTitle emoji="\uD83D\uDC7B" title="Le Mur" subtitle="Ou meurent tes conversations — et pourquoi" />
      <CPNarrativeIntro text={`Sur ${gb.total} matchs, voici comment se repartissent tes conversations.`} />

      <Card>
        <CPMiniBar bars={ghostBars} />
      </Card>

      {curveData.length > 0 && (
        <Card>
          <p className="text-xs font-medium text-gray-300 mb-3">Courbe de survie</p>
          <div className="h-44 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData}>
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
                  fill={appColor.primary}
                  fillOpacity={0.15}
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
          <p className="mt-2 text-[11px] text-gray-600 text-center">
            Zone rouge = les 3 premiers messages, ou la majorite des conversations meurent
          </p>
        </Card>
      )}

      <CPExpandToggle title="Detail du ghosting">
        <div className="rounded-lg border border-white/5 overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-3 py-2 text-left text-gray-400">Categorie</th>
              <th className="px-3 py-2 text-right text-gray-400">Nombre</th>
              <th className="px-3 py-2 text-right text-gray-400">%</th>
            </tr></thead>
            <tbody>
              {ghostBars.map((b) => (
                <tr key={b.label} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-1.5 text-gray-300">{b.label}</td>
                  <td className="px-3 py-1.5 text-right text-gray-300">{b.value}</td>
                  <td className="px-3 py-1.5 text-right" style={{ color: b.color }}>
                    {gb.total > 0 ? Math.round((b.value / gb.total) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CPExpandToggle>
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
      <CPSectionTitle emoji="\u2753" title="Tes Questions" subtitle="La densite de questions predit la survie d'une conversation (H27)" />
      <CPNarrativeIntro text={`Quand tu poses 0 questions, ${insights.zeroQuestionGhostRate}% de tes convos meurent.`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CPSpotlightCard
          value={<>{insights.zeroQuestionGhostRate}%</>}
          label="Ghost rate sans question"
          sublabel="0 question = conversation morte"
          color="#ef4444"
          icon="\uD83D\uDC7B"
        />
        <Card className="flex flex-col items-center justify-center gap-3 py-4">
          <CPProgressRing value={qDensityPct} max={50} size={70} label="Densite de questions" color={qDensityPct >= 20 ? "#34d399" : "#fbbf24"} />
          <CPBenchmarkBadge benchmark={bench} />
        </Card>
      </div>

      <Card>
        <p className="text-xs font-medium text-gray-300 mb-3">Distribution des questions par conversation</p>
        <CPMiniBar bars={buckets} />
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
      <CPSectionTitle emoji="\u23F1\uFE0F" title="Ton Tempo" subtitle="La vitesse de reponse multiplie tes chances (H34)" />
      <CPNarrativeIntro text={`Ton temps de reponse median est de ${medianLabel}. ${median <= 60 ? "Tu es reactif — c'est un atout majeur." : "Les reponses rapides multiplient tes chances par 3."}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CPSpotlightCard
          value={medianLabel}
          label="Temps de reponse median"
          color={tempoColor}
          icon="\u26A1"
        />
        <Card className="flex flex-col items-center justify-center gap-3 py-4">
          <CPBenchmarkBadge benchmark={bench} />
          <p className="text-[11px] text-gray-500 text-center">
            {totalBuckets > 0 ? `${Math.round((buckets.under1h / totalBuckets) * 100)}% de tes reponses en moins d'1h` : "Pas assez de donnees"}
          </p>
        </Card>
      </div>

      {totalBuckets > 0 && (
        <Card>
          <p className="text-xs font-medium text-gray-300 mb-3">Repartition des temps de reponse</p>
          <CPMiniBar bars={tempoBars} />
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
      <CPSectionTitle emoji="\u2709\uFE0F" title="Tes Openers" subtitle="Le premier message decide de tout (H43, H50)" />
      <CPNarrativeIntro text="La qualite de ton premier message determine si la conversation vivra ou mourra." />

      {/* 3 mini-stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-3">
          <p className="text-2xl font-bold" style={{ color: appColor.primary }}>{insights.openerStats.avgLength}</p>
          <p className="text-[10px] text-gray-400 mt-1">car. en moyenne</p>
          <div className="mt-2"><CPBenchmarkBadge benchmark={bench} /></div>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold" style={{ color: insights.openerStats.containsQuestion >= 40 ? "#34d399" : "#fbbf24" }}>
            {insights.openerStats.containsQuestion}%
          </p>
          <p className="text-[10px] text-gray-400 mt-1">avec question</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold" style={{ color: insights.openerStats.helloCount > 0 ? "#ef4444" : "#34d399" }}>
            {insights.openerStats.helloCount}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">"salut/hey"</p>
          {insights.openerStats.helloCount > 0 && (
            <p className="text-[9px] text-red-400 mt-0.5">generiques detectes</p>
          )}
        </Card>
      </div>

      {/* La Formule FR+?+Perso */}
      <CPSpotlightCard
        value={<>{insights.openerStats.frQuestionPersoRate}%</>}
        label="Francais + Question + Personnalise"
        sublabel="La formule gagnante pour tes openers"
        color="#f59e0b"
        icon="\uD83C\uDFAF"
      />

      <CPExpandToggle title="Impact des openers generiques (H50)">
        <p className="text-xs text-gray-500 leading-relaxed">
          Les openers generiques ("Salut", "Hey", "Coucou") ont un taux de reponse 3 a 5x inferieur
          aux messages personnalises. Un opener ideal combine : langue naturelle (francais),
          une question ouverte, et un element specifique au profil de la personne.
        </p>
      </CPExpandToggle>
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
      <CPSectionTitle emoji="\uD83D\uDCC5" title="L'Escalade" subtitle="Quand proposer un rendez-vous — le timing change tout (H29)" />
      <CPNarrativeIntro text={`Tu proposes un rendez-vous en moyenne au message #${es.avgMessageNumber}. ${inRange ? "C'est dans la fenetre optimale !" : "C'est en dehors de la fenetre optimale."}`} />

      <CPSpotlightCard
        value={<>Message #{es.avgMessageNumber}</>}
        label="Premiere escalation en moyenne"
        sublabel={`${es.inOptimalRange}% dans la fenetre optimale`}
        color={escColor}
        icon="\uD83D\uDCC5"
      />

      {/* Visual range bar */}
      <Card>
        <p className="text-xs font-medium text-gray-300 mb-3">Fenetre optimale d'escalation</p>
        <div className="relative h-8 rounded-full bg-white/5 overflow-hidden">
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
        <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
          <span>Msg #1</span>
          <span className="text-emerald-400">#{es.optimalRange.min}-{es.optimalRange.max} optimal</span>
          <span>#{rangeMax}</span>
        </div>
        {insights.source === "hinge" ? (
          <p className="mt-2 text-[10px] text-gray-600 text-center">Hinge : escalation tot (msg #3-8) fonctionne mieux</p>
        ) : (
          <p className="mt-2 text-[10px] text-gray-600 text-center">Tinder/Bumble : escalation msg #8-20 recommandee</p>
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
      <CPSectionTitle emoji="\uD83D\uDCF1" title="Le Double-Text" subtitle="Relancer apres un silence — ca marche ? (H20)" />
      <CPNarrativeIntro text="Le double-text, c'est quand tu envoies un 2eme message sans avoir recu de reponse. Parfois ca relance, parfois ca tue." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CPSpotlightCard
          value={<>{insights.doubleTextRate}%</>}
          label="de tes convos ont un double-text"
          color="#818cf8"
          icon="\uD83D\uDCF1"
        />
        <CPSpotlightCard
          value={<>{insights.doubleTextSurvival}%</>}
          label="survivent apres la relance"
          color={insights.doubleTextSurvival >= 40 ? "#34d399" : "#ef4444"}
          icon={insights.doubleTextSurvival >= 40 ? "\u2705" : "\u274C"}
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
      <CPSectionTitle emoji="\u2696\uFE0F" title="L'Equilibre" subtitle="L'investissement asymetrique tue les conversations" />
      <CPNarrativeIntro text={`Sur ${total} conversations avec echanges, voici la repartition de ton investissement.`} />

      <Card>
        <CPMiniBar bars={balanceBars} />
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {balanceBars.map((bar) => (
            <span key={bar.label} className="text-[10px] text-gray-500">
              {bar.label}: <span className="font-medium" style={{ color: bar.color }}>{total > 0 ? Math.round((bar.value / total) * 100) : 0}%</span>
            </span>
          ))}
        </div>
      </Card>

      {b.overInvesting > b.balanced && (
        <Card className="border-red-500/20">
          <p className="text-xs text-red-400 text-center">
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
      <CPSectionTitle emoji="\uD83D\uDD0B" title="La Fatigue" subtitle="Quand l'energie baisse, les conversations s'en ressentent (H31)" />
      <CPNarrativeIntro text="L'effort que tu mets dans tes premiers messages evolue-t-il avec le temps ?" />

      {hasTrend ? (
        <>
          <Card>
            <p className="text-xs font-medium text-gray-300 mb-3">Longueur moyenne des openers par mois</p>
            <div className="h-44 sm:h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.monthlyOpenerLength}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v: string) => { const [, m] = v.split("-"); const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"]; return months[Number(m) - 1] || v; }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Tooltip content={<DarkTooltip />} />
                  <ReferenceLine y={trend.monthlyOpenerLength.reduce((s, d) => s + d.avgLength, 0) / trend.monthlyOpenerLength.length} stroke="#6b7280" strokeDasharray="5 4" strokeWidth={1} />
                  <Area type="monotone" dataKey="avgLength" name="Longueur" stroke={appColor.primary} fill={appColor.primary} fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <p className="text-xs font-medium text-gray-300 mb-3">Taux de ghosting par mois</p>
            <div className="h-44 sm:h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.monthlyGhostRate}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v: string) => { const [, m] = v.split("-"); const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"]; return months[Number(m) - 1] || v; }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="rate" name="Ghost rate" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-xs text-gray-500 text-center py-4">
            Pas assez de donnees pour detecter une tendance (minimum 3 mois requis).
          </p>
        </Card>
      )}

      {insights.fatigueDetected && (
        <motion.div
          className="rounded-xl bg-violet-950/30 border border-violet-500/20 px-4 py-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs text-violet-300">
            Signe de fatigue detecte — tes openers raccourcissent ces derniers mois.
            C'est normal apres plusieurs mois d'utilisation. Prends une pause et reviens plus fort.
          </p>
        </motion.div>
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
      <CPSectionTitle emoji="\uD83C\uDFC6" title="Le Verdict" subtitle="Ton score conversationnel global, base sur 5 dimensions" />
      <CPNarrativeIntro text={`${insights.conversationsAnalyzed} conversations analysees, 5 axes evalues. Voici ton bilan.`} />

      <Card className="border-brand-500/20 bg-brand-950/10">
        {/* Score geant */}
        <div className="text-center py-6">
          <div style={{ color: scoreColor }}>
            <CPAnimatedCounter
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
          <CPProgressRing value={insights.scoreBreakdown.questionDensity} label="Questions" color={ringColor(insights.scoreBreakdown.questionDensity)} />
          <CPProgressRing value={insights.scoreBreakdown.responseSpeed} label="Reactivite" color={ringColor(insights.scoreBreakdown.responseSpeed)} />
          <CPProgressRing value={insights.scoreBreakdown.openerQuality} label="Openers" color={ringColor(insights.scoreBreakdown.openerQuality)} />
          <CPProgressRing value={insights.scoreBreakdown.escalationTiming} label="Escalation" color={ringColor(insights.scoreBreakdown.escalationTiming)} />
          <CPProgressRing value={insights.scoreBreakdown.conversationBalance} label="Equilibre" color={ringColor(insights.scoreBreakdown.conversationBalance)} />
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
          <p className="mt-2 text-sm text-gray-400 max-w-sm mx-auto">
            {insights.archetypeDescription}
          </p>
          {nextLabel && pointsToNext > 0 && (
            <p className="mt-2 text-[11px] text-gray-500">
              Tu es a <span className="text-white font-medium">{pointsToNext} pts</span> de devenir <span style={{ color: scoreColor }} className="font-medium">{nextLabel}</span>
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

      <CPExpandToggle title="Comment le score est calcule">
        <div className="space-y-2 text-xs text-gray-500">
          <p>Le score CDS (Conversation Dating Score) est base sur 5 axes, chacun note sur 20 :</p>
          <ul className="space-y-1 pl-4">
            <li><span className="text-gray-300 font-medium">Questions (0-20)</span> — densite de "?" dans tes messages envoyes (H27)</li>
            <li><span className="text-gray-300 font-medium">Reactivite (0-20)</span> — temps de reponse median (H34)</li>
            <li><span className="text-gray-300 font-medium">Openers (0-20)</span> — longueur + question + personnalisation (H43, H50)</li>
            <li><span className="text-gray-300 font-medium">Escalation (0-20)</span> — timing de proposition de rendez-vous (H29)</li>
            <li><span className="text-gray-300 font-medium">Equilibre (0-20)</span> — ratio messages envoyes vs recus</li>
          </ul>
          <p className="text-[10px] text-gray-600 mt-2">
            Base sur {insights.conversationsAnalyzed} conversations analysees · 100% client-side · Confiance: {insights.confidenceLevel}
          </p>
        </div>
      </CPExpandToggle>
    </section>
  );
}

export default function WrappedReport({ metrics, conversationInsights, onShareClick }: WrappedReportProps) {
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
    <div className="space-y-5">
      {/* ─── 1. Hero section ─── */}
      <motion.div
        className="text-center py-6 sm:py-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold">
          <span className={`bg-gradient-to-r ${appColor.gradient} bg-clip-text text-transparent`}>
            TON DATING WRAPPED
          </span>
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {formatPeriod(metrics.periodStart, metrics.periodEnd)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {sourceName} — {metrics.totalDays} jours d'activite
          {metrics.tenureMonths && (
            <span className="ml-1">
              · Sur {sourceName} depuis {metrics.tenureMonths} mois
            </span>
          )}
        </p>
      </motion.div>

      {/* ─── 2. Temps investi (hoursPerMatch promoted to H2) ─── */}
      <Card delay={0.05}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Temps investi
        </h3>
        {metrics.hoursPerMatch > 0 ? (
          <>
            <div className="text-center mb-4">
              <p className="text-4xl sm:text-5xl font-extrabold" style={{ color: appColor.primary }}>
                {metrics.hoursPerMatch}h
              </p>
              <p className="mt-1 text-sm text-gray-300">par match obtenu</p>
            </div>
            <div className="flex items-center justify-around">
              <BigStat
                value={`${metrics.estimatedTotalHours}h`}
                label="temps total estime"
                size="sm"
              />
              <div className="h-12 w-px bg-white/10" />
              <BigStat
                value={`${metrics.totalDays > 0 ? Math.round((metrics.estimatedTotalHours / metrics.totalDays) * 10) / 10 : 0}h`}
                label="par jour en moyenne"
                size="sm"
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-around">
            <BigStat
              value={`${metrics.estimatedTotalHours}h`}
              label="temps total estime"
            />
            <div className="h-12 w-px bg-white/10" />
            <BigStat
              value={`${metrics.totalDays > 0 ? Math.round((metrics.estimatedTotalHours / metrics.totalDays) * 10) / 10 : 0}h`}
              label="par jour en moyenne"
              size="sm"
            />
          </div>
        )}
        {metrics.estimatedTotalHours > 100 && (
          <p className="mt-3 text-xs text-amber-400 text-center">
            C'est plus de {Math.round(metrics.estimatedTotalHours / 24)} jours complets passes a swiper...
          </p>
        )}
      </Card>

      {/* ─── 3. Volume (Swipes, contextualized) ─── */}
      <Card delay={0.1}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Volume de swipes
        </h3>
        <div className="flex items-center justify-around">
          <BigStat
            value={metrics.totalSwipes.toLocaleString("fr-FR")}
            label="swipes au total"
            color={appColor.primary}
          />
          <div className="h-12 w-px bg-white/10" />
          {/* Hinge doesn't log passes — show avg swipes/day instead of meaningless 99% rate */}
          {metrics.source === "hinge" ? (
            <BigStat
              value={metrics.avgSwipesPerDay.toLocaleString("fr-FR")}
              label="likes / jour en moy."
              size="sm"
            />
          ) : (
            <BigStat
              value={`${metrics.rightSwipeRate}%`}
              label="de likes (right swipes)"
              size="sm"
            />
          )}
        </div>
        {/* Hinge doesn't log passes so rightSwipeRate is always ~100% — skip this warning */}
        {metrics.rightSwipeRate > 70 && metrics.source !== "hinge" && (
          <motion.div
            className="mt-4 rounded-xl bg-amber-950/30 border border-amber-500/20 px-4 py-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-xs text-amber-400 flex items-start gap-2">
              <span className="shrink-0">&#x26A0;&#xFE0F;</span>
              Tu likes trop ! Sois plus selectif pour de meilleurs matches. Les profils avec un taux de like &lt;30% ont 3x plus de matches.
            </p>
          </motion.div>
        )}
      </Card>

      {/* ─── 4. Funnel (NEW — deep insight) ─── */}
      {metrics.funnel && metrics.funnel.likes > 0 && (
        <Card delay={0.12}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Ton funnel
          </h3>
          <FunnelChart funnel={metrics.funnel} color={appColor.primary} weMet={!!metrics.funnel.dates} />
          <p className="mt-3 text-xs text-gray-500 text-center">
            {metrics.funnel.dates > 0
              ? `Sur ${metrics.funnel.likes.toLocaleString("fr-FR")} likes, ${metrics.funnel.dates} date${metrics.funnel.dates > 1 ? "s" : ""} en vrai`
              : `Sur ${metrics.funnel.likes.toLocaleString("fr-FR")} likes, ${metrics.funnel.conversations} conversation${metrics.funnel.conversations > 1 ? "s" : ""}`}
          </p>
        </Card>
      )}

      {/* ─── 5. Tes meilleurs jours (day-of-week) ─── */}
      <Card delay={0.15}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Tes meilleurs jours
        </h3>
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
          <p className="mt-2 text-xs text-center text-gray-400">
            <span className="font-semibold" style={{ color: appColor.primary }}>{metrics.bestDay}</span>
            {" "}= ton jour de chance
          </p>
        )}
        <p className="mt-3 text-[11px] text-gray-600 text-center">
          DatePulse te dit aussi a quelle <strong className="text-gray-400">heure</strong> swiper →{" "}
          <a href="/" className="underline hover:text-gray-300 transition">Voir les fenetres</a>
        </p>
      </Card>

      {/* ─── 6. Impact du commentaire (Hinge only) ─── */}
      {metrics.commentImpact && (
        <Card delay={0.18}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Impact du commentaire
          </h3>
          <div className="text-center mb-4">
            <p className="text-4xl sm:text-5xl font-extrabold" style={{ color: appColor.primary }}>
              x{metrics.commentImpact.boostFactor}
            </p>
            <p className="mt-1 text-sm text-gray-300">boost commentaire</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="text-lg font-bold text-emerald-400">{metrics.commentImpact.commentedMatchRate}%</p>
              <p className="text-xs text-gray-400">match rate</p>
              <p className="mt-1 text-[11px] text-gray-600">{metrics.commentImpact.commentedLikes} likes avec commentaire</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="text-lg font-bold text-gray-400">{metrics.commentImpact.plainMatchRate}%</p>
              <p className="text-xs text-gray-400">match rate</p>
              <p className="mt-1 text-[11px] text-gray-600">
                {metrics.funnel ? metrics.funnel.likes - metrics.commentImpact.commentedLikes : "?"} likes sans commentaire
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 text-center">
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
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          {metrics.purchasesTotal ? "Conversion & Depenses" : "Matches"}
        </h3>

        {/* Purchases block */}
        {metrics.purchasesTotal != null && metrics.purchasesTotal > 0 && (
          <div className="mb-5 text-center">
            <p className="text-4xl sm:text-5xl font-extrabold text-red-400">
              {metrics.purchasesTotal}&euro;
            </p>
            <p className="mt-1 text-sm text-gray-400">depenses sur {sourceName}</p>
            {metrics.costPerMatch != null && metrics.costPerMatch > 0 && (
              <p className="mt-2 text-xs text-red-400/80">
                soit {metrics.costPerMatch}&euro; par match obtenu
              </p>
            )}
            <p className="mt-3 text-[11px] text-gray-600">
              L'Audit DatePulse coute moins qu'un seul match sur {sourceName}
            </p>
            <div className="my-4 h-px bg-white/5" />
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
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Premium vs Free
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
                Premium ({metrics.premiumROI.premiumMonths} mois)
              </p>
              <p className="text-2xl font-bold" style={{ color: appColor.primary }}>
                {metrics.premiumROI.premiumMatchRate}%
              </p>
              <p className="text-xs text-gray-400">match rate</p>
              <p className="mt-2 text-[11px] text-gray-600">
                {metrics.premiumROI.totalSpent}&euro; depenses
              </p>
              {metrics.premiumROI.costPerPremiumMatch > 0 && (
                <p className="text-[11px] text-gray-600">
                  {metrics.premiumROI.costPerPremiumMatch}&euro;/match
                </p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
                Free ({metrics.premiumROI.freeMonths} mois)
              </p>
              <p className="text-2xl font-bold text-gray-300">
                {metrics.premiumROI.freeMatchRate}%
              </p>
              <p className="text-xs text-gray-400">match rate</p>
              <p className="mt-2 text-[11px] text-gray-600">0&euro;</p>
            </div>
          </div>
          {/* Worth-it badge */}
          <div className="text-center">
            {metrics.premiumROI.isWorthIt ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
                Le premium vaut le coup (x{metrics.premiumROI.boostFactor})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-950/40 border border-red-500/20 px-3 py-1 text-xs text-red-400">
                Le premium ne change rien pour toi
              </span>
            )}
          </div>
          <p className="mt-3 text-[11px] text-gray-600 text-center">
            L'Audit DatePulse coute 9.99&euro; — moins qu'un mois de {sourceName} Premium
          </p>
        </Card>
      )}

      {/* ─── 9. Conversations (enriched with ghost empathy + sent/received) ─── */}
      <Card delay={0.25}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
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
          <p className="mt-3 text-xs text-gray-500 text-center">
            {metrics.ghostRate}% de tes matches n'ont jamais mene a un echange.{" "}
            {metrics.ghostRate <= 60
              ? "C'est normal — la moyenne est de ~60%."
              : "C'est au-dessus de la moyenne (~60%)."}
          </p>
        )}

        {/* Sent/Received ratio */}
        {metrics.sentReceivedRatio > 0 && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            Tu envoies <span className="text-white font-medium">{metrics.sentReceivedRatio}x</span> plus de messages que tu n'en recois
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

      {/* ═══ CONVERSATION PULSE — 10 premium sections ═══ */}
      {conversationInsights && conversationInsights.conversationsAnalyzed >= 5 && (
        <div className="space-y-12">
          <CPSectionNav />
          <CPSectionHero insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionGhost insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionQuestions insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionTempo insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionOpeners insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionEscalation insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionDoubleText insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionBalance insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionFatigue insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} />
          <CPSectionVerdict insights={conversationInsights} appColor={appColor} benchmarkGender={benchmarkGender} onShareClick={onShareClick} />
        </div>
      )}

      {/* ─── 9b. Boost Intelligence (Tinder only) ─── */}
      {metrics.boostDates && metrics.boostDates.length > 0 && (
        <Card delay={0.26}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
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
            <p className="mt-3 text-xs text-gray-500 text-center">
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
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
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

      {/* ─── 10. Temps de reponse ─── */}
      {metrics.responseTime && (
        <Card delay={0.27}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Temps de reponse
          </h3>
          <BigStat
            value={`${metrics.responseTime.medianHours}h`}
            label="temps de reponse median"
            color={appColor.primary}
          />
          <div className="mt-4 space-y-2">
            {[
              { label: "< 1h", count: metrics.responseTime.under1h, badge: "\u26A1" },
              { label: "1-6h", count: metrics.responseTime.under6h, badge: undefined },
              { label: "6-24h", count: metrics.responseTime.under24h, badge: undefined },
              { label: "> 24h", count: metrics.responseTime.over24h, badge: "\u{1F422}" },
            ].map((bucket) => {
              const total = metrics.responseTime!.under1h + metrics.responseTime!.under6h + metrics.responseTime!.under24h + metrics.responseTime!.over24h;
              const pct = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
              return (
                <div key={bucket.label} className="flex items-center gap-3 text-xs">
                  <span className="w-10 text-gray-400 text-right font-medium">{bucket.label}</span>
                  <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: appColor.primary,
                        opacity: 0.6 + (pct / 100) * 0.4,
                      }}
                    />
                  </div>
                  <span className="w-16 text-gray-500 text-right">
                    {bucket.count} ({pct}%) {bucket.badge ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500 text-center">
            {metrics.responseTime.medianHours < 6
              ? "Tu es reactif ! Repondre vite augmente tes chances de 3x."
              : "Les matchs qui repondent dans l'heure ont 3x plus de chances de mener a un date."}
          </p>
        </Card>
      )}

      {/* ─── 11. Survie des matchs (Hinge only) ─── */}
      {metrics.unmatchData && metrics.unmatchData.totalUnmatched > 0 && (
        <Card delay={0.29}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Survie des matchs
          </h3>
          <BigStat
            value={`${metrics.unmatchData.survivalRate}%`}
            label="de matchs encore actifs"
            color={appColor.primary}
          />
          <p className="mt-2 text-xs text-gray-500 text-center">
            {metrics.unmatchData.totalUnmatched} unmatch{metrics.unmatchData.totalUnmatched > 1 ? "s" : ""}
            {" "}(duree moy. {metrics.unmatchData.avgDurationDays}j)
          </p>
          <p className="mt-2 text-[11px] text-gray-600 text-center">
            C'est normal — sur Hinge, la majorite des matchs finissent par etre supprimes.
          </p>
        </Card>
      )}

      {/* ─── 12. Evolution mensuelle ─── */}
      {monthlyData.length > 1 && (
        <Card delay={0.3}>
          {/* Header + stat pills */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Evolution mensuelle
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] border"
                style={{ background: "rgba(108,122,224,0.06)", borderColor: "rgba(108,122,224,0.15)", color: "#6C7AE0" }}>
                <span className="text-gray-500">Swipes</span>
                <span className="font-bold">{metrics.totalSwipes.toLocaleString("fr-FR")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] border"
                style={{ background: "rgba(245,166,35,0.06)", borderColor: "rgba(245,166,35,0.15)", color: "#F5A623" }}>
                <span className="text-gray-500">Matches</span>
                <span className="font-bold">{metrics.monthlyData.reduce((s, d) => s + d.matches, 0)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] border"
                style={{ background: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                <span className="text-gray-500">Moy.</span>
                <span className="font-bold">{avgRate}%</span>
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-end gap-5 text-[11px] mb-3 pr-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#6C7AE0" }} />
              <span className="text-gray-500">Swipes</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3.5 rounded-sm" style={{ height: 2.5, background: "#34d399" }} />
              <span className="text-gray-500">Taux de match</span>
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
                <span className="text-gray-500"> ({monthlyData.find((d) => d.month === bestMonthLabel)?.rate ?? 0}%)</span>
              </span>
              {worstMonthLabel && worstMonthLabel !== bestMonthLabel && (
                <>
                  <span className="text-gray-600">—</span>
                  <span>
                    Pire mois : <strong className="text-red-400">{worstMonthLabel}</strong>
                    <span className="text-gray-500"> ({monthlyData.find((d) => d.month === worstMonthLabel)?.rate ?? 0}%)</span>
                  </span>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ─── Benchmarks: Ou tu te situes ─── */}
      {metrics.source === "tinder" && (
        <Card delay={0.32}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ou tu te situes
            </h3>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-gray-600">Je suis</span>
              <button
                onClick={() => setBenchmarkGender("men")}
                className={`px-2 py-0.5 rounded-md transition ${
                  benchmarkGender === "men"
                    ? "bg-white/10 text-white font-medium"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Homme
              </button>
              <button
                onClick={() => setBenchmarkGender("women")}
                className={`px-2 py-0.5 rounded-md transition ${
                  benchmarkGender === "women"
                    ? "bg-white/10 text-white font-medium"
                    : "text-gray-500 hover:text-gray-300"
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
                <div key={item.key} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
                  <div>
                    <p className="text-sm text-gray-300 font-medium">{item.label}</p>
                    <p className="text-lg font-bold text-white">
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

          <p className="mt-3 text-[10px] text-gray-600 text-center">
            {BENCHMARK_DISCLAIMER}
          </p>
        </Card>
      )}

      {/* ─── 8. Ton ADN Dating (RadarChart) ─── */}
      <Card delay={0.35}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
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
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-gray-500">
          {metrics.adnDating.map((a) => (
            <div key={a.axis} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: appColor.primary, opacity: a.value / 100 }}
              />
              <span>{a.axis}</span>
              <span className="ml-auto font-semibold text-gray-300">{a.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── 9. Verdict ─── */}
      <Card delay={0.4} className="border-brand-500/20 bg-brand-950/10">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Verdict
        </h3>
        <div className="text-center">
          <span className="text-3xl">{verdict.icon}</span>
          <p className="mt-3 text-sm sm:text-base font-medium text-white">
            {verdict.title}
          </p>
          <p className="mt-2 text-sm text-gray-400">{verdict.message}</p>
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
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Tes horaires d'activite
          </h3>
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
            <p className="mt-2 text-[10px] text-gray-600 text-center">
              Base sur tes messages envoyes — l'export Tinder ne fournit pas l'heure exacte des swipes
            </p>
          )}
        </Card>
      )}

      {/* ─── Opt-in dormant checkbox ─── */}
      <div className="text-center py-2">
        <label className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-not-allowed">
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
