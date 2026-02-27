import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { computeBoostHeatmap, getBoostRecommendation } from "../lib/boostOptimizer";
import type { BoostSlot } from "../lib/boostOptimizer";
import type { AppName } from "../lib/data";
import { getParisDateParts } from "../lib/franceTime";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function efficiencyToColor(eff: number): string {
  if (eff >= 1.5) return "bg-green-400/90";
  if (eff >= 1.0) return "bg-green-500/60";
  if (eff >= 0.5) return "bg-amber-500/60";
  return "bg-red-600/60";
}

function efficiencyToHex(eff: number): string {
  if (eff >= 1.5) return "#4ade80";
  if (eff >= 1.0) return "#22c55e";
  if (eff >= 0.5) return "#f59e0b";
  return "#dc2626";
}

function efficiencyTextColor(eff: number): string {
  if (eff >= 1.5) return "text-green-400";
  if (eff >= 1.0) return "text-green-500";
  if (eff >= 0.5) return "text-amber-400";
  return "text-red-400";
}

interface BoostOptimizerProps {
  app: AppName;
  now: Date;
}

export default function BoostOptimizer({ app, now }: BoostOptimizerProps) {
  const [expanded, setExpanded] = useState(false);
  const [tooltip, setTooltip] = useState<BoostSlot | null>(null);

  const boostHeatmap = useMemo(() => computeBoostHeatmap(now, app), [now, app]);
  const recommendation = useMemo(() => getBoostRecommendation(now, app), [now, app]);

  // Group heatmap by day
  const days = useMemo(() => {
    const map = new Map<number, BoostSlot[]>();
    for (const slot of boostHeatmap) {
      if (!map.has(slot.dayIndex)) map.set(slot.dayIndex, []);
      map.get(slot.dayIndex)!.push(slot);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [boostHeatmap]);

  // Current time in Paris -> heatmap dayIndex + hour
  const { currentDayIndex, currentHour } = useMemo(() => {
    const paris = getParisDateParts(now ?? new Date());
    const jsDayToDisplay = [6, 0, 1, 2, 3, 4, 5];
    return {
      currentDayIndex: jsDayToDisplay[paris.day],
      currentHour: paris.hour,
    };
  }, [now]);

  if (!recommendation.bestSlot) return null;

  const { bestSlot, top5 } = recommendation;

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">🚀</span>
          Boost Optimizer
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
        >
          {expanded ? "Masquer" : "Voir"} la heatmap ROI
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        </button>
      </div>

      {/* Best slot recommendation */}
      <div className="flex items-start gap-3 rounded-xl bg-green-950/30 border border-green-500/20 p-4">
        <span className="text-2xl">🚀</span>
        <div>
          <p className="text-sm font-semibold text-white">
            Ton Boost sera{" "}
            <span className="text-green-400">{bestSlot.efficiency}x</span>{" "}
            plus efficace
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {bestSlot.dayName} a {bestSlot.hour}h — {bestSlot.efficiencyLabel}
          </p>
        </div>
      </div>

      {/* Top 5 slots */}
      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Top 5 creneaux Boost
        </p>
        {top5.map((slot, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0"
          >
            <span className="text-gray-400">
              {slot.dayName} {slot.hour}h
            </span>
            <span className={efficiencyTextColor(slot.efficiency)}>
              {slot.efficiency}x
            </span>
          </div>
        ))}
      </div>

      {/* Expandable ROI heatmap */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Heatmap ROI — Efficacite du Boost
              </p>

              {/* Mobile tooltip */}
              {tooltip && (
                <motion.div
                  className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs sm:hidden"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: efficiencyToHex(tooltip.efficiency) }}
                  />
                  <span className="font-medium text-gray-200">
                    {tooltip.dayName} {tooltip.hour}h
                  </span>
                  <span className="text-gray-400">—</span>
                  <span className="font-semibold" style={{ color: efficiencyToHex(tooltip.efficiency) }}>
                    {tooltip.efficiency}x
                  </span>
                </motion.div>
              )}

              {/* Desktop: full grid */}
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
                          const isNow =
                            slot.dayIndex === currentDayIndex &&
                            slot.hour === currentHour;
                          return (
                            <div
                              key={slot.hour}
                              className={`flex-1 rounded-sm ${efficiencyToColor(slot.efficiency)} ${
                                isNow
                                  ? "ring-2 ring-white animate-pulse"
                                  : ""
                              } transition-all hover:opacity-80 hover:scale-110`}
                              style={{ aspectRatio: "1", minHeight: 16 }}
                              title={`${slot.dayName} ${slot.hour}h : ${slot.efficiency}x${isNow ? " (maintenant)" : ""}`}
                            />
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Mobile: compact grid */}
              <div className="sm:hidden">
                {/* Hour headers */}
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
                        const isNow =
                          slot.dayIndex === currentDayIndex &&
                          slot.hour === currentHour;
                        return (
                          <div
                            key={slot.hour}
                            className={`flex-1 rounded-[2px] ${efficiencyToColor(slot.efficiency)} ${
                              isNow
                                ? "ring-1 ring-white animate-pulse"
                                : ""
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
                  <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-red-600/60" />
                  {"<0.5x"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-amber-500/60" />
                  0.5-1x
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-green-500/60" />
                  1-1.5x
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-green-400/90" />
                  {">1.5x"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
