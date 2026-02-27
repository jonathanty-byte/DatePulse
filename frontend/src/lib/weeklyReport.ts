import type { PulseSession } from "./sessionTracker";
import { getSessions } from "./sessionTracker";

// ── Types ───────────────────────────────────────────────────────

export interface WeeklyReport {
  weekStart: string;        // ISO Monday
  weekEnd: string;          // ISO Sunday
  totalTime: number;        // minutes
  sessionsCount: number;
  completedSessions: number;
  totalMatches: number;
  avgScore: number;
  matchesPerHour: number;
  bestDay: string | null;   // "Dimanche"
  bestHour: number | null;  // 21
  pctGreenLight: number;    // % sessions started with score >= 56
  // Previous week comparison
  prevWeek: {
    totalTime: number;
    totalMatches: number;
    matchesPerHour: number;
  } | null;
  // Deltas (% change)
  timeDelta: number;
  matchesDelta: number;
  efficiencyDelta: number;
  // Daily breakdown for chart
  dailyMatches: DailyData[];
}

export interface DailyData {
  day: string;      // "Lun", "Mar", etc.
  matches: number;
  avgScore: number;
}

// ── Week boundaries ─────────────────────────────────────────────

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Get Monday 00:00:00 for the week containing the given date, shifted by weekOffset. */
function getWeekStart(date: Date, weekOffset = 0): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days since Monday
  d.setDate(d.getDate() - diff + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get Sunday 23:59:59 for the week starting on the given Monday. */
function getWeekEnd(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Filter sessions within [start, end]. */
function filterSessionsInRange(
  sessions: PulseSession[],
  start: Date,
  end: Date
): PulseSession[] {
  return sessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

// ── Aggregation ─────────────────────────────────────────────────

function aggregateWeek(sessions: PulseSession[]): {
  totalTime: number;
  sessionsCount: number;
  completedSessions: number;
  totalMatches: number;
  avgScore: number;
  matchesPerHour: number;
  bestDay: string | null;
  bestHour: number | null;
  pctGreenLight: number;
  dailyMatches: DailyData[];
} {
  if (sessions.length === 0) {
    return {
      totalTime: 0,
      sessionsCount: 0,
      completedSessions: 0,
      totalMatches: 0,
      avgScore: 0,
      matchesPerHour: 0,
      bestDay: null,
      bestHour: null,
      pctGreenLight: 0,
      dailyMatches: buildEmptyDaily(),
    };
  }

  const totalTime = sessions.reduce((sum, s) => sum + s.duration_actual, 0);
  const totalMatches = sessions.reduce((sum, s) => sum + s.matches, 0);
  const avgScore = Math.round(
    sessions.reduce((sum, s) => sum + s.score_avg, 0) / sessions.length
  );
  const matchesPerHour = totalTime > 0
    ? Math.round((totalMatches / (totalTime / 60)) * 10) / 10
    : 0;
  const completedSessions = sessions.filter((s) => s.completed).length;
  const greenLightCount = sessions.filter((s) => s.score_start >= 56).length;
  const pctGreenLight = Math.round((greenLightCount / sessions.length) * 100);

  // Best day & hour
  const byDay: Record<number, { matches: number; count: number }> = {};
  const byHour: Record<number, number> = {};
  // Daily breakdown (Mon-Sun order)
  const dailyMap: Record<number, { matches: number; scores: number[]; }> = {};

  for (const s of sessions) {
    const d = new Date(s.date);
    const day = d.getDay(); // 0=Sun
    const hour = d.getHours();

    byDay[day] = byDay[day] ?? { matches: 0, count: 0 };
    byDay[day].matches += s.matches;
    byDay[day].count++;

    byHour[hour] = (byHour[hour] ?? 0) + s.matches;

    dailyMap[day] = dailyMap[day] ?? { matches: 0, scores: [] };
    dailyMap[day].matches += s.matches;
    dailyMap[day].scores.push(s.score_avg);
  }

  // Best day
  let bestDay: string | null = null;
  let bestDayMatches = 0;
  for (const [dayStr, data] of Object.entries(byDay)) {
    if (data.matches > bestDayMatches) {
      bestDay = DAY_NAMES[Number(dayStr)];
      bestDayMatches = data.matches;
    }
  }

  // Best hour
  let bestHour: number | null = null;
  let bestHourMatches = 0;
  for (const [hourStr, matches] of Object.entries(byHour)) {
    if (matches > bestHourMatches) {
      bestHour = Number(hourStr);
      bestHourMatches = matches;
    }
  }

  // Daily matches array (Mon=1, Tue=2, ..., Sun=0) in display order
  const displayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  const dailyMatches: DailyData[] = displayOrder.map((jsDay) => {
    const data = dailyMap[jsDay];
    return {
      day: DAY_SHORT[jsDay],
      matches: data?.matches ?? 0,
      avgScore: data?.scores.length
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0,
    };
  });

  return {
    totalTime: Math.round(totalTime * 10) / 10,
    sessionsCount: sessions.length,
    completedSessions,
    totalMatches,
    avgScore,
    matchesPerHour,
    bestDay,
    bestHour,
    pctGreenLight,
    dailyMatches,
  };
}

function buildEmptyDaily(): DailyData[] {
  const displayOrder = [1, 2, 3, 4, 5, 6, 0];
  return displayOrder.map((jsDay) => ({
    day: DAY_SHORT[jsDay],
    matches: 0,
    avgScore: 0,
  }));
}

// ── Main function ───────────────────────────────────────────────

export function generateWeeklyReport(
  sessions?: PulseSession[],
  weekOffset = 0
): WeeklyReport {
  const allSessions = sessions ?? getSessions();
  const now = new Date();

  // Current week boundaries
  const weekStart = getWeekStart(now, weekOffset);
  const weekEnd = getWeekEnd(weekStart);
  const currentWeekSessions = filterSessionsInRange(allSessions, weekStart, weekEnd);
  const current = aggregateWeek(currentWeekSessions);

  // Previous week boundaries
  const prevWeekStart = getWeekStart(now, weekOffset - 1);
  const prevWeekEnd = getWeekEnd(prevWeekStart);
  const prevWeekSessions = filterSessionsInRange(allSessions, prevWeekStart, prevWeekEnd);

  let prevWeek: WeeklyReport["prevWeek"] = null;
  let timeDelta = 0;
  let matchesDelta = 0;
  let efficiencyDelta = 0;

  if (prevWeekSessions.length > 0) {
    const prev = aggregateWeek(prevWeekSessions);
    prevWeek = {
      totalTime: prev.totalTime,
      totalMatches: prev.totalMatches,
      matchesPerHour: prev.matchesPerHour,
    };

    timeDelta = prev.totalTime > 0
      ? Math.round(((current.totalTime - prev.totalTime) / prev.totalTime) * 100)
      : 0;
    matchesDelta = prev.totalMatches > 0
      ? Math.round(((current.totalMatches - prev.totalMatches) / prev.totalMatches) * 100)
      : 0;
    efficiencyDelta = prev.matchesPerHour > 0
      ? Math.round(((current.matchesPerHour - prev.matchesPerHour) / prev.matchesPerHour) * 100)
      : 0;
  }

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    ...current,
    prevWeek,
    timeDelta,
    matchesDelta,
    efficiencyDelta,
  };
}

// ── Insight templates ───────────────────────────────────────────

export function getInsight(report: WeeklyReport): string {
  // Priority order: best insight first
  if (report.sessionsCount === 0) {
    return "Aucune session cette semaine. Lance ta premiere session pendant un momentum !";
  }

  // Less time + more matches = ideal detox
  if (report.matchesDelta > 0 && report.timeDelta < 0 && report.prevWeek) {
    const timeSaved = Math.round(report.prevWeek.totalTime - report.totalTime);
    return `Moins de temps, plus de matches ! Tu as gagne ${timeSaved} min cette semaine avec ${report.matchesDelta > 0 ? "+" : ""}${report.matchesDelta}% de matches.`;
  }

  // High green light adherence
  if (report.pctGreenLight >= 80) {
    return `${report.pctGreenLight}% de tes sessions en momentum. Tu maitrises le timing.`;
  }

  // Low green light adherence
  if (report.pctGreenLight < 50 && report.sessionsCount >= 3) {
    return "Tu swipes encore hors pic. Les creneaux momentum donnent plus de matches.";
  }

  // Efficiency improving
  if (report.efficiencyDelta > 0 && report.prevWeek) {
    return `Ton efficacite s'ameliore : ${report.matchesPerHour} matches/heure vs ${report.prevWeek.matchesPerHour} la semaine derniere.`;
  }

  // Active week
  if (report.sessionsCount >= 7) {
    return `${report.sessionsCount} sessions cette semaine ! Continue sur ta lancee.`;
  }

  // Fallback
  return "Astuce : les sessions de 15 min en momentum sont les plus efficaces.";
}

// ── Helper: check if any sessions exist ─────────────────────────

export function hasAnySessions(): boolean {
  return getSessions().length > 0;
}
