/**
 * Table showing the best time slots ranked by score.
 */

import type { BestTime } from "../types";

interface BestTimesTableProps {
  bestTimes: BestTime[];
}

function getMedalEmoji(index: number): string {
  if (index === 0) return "#1";
  if (index === 1) return "#2";
  if (index === 2) return "#3";
  return `#${index + 1}`;
}

function scoreBarWidth(score: number): string {
  return `${Math.max(score, 5)}%`;
}

function scoreColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 45) return "bg-orange-500";
  return "bg-red-500";
}

export default function BestTimesTable({ bestTimes }: BestTimesTableProps) {
  if (bestTimes.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        Pas de donnees disponibles
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bestTimes.map((bt, i) => (
        <div
          key={`${bt.day}-${bt.hour}`}
          className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-4 py-3"
        >
          <span className="w-8 text-sm font-bold text-gray-400">
            {getMedalEmoji(i)}
          </span>
          <div className="w-24">
            <span className="text-sm font-medium capitalize text-gray-200">
              {bt.day}
            </span>
            <span className="ml-1 text-sm text-gray-400">{bt.hour}</span>
          </div>
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-gray-700">
              <div
                className={`h-full rounded-full ${scoreColor(bt.avg_score)} transition-all duration-700`}
                style={{ width: scoreBarWidth(bt.avg_score) }}
              />
            </div>
          </div>
          <span className="w-12 text-right text-sm font-semibold text-gray-200">
            {Math.round(bt.avg_score)}
          </span>
        </div>
      ))}
    </div>
  );
}
