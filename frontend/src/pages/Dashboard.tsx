/**
 * Main dashboard page — assembles all components.
 */

import { useEffect, useState } from "react";
import AppSelector from "../components/AppSelector";
import BestTimesTable from "../components/BestTimesTable";
import CitySelector from "../components/CitySelector";
import HeatmapWeek from "../components/HeatmapWeek";
import HistoryChart from "../components/HistoryChart";
import ScoreGauge from "../components/ScoreGauge";
import TrendIndicator from "../components/TrendIndicator";
import { useForecast } from "../hooks/useForecast";
import { useHistory } from "../hooks/useHistory";
import { useScore } from "../hooks/useScore";
import { fetchApps, fetchBestTimes } from "../services/api";
import type { BestTime, CityInfo } from "../types";

function timeAgo(dateStr: string): string {
  try {
    const then = new Date(dateStr + "Z").getTime();
    const now = Date.now();
    const mins = Math.floor((now - then) / 60000);
    if (mins < 1) return "a l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `il y a ${hours}h`;
  } catch {
    return "";
  }
}

export default function Dashboard() {
  const [app, setApp] = useState("tinder");
  const [city, setCity] = useState("paris");
  const [apps, setApps] = useState<string[]>(["tinder", "bumble", "hinge", "happn"]);
  const [cities, setCities] = useState<CityInfo[]>([]);
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);

  const score = useScore(app, city);
  const forecast = useForecast(app, city);
  const history = useHistory(app, city, "30d");

  // Load apps + cities on mount
  useEffect(() => {
    fetchApps()
      .then((data) => {
        setApps(data.apps);
        setCities(data.cities);
      })
      .catch(() => {});
  }, []);

  // Load best times when app/city changes
  useEffect(() => {
    fetchBestTimes(app, city)
      .then((data) => setBestTimes(data.best_times))
      .catch(() => setBestTimes([]));
  }, [app, city]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            DatePulse
          </h1>
          <p className="text-sm text-gray-400">
            Score d'activite dating en temps reel
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AppSelector apps={apps} selected={app} onChange={setApp} />
          {cities.length > 0 && (
            <CitySelector cities={cities} selected={city} onChange={setCity} />
          )}
        </div>
      </header>

      {/* Score live + trend */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-around">
          <ScoreGauge
            score={score.data?.score ?? null}
            percentile={score.data?.percentile ?? null}
          />
          <div className="space-y-3 text-center md:text-left">
            <div>
              <TrendIndicator trend={score.data?.trend ?? null} />
            </div>
            {score.data?.updated_at && (
              <p className="text-xs text-gray-500">
                Mis a jour {timeAgo(score.data.updated_at)}
              </p>
            )}
            {score.data?.components && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Composantes
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(score.data.components).map(
                    ([name, detail]) =>
                      detail.normalized !== null && (
                        <span
                          key={name}
                          className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300"
                        >
                          {name}: {Math.round(detail.normalized)}
                        </span>
                      )
                  )}
                </div>
              </div>
            )}
            {score.loading && (
              <p className="text-xs text-gray-500">Chargement...</p>
            )}
            {score.error && (
              <p className="text-xs text-red-400">{score.error}</p>
            )}
          </div>
        </div>
      </section>

      {/* Grid: Heatmap + Best Times */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Heatmap (2/3 width) */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Previsions 7 jours
          </h2>
          {forecast.data?.forecast && forecast.data.forecast.length > 0 ? (
            <HeatmapWeek forecast={forecast.data.forecast} />
          ) : forecast.loading ? (
            <p className="py-8 text-center text-gray-500">Chargement...</p>
          ) : (
            <p className="py-8 text-center text-gray-500">
              Pas de previsions disponibles
            </p>
          )}
        </section>

        {/* Best Times (1/3 width) */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Meilleurs creneaux
          </h2>
          <BestTimesTable bestTimes={bestTimes} />
        </section>
      </div>

      {/* History chart */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Historique 30 jours
        </h2>
        {history.data?.history ? (
          <HistoryChart history={history.data.history} />
        ) : history.loading ? (
          <p className="py-8 text-center text-gray-500">Chargement...</p>
        ) : (
          <p className="py-8 text-center text-gray-500">
            Pas de donnees historiques
          </p>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-600">
        DatePulse &mdash; Donnees issues de Google Trends, Wikipedia, Bluesky,
        App Store, Open-Meteo
      </footer>
    </div>
  );
}
