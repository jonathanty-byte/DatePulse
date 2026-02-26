import type { AppName } from "./data";
import { computeScore } from "./scoring";

// ── Types ───────────────────────────────────────────────────────

export interface MatchEntry {
  id: string;
  app: AppName;
  timestamp: string; // ISO string
  score: number; // DatePulse score at that moment (auto-computed)
  note: string;
  rating?: number; // User compatibility rating 1-10
}

export interface MatchStats {
  total: number;
  byApp: Record<string, number>;
  avgScore: number;
  highScoreMatches: number; // matches with score >= 60
  lowScoreMatches: number; // matches with score < 40
  bestDay: string | null;
  bestHour: number | null;
}

// ── Storage ─────────────────────────────────────────────────────

const STORAGE_KEY = "datepulse_matches";

export function loadMatches(): MatchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MatchEntry[];
  } catch {
    return [];
  }
}

export function saveMatches(matches: MatchEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
}

export function addMatch(app: AppName, date: Date, note = "", rating?: number): MatchEntry {
  const matches = loadMatches();
  const result = computeScore(date, app);
  const entry: MatchEntry = {
    id: crypto.randomUUID(),
    app,
    timestamp: date.toISOString(),
    score: result.score,
    note,
    rating: rating && rating >= 1 && rating <= 10 ? rating : undefined,
  };
  matches.push(entry);
  matches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  saveMatches(matches);
  return entry;
}

export function updateMatch(
  id: string,
  updates: { app?: AppName; date?: Date; note?: string; rating?: number | null }
): void {
  const matches = loadMatches();
  const idx = matches.findIndex((m) => m.id === id);
  if (idx === -1) return;

  const m = matches[idx];
  if (updates.app !== undefined) m.app = updates.app;
  if (updates.date !== undefined) {
    m.timestamp = updates.date.toISOString();
    m.score = computeScore(updates.date, m.app).score;
  }
  if (updates.note !== undefined) m.note = updates.note;
  if (updates.rating === null) {
    m.rating = undefined;
  } else if (updates.rating !== undefined && updates.rating >= 1 && updates.rating <= 10) {
    m.rating = updates.rating;
  }

  // Re-sort if date changed
  if (updates.date !== undefined) {
    matches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  saveMatches(matches);
}

export function deleteMatch(id: string): void {
  const matches = loadMatches().filter((m) => m.id !== id);
  saveMatches(matches);
}

// ── Stats ───────────────────────────────────────────────────────

export function computeMatchStats(matches: MatchEntry[]): MatchStats {
  if (matches.length === 0) {
    return {
      total: 0,
      byApp: {},
      avgScore: 0,
      highScoreMatches: 0,
      lowScoreMatches: 0,
      bestDay: null,
      bestHour: null,
    };
  }

  const byApp: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  const byHour: Record<number, number> = {};
  let scoreSum = 0;
  let highScore = 0;
  let lowScore = 0;

  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  for (const m of matches) {
    // By app
    byApp[m.app] = (byApp[m.app] || 0) + 1;

    // Score stats
    scoreSum += m.score;
    if (m.score >= 60) highScore++;
    if (m.score < 40) lowScore++;

    // By day/hour
    const d = new Date(m.timestamp);
    const dayName = dayNames[d.getDay()];
    byDay[dayName] = (byDay[dayName] || 0) + 1;
    const hour = d.getHours();
    byHour[hour] = (byHour[hour] || 0) + 1;
  }

  // Find best day
  let bestDay: string | null = null;
  let bestDayCount = 0;
  for (const [day, count] of Object.entries(byDay)) {
    if (count > bestDayCount) {
      bestDay = day;
      bestDayCount = count;
    }
  }

  // Find best hour
  let bestHour: number | null = null;
  let bestHourCount = 0;
  for (const [hour, count] of Object.entries(byHour)) {
    if (count > bestHourCount) {
      bestHour = Number(hour);
      bestHourCount = count;
    }
  }

  return {
    total: matches.length,
    byApp,
    avgScore: Math.round(scoreSum / matches.length),
    highScoreMatches: highScore,
    lowScoreMatches: lowScore,
    bestDay,
    bestHour,
  };
}

// ── Weekly aggregation for chart ────────────────────────────────

export interface WeeklyData {
  week: string; // "Sem 1", "Sem 2", etc.
  matches: number;
  avgScore: number;
}

export function aggregateByWeek(matches: MatchEntry[]): WeeklyData[] {
  if (matches.length === 0) return [];

  // Group by ISO week
  const weeks = new Map<string, { matches: number; scoreSum: number }>();

  for (const m of matches) {
    const d = new Date(m.timestamp);
    const weekKey = getISOWeekKey(d);
    const existing = weeks.get(weekKey) || { matches: 0, scoreSum: 0 };
    existing.matches++;
    existing.scoreSum += m.score;
    weeks.set(weekKey, existing);
  }

  // Convert to sorted array, keep last 8 weeks max
  const sorted = Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8);

  return sorted.map(([_, data], i) => ({
    week: `Sem ${i + 1}`,
    matches: data.matches,
    avgScore: Math.round(data.scoreSum / data.matches),
  }));
}

function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
