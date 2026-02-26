import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { computeScore } from "../lib/scoring";
import type { ScoreResult } from "../lib/scoring";
import type { AppName } from "../lib/data";
import { formatParisDay, formatParisTime } from "../lib/franceTime";
import ScoreGauge from "../components/ScoreGauge";
import ScoreLabel from "../components/ScoreLabel";
import AppSelector from "../components/AppSelector";
import HeatmapWeek from "../components/HeatmapWeek";
import BestTimes from "../components/BestTimes";
import CountdownNext from "../components/CountdownNext";
import PoolFreshness from "../components/PoolFreshness";
import MatchTrackerInline from "../components/MatchTrackerInline";

const TRIGGER_URL = "http://localhost:5555/trigger";
const SWIPEABLE_APPS = new Set(["tinder", "bumble"]);

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Home() {
  const [app, setApp] = useState<AppName>("tinder");
  const [now, setNow] = useState(new Date());
  const [result, setResult] = useState<ScoreResult>(() => computeScore(new Date(), "tinder"));
  const [triggerStatus, setTriggerStatus] = useState<"idle" | "launching" | "ok" | "error">("idle");

  // Recompute when app changes
  useEffect(() => {
    setResult(computeScore(now, app));
  }, [app, now]);

  // Refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNow(d);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:pb-16 sm:pt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-transparent" />
        <div className="relative mx-auto max-w-4xl">
          {/* Title */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                DatePulse
              </span>
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-base sm:text-lg text-gray-400">
              C'est le bon moment pour swiper ?
            </p>
          </motion.div>

          {/* App selector */}
          <motion.div
            className="mt-6 sm:mt-8 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <AppSelector selected={app} onChange={setApp} />
          </motion.div>

          {/* Score display */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-4 sm:gap-6">
            <motion.p
              className="text-xs sm:text-sm font-medium uppercase tracking-wider text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {capitalize(app)} — {formatParisDay(now)} — {formatParisTime(now)} (heure de Paris)
            </motion.p>
            <ScoreGauge score={result.score} />
            <ScoreLabel score={result.score} event={result.event} app={app} now={now} />
            <CountdownNext app={app} />

            {/* Auto Swiper launch button (Tinder & Bumble only) */}
            {SWIPEABLE_APPS.has(app) && <motion.button
              onClick={async () => {
                setTriggerStatus("launching");
                try {
                  const res = await fetch(TRIGGER_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ app }),
                  });
                  if (res.ok) {
                    setTriggerStatus("ok");
                  } else {
                    setTriggerStatus("error");
                  }
                } catch {
                  setTriggerStatus("error");
                }
                setTimeout(() => setTriggerStatus("idle"), 5000);
              }}
              disabled={triggerStatus === "launching"}
              className="mt-2 sm:mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-pink-500 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-brand-500/40 hover:brightness-110 active:scale-95 disabled:opacity-50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M2 10a.75.75 0 0 1 .75-.75h12.59l-2.1-1.95a.75.75 0 1 1 1.02-1.1l3.5 3.25a.75.75 0 0 1 0 1.1l-3.5 3.25a.75.75 0 1 1-1.02-1.1l2.1-1.95H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
              </svg>
              {triggerStatus === "launching"
                ? "Lancement en cours..."
                : triggerStatus === "ok"
                  ? "Auto Swiper lance !"
                  : triggerStatus === "error"
                    ? "Erreur — serveur local actif ?"
                    : `Lancer Auto Swiper — ${capitalize(app)}`}
            </motion.button>}
          </div>
        </div>
      </section>

      {/* ── Heatmap + Best Times ─────────────────────── */}
      <section className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Heatmap (2/3) */}
            <motion.div
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 lg:col-span-2"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-white">
                Activite de la semaine — {capitalize(app)}
              </h2>
              <HeatmapWeek now={now} app={app} />
            </motion.div>

            {/* Right column: Best times + Pool freshness */}
            <div className="flex flex-col gap-4 sm:gap-6">
              <motion.div
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-white">
                  Meilleurs creneaux
                </h2>
                <BestTimes now={now} app={app} />
              </motion.div>

              {/* Pool freshness */}
              <PoolFreshness now={now} />
            </div>
          </div>

          {/* Match Tracker — full width below the grid */}
          <div className="mt-4 sm:mt-6">
            <MatchTrackerInline currentApp={app} />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            className="mb-8 sm:mb-10 text-center text-xl sm:text-2xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Comment ca marche
          </motion.h2>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
            {[
              {
                num: "1",
                title: "On agrege",
                desc: "Publications officielles de Tinder, Bumble, Hinge + etudes Nielsen, Ogury, SwipeStats",
              },
              {
                num: "2",
                title: "On calcule",
                desc: "Score par app : heure x jour x mois x evenements. Calibre sur les donnees publiees par chaque app.",
              },
              {
                num: "3",
                title: "Tu agis",
                desc: "Ouvre ton app au meilleur moment. Plus d'activite = plus de matches.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 text-center"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                whileHover={{ scale: 1.03, borderColor: "rgba(255,255,255,0.2)" }}
              >
                <div className="mx-auto mb-3 sm:mb-4 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/30">
                  {step.num}
                </div>
                <h3 className="mb-1.5 sm:mb-2 font-semibold text-sm sm:text-base">{step.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology teaser ───────────────────────── */}
      <section className="px-4 py-8 sm:py-12">
        <motion.div
          className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-brand-900/20 p-6 sm:p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          <h2 className="text-lg sm:text-xl font-bold">Donnees 100% transparentes</h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-400 leading-relaxed">
            Nous n'inventons rien. Chaque app a ses propres patterns d'activite,
            calibres sur les publications officielles (Tinder Year in Swipe,
            Hinge Blog, Bumble PR) et les etudes tierces (Nielsen, Ogury).
          </p>
          <a
            href="/methodology"
            className="mt-4 sm:mt-5 inline-block rounded-lg bg-white/5 px-5 sm:px-6 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10 hover:text-white"
          >
            Voir la methodologie
          </a>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-white/5 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-gray-500">
          <p>
            Construit sur des donnees publiques. Independant.
          </p>
        </div>
      </footer>
    </div>
  );
}
