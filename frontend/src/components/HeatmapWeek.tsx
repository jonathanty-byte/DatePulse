/**
 * 7-day x 24-hour heatmap showing predicted activity scores.
 * Color-coded cells from blue (low) to red (high).
 */

import type { ForecastItem } from "../types";

interface HeatmapWeekProps {
  forecast: ForecastItem[];
}

const DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function scoreToColor(score: number): string {
  if (score >= 75) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 45) return "bg-yellow-500";
  if (score >= 30) return "bg-blue-400";
  return "bg-blue-900";
}

function getDayIndex(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  // JS: 0=Sunday. Convert to Mon=0
  return (d.getDay() + 6) % 7;
}

export default function HeatmapWeek({ forecast }: HeatmapWeekProps) {
  // Build grid[dayIndex][hour] = score
  const grid: (number | null)[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(null)
  );

  for (const item of forecast) {
    const dayIdx = getDayIndex(item.date);
    if (dayIdx >= 0 && dayIdx < 7 && item.hour >= 0 && item.hour < 24) {
      grid[dayIdx][item.hour] = item.predicted_score;
    }
  }

  // Find top 5 slots
  const allSlots = forecast
    .slice()
    .sort((a, b) => b.predicted_score - a.predicted_score);
  const top5 = new Set(
    allSlots.slice(0, 5).map((s) => `${s.date}-${s.hour}`)
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Hour headers */}
        <div className="mb-1 flex">
          <div className="w-10 shrink-0" />
          {HOURS.map((h) => (
            <div
              key={h}
              className="flex-1 text-center text-[10px] text-gray-500"
            >
              {h % 3 === 0 ? `${h}h` : ""}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="mb-0.5 flex items-center">
            <div className="w-10 shrink-0 text-xs font-medium text-gray-400">
              {day}
            </div>
            <div className="flex flex-1 gap-0.5">
              {HOURS.map((hour) => {
                const score = grid[dayIdx]?.[hour];
                const matchItem = forecast.find(
                  (f) => getDayIndex(f.date) === dayIdx && f.hour === hour
                );
                const isTop =
                  matchItem &&
                  top5.has(`${matchItem.date}-${matchItem.hour}`);

                return (
                  <div
                    key={hour}
                    className={`heatmap-cell flex-1 rounded-sm ${
                      score !== null ? scoreToColor(score) : "bg-gray-800"
                    } ${isTop ? "ring-2 ring-white/60" : ""}`}
                    style={{ aspectRatio: "1", minHeight: 16 }}
                    title={
                      score !== null
                        ? `${day} ${hour}h: ${Math.round(score)}/100`
                        : `${day} ${hour}h: --`
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-blue-900" />
            Calme
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-yellow-500" />
            Moyen
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
            Intense
          </span>
        </div>
      </div>
    </div>
  );
}
