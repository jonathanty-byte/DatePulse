import { useCallback, useEffect, useState } from "react";
import { fetchCalendar } from "../services/api";
import type { CalendarResponse } from "../types";

export function useCalendar(app: string, months = 12) {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchCalendar(app, months);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [app, months]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
