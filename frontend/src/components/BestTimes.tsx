import { useMemo } from "react";
import { motion } from "framer-motion";
import { computeBestTimes, getScoreLabel } from "../lib/scoring";
import type { AppName } from "../lib/data";

interface BestTimesProps {
  now?: Date;
  app?: AppName;
  count?: number;
}

export default function BestTimes({ now, app = "tinder", count = 5 }: BestTimesProps) {
  const bestTimes = useMemo(() => computeBestTimes(now, app, count), [now, app, count]);

  return (
    <div className="space-y-2">
      {bestTimes.map((slot, i) => {
        const { color } = getScoreLabel(slot.score);
        return (
          <motion.div
            key={`${app}-${slot.dayName}-${slot.hour}`}
            className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <span className="w-8 text-sm font-bold text-gray-400">
              #{i + 1}
            </span>
            <div className="w-28">
              <span className="text-sm font-medium capitalize text-gray-200">
                {slot.dayNameFull}
              </span>
              <span className="ml-1 text-sm text-gray-400">{slot.hour}h</span>
            </div>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(slot.score, 5)}%` }}
                  transition={{ duration: 0.7, delay: i * 0.1 }}
                />
              </div>
            </div>
            <span
              className="w-12 text-right text-sm font-semibold"
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
