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
  return `${dayName} à ${hour}h`;
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
      className="relative px-4 pb-12 pt-10 sm:pb-16 sm:pt-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mx-auto max-w-4xl flex flex-col items-center text-center">
        {/* STOP label */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <span className="inline-block bg-red-50 border border-red-200 px-5 py-1.5 text-sm sm:text-base font-bold tracking-[0.1em] text-red-500 uppercase">
            Hors pic
          </span>
        </motion.div>

        {/* Main message */}
        <motion.h2
          className="mt-5 sm:mt-6 text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] text-red-500"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          ATTENDS LE CRÉNEAU
        </motion.h2>

        <motion.p
          className="mt-2 sm:mt-3 max-w-md text-sm sm:text-base text-slate-500 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Activité quasi-nulle. Tu vas juste scroller dans le vide.
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

        {/* Score label */}
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
            className="mt-6 sm:mt-8 flex items-center gap-3 bg-white border border-green-200 px-5 sm:px-6 py-3 sm:py-4 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex h-8 w-8 items-center justify-center bg-green-50 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm text-slate-400">Prochain momentum</p>
              <p className="text-base sm:text-lg font-bold text-green-600">
                {formatCountdown(nextGreen)}
                <span className="ml-2 text-xs sm:text-sm font-normal text-slate-400">
                  — score {nextGreen.score}
                </span>
              </p>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.a
          href="/wrapped"
          className="mt-5 sm:mt-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          Profite-en pour analyser tes donnees
          <span className="text-xs">&rarr;</span>
        </motion.a>
      </div>
    </motion.section>
  );
}
