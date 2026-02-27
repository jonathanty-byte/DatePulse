import type { ParsedData, RawSwipe, RawMatch } from "./wrappedParser";
import { computeScore } from "./scoring";
import type { AppName } from "./data";

// ── Types ───────────────────────────────────────────────────────

export interface MonthlyData {
  month: string; // "2025-01"
  swipes: number;
  matches: number;
  rightSwipeRate: number;
}

export interface WrappedMetrics {
  // Volume
  totalSwipes: number;
  rightSwipes: number;
  rightSwipeRate: number;
  daysActive: number;
  avgSwipesPerDay: number;

  // Conversion
  swipeToMatchRate: number;
  matchToConvoRate: number;
  ghostRate: number;

  // Conversations
  avgConvoLength: number;
  userInitiatedRate: number;
  longestConvo: number;

  // Timing
  peakSwipeHour: number;
  peakMatchHour: number;
  swipesByHour: Record<number, number>;
  matchesByMonth: Record<string, number>;

  // DateDetox correlation
  matchesInGreenLightPct: number;
  estimatedTimeSavedHours: number;

  // Time spent
  estimatedTotalHours: number;
  hoursPerMatch: number;

  // Trends
  bestMonth: string;
  worstMonth: string;
  monthlyData: MonthlyData[];

  // Period
  periodStart: Date;
  periodEnd: Date;
  totalDays: number;

  // App source
  source: string;
}

// ── Main function ───────────────────────────────────────────────

export function computeWrappedMetrics(data: ParsedData): WrappedMetrics {
  const { swipes, matches, source, period, appOpens } = data;

  // Map source to AppName for scoring (WrappedAppSource is a subset of AppName)
  const appName: AppName = source as AppName;

  // ── Volume metrics ─────────────────────────────────────────
  const totalSwipes = swipes.length;
  const rightSwipes = swipes.filter(
    (s) => s.direction === "like" || s.direction === "superlike"
  ).length;
  const rightSwipeRate =
    totalSwipes > 0 ? Math.round((rightSwipes / totalSwipes) * 100) : 0;

  const activeDays = new Set(swipes.map((s) => dateKey(s.timestamp)));
  const daysActive = activeDays.size || 1;
  const avgSwipesPerDay = Math.round(totalSwipes / daysActive);

  // ── Conversion metrics ─────────────────────────────────────
  const totalMatches = matches.length;
  const swipeToMatchRate =
    rightSwipes > 0 ? Math.round((totalMatches / rightSwipes) * 100) : 0;

  const convos = matches.filter((m) => m.messagesCount > 0);
  const matchToConvoRate =
    totalMatches > 0 ? Math.round((convos.length / totalMatches) * 100) : 0;

  // Ghost rate: matched but no messages exchanged
  const ghosted = matches.filter((m) => m.messagesCount === 0);
  const ghostRate =
    totalMatches > 0 ? Math.round((ghosted.length / totalMatches) * 100) : 0;

  // ── Conversation metrics ───────────────────────────────────
  const convoLengths = matches.map((m) => m.messagesCount);
  const avgConvoLength =
    convos.length > 0
      ? Math.round(convoLengths.reduce((a, b) => a + b, 0) / convos.length)
      : 0;

  const userInitiated = matches.filter((m) => m.userInitiated);
  const userInitiatedRate =
    convos.length > 0
      ? Math.round((userInitiated.length / convos.length) * 100)
      : 0;

  const longestConvo = convoLengths.length > 0 ? Math.max(...convoLengths) : 0;

  // ── Timing metrics ─────────────────────────────────────────
  const swipesByHour = computeHourDistribution(
    swipes.map((s) => s.timestamp)
  );
  const matchesByHour = computeHourDistribution(
    matches.map((m) => m.timestamp)
  );

  const peakSwipeHour = findPeakHour(swipesByHour);
  const peakMatchHour = findPeakHour(matchesByHour);

  const matchesByMonth = computeMonthDistribution(
    matches.map((m) => m.timestamp)
  );

  // ── DateDetox correlation ──────────────────────────────────
  let greenLightMatches = 0;
  for (const match of matches) {
    const result = computeScore(match.timestamp, appName);
    if (result.score >= 35) greenLightMatches++;
  }
  const matchesInGreenLightPct =
    totalMatches > 0
      ? Math.round((greenLightMatches / totalMatches) * 100)
      : 0;

  // Estimated time spent on the app
  const totalPeriodDays = Math.max(
    1,
    Math.ceil(
      (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const estimatedTotalHours = appOpens
    ? Math.round((appOpens * 8) / 60) // 8 min per session average
    : Math.round((totalSwipes * 3) / 3600); // 3 sec per swipe

  // Estimated time saved: if user only swiped during green light windows
  // Adjust for their actual green light match rate
  const wastedTimePct = 1 - matchesInGreenLightPct / 100;
  const estimatedTimeSavedHours = Math.round(
    estimatedTotalHours * wastedTimePct * 0.5
  ); // conservative

  const hoursPerMatch =
    totalMatches > 0
      ? Math.round((estimatedTotalHours / totalMatches) * 10) / 10
      : 0;

  // ── Monthly trends ─────────────────────────────────────────
  const monthlyData = computeMonthlyData(swipes, matches);
  const bestMonth = findBestMonth(monthlyData);
  const worstMonth = findWorstMonth(monthlyData);

  return {
    totalSwipes,
    rightSwipes,
    rightSwipeRate,
    daysActive,
    avgSwipesPerDay,
    swipeToMatchRate,
    matchToConvoRate,
    ghostRate,
    avgConvoLength,
    userInitiatedRate,
    longestConvo,
    peakSwipeHour,
    peakMatchHour,
    swipesByHour,
    matchesByMonth,
    matchesInGreenLightPct,
    estimatedTimeSavedHours,
    estimatedTotalHours,
    hoursPerMatch,
    bestMonth,
    worstMonth,
    monthlyData,
    periodStart: period.start,
    periodEnd: period.end,
    totalDays: totalPeriodDays,
    source,
  };
}

// ── Helper functions ────────────────────────────────────────────

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeHourDistribution(dates: Date[]): Record<number, number> {
  const dist: Record<number, number> = {};
  for (let h = 0; h < 24; h++) dist[h] = 0;
  for (const d of dates) {
    dist[d.getHours()] = (dist[d.getHours()] || 0) + 1;
  }
  return dist;
}

function computeMonthDistribution(dates: Date[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const d of dates) {
    const key = monthKey(d);
    dist[key] = (dist[key] || 0) + 1;
  }
  return dist;
}

function findPeakHour(hourDist: Record<number, number>): number {
  let maxCount = 0;
  let peakHour = 20; // default
  for (const [hour, count] of Object.entries(hourDist)) {
    if (count > maxCount) {
      maxCount = count;
      peakHour = Number(hour);
    }
  }
  return peakHour;
}

function computeMonthlyData(
  swipes: RawSwipe[],
  matches: RawMatch[]
): MonthlyData[] {
  const months = new Map<
    string,
    { swipes: number; likes: number; matches: number }
  >();

  for (const s of swipes) {
    const key = monthKey(s.timestamp);
    const existing = months.get(key) ?? { swipes: 0, likes: 0, matches: 0 };
    existing.swipes++;
    if (s.direction === "like" || s.direction === "superlike")
      existing.likes++;
    months.set(key, existing);
  }

  for (const m of matches) {
    const key = monthKey(m.timestamp);
    const existing = months.get(key) ?? { swipes: 0, likes: 0, matches: 0 };
    existing.matches++;
    months.set(key, existing);
  }

  return Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      swipes: data.swipes,
      matches: data.matches,
      rightSwipeRate:
        data.swipes > 0
          ? Math.round((data.likes / data.swipes) * 100)
          : 0,
    }));
}

function findBestMonth(data: MonthlyData[]): string {
  if (data.length === 0) return "";
  return data.reduce((best, curr) =>
    curr.matches > best.matches ? curr : best
  ).month;
}

function findWorstMonth(data: MonthlyData[]): string {
  if (data.length === 0) return "";
  // Only consider months with activity
  const active = data.filter((d) => d.swipes > 0);
  if (active.length === 0) return "";
  return active.reduce((worst, curr) =>
    curr.matches < worst.matches ? curr : worst
  ).month;
}
