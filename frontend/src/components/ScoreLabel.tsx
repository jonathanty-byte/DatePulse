import { motion } from "framer-motion";
import { getScoreLabel, getDeltaVsAverage } from "../lib/scoring";
import type { AppName } from "../lib/data";

interface ScoreLabelProps {
  score: number;
  event: string | null;
  app?: AppName;
  now?: Date;
}

export default function ScoreLabel({ score, event, app = "tinder", now }: ScoreLabelProps) {
  const { label, color, colorBg, message } = getScoreLabel(score);
  const delta = getDeltaVsAverage(score, now ?? new Date(), app);

  return (
    <motion.div
      className="flex flex-col items-center gap-2 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Label badge */}
      <span
        className="inline-block rounded-full px-3.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold"
        style={{ backgroundColor: colorBg, color }}
      >
        {label}
      </span>

      {/* Message */}
      <p className="text-base sm:text-lg font-medium text-gray-200">{message}</p>

      {/* Delta vs average */}
      <p className="text-xs sm:text-sm text-gray-400">
        {delta >= 0 ? (
          <span className="text-green-400">+{delta}%</span>
        ) : (
          <span className="text-red-400">{delta}%</span>
        )}{" "}
        vs la moyenne
      </p>

      {/* Active event */}
      {event && (
        <span className="rounded-lg bg-brand-600/20 px-3 py-1 text-xs font-medium text-brand-400">
          {event}
        </span>
      )}
    </motion.div>
  );
}
