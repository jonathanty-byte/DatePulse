import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APPS } from "../lib/data";
import type { AppName } from "../lib/data";
import { getScoreLabel } from "../lib/scoring";
import {
  loadMatches,
  addMatch,
  updateMatch,
  deleteMatch,
  computeMatchStats,
  aggregateByWeek,
  type MatchEntry,
  type MatchStats,
  type WeeklyData,
} from "../lib/matchTracker";

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

// ── Mini bar chart ──────────────────────────────────────────────

function MiniBarChart({ data }: { data: WeeklyData[] }) {
  if (data.length === 0) return null;
  const maxMatches = Math.max(...data.map((d) => d.matches), 1);

  return (
    <div className="flex items-end gap-1.5 sm:gap-2 h-28 sm:h-32">
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

// ── Main inline component ───────────────────────────────────────

interface Props {
  currentApp: AppName;
}

export default function MatchTrackerInline({ currentApp }: Props) {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [formApp, setFormApp] = useState<AppName>(currentApp);
  const [formDate, setFormDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [formNote, setFormNote] = useState("");
  const [formRating, setFormRating] = useState<number>(0); // 0 = not set
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Sync formApp when parent app changes
  useEffect(() => {
    setFormApp(currentApp);
  }, [currentApp]);

  const refresh = useCallback(() => {
    const m = loadMatches();
    setMatches(m);
    setStats(computeMatchStats(m));
    setWeeklyData(aggregateByWeek(m));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resetForm = () => {
    setFormNote("");
    setFormRating(0);
    setEditingId(null);
    setShowForm(false);
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    setFormDate(local.toISOString().slice(0, 16));
    setFormApp(currentApp);
  };

  const handleSubmit = () => {
    const date = new Date(formDate);
    const rating = formRating >= 1 ? formRating : undefined;

    if (editingId) {
      updateMatch(editingId, { app: formApp, date, note: formNote.trim(), rating: rating ?? null });
    } else {
      addMatch(formApp, date, formNote.trim(), rating);
    }
    resetForm();
    refresh();
  };

  const handleEdit = (m: MatchEntry) => {
    const d = new Date(m.timestamp);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    setFormApp(m.app);
    setFormDate(local.toISOString().slice(0, 16));
    setFormNote(m.note);
    setFormRating(m.rating ?? 0);
    setEditingId(m.id);
    setShowForm(true);
  };

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

  const displayedMatches = expanded ? matches : matches.slice(0, 5);

  return (
    <motion.div
      className="rounded-2xl border border-brand-500/15 bg-white/[0.02] p-4 sm:p-6"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.35, duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Match Tracker
          </h2>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
            Note tes matches, decouvre tes patterns
          </p>
        </div>
        <motion.button
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-emerald-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition hover:shadow-brand-500/30 active:scale-95"
          whileTap={{ scale: 0.95 }}
        >
          <span>{showForm ? "\u2715" : "+"}</span>
          <span className="hidden sm:inline">{showForm ? "Annuler" : "Match"}</span>
        </motion.button>
      </div>

      {/* Add match form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* App selector */}
            <div className="mb-2.5">
              <label className="mb-1 block text-[10px] sm:text-xs text-gray-400">App</label>
              <div className="flex gap-1.5">
                {APPS.map((app) => (
                  <button
                    key={app}
                    onClick={() => setFormApp(app)}
                    className={`rounded-md px-2.5 py-1 text-[10px] sm:text-xs font-medium transition-all active:scale-95 ${
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

            {/* Date + Note row */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] sm:text-xs text-gray-400">Quand</label>
                <input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200 outline-none focus:border-brand-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] sm:text-xs text-gray-400">Note</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Optionnel..."
                  maxLength={80}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 outline-none focus:border-brand-500/50"
                />
              </div>
            </div>

            {/* Compatibility rating */}
            <div className="mb-3">
              <label className="mb-1.5 block text-[10px] sm:text-xs text-gray-400">
                Compatibilite{formRating > 0 ? ` — ${formRating}/10` : ""}
              </label>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFormRating(formRating === v ? 0 : v)}
                    className={`flex-1 rounded-md py-1.5 text-[10px] sm:text-xs font-medium transition-all active:scale-90 ${
                      formRating >= v
                        ? v >= 8
                          ? "bg-green-500/30 text-green-300 ring-1 ring-green-500/30"
                          : v >= 5
                            ? "bg-yellow-500/25 text-yellow-300 ring-1 ring-yellow-500/25"
                            : "bg-red-500/25 text-red-300 ring-1 ring-red-500/25"
                        : "bg-white/5 text-gray-500 hover:bg-white/10"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              onClick={handleSubmit}
              className="w-full rounded-lg bg-brand-600 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-brand-500 active:scale-[0.98]"
              whileTap={{ scale: 0.98 }}
            >
              {editingId ? "Modifier" : "Enregistrer"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      {stats && stats.total > 0 && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="rounded-lg bg-white/[0.04] p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-xl font-bold text-white">{stats.total}</p>
            <p className="text-[8px] sm:text-[10px] text-gray-500">matches</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-xl font-bold" style={{ color: scoreToColor(stats.avgScore) }}>
              {stats.avgScore}
            </p>
            <p className="text-[8px] sm:text-[10px] text-gray-500">score moy.</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2 sm:p-3 text-center">
            <p className="text-sm sm:text-base font-bold text-white truncate">
              {stats.bestDay ? stats.bestDay.slice(0, 3) : "—"}
            </p>
            <p className="text-[8px] sm:text-[10px] text-gray-500">jour</p>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-xl font-bold text-white">
              {stats.bestHour !== null ? `${stats.bestHour}h` : "—"}
            </p>
            <p className="text-[8px] sm:text-[10px] text-gray-500">heure</p>
          </div>
        </div>
      )}

      {/* Correlation insight */}
      {stats && stats.total >= 3 && (
        <div className="mb-4 rounded-lg bg-gradient-to-r from-brand-900/20 to-transparent px-3 py-2.5 text-xs text-gray-300">
          <span className="text-green-400 font-medium">{stats.highScoreMatches}</span> matches score &ge;60
          {" · "}
          <span className="text-red-400 font-medium">{stats.lowScoreMatches}</span> score &lt;40
          {stats.highScoreMatches > stats.lowScoreMatches && stats.total >= 5 && (
            <span className="block mt-1 text-brand-400 font-medium text-[10px] sm:text-xs">
              Tu matches plus quand DateDetox est haut !
            </span>
          )}
        </div>
      )}

      {/* Weekly chart */}
      {weeklyData.length > 1 && (
        <div className="mb-4">
          <MiniBarChart data={weeklyData} />
          <p className="mt-1 text-[8px] sm:text-[10px] text-gray-600 text-center">
            Matches/semaine — couleur = score moyen
          </p>
        </div>
      )}

      {/* Match history */}
      {matches.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-2xl mb-1">{"\u2764\uFE0F"}</p>
          <p className="text-xs text-gray-400">Aucun match — clique "+" pour commencer</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {displayedMatches.map((m) => {
              const { icon } = getScoreLabel(m.score);
              return (
                <motion.div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 sm:px-3 py-2 group"
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                >
                  <div
                    className="h-6 w-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: APP_COLORS[m.app] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-200">
                        {capitalize(m.app)}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-gray-500">
                        {formatDate(m.timestamp)}
                      </span>
                    </div>
                    {m.note && (
                      <p className="text-[9px] sm:text-[10px] text-gray-500 truncate">{m.note}</p>
                    )}
                  </div>
                  {/* Rating badge */}
                  {m.rating && (
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold ${
                        m.rating >= 8
                          ? "bg-green-500/20 text-green-400"
                          : m.rating >= 5
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {m.rating}/10
                    </span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs">{icon}</span>
                    <span
                      className="text-[10px] sm:text-xs font-semibold"
                      style={{ color: scoreToColor(m.score) }}
                    >
                      {m.score}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEdit(m)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[9px] text-gray-600 opacity-0 group-hover:opacity-100 hover:text-blue-400 transition"
                    title="Modifier"
                  >
                    &#9998;
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] transition ${
                      deleteConfirm === m.id
                        ? "bg-red-500/20 text-red-400"
                        : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
                    }`}
                  >
                    {deleteConfirm === m.id ? "OK" : "\u2715"}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {matches.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-center text-[10px] sm:text-xs text-gray-500 hover:text-gray-300 py-1.5 transition"
            >
              {expanded ? "Voir moins" : `Voir tout (${matches.length})`}
            </button>
          )}
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-3 text-center text-[8px] sm:text-[9px] text-gray-600">
        Stocke localement — rien n'est envoye
      </p>
    </motion.div>
  );
}
