import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  ReferenceLine,
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
} from "recharts";
import type { WrappedMetrics } from "../lib/wrappedMetrics";
import { getVerdict } from "../lib/wrappedMetrics";

// ── Types ───────────────────────────────────────────────────────

interface WrappedReportProps {
  metrics: WrappedMetrics;
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

export default function WrappedReport({ metrics, onShareClick }: WrappedReportProps) {
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
          <BigStat
            value={`${metrics.rightSwipeRate}%`}
            label="de likes (right swipes)"
            size="sm"
          />
        </div>
        {metrics.rightSwipeRate > 70 && (
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

      {/* ─── 4. Tes meilleurs jours (NEW — day-of-week) ─── */}
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

      {/* ─── 5. Conversion + Purchases ─── */}
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

      {/* ─── 6. Conversations (enriched with ghost empathy + sent/received) ─── */}
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

      {/* ─── 7. Evolution mensuelle (unchanged) ─── */}
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
