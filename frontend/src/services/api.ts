import type {
  AppsResponse,
  BestTimesResponse,
  ForecastResponse,
  HealthResponse,
  HistoryResponse,
  ScoreResponse,
} from "../types";

const BASE = import.meta.env.PROD
  ? "https://datepulse-api.onrender.com/api"
  : "/api";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function fetchLiveScore(app: string, city: string) {
  return fetchJSON<ScoreResponse>(
    `${BASE}/score/live?app=${app}&city=${city}`
  );
}

export function fetchForecast(app: string, city: string, days = 7) {
  return fetchJSON<ForecastResponse>(
    `${BASE}/score/forecast?app=${app}&city=${city}&days=${days}`
  );
}

export function fetchHistory(app: string, city: string, period = "30d") {
  return fetchJSON<HistoryResponse>(
    `${BASE}/score/history?app=${app}&city=${city}&period=${period}`
  );
}

export function fetchBestTimes(app: string, city: string) {
  return fetchJSON<BestTimesResponse>(
    `${BASE}/score/best-times?app=${app}&city=${city}`
  );
}

export function fetchApps() {
  return fetchJSON<AppsResponse>(`${BASE}/apps`);
}

export function fetchHealth() {
  return fetchJSON<HealthResponse>(`${BASE}/health`);
}
