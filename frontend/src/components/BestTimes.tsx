import { useMemo } from "react";
import { motion } from "framer-motion";
import { computeBestTimes, getScoreLabel } from "../lib/scoring";
import type { AppName } from "../lib/data";

interface BestTimesProps {
  now?: Date;
  app?: AppName;
  count?: number;
}

export default function BestTimes({ now, app = "tinder", count = 3 }: BestTimesProps) {
  const bestTimes = useMemo(() => computeBestTimes(now, app, count), [now, app, count]);

  return (
    <div className="space-y-2">
      {bestTimes.map((slot, i) => {
        const { color } = getScoreLabel(slot.score);
        return (
          <motion.div
            key={`${app}-${slot.dayName}-${slot.hour}`}
            className="flex items-center gap-2 sm:gap-3 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            <span className="w-6 sm:w-8 text-xs sm:text-sm font-bold text-slate-500">
              #{i + 1}
            </span>
            <div className="w-20 sm:w-28">
              <span className="text-xs sm:text-sm font-medium capitalize text-slate-800">
                {slot.dayNameFull}
              </span>
              <span className="ml-1 text-xs sm:text-sm text-slate-500">{slot.hour}h</span>
            </div>
            <div className="flex-1">
              <div className="h-1.5 sm:h-2 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(slot.score, 5)}%` }}
                  transition={{ duration: 0.7, delay: i * 0.08 }}
                />
              </div>
            </div>
            <span
              className="w-10 sm:w-12 text-right text-xs sm:text-sm font-semibold"
              style={{ color }}
            >
              {slot.score}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
