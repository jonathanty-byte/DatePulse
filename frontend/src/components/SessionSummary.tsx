import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { AppName } from "../lib/data";
import { DAY_NAMES_FULL } from "../lib/data";
import type { PulseSession } from "../lib/sessionTracker";
import { getEfficiencyPercentile, getSessionStats, getSessions } from "../lib/sessionTracker";
import { getNextPeak } from "../lib/scoring";
import type { NextPeak } from "../lib/scoring";
import { getParisDateParts } from "../lib/franceTime";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface SessionSummaryProps {
  session: PulseSession;
  app: AppName;
  onClose: () => void;
  onNewSession: () => void;
  isGreenLight: boolean; // show "Nouvelle session" only if still in green zone
}

export default function SessionSummary({
  session,
  app,
  onClose,
  onNewSession,
  isGreenLight,
}: SessionSummaryProps) {
  const [nextGreen, setNextGreen] = useState<NextPeak | null>(null);
  const [percentile, setPercentile] = useState<number | null>(null);

  useEffect(() => {
    setNextGreen(getNextPeak(new Date(), app, 56));
    setPercentile(getEfficiencyPercentile(session));
  }, [app, session]);

  const efficiency =
    session.duration_actual > 0
      ? Math.round((session.matches / (session.duration_actual / 60)) * 10) / 10
      : 0;

  const stats = getSessionStats(getSessions());

  // Format next green light countdown
  const formatNext = (peak: NextPeak): string => {
    const { day, hour } = getParisDateParts(peak.date);
    const dayName = DAY_NAMES_FULL[day];
    if (peak.hoursUntil < 1) return `dans ${peak.minutesUntil} min`;
    if (peak.hoursUntil < 24) return `dans ${peak.hoursUntil}h${peak.minutesUntil > 0 ? String(peak.minutesUntil).padStart(2, "0") : ""}`;
    return `${dayName} a ${hour}h`;
  };

  // Efficiency emoji
  const effEmoji =
    efficiency >= 4 ? "\u{1F525}" : efficiency >= 2 ? "\u{26A1}" : efficiency >= 1 ? "\u{1F44D}" : "\u{1F4AA}";

  return (
    <motion.section
      className="relative overflow-hidden px-4 pb-12 pt-10 sm:pb-16 sm:pt-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Celebratory gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-50 to-[#f8f9fc]" />

      <div className="relative mx-auto max-w-md flex flex-col items-center text-center">
        {/* Success badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
        >
          <span className="inline-block text-5xl sm:text-6xl">
            {session.completed ? "\u{2705}" : "\u{23F9}\u{FE0F}"}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          className="mt-4 text-xl sm:text-2xl font-extrabold text-slate-900"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {session.completed ? "Session terminee !" : "Session arretee"}
        </motion.h2>

        {/* Stats card */}
        <motion.div
          className="mt-6 w-full border border-gray-200 bg-white shadow-sm p-5 sm:p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="grid grid-cols-2 gap-4">
            <StatItem
              icon="&#x23F1;"
              label="Duree"
              value={`${Math.round(session.duration_actual)} min`}
              delay={0.35}
            />
            <StatItem
              icon="&#x1F4CA;"
              label="Score moyen"
              value={String(session.score_avg)}
              delay={0.4}
            />
            <StatItem
              icon="&#x1F495;"
              label="Matches"
              value={String(session.matches)}
              delay={0.45}
            />
            <StatItem
              icon={effEmoji}
              label="Efficacite"
              value={`${efficiency}/h`}
              delay={0.5}
            />
          </div>

          {/* Score range */}
          <motion.div
            className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-3 text-xs text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <span>Score : {session.score_start} &#x2192; {session.score_end}</span>
            <span>|</span>
            <span>{capitalize(session.app)}</span>
          </motion.div>
        </motion.div>

        {/* Percentile comparison */}
        {percentile !== null && (
          <motion.div
            className="mt-4 w-full bg-brand-50 border border-brand-200 px-5 py-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-sm text-brand-500">
              &#x1F4C8; Mieux que {percentile}% de tes sessions
            </p>
          </motion.div>
        )}

        {/* Global stats hint */}
        {stats.sessionsCount > 1 && (
          <motion.p
            className="mt-3 text-xs text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            {stats.sessionsCount} sessions au total — {stats.matchesPerHour} matches/h en moyenne
          </motion.p>
        )}

        {/* Next green light */}
        {nextGreen && !isGreenLight && (
          <motion.div
            className="mt-5 flex items-center gap-3 bg-gray-50 border border-green-200 px-5 py-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <span className="text-xl">&#x1F7E2;</span>
            <div className="text-left">
              <p className="text-xs text-slate-500">Prochain momentum</p>
              <p className="text-sm font-bold text-green-600">
                {formatNext(nextGreen)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 w-full"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          {isGreenLight && (
            <motion.button
              onClick={onNewSession}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
              whileTap={{ scale: 0.95 }}
            >
              <span>&#x1F3AF;</span>
              Nouvelle session
            </motion.button>
          )}
          <motion.button
            onClick={onClose}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm sm:text-base font-semibold transition active:scale-95 ${
              isGreenLight
                ? "bg-gray-50 border border-gray-200 text-slate-500 hover:bg-gray-100 hover:text-slate-900"
                : "bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-sm"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            Fermer
          </motion.button>
        </motion.div>
      </div>
    </motion.section>
  );
}

// ── Stat item sub-component ─────────────────────────────────────

function StatItem({
  icon,
  label,
  value,
  delay,
}: {
  icon: string;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1 py-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <span className="text-xl" dangerouslySetInnerHTML={{ __html: icon }} />
      <span className="text-lg sm:text-xl font-bold text-slate-900">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </motion.div>
  );
}
