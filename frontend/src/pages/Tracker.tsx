import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
            {d.matches}
          </span>
          <motion.div
            className="w-full rounded-t-md"
            style={{ backgroundColor: scoreToColor(d.avgScore) }}
            initial={{ height: 0 }}
            animate={{ height: `${(d.matches / maxMatches) * 100}%` }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          />
          <span className="text-[8px] sm:text-[10px] text-gray-500 truncate w-full text-center">
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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <section className="relative overflow-hidden px-4 pb-6 pt-8 sm:pt-12">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-transparent" />
        <div className="relative mx-auto max-w-2xl">
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <a
                href="/"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-300 transition"
              >
                &larr; DatePulse
              </a>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                  Match Tracker
                </span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Note tes matches, decouvre tes patterns
              </p>
            </div>
            <motion.button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-pink-500 px-4 sm:px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-brand-500/40 active:scale-95"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-lg">{showForm ? "\u2715" : "+"}</span>
              <span className="hidden sm:inline">
                {showForm ? "Annuler" : "Nouveau match"}
              </span>
            </motion.button>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 pb-12">
        {/* ── Add match form ──────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="mb-4 text-base font-semibold">Ajouter un match</h2>

              {/* App selector */}
              <div className="mb-3">
                <label className="mb-1.5 block text-xs text-gray-400">
                  Application
                </label>
                <div className="flex gap-1.5">
                  {APPS.map((app) => (
                    <button
                      key={app}
                      onClick={() => setFormApp(app)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                        formApp === app
                          ? "bg-white/15 text-white ring-1 ring-white/20"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {capitalize(app)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date picker */}
              <div className="mb-3">
                <label className="mb-1.5 block text-xs text-gray-400">
                  Quand ?
                </label>
                <input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
                />
              </div>

              {/* Note */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs text-gray-400">
                  Note (optionnel)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Ex: super profil, conversation direct..."
                  maxLength={100}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
                />
              </div>

              {/* Submit */}
              <motion.button
                onClick={handleAdd}
                className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 active:scale-[0.98]"
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
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">matches</p>
            </div>

            {/* Avg score */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 text-center">
              <p
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: scoreToColor(stats.avgScore) }}
              >
                {stats.avgScore}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">score moyen</p>
            </div>

            {/* Best day */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 text-center">
              <p className="text-lg sm:text-xl font-bold text-white truncate">
                {stats.bestDay || "—"}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">meilleur jour</p>
            </div>

            {/* Best hour */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {stats.bestHour !== null ? `${stats.bestHour}h` : "—"}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">meilleure heure</p>
            </div>
          </motion.div>
        )}

        {/* ── Correlation insight ─────────────────────── */}
        {stats && stats.total >= 3 && (
          <motion.div
            className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-brand-900/10 p-4 sm:p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-sm font-semibold text-white mb-2">
              Tes patterns
            </h3>
            <div className="space-y-1.5 text-xs sm:text-sm text-gray-300">
              <p>
                <span className="text-green-400 font-medium">{stats.highScoreMatches}</span> matches
                quand le score etait &ge; 60{" "}
                <span className="text-gray-500">
                  ({stats.total > 0 ? Math.round((stats.highScoreMatches / stats.total) * 100) : 0}%)
                </span>
              </p>
              <p>
                <span className="text-red-400 font-medium">{stats.lowScoreMatches}</span> matches
                quand le score etait &lt; 40{" "}
                <span className="text-gray-500">
                  ({stats.total > 0 ? Math.round((stats.lowScoreMatches / stats.total) * 100) : 0}%)
                </span>
              </p>
              {stats.highScoreMatches > stats.lowScoreMatches && stats.total >= 5 && (
                <p className="mt-2 text-brand-400 font-medium">
                  Tu matches plus quand DatePulse est haut — continue de swiper aux bons moments !
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Weekly chart ────────────────────────────── */}
        {weeklyData.length > 1 && (
          <motion.div
            className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-white mb-3">
              Matches par semaine
            </h3>
            <MiniBarChart data={weeklyData} />
            <p className="mt-2 text-[10px] text-gray-500 text-center">
              Couleur = score moyen de la semaine
            </p>
          </motion.div>
        )}

        {/* ── Match history ──────────────────────────── */}
        <motion.div
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h3 className="text-sm font-semibold text-white mb-3">
            Historique
            {matches.length > 0 && (
              <span className="ml-2 text-xs text-gray-500 font-normal">
                ({matches.length})
              </span>
            )}
          </h3>

          {matches.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-3xl mb-2">{"\u2764\uFE0F"}</p>
              <p className="text-sm text-gray-400">
                Aucun match enregistre
              </p>
              <p className="text-xs text-gray-500 mt-1">
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
                      className="flex items-center gap-2.5 sm:gap-3 rounded-xl bg-white/[0.03] px-3 sm:px-4 py-2.5 group"
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
                          <span className="text-xs sm:text-sm font-medium text-gray-200">
                            {capitalize(m.app)}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-500">
                            {formatDate(m.timestamp)}
                          </span>
                        </div>
                        {m.note && (
                          <p className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5">
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
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] transition ${
                          deleteConfirm === m.id
                            ? "bg-red-500/20 text-red-400"
                            : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/5"
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
        <p className="mt-6 text-center text-[10px] text-gray-600">
          Donnees stockees localement sur ton appareil. Rien n'est envoye.
        </p>
      </div>
    </div>
  );
}
