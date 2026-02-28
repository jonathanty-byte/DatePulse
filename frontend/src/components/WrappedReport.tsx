import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WrappedMetrics } from "../lib/wrappedMetrics";

// ── Types ───────────────────────────────────────────────────────

interface WrappedReportProps {
  metrics: WrappedMetrics;
  onShareClick?: () => void;
}

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

/** Big number stat display. */
function BigStat({
  value,
  label,
  size = "lg",
}: {
  value: string | number;
  label: string;
  size?: "lg" | "sm";
}) {
  return (
    <div className="text-center">
      <p
        className={`font-extrabold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent ${
          size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"
        }`}
      >
        {value}
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

// ── Main component ──────────────────────────────────────────────

export default function WrappedReport({ metrics, onShareClick }: WrappedReportProps) {
  // Prepare hour chart data
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: formatHour(h),
    swipes: metrics.swipesByHour[h] || 0,
  }));

  // Prepare monthly chart data
  const monthlyData = metrics.monthlyData.map((d) => ({
    month: formatMonth(d.month),
    swipes: d.swipes,
    matches: d.matches,
  }));

  // Determine verdict
  const verdict = getVerdict(metrics);

  // Hours per day
  const hoursPerDay =
    metrics.totalDays > 0
      ? Math.round((metrics.estimatedTotalHours / metrics.totalDays) * 10) / 10
      : 0;

  // Total matches
  const totalMatches =
    metrics.totalSwipes > 0
      ? Math.round(
          (metrics.swipeToMatchRate / 100) * metrics.rightSwipes
        )
      : 0;

  return (
    <div className="space-y-5">
      {/* 1. Hero section */}
      <motion.div
        className="text-center py-6 sm:py-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold">
          <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-brand-600 bg-clip-text text-transparent">
            TON DATING WRAPPED
          </span>
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {formatPeriod(metrics.periodStart, metrics.periodEnd)}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          {metrics.source.charAt(0).toUpperCase() + metrics.source.slice(1)} — {metrics.totalDays} jours d'activite
        </p>
      </motion.div>

      {/* 2. Time spent */}
      <Card delay={0.05}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Temps passe
        </h3>
        <div className="flex items-center justify-around">
          <BigStat
            value={`${metrics.estimatedTotalHours}h`}
            label="temps total estime"
          />
          <div className="h-12 w-px bg-white/10" />
          <BigStat
            value={`${hoursPerDay}h`}
            label="par jour en moyenne"
            size="sm"
          />
        </div>
        {metrics.estimatedTotalHours > 100 && (
          <p className="mt-3 text-xs text-amber-400 text-center">
            C'est plus de {Math.round(metrics.estimatedTotalHours / 24)} jours complets passes a swiper...
          </p>
        )}
      </Card>

      {/* 3. Swipes */}
      <Card delay={0.1}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Swipes
        </h3>
        <div className="flex items-center justify-around">
          <BigStat
            value={metrics.totalSwipes.toLocaleString("fr-FR")}
            label="swipes au total"
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

      {/* 4. Matches */}
      <Card delay={0.15}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Matches
        </h3>
        <div className="flex items-center justify-around">
          <BigStat value={totalMatches} label="matches obtenus" />
          <div className="h-12 w-px bg-white/10" />
          <BigStat
            value={`${metrics.swipeToMatchRate}%`}
            label="taux de conversion"
            size="sm"
          />
        </div>
        {metrics.hoursPerMatch > 0 && (
          <p className="mt-3 text-xs text-gray-500 text-center">
            En moyenne, {metrics.hoursPerMatch}h de swipe par match obtenu
          </p>
        )}
      </Card>

      {/* 5. Conversations */}
      <Card delay={0.2}>
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
        {metrics.ghostRate > 50 && (
          <p className="mt-3 text-xs text-red-400 text-center">
            Plus de la moitie de tes matches ne menent a aucun message. Travaille tes premiers messages !
          </p>
        )}
      </Card>

      {/* 6. Timing — swipes by hour bar chart (only when hourly data is available) */}
      {!metrics.dailyOnly && (
        <Card delay={0.25}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Tes horaires d'activite
          </h3>
          <div className="flex items-center justify-around mb-4">
            <BigStat
              value={formatHour(metrics.peakSwipeHour)}
              label="pic de swipe"
              size="sm"
            />
            <div className="h-12 w-px bg-white/10" />
            <BigStat
              value={formatHour(metrics.peakMatchHour)}
              label="pic de matches"
              size="sm"
            />
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
                  name="Swipes"
                  fill="#ec4899"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 7. DatePulse correlation — circular percentage */}
      <Card delay={0.3}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Correlation DatePulse
        </h3>
        <div className="flex flex-col items-center">
          <CirclePercent value={metrics.matchesInGreenLightPct} />
          <p className="mt-3 text-sm text-gray-300 text-center max-w-sm">
            <span className="font-semibold text-white">
              {metrics.matchesInGreenLightPct}%
            </span>{" "}
            de tes matches sont arrives pendant les fenetres momentum de DatePulse
          </p>
          {metrics.estimatedTimeSavedHours > 0 && (
            <p className="mt-2 text-xs text-emerald-400">
              Tu aurais pu economiser ~{metrics.estimatedTimeSavedHours}h en ne swipant que pendant les fenetres optimales
            </p>
          )}
        </div>
      </Card>

      {/* 8. Monthly trends */}
      {monthlyData.length > 1 && (
        <Card delay={0.35}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Evolution mensuelle
          </h3>
          <div className="h-48 sm:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradSwipes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMatches" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip
                  content={<DarkTooltip />}
                  cursor={{ stroke: "rgba(255,255,255,0.06)" }}
                />
                <Area
                  type="monotone"
                  dataKey="swipes"
                  name="Swipes"
                  stroke="#ec4899"
                  strokeWidth={2}
                  fill="url(#gradSwipes)"
                />
                <Area
                  type="monotone"
                  dataKey="matches"
                  name="Matches"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#gradMatches)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {metrics.bestMonth && (
            <p className="mt-2 text-xs text-gray-500 text-center">
              Meilleur mois :{" "}
              <span className="text-emerald-400 font-medium">
                {formatMonth(metrics.bestMonth)}
              </span>
              {metrics.worstMonth && metrics.worstMonth !== metrics.bestMonth && (
                <>
                  {" "} — Pire mois :{" "}
                  <span className="text-red-400 font-medium">
                    {formatMonth(metrics.worstMonth)}
                  </span>
                </>
              )}
            </p>
          )}
        </Card>
      )}

      {/* 9. Verdict */}
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
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98]"
            whileTap={{ scale: 0.98 }}
          >
            {verdict.ctaLabel}
            <span>&#x2192;</span>
          </motion.a>
        </div>
      </Card>

      {/* Share button */}
      {onShareClick && (
        <motion.button
          onClick={onShareClick}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98]"
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

// ── Circle percentage component ─────────────────────────────────

function CirclePercent({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-32 w-32 sm:h-40 sm:w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#ec4899"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-extrabold text-white">
          {value}%
        </span>
      </div>
    </div>
  );
}

// ── Verdict logic ───────────────────────────────────────────────

interface Verdict {
  icon: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}

function getVerdict(m: WrappedMetrics): Verdict {
  if (m.ghostRate > 50) {
    return {
      icon: "\u{1F47B}",
      title: "Tu te fais ghoster trop souvent",
      message:
        "Plus de la moitie de tes matches ne menent a rien. Travaille tes premiers messages pour convertir plus de matches en conversations.",
      ctaLabel: "Ameliorer mes messages",
      ctaHref: "/coach",
    };
  }

  if (m.rightSwipeRate > 70) {
    return {
      icon: "\u{1F6A8}",
      title: "Tu likes tout le monde",
      message:
        "Un taux de like a " +
        m.rightSwipeRate +
        "% penalise ton algorithme. Sois plus selectif pour que l'app te montre de meilleurs profils.",
      ctaLabel: "Optimiser ma strategie",
      ctaHref: "/audit",
    };
  }

  if (m.matchesInGreenLightPct > 60) {
    return {
      icon: "\u{2705}",
      title: "Tu swipes deja aux bons moments !",
      message:
        "DatePulse valide — " +
        m.matchesInGreenLightPct +
        "% de tes matches arrivent pendant les fenetres optimales. Continue comme ca.",
      ctaLabel: "Voir mes fenetres",
      ctaHref: "/",
    };
  }

  return {
    icon: "\u{1F4CA}",
    title: "Optimise tes sessions",
    message:
      "Utilise DatePulse pour swiper au bon moment et maximiser tes matches. Swipe when it matters.",
    ctaLabel: "Voir les fenetres momentum",
    ctaHref: "/",
  };
}
