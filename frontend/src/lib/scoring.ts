import {
  APP_HOURLY,
  APP_WEEKLY,
  APP_MONTHLY,
  SPECIAL_EVENTS,
  DAY_NAMES_FULL,
  MONTHLY_INSTALLS,
  MONTHLY_CHURN,
  WEATHER_MODIFIERS,
} from "./data";
import type { AppName, PoolFreshnessData } from "./data";
import { getParisDateParts } from "./franceTime";

// ── Score result types ──────────────────────────────────────────

export interface ScoreResult {
  score: number;
  hourly: number;
  weekly: number;
  monthly: number;
  event: string | null;
  eventMultiplier: number;
  trendModifier: number;
}

export interface ScoreLabel {
  label: string;
  color: string;
  colorBg: string;
  icon: string;
  message: string;
}

export interface HeatmapSlot {
  dayIndex: number; // 0=lun, 1=mar, ..., 6=dim (display order)
  dayName: string;
  hour: number;
  score: number;
}

export interface BestTimeSlot {
  dayName: string;
  dayNameFull: string;
  hour: number;
  score: number;
}

// ── Core scoring ────────────────────────────────────────────────

/** Compute the activity score for a given date and app. */
export function computeScore(
  date: Date = new Date(),
  app: AppName = "tinder",
  weatherCondition?: string,
  trendModifier?: number
): ScoreResult {
  const { hour, day, month } = getParisDateParts(date);

  const hourly = APP_HOURLY[app][hour];
  const weekly = APP_WEEKLY[app][day];
  const monthly = APP_MONTHLY[app][month];

  // Find the strongest matching event
  let eventMultiplier = 1.0;
  let eventName: string | null = null;
  for (const event of SPECIAL_EVENTS) {
    if (event.check(date)) {
      if (
        eventName === null ||
        Math.abs(event.multiplier - 1) > Math.abs(eventMultiplier - 1)
      ) {
        eventMultiplier = event.multiplier;
        eventName = event.name;
      }
    }
  }

  // Weather modifier
  const weatherMod = weatherCondition
    ? (WEATHER_MODIFIERS[weatherCondition] ?? 1.0)
    : 1.0;

  // Google Trends modifier (validated triple: r=0.93 with Tinder APP_MONTHLY)
  // Only applied to real-time score, NOT to heatmap/bestTimes/countdown
  const trendMod =
    trendModifier != null && trendModifier >= 0.5 && trendModifier <= 2.0
      ? trendModifier
      : 1.0;

  const raw = (hourly * weekly * monthly) / 10000 * eventMultiplier * weatherMod * trendMod;
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  return { score, hourly, weekly, monthly, event: eventName, eventMultiplier, trendModifier: trendMod };
}

// ── Score labels (UX mapping) ───────────────────────────────────

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 91)
    return { label: "En feu", color: "#ef4444", colorBg: "#ef444422", icon: "\u{1F680}", message: "Moment optimal ! Fonce !" };
  if (score >= 76)
    return { label: "Tres actif", color: "#f97316", colorBg: "#f9731622", icon: "\u{26A1}", message: "Excellente activite !" };
  if (score >= 56)
    return { label: "Actif", color: "#eab308", colorBg: "#eab30822", icon: "\u{1F525}", message: "Bon moment pour swiper" };
  if (score >= 36)
    return { label: "Moyen", color: "#facc15", colorBg: "#facc1522", icon: "\u{1F324}\u{FE0F}", message: "Activite correcte" };
  if (score >= 16)
    return { label: "Calme", color: "#60a5fa", colorBg: "#60a5fa22", icon: "\u{1F634}", message: "Peu d'activite en ce moment" };
  return { label: "Tres calme", color: "#6b7280", colorBg: "#6b728022", icon: "\u{1F319}", message: "Evite de swiper maintenant" };
}

// ── Heatmap (7 days x 24 hours) ────────────────────────────────

/** Generate a full week heatmap for the current month and app. */
export function computeWeekHeatmap(
  baseDate: Date = new Date(),
  app: AppName = "tinder"
): HeatmapSlot[] {
  const { month } = getParisDateParts(baseDate);
  const hourlyTable = APP_HOURLY[app];
  const weeklyTable = APP_WEEKLY[app];
  const monthlyTable = APP_MONTHLY[app];
  const slots: HeatmapSlot[] = [];

  // Display order: lun(1), mar(2), mer(3), jeu(4), ven(5), sam(6), dim(0)
  const jsDay = [1, 2, 3, 4, 5, 6, 0]; // JS getDay values in display order
  const displayNames = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

  for (let di = 0; di < 7; di++) {
    const day = jsDay[di];
    for (let hour = 0; hour < 24; hour++) {
      const hourly = hourlyTable[hour];
      const weekly = weeklyTable[day];
      const monthly = monthlyTable[month];
      const raw = (hourly * weekly * monthly) / 10000;
      const score = Math.min(100, Math.max(0, Math.round(raw)));
      slots.push({ dayIndex: di, dayName: displayNames[di], hour, score });
    }
  }

  return slots;
}

// ── Best times ──────────────────────────────────────────────────

/** Get the top N time slots for the current week and app. */
export function computeBestTimes(
  baseDate: Date = new Date(),
  app: AppName = "tinder",
  count = 5
): BestTimeSlot[] {
  const heatmap = computeWeekHeatmap(baseDate, app);
  const sorted = [...heatmap].sort((a, b) => b.score - a.score);

  // JS day mapping for display order -> full name
  const jsDayForDisplay = [1, 2, 3, 4, 5, 6, 0];

  return sorted.slice(0, count).map((slot) => ({
    dayName: slot.dayName,
    dayNameFull: DAY_NAMES_FULL[jsDayForDisplay[slot.dayIndex]],
    hour: slot.hour,
    score: slot.score,
  }));
}

// ── Delta vs average ────────────────────────────────────────────

/** Compute the average score for the current month (all 168 weekly slots). */
export function getMonthlyAverage(
  baseDate: Date = new Date(),
  app: AppName = "tinder"
): number {
  const heatmap = computeWeekHeatmap(baseDate, app);
  const sum = heatmap.reduce((acc, slot) => acc + slot.score, 0);
  return sum / heatmap.length;
}

/** Get delta percentage vs the monthly average. */
export function getDeltaVsAverage(
  score: number,
  baseDate: Date = new Date(),
  app: AppName = "tinder"
): number {
  const avg = getMonthlyAverage(baseDate, app);
  if (avg === 0) return 0;
  return Math.round(((score - avg) / avg) * 100);
}

// ── Countdown to next peak ──────────────────────────────────────

export interface NextPeak {
  date: Date;
  score: number;
  hoursUntil: number;
  minutesUntil: number;
}

/** Find the next time slot where score >= threshold for a given app.
 *  Uses the same static heatmap formula as BestTimes (no events/weather)
 *  so scores stay consistent across all UI components. */
export function getNextPeak(
  fromDate: Date = new Date(),
  app: AppName = "tinder",
  threshold = 70
): NextPeak | null {
  const { month } = getParisDateParts(fromDate);
  const hourlyTable = APP_HOURLY[app];
  const weeklyTable = APP_WEEKLY[app];
  const monthlyTable = APP_MONTHLY[app];

  const check = new Date(fromDate);
  // Round up to next hour
  check.setMinutes(0, 0, 0);
  check.setHours(check.getHours() + 1);

  // Search up to 7 days ahead
  for (let i = 0; i < 168; i++) {
    const { hour, day } = getParisDateParts(check);
    const raw = (hourlyTable[hour] * weeklyTable[day] * monthlyTable[month]) / 10000;
    const score = Math.min(100, Math.max(0, Math.round(raw)));
    if (score >= threshold) {
      const diff = check.getTime() - fromDate.getTime();
      return {
        date: new Date(check),
        score,
        hoursUntil: Math.floor(diff / 3600000),
        minutesUntil: Math.floor((diff % 3600000) / 60000),
      };
    }
    check.setHours(check.getHours() + 1);
  }
  return null;
}

// ── Pool Freshness Score ────────────────────────────────────────

/** Compute the pool freshness for a given month.
 *  Based on Adjust install benchmarks + Sensor Tower churn data. */
export function getPoolFreshness(date: Date = new Date()): PoolFreshnessData {
  const { month } = getParisDateParts(date);
  const installs = MONTHLY_INSTALLS[month];
  const churn = MONTHLY_CHURN[month];

  // Net growth: high installs + low churn = fresh pool
  // Formula: installs weight (60%) + inverse churn weight (40%)
  const netGrowth = Math.round(installs * 0.6 + (100 - churn) * 0.4);

  let label: PoolFreshnessData["label"];
  let labelFr: string;
  let message: string;

  if (netGrowth >= 75) {
    label = "tres-frais";
    labelFr = "Tres frais";
    message = "Afflux de nouveaux profils — tes chances de matcher sont au plus haut";
  } else if (netGrowth >= 60) {
    label = "frais";
    labelFr = "Frais";
    message = "Bon renouvellement du pool — de nouveaux profils a decouvrir";
  } else if (netGrowth >= 45) {
    label = "stable";
    labelFr = "Stable";
    message = "Pool equilibre — activite normale";
  } else if (netGrowth >= 30) {
    label = "stagnant";
    labelFr = "Stagnant";
    message = "Peu de nouveaux profils — les memes tetes reviennent";
  } else {
    label = "en-vidange";
    labelFr = "En vidange";
    message = "Le pool se vide — beaucoup de departs, peu d'arrivees";
  }

  return { installs, churn, netGrowth, label, labelFr, message };
}
