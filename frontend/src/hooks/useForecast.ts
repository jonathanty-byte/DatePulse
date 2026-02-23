import { useCallback, useEffect, useState } from "react";
import { fetchForecast } from "../services/api";
import type { ForecastResponse } from "../types";

export function useForecast(app: string, city: string, days = 7) {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchForecast(app, city, days);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forecast");
    } finally {
      setLoading(false);
    }
  }, [app, city, days]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
