import { computeWeekHeatmap, getMonthlyAverage } from "./scoring";
import type { AppName } from "./data";

export interface BoostSlot {
  dayIndex: number;
  dayName: string;
  hour: number;
  score: number;
  efficiency: number;
  efficiencyLabel: string;
}

export interface BoostRecommendation {
  bestSlot: BoostSlot;
  currentEfficiency: number;
  improvementPct: number;
  top5: BoostSlot[];
}

/** Compute the boost efficiency heatmap (7x24 grid).
 *  efficiency = slot.score / weeklyAverage — tells you how much ROI a Boost would give. */
export function computeBoostHeatmap(
  baseDate: Date = new Date(),
  app: AppName = "tinder"
): BoostSlot[] {
  const heatmap = computeWeekHeatmap(baseDate, app);
  const avg = getMonthlyAverage(baseDate, app);
  if (avg === 0) return [];

  return heatmap.map((slot) => {
    const efficiency = slot.score / avg;
    return {
      dayIndex: slot.dayIndex,
      dayName: slot.dayName,
      hour: slot.hour,
      score: slot.score,
      efficiency: Math.round(efficiency * 100) / 100,
      efficiencyLabel: getEfficiencyLabel(efficiency),
    };
  });
}

function getEfficiencyLabel(eff: number): string {
  if (eff >= 1.5) return "Optimal";
  if (eff >= 1.0) return "Bon";
  if (eff >= 0.5) return "Moyen";
  return "Faible";
}

/** Get the best Boost recommendation for a given date and app. */
export function getBoostRecommendation(
  baseDate: Date = new Date(),
  app: AppName = "tinder"
): BoostRecommendation {
  const boostSlots = computeBoostHeatmap(baseDate, app);
  const sorted = [...boostSlots].sort((a, b) => b.efficiency - a.efficiency);
  const top5 = sorted.slice(0, 5);
  const bestSlot = top5[0];

  // Current slot efficiency: find current hour/day in the heatmap
  const avg = getMonthlyAverage(baseDate, app);
  const currentScore = boostSlots.length > 0 ? avg : 0;
  const currentEfficiency = avg > 0 ? currentScore / avg : 1.0;
  const improvementPct = bestSlot
    ? Math.round((bestSlot.efficiency / Math.max(currentEfficiency, 0.01) - 1) * 100)
    : 0;

  return {
    bestSlot,
    currentEfficiency: Math.round(currentEfficiency * 100) / 100,
    improvementPct,
    top5,
  };
}
