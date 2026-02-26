import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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

function scoreToHex(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 55) return "#f97316";
  if (score >= 35) return "#eab308";
  if (score >= 15) return "#60a5fa";
  return "#1e3a5f";
}

interface HeatmapWeekProps {
  now?: Date;
  app?: AppName;
}

export default function HeatmapWeek({ now, app = "tinder" }: HeatmapWeekProps) {
  const heatmap = useMemo(() => computeWeekHeatmap(now, app), [now, app]);
  const [tooltip, setTooltip] = useState<HeatmapSlot | null>(null);

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
    <div>
      {/* Tooltip for mobile */}
      {tooltip && (
        <motion.div
          className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs sm:hidden"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: scoreToHex(tooltip.score) }}
          />
          <span className="font-medium text-gray-200">
            {tooltip.dayName} {tooltip.hour}h
          </span>
          <span className="text-gray-400">—</span>
          <span className="font-semibold" style={{ color: scoreToHex(tooltip.score) }}>
            {tooltip.score}/100
          </span>
        </motion.div>
      )}

      {/* Desktop: full grid with scroll */}
      <div className="hidden sm:block overflow-x-auto">
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
          {days.map(([dayIndex, slots], rowIdx) => (
            <motion.div
              key={dayIndex}
              className="mb-0.5 flex items-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + rowIdx * 0.04 }}
            >
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
                      } transition-all hover:opacity-80 hover:scale-110`}
                      style={{ aspectRatio: "1", minHeight: 16 }}
                      title={`${slot.dayName} ${slot.hour}h : ${slot.score}/100`}
                    />
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile: compact grid, no scroll needed */}
      <div className="sm:hidden">
        {/* Hour headers - show every 4h on mobile */}
        <div className="mb-1 flex">
          <div className="w-8 shrink-0" />
          {HOURS.map((h) => (
            <div
              key={h}
              className="flex-1 text-center text-[8px] text-gray-500"
            >
              {h % 4 === 0 ? `${h}h` : ""}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {days.map(([dayIndex, slots], rowIdx) => (
          <motion.div
            key={dayIndex}
            className="mb-px flex items-center"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + rowIdx * 0.04 }}
          >
            <div className="w-8 shrink-0 text-[10px] font-medium text-gray-400">
              {slots[0].dayName.slice(0, 2)}
            </div>
            <div className="flex flex-1 gap-px">
              {slots.map((slot) => {
                const isTop = top5.has(`${slot.dayIndex}-${slot.hour}`);
                return (
                  <div
                    key={slot.hour}
                    className={`flex-1 rounded-[2px] ${scoreToColor(slot.score)} ${
                      isTop ? "ring-1 ring-white/50" : ""
                    }`}
                    style={{ aspectRatio: "1.2", minHeight: 10 }}
                    onClick={() => setTooltip(slot)}
                  />
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-blue-900/30" />
          Calme
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-yellow-500/60" />
          Moyen
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-red-500/90" />
          Intense
        </span>
      </div>
    </div>
  );
}
