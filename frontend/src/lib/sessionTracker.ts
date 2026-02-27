import type { AppName } from "./data";
import { computeScore } from "./scoring";

// ── Types ───────────────────────────────────────────────────────

export interface DetoxSession {
  id: string;                // "session-" + timestamp
  date: string;              // ISO 8601
  app: AppName;
  duration_planned: number;  // minutes (10, 15, 20, 30)
  duration_actual: number;   // minutes (actual elapsed)
  score_start: number;
  score_end: number;
  score_avg: number;
  matches: number;
  completed: boolean;        // true if timer reached 0, false if manual stop
}

export interface SessionStats {
  totalTime: number;         // minutes
  totalMatches: number;
  avgScore: number;
  matchesPerHour: number;
  sessionsCount: number;
  completionRate: number;    // 0-1
}

// Active session state stored in localStorage for tab survival
export interface ActiveSessionState {
  sessionId: string;
  app: AppName;
  startTime: number;         // Date.now() timestamp
  plannedDuration: number;   // minutes
  scoreStart: number;
  matches: number;
  scoreSamples: number[];    // score samples taken during session
}

// ── Storage ─────────────────────────────────────────────────────

const STORAGE_KEY = "datedetox_sessions";
const ACTIVE_KEY = "datedetox_active_session";

function loadSessions(): DetoxSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DetoxSession[];
  } catch {
    return [];
  }
}

function saveSessions(sessions: DetoxSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ── Active session (tab survival) ───────────────────────────────

export function getActiveSessionState(): ActiveSessionState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSessionState;
  } catch {
    return null;
  }
}

export function saveActiveSessionState(state: ActiveSessionState): void {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(state));
}

export function clearActiveSessionState(): void {
  localStorage.removeItem(ACTIVE_KEY);
}

// ── CRUD ────────────────────────────────────────────────────────

export function startSession(
  app: AppName,
  duration: number,
  score: number
): ActiveSessionState {
  const state: ActiveSessionState = {
    sessionId: `session-${Date.now()}`,
    app,
    startTime: Date.now(),
    plannedDuration: duration,
    scoreStart: score,
    matches: 0,
    scoreSamples: [score],
  };
  saveActiveSessionState(state);
  return state;
}

export function endSession(
  activeState: ActiveSessionState,
  completed: boolean
): DetoxSession {
  const now = Date.now();
  const elapsedMs = now - activeState.startTime;
  const elapsedMinutes = Math.round((elapsedMs / 60_000) * 10) / 10; // 1 decimal

  // Get current score for score_end
  const scoreEnd = computeScore(new Date(), activeState.app).score;
  const allSamples = [...activeState.scoreSamples, scoreEnd];
  const scoreAvg = Math.round(
    allSamples.reduce((sum, s) => sum + s, 0) / allSamples.length
  );

  const session: DetoxSession = {
    id: activeState.sessionId,
    date: new Date(activeState.startTime).toISOString(),
    app: activeState.app,
    duration_planned: activeState.plannedDuration,
    duration_actual: elapsedMinutes,
    score_start: activeState.scoreStart,
    score_end: scoreEnd,
    score_avg: scoreAvg,
    matches: activeState.matches,
    completed,
  };

  const sessions = loadSessions();
  sessions.push(session);
  sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveSessions(sessions);

  clearActiveSessionState();
  return session;
}

export function getSessions(): DetoxSession[] {
  return loadSessions();
}

export function getSessionsThisWeek(): DetoxSession[] {
  const sessions = loadSessions();
  const now = new Date();
  // Start of week (Monday 00:00)
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay(); // 0=Sun
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days since Monday
  startOfWeek.setDate(now.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  return sessions.filter((s) => new Date(s.date).getTime() >= startOfWeek.getTime());
}

export function getSessionStats(sessions?: DetoxSession[]): SessionStats {
  const data = sessions ?? loadSessions();

  if (data.length === 0) {
    return {
      totalTime: 0,
      totalMatches: 0,
      avgScore: 0,
      matchesPerHour: 0,
      sessionsCount: 0,
      completionRate: 0,
    };
  }

  const totalTime = data.reduce((sum, s) => sum + s.duration_actual, 0);
  const totalMatches = data.reduce((sum, s) => sum + s.matches, 0);
  const avgScore = Math.round(
    data.reduce((sum, s) => sum + s.score_avg, 0) / data.length
  );
  const matchesPerHour = totalTime > 0
    ? Math.round((totalMatches / (totalTime / 60)) * 10) / 10
    : 0;
  const completedCount = data.filter((s) => s.completed).length;

  return {
    totalTime: Math.round(totalTime * 10) / 10,
    totalMatches,
    avgScore,
    matchesPerHour,
    sessionsCount: data.length,
    completionRate: Math.round((completedCount / data.length) * 100) / 100,
  };
}

/** Compute percentile of a session's efficiency vs all previous sessions */
export function getEfficiencyPercentile(session: DetoxSession): number | null {
  const allSessions = loadSessions().filter((s) => s.id !== session.id);
  if (allSessions.length < 2) return null; // Need at least 2 previous sessions

  const getEfficiency = (s: DetoxSession) =>
    s.duration_actual > 0 ? s.matches / (s.duration_actual / 60) : 0;

  const currentEff = getEfficiency(session);
  const betterCount = allSessions.filter(
    (s) => getEfficiency(s) < currentEff
  ).length;

  return Math.round((betterCount / allSessions.length) * 100);
}
