// Types and fetch logic for Play Store rankings data

export interface AppRanking {
  rank: number | null;
  score: number;
  ratings: number;
  installs: string;
  trend: "up" | "down" | "stable";
}

export interface RankingsData {
  updated: string;
  apps: Record<string, AppRanking>;
}

export interface RankingsHistory {
  date: string;
  apps: Record<string, { rank: number | null; score: number; ratings: number }>;
}

// Normalize scraper trend values to the frontend enum.
// Backward-compatible with old numeric deltas and nulls.
function normalizeTrend(trend: number | string | null): "up" | "down" | "stable" {
  if (trend === null || trend === undefined) return "stable";
  if (typeof trend === "string") {
    if (trend === "up" || trend === "down" || trend === "stable") return trend;
    return "stable";
  }
  if (trend < 0) return "up";
  if (trend > 0) return "down";
  return "stable";
}

// Fetch latest rankings from the static JSON (served from public/data/)
export async function fetchLatestRankings(): Promise<RankingsData | null> {
  try {
    const res = await fetch("/data/rankings-latest.json", { cache: "no-cache" });
    if (!res.ok) return null;
    const data = await res.json();
    // Normalize trend values from scraper (int) to frontend format (string)
    if (data?.apps) {
      for (const key of Object.keys(data.apps)) {
        data.apps[key].trend = normalizeTrend(data.apps[key].trend);
      }
    }
    return data;
  } catch {
    return null;
  }
}

// Fetch rankings history for trend calculation
export async function fetchRankingsHistory(): Promise<RankingsHistory[] | null> {
  try {
    const res = await fetch("/data/rankings-history.json", { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Compute trend from history (compare last 7 days average ratings count to previous 7 days)
export function computeTrend(
  history: RankingsHistory[],
  appName: string
): "up" | "down" | "stable" {
  if (history.length < 8) return "stable";

  const recent = history.slice(0, 7);
  const previous = history.slice(7, 14);

  if (previous.length < 3) return "stable";

  const recentAvg = recent.reduce((sum, h) => sum + (h.apps[appName]?.ratings ?? 0), 0) / recent.length;
  const previousAvg = previous.reduce((sum, h) => sum + (h.apps[appName]?.ratings ?? 0), 0) / previous.length;

  if (previousAvg === 0) return "stable";
  const change = (recentAvg - previousAvg) / previousAvg;

  if (change > 0.02) return "up";
  if (change < -0.02) return "down";
  return "stable";
}

// Format "last updated" as relative time in French
export function formatUpdatedAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  if (days > 0) return `il y a ${days}j`;
  if (hours > 0) return `il y a ${hours}h`;
  return "a l'instant";
}
