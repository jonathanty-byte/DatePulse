/**
 * Calendar view page — 12-month activity heatmap.
 */

import { useEffect, useState } from "react";
import AppSelector from "../components/AppSelector";
import CalendarHeatmap from "../components/CalendarHeatmap";
import { useCalendar } from "../hooks/useCalendar";
import { fetchApps } from "../services/api";
import type { CalendarDayItem } from "../types";

function formatDateFR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function TopDaysList({
  title,
  days,
  variant,
}: {
  title: string;
  days: CalendarDayItem[];
  variant: "top" | "worst";
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      <div className="space-y-1">
        {days.slice(0, 5).map((day) => (
          <div
            key={day.date}
            className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-sm"
          >
            <div>
              <span className="text-white">{formatDateFR(day.date)}</span>
              {day.event && (
                <span className="ml-2 text-brand-400">{day.event}</span>
              )}
            </div>
            <span
              className={`font-bold ${
                variant === "top" ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {day.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [app, setApp] = useState("tinder");
  const [apps, setApps] = useState<string[]>([
    "tinder", "bumble", "hinge", "happn",
  ]);

  const calendar = useCalendar(app, 12);

  useEffect(() => {
    fetchApps()
      .then((data) => setApps(data.apps))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            &larr; Dashboard
          </a>
          <h1 className="text-2xl font-bold text-white">
            Calendrier d'activite
          </h1>
          <p className="text-sm text-gray-400">
            12 mois d'historique — meilleurs et pires jours pour swiper
          </p>
        </div>
        <AppSelector apps={apps} selected={app} onChange={setApp} />
      </header>

      {/* Stats summary */}
      {calendar.data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Jours analyses", value: calendar.data.total_days },
            { label: "Score moyen", value: calendar.data.avg_score },
            {
              label: "Meilleur jour",
              value: calendar.data.top_days[0]?.score ?? "--",
            },
            {
              label: "Jour le plus calme",
              value: calendar.data.worst_days[0]?.score ?? "--",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center"
            >
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar heatmap */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Activite quotidienne
        </h2>
        {calendar.loading ? (
          <p className="py-12 text-center text-gray-500">Chargement...</p>
        ) : calendar.error ? (
          <p className="py-12 text-center text-red-400">{calendar.error}</p>
        ) : calendar.data?.calendar && calendar.data.calendar.length > 0 ? (
          <CalendarHeatmap calendar={calendar.data.calendar} />
        ) : (
          <p className="py-12 text-center text-gray-500">
            Pas de donnees disponibles
          </p>
        )}
      </section>

      {/* Top and worst days */}
      {calendar.data && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <TopDaysList
              title="Top 5 — Jours les plus actifs"
              days={calendar.data.top_days}
              variant="top"
            />
          </section>
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <TopDaysList
              title="Top 5 — Jours les plus calmes"
              days={calendar.data.worst_days}
              variant="worst"
            />
          </section>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-600">
        DatePulse &mdash; Donnees issues de Google Trends, Wikipedia et
        calendrier saisonnier
      </footer>
    </div>
  );
}
