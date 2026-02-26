import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPoolFreshness } from "../lib/scoring";
import type { PoolFreshnessData } from "../lib/data";
import {
  fetchLatestRankings,
  formatUpdatedAgo,
  type RankingsData,
  type AppRanking,
} from "../lib/rankings";

const POOL_CONFIG: Record<
  PoolFreshnessData["label"],
  { color: string; bg: string; icon: string; barColor: string }
> = {
  "tres-frais": { color: "#22c55e", bg: "#22c55e18", icon: "\u{1F331}", barColor: "#22c55e" },
  frais: { color: "#4ade80", bg: "#4ade8018", icon: "\u{1F33F}", barColor: "#4ade80" },
  stable: { color: "#facc15", bg: "#facc1518", icon: "\u{2696}\u{FE0F}", barColor: "#facc15" },
  stagnant: { color: "#f97316", bg: "#f9731618", icon: "\u{1F32B}\u{FE0F}", barColor: "#f97316" },
  "en-vidange": { color: "#ef4444", bg: "#ef444418", icon: "\u{1F4A8}", barColor: "#ef4444" },
};

interface PoolFreshnessProps {
  now?: Date;
}

// Display name mapping for app identifiers
const APP_DISPLAY_NAMES: Record<string, string> = {
  tinder: "Tinder",
  bumble: "Bumble",
  hinge: "Hinge",
  happn: "Happn",
};

// Ordered list of apps to display
const RANKED_APPS = ["tinder", "bumble", "hinge", "happn"];



export default function PoolFreshness({ now }: PoolFreshnessProps) {
  const pool = useMemo(() => getPoolFreshness(now ?? new Date()), [now]);
  const config = POOL_CONFIG[pool.label];

  // Fetch Play Store rankings on mount
  const [rankings, setRankings] = useState<RankingsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLatestRankings().then((data) => {
      if (!cancelled) setRankings(data);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      {/* Existing Pool Freshness card */}
      <motion.div
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h2 className="mb-4 text-lg font-semibold text-white">
          Etat du pool
        </h2>

        {/* Main indicator */}
        <div className="flex items-center gap-4">
          <span className="text-3xl">{config.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-sm font-semibold"
                style={{ backgroundColor: config.bg, color: config.color }}
              >
                {pool.labelFr}
              </span>
              <span className="text-sm text-gray-500">
                {pool.netGrowth}/100
              </span>
            </div>
            <p className="mt-1.5 text-sm text-gray-400">
              {pool.message}
            </p>
          </div>
        </div>

        {/* Bars */}
        <div className="mt-5 space-y-3">
          {/* Installs bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">Nouveaux profils</span>
              <span className="font-medium text-green-400">{pool.installs}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-green-500"
                initial={{ width: 0 }}
                animate={{ width: `${pool.installs}%` }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
            </div>
          </div>

          {/* Churn bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">Departs</span>
              <span className="font-medium text-red-400">{pool.churn}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-red-500"
                initial={{ width: 0 }}
                animate={{ width: `${pool.churn}%` }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            </div>
          </div>

          {/* Net growth bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">Qualite du pool</span>
              <span className="font-medium" style={{ color: config.color }}>
                {pool.netGrowth}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: config.barColor }}
                initial={{ width: 0 }}
                animate={{ width: `${pool.netGrowth}%` }}
                transition={{ duration: 0.8, delay: 0.6 }}
              />
            </div>
          </div>
        </div>

        {/* Source */}
        <p className="mt-4 text-[10px] text-gray-600">
          Source : Adjust Benchmarks 2024, Sensor Tower France 2024-2025
        </p>
      </motion.div>

      {/* Play Store Trends card — only shown when data with trends is available */}
      <AnimatePresence>
        {rankings && rankings.apps && Object.keys(rankings.apps).length > 0 &&
          RANKED_APPS.some((k) => rankings.apps[k]?.trend && rankings.apps[k]?.trend !== "stable") && (
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.45 }}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Tendance telechargements
              </h2>
              {rankings.updated && (
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-gray-500">
                  {formatUpdatedAgo(rankings.updated)}
                </span>
              )}
            </div>

            {/* App trends list */}
            <div className="space-y-2">
              {RANKED_APPS.map((appKey, index) => {
                const app: AppRanking | undefined = rankings.apps[appKey];
                if (!app || !app.trend || app.trend === "stable") return null;

                const isUp = app.trend === "up";

                return (
                  <motion.div
                    key={appKey}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-2.5"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.07 }}
                  >
                    {/* Trend icon */}
                    <span className={`text-sm font-bold ${isUp ? "text-green-400" : "text-red-400"}`}>
                      {isUp ? "\u25B2" : "\u25BC"}
                    </span>

                    {/* App name */}
                    <span className="flex-1 text-sm font-medium text-white">
                      {APP_DISPLAY_NAMES[appKey] ?? appKey}
                    </span>

                    {/* Trend label */}
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                      isUp
                        ? "bg-green-500/15 text-green-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>
                      {isUp ? "Plus de telechargements" : "Moins de telechargements"}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Source */}
            <p className="mt-3 text-[10px] text-gray-600">
              Source : Google Play Store France — tendance sur 7 jours
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
