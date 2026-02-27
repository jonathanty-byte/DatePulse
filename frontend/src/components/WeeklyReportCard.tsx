import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { generateWeeklyReport, getInsight, hasAnySessions } from "../lib/weeklyReport";
import type { WeeklyReport } from "../lib/weeklyReport";

// ── Helpers ─────────────────────────────────────────────────────

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, "0")}`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("fr-FR", opts)} au ${e.toLocaleDateString("fr-FR", opts)}`;
}

function scoreToBarColor(score: number): string {
  if (score >= 56) return "#16A34A"; // green
  if (score >= 36) return "#F59E0B"; // amber
  return "#DC2626"; // red
}

/** Delta display: for time, LESS = better (green), for matches/efficiency MORE = better */
function DeltaBadge({
  delta,
  invertColor = false,
}: {
  delta: number;
  invertColor?: boolean; // true = negative is green (for time)
}) {
  if (delta === 0) return null;
  const isPositive = delta > 0;
  const isGood = invertColor ? !isPositive : isPositive;

  return (
    <span
      className={`ml-1.5 text-xs font-medium ${
        isGood ? "text-green-400" : "text-red-400"
      }`}
    >
      {isPositive ? "+" : ""}{delta}%
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────

export default function WeeklyReportCard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const hasSessions = useMemo(() => hasAnySessions(), []);

  const report = useMemo<WeeklyReport>(
    () => generateWeeklyReport(undefined, weekOffset),
    [weekOffset]
  );

  const insight = useMemo(() => getInsight(report), [report]);

  if (!hasSessions) return null;

  const canGoForward = weekOffset < 0;

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      {/* Header with week navigation */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <span>&#x1F4CA;</span>
          Ton bilan
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition text-sm"
          >
            &#x2039;
          </button>
          <span className="text-xs text-gray-500 min-w-[120px] text-center">
            {weekOffset === 0
              ? "Cette semaine"
              : weekOffset === -1
                ? "Semaine derniere"
                : formatDateRange(report.weekStart, report.weekEnd)}
          </span>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={!canGoForward}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &#x203A;
          </button>
        </div>
      </div>

      {/* Week range subtitle */}
      <p className="text-xs text-gray-600 mb-4">
        {formatDateRange(report.weekStart, report.weekEnd)}
      </p>

      {report.sessionsCount === 0 ? (
        /* Empty state */
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400 mb-2">
            Aucune session cette semaine.
          </p>
          <p className="text-xs text-gray-600">
            Lance ta premiere session pendant un momentum !
          </p>
        </div>
      ) : (
        <>
          {/* 4 stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-5">
            <StatCard
              icon="&#x23F1;"
              label="Temps total"
              value={formatTime(report.totalTime)}
              delta={report.timeDelta}
              invertDelta
              delay={0.05}
            />
            <StatCard
              icon="&#x1F3AF;"
              label="Sessions"
              value={`${report.sessionsCount}`}
              subtitle={`${Math.round((report.completedSessions / report.sessionsCount) * 100)}% completes`}
              delay={0.1}
            />
            <StatCard
              icon="&#x1F495;"
              label="Matches"
              value={`${report.totalMatches}`}
              delta={report.matchesDelta}
              delay={0.15}
            />
            <StatCard
              icon="&#x26A1;"
              label="Efficacite"
              value={`${report.matchesPerHour}/h`}
              delta={report.efficiencyDelta}
              delay={0.2}
            />
          </div>

          {/* Bar chart: matches by day */}
          <div className="mb-5">
            <p className="text-xs text-gray-500 mb-2">Matches par jour</p>
            <div className="h-32 sm:h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.dailyMatches} barCategoryGap="20%">
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#4B5563", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={20}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{
                      background: "#1F2937",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#9CA3AF" }}
                    formatter={(value: number, _name: string, props: unknown) => {
                      const p = props as { payload?: { avgScore?: number } } | undefined;
                      const avg = p?.payload?.avgScore ?? 0;
                      return [`${value} match${value !== 1 ? "es" : ""} (score moy. ${avg})`, ""];
                    }}
                  />
                  <Bar dataKey="matches" radius={[4, 4, 0, 0]}>
                    {report.dailyMatches.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.matches > 0 ? scoreToBarColor(entry.avgScore) : "rgba(255,255,255,0.05)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insight card */}
          <motion.div
            className="rounded-xl bg-brand-600/10 border border-brand-500/20 px-4 py-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-sm text-brand-300">{insight}</p>
          </motion.div>

          {/* Extra info */}
          {(report.bestDay || report.bestHour !== null) && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
              {report.bestDay && (
                <span>Meilleur jour : {report.bestDay}</span>
              )}
              {report.bestHour !== null && (
                <span>Meilleure heure : {report.bestHour}h</span>
              )}
              <span>Momentum : {report.pctGreenLight}%</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ── Sub-component ───────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  subtitle,
  delta,
  invertDelta = false,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  delta?: number;
  invertDelta?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      className="rounded-xl bg-white/[0.03] border border-white/5 p-3 sm:p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm" dangerouslySetInnerHTML={{ __html: icon }} />
        <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg sm:text-xl font-bold text-white">{value}</span>
        {delta !== undefined && delta !== 0 && (
          <DeltaBadge delta={delta} invertColor={invertDelta} />
        )}
      </div>
      {subtitle && (
        <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>
      )}
    </motion.div>
  );
}
