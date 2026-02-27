import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppName } from "../lib/data";
import { computeScore } from "../lib/scoring";
import type { ActiveSessionState } from "../lib/sessionTracker";
import {
  saveActiveSessionState,
  endSession,
} from "../lib/sessionTracker";
import type { PulseSession } from "../lib/sessionTracker";

// ── Types ───────────────────────────────────────────────────────

interface SessionTimerProps {
  app: AppName;
  activeSession: ActiveSessionState;
  weatherCondition?: string;
  trendModifier?: number;
  onSessionEnd: (session: PulseSession) => void;
}

const DURATION_OPTIONS = [10, 15, 20, 30] as const;

// ── Component ───────────────────────────────────────────────────

export default function SessionTimer({
  app,
  activeSession,
  weatherCondition,
  trendModifier,
  onSessionEnd,
}: SessionTimerProps) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(activeSession));
  const [matches, setMatches] = useState(activeSession.matches);
  const [liveScore, setLiveScore] = useState(() =>
    computeScore(new Date(), app, weatherCondition, trendModifier).score
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [midTimeShown, setMidTimeShown] = useState(false);
  const [showMidToast, setShowMidToast] = useState(false);
  const hasEndedRef = useRef(false);

  const totalSeconds = activeSession.plannedDuration * 60;
  const progress = Math.max(0, Math.min(1, 1 - remaining / totalSeconds));

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = getRemainingSeconds(activeSession);
      setRemaining(secs);

      // Sample score every 30 seconds
      if (Math.floor(secs) % 30 === 0) {
        const score = computeScore(new Date(), app, weatherCondition, trendModifier).score;
        setLiveScore(score);
        // Add score sample (avoid duplicates by checking last sample time)
        if (!activeSession.scoreSamples.includes(score) || activeSession.scoreSamples.length < 100) {
          activeSession.scoreSamples.push(score);
          saveActiveSessionState(activeSession);
        }
      }

      // Mid-time notification
      if (!midTimeShown && secs <= totalSeconds / 2 && secs > 0) {
        setMidTimeShown(true);
        setShowMidToast(true);
        setTimeout(() => setShowMidToast(false), 4000);
      }

      // Timer ended
      if (secs <= 0 && !hasEndedRef.current) {
        hasEndedRef.current = true;
        // Vibrate if available
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        handleEnd(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, app, weatherCondition, trendModifier, midTimeShown, totalSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update live score every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScore(computeScore(new Date(), app, weatherCondition, trendModifier).score);
    }, 60_000);
    return () => clearInterval(interval);
  }, [app, weatherCondition, trendModifier]);

  const handleEnd = useCallback(
    (completed: boolean) => {
      if (hasEndedRef.current && !completed) {
        // Already ended via timer, don't double-end
        return;
      }
      hasEndedRef.current = true;
      const updatedState = { ...activeSession, matches };
      const session = endSession(updatedState, completed);
      onSessionEnd(session);
    },
    [activeSession, matches, onSessionEnd]
  );

  const handleAddMatch = () => {
    const newMatches = matches + 1;
    setMatches(newMatches);
    activeSession.matches = newMatches;
    saveActiveSessionState(activeSession);
  };

  const handleStop = () => {
    if (showConfirm) {
      handleEnd(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  // Format remaining time
  const mins = Math.max(0, Math.floor(remaining / 60));
  const secs = Math.max(0, Math.floor(remaining % 60));
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // SVG circular timer
  const size = 220;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  // Color based on remaining time
  const isEnding = remaining <= 60;
  const color = isEnding ? "#F59E0B" : "#22C55E";

  return (
    <motion.section
      className="relative overflow-hidden px-4 pb-12 pt-10 sm:pb-16 sm:pt-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-[#080b14]" />

      {/* Pulsing session glow */}
      <motion.div
        className="absolute inset-0 bg-green-500/5"
        animate={{ opacity: [0, 0.06, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-4xl flex flex-col items-center text-center">
        {/* Session active badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span className="inline-block rounded-full bg-green-600/20 border border-green-500/30 px-5 py-1.5 text-sm sm:text-base font-bold tracking-widest text-green-400 uppercase">
            Session en cours
          </span>
        </motion.div>

        {/* Circular timer */}
        <motion.div
          className="relative mt-6 sm:mt-8 w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-white/5"
            />
            {/* Progress arc */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
            {/* Glow */}
            <defs>
              <filter id="timer-glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth / 2}
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{
                strokeDashoffset: dashOffset,
                opacity: [0.2, 0.4],
              }}
              transition={{
                strokeDashoffset: { duration: 0.5, ease: "linear" },
                opacity: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
              }}
              filter="url(#timer-glow)"
            />
          </svg>

          {/* Center: countdown */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl sm:text-5xl font-bold font-mono"
              style={{ color }}
              key={timeStr}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              {timeStr}
            </motion.span>
            <span className="text-xs sm:text-sm text-gray-400 mt-1">
              restantes
            </span>
          </div>

          {/* Outer pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 25px 2px ${color}` }}
            animate={{ opacity: [0.15, 0.3], scale: [1, 1.03] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Live score */}
        <motion.div
          className="mt-5 flex items-center gap-2 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span>Score actuel :</span>
          <span className="font-bold text-green-400 text-base">{liveScore}</span>
          <span className="text-gray-600">/100</span>
        </motion.div>

        {/* Match counter */}
        <motion.div
          className="mt-4 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2">
            <span className="text-lg">&#x1F495;</span>
            <span className="text-sm text-gray-300">
              {matches} match{matches !== 1 ? "es" : ""}
            </span>
          </div>
          <motion.button
            onClick={handleAddMatch}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400 text-xl font-bold transition hover:bg-brand-600/30 active:scale-90"
            whileTap={{ scale: 0.85 }}
          >
            +
          </motion.button>
        </motion.div>

        {/* Stop button */}
        <motion.button
          onClick={handleStop}
          className={`mt-6 sm:mt-8 flex items-center gap-2 rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold transition active:scale-95 ${
            showConfirm
              ? "bg-red-600/80 text-white shadow-red-500/25 shadow-lg"
              : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
          }`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>&#x23F9;</span>
          {showConfirm
            ? "Confirmer l'arret (session incomplete)"
            : "Arreter la session"}
        </motion.button>

        {/* Mid-time toast */}
        <AnimatePresence>
          {showMidToast && (
            <motion.div
              className="mt-4 rounded-xl bg-amber-600/20 border border-amber-500/30 px-5 py-3 text-sm text-amber-300"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
            >
              Mi-temps ! {Math.ceil(remaining / 60)} min restantes
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function getRemainingSeconds(state: ActiveSessionState): number {
  const elapsed = (Date.now() - state.startTime) / 1000;
  return Math.max(0, state.plannedDuration * 60 - elapsed);
}

// ── Duration Selector (used in GreenLightScreen) ────────────────

interface DurationSelectorProps {
  selected: number;
  onChange: (duration: number) => void;
}

export function DurationSelector({ selected, onChange }: DurationSelectorProps) {
  return (
    <div className="flex gap-2">
      {DURATION_OPTIONS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
            selected === d
              ? "bg-green-600/30 border border-green-500/40 text-green-400"
              : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300"
          }`}
        >
          {d} min
        </button>
      ))}
    </div>
  );
}
