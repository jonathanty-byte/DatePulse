import { useCallback, useEffect, useState } from "react";
import { fetchLiveScore } from "../services/api";
import type { ScoreResponse } from "../types";

const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

export function useScore(app: string, city: string) {
  const [data, setData] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchLiveScore(app, city);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load score");
    } finally {
      setLoading(false);
    }
  }, [app, city]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, error, refresh: load };
}
