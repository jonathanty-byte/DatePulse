import { useCallback, useEffect, useState } from "react";
import { fetchHistory } from "../services/api";
import type { HistoryResponse } from "../types";

export function useHistory(app: string, city: string, period = "30d") {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchHistory(app, city, period);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [app, city, period]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
