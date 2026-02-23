export interface ScoreResponse {
  app: string;
  city: string;
  score: number | null;
  percentile: number | null;
  trend: "rising" | "falling" | "stable" | null;
  components: Record<string, ComponentDetail>;
  updated_at: string;
  message?: string;
}

export interface ComponentDetail {
  normalized: number | null;
  weight: number;
  weighted: number;
  status?: string;
}

export interface ForecastItem {
  date: string;
  hour: number;
  predicted_score: number;
  confidence: number;
  components: Record<string, number>;
}

export interface ForecastResponse {
  app: string;
  city: string;
  days: number;
  forecast: ForecastItem[];
}

export interface HistoryItem {
  date: string;
  score: number;
  percentile: number | null;
  trend: string | null;
}

export interface HistoryResponse {
  app: string;
  city: string;
  period: string;
  history: HistoryItem[];
  source?: string;
}

export interface BestTime {
  day: string;
  hour: string;
  hour_int: number;
  avg_score: number;
}

export interface BestTimesResponse {
  app: string;
  city: string;
  best_times: BestTime[];
}

export interface CityInfo {
  id: string;
  display_name: string;
  lat: number;
  lon: number;
}

export interface AppsResponse {
  apps: string[];
  cities: CityInfo[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: {
    total_signals: number;
    total_scores: number;
    total_forecasts: number;
  };
  sources: Record<
    string,
    { total_signals: number; last_collected: string | null; status: string }
  >;
}
