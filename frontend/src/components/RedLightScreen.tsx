import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ScoreGauge from "./ScoreGauge";
import ScoreLabel from "./ScoreLabel";
import { getNextPeak } from "../lib/scoring";
import type { NextPeak } from "../lib/scoring";
import { DAY_NAMES_FULL } from "../lib/data";
import type { AppName } from "../lib/data";
import { getParisDateParts } from "../lib/franceTime";

function formatCountdown(peak: NextPeak): string {
  const { day, hour } = getParisDateParts(peak.date);
  const dayName = DAY_NAMES_FULL[day];

  if (peak.hoursUntil === 0) {
    return `dans ${peak.minutesUntil} min`;
  }
  if (peak.hoursUntil < 24) {
    return `dans ${peak.hoursUntil}h${peak.minutesUntil > 0 ? String(peak.minutesUntil).padStart(2, "0") : ""}`;
  }
  return `${dayName} a ${hour}h`;
}

interface RedLightScreenProps {
  score: number;
  event: string | null;
  app: AppName;
  now: Date;
}

export default function RedLightScreen({ score, event, app, now }: RedLightScreenProps) {
  const [nextGreen, setNextGreen] = useState<NextPeak | null>(null);

  useEffect(() => {
    const update = () => setNextGreen(getNextPeak(new Date(), app, 56));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [app]);

  return (
    <motion.section
      className="relative overflow-hidden px-4 pb-12 pt-10 sm:pb-16 sm:pt-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Pulsing red background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-red-950/40 to-[#080b14]"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-4xl flex flex-col items-center text-center">
        {/* STOP label */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <span className="inline-block rounded-full bg-red-600/20 border border-red-500/30 px-5 py-1.5 text-sm sm:text-base font-bold tracking-widest text-red-400 uppercase">
            Hors pic
          </span>
        </motion.div>

        {/* Main message */}
        <motion.h2
          className="mt-5 sm:mt-6 text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-red-400"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          ATTENDS LE CRENEAU
        </motion.h2>

        <motion.p
          className="mt-2 sm:mt-3 max-w-md text-sm sm:text-base text-gray-400 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Activite quasi-nulle. Tu vas juste scroller dans le vide.
        </motion.p>

        {/* Gauge */}
        <motion.div
          className="mt-6 sm:mt-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <ScoreGauge score={score} mode="red" />
        </motion.div>

        {/* Score label (event badge, delta) */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <ScoreLabel score={score} event={event} app={app} now={now} />
        </motion.div>

        {/* Countdown to next Green Light */}
        {nextGreen && (
          <motion.div
            className="mt-6 sm:mt-8 flex items-center gap-3 rounded-xl bg-white/5 border border-green-500/20 px-5 sm:px-6 py-3 sm:py-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <span className="text-2xl sm:text-3xl">&#x1F7E2;</span>
            <div className="text-left">
              <p className="text-xs sm:text-sm text-gray-400">Prochain momentum</p>
              <p className="text-base sm:text-lg font-bold text-green-400">
                {formatCountdown(nextGreen)}
                <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">
                  — score {nextGreen.score}
                </span>
              </p>
            </div>
          </motion.div>
        )}

        {/* CTA: improve profile → /audit */}
        <motion.a
          href="/audit?from=redlight"
          className="mt-5 sm:mt-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          Profite-en pour ameliorer ton profil
          <span className="text-xs">&rarr;</span>
        </motion.a>
      </div>
    </motion.section>
  );
}
