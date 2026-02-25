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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Home() {
  const [app, setApp] = useState<AppName>("tinder");
  const [now, setNow] = useState(new Date());
  const [result, setResult] = useState<ScoreResult>(() => computeScore(new Date(), "tinder"));

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
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:pt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-transparent" />
        <div className="relative mx-auto max-w-4xl">
          {/* Title */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                DatePulse
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-lg text-gray-400">
              C'est le bon moment pour swiper ?
            </p>
          </motion.div>

          {/* App selector */}
          <div className="mt-8 flex justify-center">
            <AppSelector selected={app} onChange={setApp} />
          </div>

          {/* Score display */}
          <div className="mt-10 flex flex-col items-center gap-6">
            <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
              {capitalize(app)} — {formatParisDay(now)} — {formatParisTime(now)} (heure de Paris)
            </p>
            <ScoreGauge score={result.score} />
            <ScoreLabel score={result.score} event={result.event} app={app} now={now} />
            <CountdownNext app={app} />
          </div>
        </div>
      </section>

      {/* ── Heatmap + Best Times ─────────────────────── */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Heatmap (2/3) */}
            <motion.div
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="mb-4 text-lg font-semibold text-white">
                Activite de la semaine — {capitalize(app)}
              </h2>
              <HeatmapWeek now={now} app={app} />
            </motion.div>

            {/* Right column: Best times + Pool freshness */}
            <div className="flex flex-col gap-6">
              <motion.div
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="mb-4 text-lg font-semibold text-white">
                  Meilleurs creneaux
                </h2>
                <BestTimes now={now} app={app} />
              </motion.div>

              {/* Pool freshness */}
              <PoolFreshness now={now} />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold">
            Comment ca marche
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
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
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {step.num}
                </div>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology teaser ───────────────────────── */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-brand-900/20 p-8 text-center">
          <h2 className="text-xl font-bold">Donnees 100% transparentes</h2>
          <p className="mt-3 text-sm text-gray-400">
            Nous n'inventons rien. Chaque app a ses propres patterns d'activite,
            calibres sur les publications officielles (Tinder Year in Swipe,
            Hinge Blog, Bumble PR) et les etudes tierces (Nielsen, Ogury).
          </p>
          <a
            href="/methodology"
            className="mt-5 inline-block rounded-lg bg-white/5 px-6 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10"
          >
            Voir la methodologie
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-white/5 px-4 py-8">
        <div className="mx-auto max-w-4xl text-center text-sm text-gray-600">
          <p>
            Construit sur des donnees publiques. Independant.
          </p>
        </div>
      </footer>
    </div>
  );
}
