import { useMemo } from "react";
import { computeWeekHeatmap } from "../lib/scoring";
import type { HeatmapSlot } from "../lib/scoring";
import type { AppName } from "../lib/data";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function scoreToColor(score: number): string {
  if (score >= 75) return "bg-red-500/90";
  if (score >= 55) return "bg-orange-500/80";
  if (score >= 35) return "bg-yellow-500/60";
  if (score >= 15) return "bg-blue-400/40";
  return "bg-blue-900/30";
}

interface HeatmapWeekProps {
  now?: Date;
  app?: AppName;
}

export default function HeatmapWeek({ now, app = "tinder" }: HeatmapWeekProps) {
  const heatmap = useMemo(() => computeWeekHeatmap(now, app), [now, app]);

  // Group by day
  const days = useMemo(() => {
    const map = new Map<number, HeatmapSlot[]>();
    for (const slot of heatmap) {
      if (!map.has(slot.dayIndex)) map.set(slot.dayIndex, []);
      map.get(slot.dayIndex)!.push(slot);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [heatmap]);

  // Top 5 slots
  const top5 = useMemo(() => {
    const sorted = [...heatmap].sort((a, b) => b.score - a.score);
    return new Set(sorted.slice(0, 5).map((s) => `${s.dayIndex}-${s.hour}`));
  }, [heatmap]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
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
        {days.map(([dayIndex, slots]) => (
          <div key={dayIndex} className="mb-0.5 flex items-center">
            <div className="w-10 shrink-0 text-xs font-medium text-gray-400">
              {slots[0].dayName}
            </div>
            <div className="flex flex-1 gap-0.5">
              {slots.map((slot) => {
                const isTop = top5.has(`${slot.dayIndex}-${slot.hour}`);
                return (
                  <div
                    key={slot.hour}
                    className={`flex-1 rounded-sm ${scoreToColor(slot.score)} ${
                      isTop ? "ring-2 ring-white/60" : ""
                    } transition-opacity hover:opacity-80`}
                    style={{ aspectRatio: "1", minHeight: 16 }}
                    title={`${slot.dayName} ${slot.hour}h : ${slot.score}/100`}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-blue-900/30" />
            Calme
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-yellow-500/60" />
            Moyen
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-500/90" />
            Intense
          </span>
        </div>
      </div>
    </div>
  );
}
