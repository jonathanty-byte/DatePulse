import { useState } from "react";
import { motion } from "framer-motion";
import ScoreGauge from "./ScoreGauge";
import type { GaugeMode } from "./ScoreGauge";
import ScoreLabel from "./ScoreLabel";
import CountdownNext from "./CountdownNext";
import { DurationSelector } from "./SessionTimer";
import type { AppName } from "../lib/data";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SWIPEABLE_APPS = new Set(["tinder", "bumble"]);
const TRIGGER_URL = "http://localhost:5555/trigger";

interface GreenLightScreenProps {
  score: number;
  event: string | null;
  app: AppName;
  now: Date;
  onStartSession?: (duration: number) => void;
}

export default function GreenLightScreen({ score, event, app, now, onStartSession }: GreenLightScreenProps) {
  const [triggerStatus, setTriggerStatus] = useState<"idle" | "launching" | "ok" | "error">("idle");
  const [selectedDuration, setSelectedDuration] = useState(15);

  const isPeak = score >= 91;
  const isStrong = score >= 56;
  const gaugeMode: GaugeMode = isPeak ? "peak" : isStrong ? "green" : "amber";

  return (
    <motion.section
      className="relative px-4 pb-12 pt-10 sm:pb-16 sm:pt-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mx-auto max-w-4xl flex flex-col items-center text-center">
        {/* GO label */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <span
            className={`inline-block border px-5 py-1.5 text-sm sm:text-base font-bold tracking-[0.1em] uppercase ${
              isStrong
                ? "bg-green-50 border-green-200 text-green-600"
                : "bg-amber-50 border-amber-200 text-amber-600"
            }`}
          >
            {isPeak ? "Momentum optimal" : isStrong ? "Momentum" : "Transition"}
          </span>
        </motion.div>

        {/* Main message */}
        <motion.h2
          className={`mt-5 sm:mt-6 text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] ${
            isStrong ? "text-green-600" : "text-amber-600"
          }`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {isStrong ? "C'EST MAINTENANT" : "Activité correcte"}
        </motion.h2>

        <motion.p
          className="mt-2 sm:mt-3 max-w-md text-sm sm:text-base text-slate-500 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isStrong ? "15 minutes suffisent." : "15 min si tu veux, mais ce n'est pas le pic."}
        </motion.p>

        {/* Gauge */}
        <motion.div
          className="mt-6 sm:mt-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <ScoreGauge score={score} mode={gaugeMode} />
        </motion.div>

        {/* Score label */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <ScoreLabel score={score} event={event} app={app} now={now} />
        </motion.div>

        {/* Countdown (for amber zone) */}
        {!isStrong && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <CountdownNext app={app} />
          </motion.div>
        )}

        {/* Duration selector */}
        <motion.div
          className="mt-6 sm:mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <DurationSelector selected={selectedDuration} onChange={setSelectedDuration} />
        </motion.div>

        {/* Launch session button */}
        <motion.button
          onClick={() => onStartSession?.(selectedDuration)}
          className={`mt-4 flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white shadow-sm transition active:scale-95 ${
            isStrong
              ? "bg-green-600 hover:bg-green-700"
              : "bg-amber-500 hover:bg-amber-600"
          }`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          whileTap={{ scale: 0.95 }}
        >
          Lancer ma session ({selectedDuration} min)
        </motion.button>

        {/* Auto Swiper button */}
        {SWIPEABLE_APPS.has(app) && (
          <motion.button
            onClick={async () => {
              setTriggerStatus("launching");
              try {
                const res = await fetch(TRIGGER_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ app }),
                });
                setTriggerStatus(res.ok ? "ok" : "error");
              } catch {
                setTriggerStatus("error");
              }
              setTimeout(() => setTriggerStatus("idle"), 5000);
            }}
            disabled={triggerStatus === "launching"}
            className="mt-3 flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 text-xs sm:text-sm text-slate-500 transition hover:bg-gray-50 hover:text-slate-700 active:scale-95 disabled:opacity-50 shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M2 10a.75.75 0 0 1 .75-.75h12.59l-2.1-1.95a.75.75 0 1 1 1.02-1.1l3.5 3.25a.75.75 0 0 1 0 1.1l-3.5 3.25a.75.75 0 1 1-1.02-1.1l2.1-1.95H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
            </svg>
            {triggerStatus === "launching"
              ? "Lancement..."
              : triggerStatus === "ok"
                ? "Auto Swiper lancé !"
                : triggerStatus === "error"
                  ? "Erreur — serveur local actif ?"
                  : `Auto Swiper — ${capitalize(app)}`}
          </motion.button>
        )}
      </div>
    </motion.section>
  );
}
