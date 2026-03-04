import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "../components/NavBar";
import { APPS } from "../lib/data";
import type { AppName } from "../lib/data";
import { getScoreLabel } from "../lib/scoring";
import {
  loadMatches,
  addMatch,
  deleteMatch,
  computeMatchStats,
  aggregateByWeek,
  type MatchEntry,
  type MatchStats,
  type WeeklyData,
} from "../lib/matchTracker";

// ── Helpers ─────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreToColor(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 55) return "#f97316";
  if (score >= 35) return "#eab308";
  if (score >= 15) return "#60a5fa";
  return "#6b7280";
}

const APP_COLORS: Record<AppName, string> = {
  tinder: "#f97316",
  bumble: "#eab308",
  hinge: "#6b7280",
  happn: "#f97316",
};

// ── Bar chart component (no dependency) ─────────────────────────

function MiniBarChart({ data }: { data: WeeklyData[] }) {
  if (data.length === 0) return null;
  const maxMatches = Math.max(...data.map((d) => d.matches), 1);

  return (
    <div className="flex items-end gap-1.5 sm:gap-2 h-32 sm:h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
            {d.matches}
          </span>
          <motion.div
            className="w-full rounded-t-md"
            style={{ backgroundColor: scoreToColor(d.avgScore) }}
            initial={{ height: 0 }}
            animate={{ height: `${(d.matches / maxMatches) * 100}%` }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          />
          <span className="text-[8px] sm:text-[10px] text-slate-400 truncate w-full text-center">
            {d.week}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────

export default function Tracker() {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formApp, setFormApp] = useState<AppName>("tinder");
  const [formDate, setFormDate] = useState(() => {
    const now = new Date();
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [formNote, setFormNote] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load data
  const refresh = useCallback(() => {
    const m = loadMatches();
    setMatches(m);
    setStats(computeMatchStats(m));
    setWeeklyData(aggregateByWeek(m));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Add match
  const handleAdd = () => {
    const date = new Date(formDate);
    addMatch(formApp, date, formNote.trim());
    setFormNote("");
    setShowForm(false);
    // Reset date to now
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    setFormDate(local.toISOString().slice(0, 16));
    refresh();
  };

  // Delete match
  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      deleteMatch(id);
      setDeleteConfirm(null);
      refresh();
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />
      <section className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <motion.div
            className="mb-8 flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                  Match Tracker
                </span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Note tes matches, decouvre tes patterns
              </p>
            </div>
            <motion.button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-brand-500 to-emerald-500 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md active:scale-95"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-lg">{showForm ? "\u2715" : "+"}</span>
              <span className="hidden sm:inline">
                {showForm ? "Annuler" : "Nouveau match"}
              </span>
            </motion.button>
          </motion.div>

          {/* ── Add match form ──────────────────────────── */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                className="mb-6 border border-gray-200 bg-white p-4 sm:p-6 shadow-sm"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="mb-4 text-base font-semibold">Ajouter un match</h2>

                {/* App selector */}
                <div className="mb-3">
                  <label className="mb-1.5 block text-xs text-slate-500">
                    Application
                  </label>
                  <div className="flex gap-1.5">
                    {APPS.map((app) => (
                      <button
                        key={app}
                        onClick={() => setFormApp(app)}
                        className={`px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                          formApp === app
                            ? "bg-gray-100 text-slate-900 ring-1 ring-gray-300"
                            : "bg-gray-50 text-slate-500 hover:bg-gray-100"
                        }`}
                      >
                        {capitalize(app)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date picker */}
                <div className="mb-3">
                  <label className="mb-1.5 block text-xs text-slate-500">
                    Quand ?
                  </label>
                  <input
                    type="datetime-local"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
                  />
                </div>

                {/* Note */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs text-slate-500">
                    Note (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Ex: super profil, conversation direct..."
                    maxLength={100}
                    className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
                  />
                </div>

                {/* Submit */}
                <motion.button
                  onClick={handleAdd}
                  className="w-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 active:scale-[0.98]"
                  whileTap={{ scale: 0.98 }}
                >
                  Enregistrer le match
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Stats cards ─────────────────────────────── */}
          {stats && stats.total > 0 && (
            <motion.div
              className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Total matches */}
              <div className="border border-gray-200 bg-white shadow-sm p-3 sm:p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">matches</p>
              </div>

              {/* Avg score */}
              <div className="border border-gray-200 bg-white shadow-sm p-3 sm:p-4 text-center">
                <p
                  className="text-2xl sm:text-3xl font-bold"
                  style={{ color: scoreToColor(stats.avgScore) }}
                >
                  {stats.avgScore}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">score moyen</p>
              </div>

              {/* Best day */}
              <div className="border border-gray-200 bg-white shadow-sm p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {stats.bestDay || "\u2014"}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">meilleur jour</p>
              </div>

              {/* Best hour */}
              <div className="border border-gray-200 bg-white shadow-sm p-3 sm:p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {stats.bestHour !== null ? `${stats.bestHour}h` : "\u2014"}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">meilleure heure</p>
              </div>
            </motion.div>
          )}

          {/* ── Correlation insight ─────────────────────── */}
          {stats && stats.total >= 3 && (
            <motion.div
              className="mb-6 border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Tes patterns
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-slate-600">
                <p>
                  <span className="text-green-600 font-medium">{stats.highScoreMatches}</span> matches
                  quand le score etait &ge; 60{" "}
                  <span className="text-slate-400">
                    ({stats.total > 0 ? Math.round((stats.highScoreMatches / stats.total) * 100) : 0}%)
                  </span>
                </p>
                <p>
                  <span className="text-red-500 font-medium">{stats.lowScoreMatches}</span> matches
                  quand le score etait &lt; 40{" "}
                  <span className="text-slate-400">
                    ({stats.total > 0 ? Math.round((stats.lowScoreMatches / stats.total) * 100) : 0}%)
                  </span>
                </p>
                {stats.highScoreMatches > stats.lowScoreMatches && stats.total >= 5 && (
                  <p className="mt-2 text-brand-500 font-medium">
                    Tu matches plus quand DatePulse est haut — continue de swiper aux bons moments !
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Weekly chart ────────────────────────────── */}
          {weeklyData.length > 1 && (
            <motion.div
              className="mb-6 border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Matches par semaine
              </h3>
              <MiniBarChart data={weeklyData} />
              <p className="mt-2 text-[10px] text-slate-400 text-center">
                Couleur = score moyen de la semaine
              </p>
            </motion.div>
          )}

          {/* ── Match history ──────────────────────────── */}
          <motion.div
            className="border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Historique
              {matches.length > 0 && (
                <span className="ml-2 text-xs text-slate-400 font-normal">
                  ({matches.length})
                </span>
              )}
            </h3>

            {matches.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-3xl mb-2">{"\u2764\uFE0F"}</p>
                <p className="text-sm text-slate-500">
                  Aucun match enregistre
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Clique sur "+" pour ajouter ton premier match
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {matches.map((m) => {
                    const { icon } = getScoreLabel(m.score);
                    return (
                      <motion.div
                        key={m.id}
                        className="flex items-center gap-2.5 sm:gap-3 bg-gray-50 px-3 sm:px-4 py-2.5 group"
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12, height: 0 }}
                      >
                        {/* App indicator */}
                        <div
                          className="h-8 w-1 rounded-full shrink-0"
                          style={{ backgroundColor: APP_COLORS[m.app] }}
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-medium text-slate-800">
                              {capitalize(m.app)}
                            </span>
                            <span className="text-[10px] sm:text-xs text-slate-400">
                              {formatDate(m.timestamp)}
                            </span>
                          </div>
                          {m.note && (
                            <p className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">
                              {m.note}
                            </p>
                          )}
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm">{icon}</span>
                          <span
                            className="text-xs sm:text-sm font-semibold"
                            style={{ color: scoreToColor(m.score) }}
                          >
                            {m.score}
                          </span>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(m.id)}
                          className={`shrink-0 px-2 py-1 text-[10px] transition ${
                            deleteConfirm === m.id
                              ? "bg-red-50 text-red-500"
                              : "text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-gray-50"
                          }`}
                        >
                          {deleteConfirm === m.id ? "Confirmer" : "\u2715"}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* ── Footer note ────────────────────────────── */}
          <p className="mt-6 text-center text-[10px] text-slate-400">
            Donnees stockees localement sur ton appareil. Rien n'est envoye.
          </p>
        </div>
      </section>
      <footer className="border-t border-gray-200 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-slate-400 space-y-2">
          <p className="font-medium text-slate-400">DatePulse — Swipe when it matters.</p>
          <p>
            <a href="/" className="hover:text-slate-900 transition">Accueil</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/coach" className="hover:text-slate-900 transition">Coach</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/wrapped" className="hover:text-slate-900 transition">Wrapped</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/insights" className="hover:text-slate-900 transition">Insights</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
