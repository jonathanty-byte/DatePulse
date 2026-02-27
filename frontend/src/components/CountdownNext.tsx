import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getNextPeak, getScoreLabel } from "../lib/scoring";
import type { NextPeak } from "../lib/scoring";
import { DAY_NAMES_FULL } from "../lib/data";
import type { AppName } from "../lib/data";
import { getParisDateParts } from "../lib/franceTime";

function formatPeakTime(peak: NextPeak): string {
  const { day, hour } = getParisDateParts(peak.date);
  const dayName = DAY_NAMES_FULL[day];

  if (peak.hoursUntil === 0) {
    return `dans ${peak.minutesUntil} min`;
  }
  if (peak.hoursUntil < 24) {
    return `dans ${peak.hoursUntil}h${peak.minutesUntil > 0 ? String(peak.minutesUntil).padStart(2, "0") : ""}`;
  }
  // > 24h: show day name + hour
  return `${dayName} a ${hour}h`;
}

interface CountdownNextProps {
  app?: AppName;
}

export default function CountdownNext({ app = "tinder" }: CountdownNextProps) {
  const [peak, setPeak] = useState<NextPeak | null>(null);

  useEffect(() => {
    const update = () => setPeak(getNextPeak(new Date(), app, 70));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [app]);

  if (!peak) return null;

  const { icon } = getScoreLabel(peak.score);

  return (
    <motion.div
      className="flex items-center gap-2.5 sm:gap-3 rounded-xl bg-white/5 border border-white/5 px-4 sm:px-5 py-2.5 sm:py-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    >
      <span className="text-xl sm:text-2xl">{icon}</span>
      <div>
        <p className="text-xs sm:text-sm text-gray-400">Prochain Green Light</p>
        <p className="text-sm sm:text-base font-semibold text-gray-100">
          {formatPeakTime(peak)}
          <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm text-gray-400">
            — score {peak.score}/100
          </span>
        </p>
      </div>
    </motion.div>
  );
}
