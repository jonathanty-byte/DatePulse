import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NavBar from "../components/NavBar";
import { computeScore } from "../lib/scoring";
import type { AppName } from "../lib/data";

const SUPPORTED_APPS: { name: string; color: string }[] = [
  { name: "Tinder", color: "#ec4899" },
  { name: "Bumble", color: "#f59e0b" },
  { name: "Hinge", color: "#8b5cf6" },
  { name: "Happn", color: "#f97316" },
];

const FEATURES = [
  {
    href: "/wrapped",
    tag: "Wrapped",
    tagColor: "#ec4899",
    title: "Dating Wrapped",
    desc: "Upload tes donnees Tinder / Bumble / Hinge et decouvre tes vrais stats : swipes, matches, ghost rate, timing optimal...",
    cta: "Analyser mes donnees",
    highlight: true,
  },
  {
    href: "/score",
    tag: "Live",
    tagColor: "#22c55e",
    title: "Score en temps reel",
    desc: "Scores d'activite minute par minute. Meteo, tendances Google, evenements — tout est integre.",
    cta: "Voir le score",
  },
  {
    href: "/insights",
    tag: "Insights",
    tagColor: "#6366f1",
    title: "Insights Dating",
    desc: "90 hypotheses testees sur de vraies donnees. Decouvre ce qui marche vraiment.",
    cta: "Explorer les insights",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Demande tes donnees",
    desc: "Chaque app de dating doit te fournir tes donnees. Ca prend 2 jours.",
    icon: "📩",
  },
  {
    num: "2",
    title: "Upload sur DatePulse",
    desc: "Glisse ton fichier JSON ou ZIP. Tout est analyse dans ton navigateur, rien ne quitte ton appareil.",
    icon: "📊",
  },
  {
    num: "3",
    title: "Decouvre tes stats",
    desc: "Swipes, matches, ghost rate, timing optimal, score ELO estime — tout est la.",
    icon: "🔍",
  },
];

export default function Home() {
  const [liveScore, setLiveScore] = useState<number>(0);
  const [liveApp] = useState<AppName>("tinder");

  // Live score ticker for social proof
  useEffect(() => {
    const update = () => setLiveScore(computeScore(new Date(), liveApp).score);
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [liveApp]);

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Subtle gradient bg */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15), transparent)",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-600"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Score live Tinder : {liveScore}/100
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.04em] leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Tes donnees de dating{" "}
            <span className="bg-gradient-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              racontent une histoire
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-slate-500 leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            Decouvre ce que tes apps ne te montrent pas.
            Demande tes donnees (1-3 jours), l'analyse prend 2 minutes.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <a
              href="/wrapped"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 hover:shadow-brand-500/40"
            >
              Analyser mes donnees
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href="/insights"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-300 bg-white px-6 py-3.5 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50 hover:border-brand-400"
            >
              Voir un exemple
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href="/score"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-gray-50 hover:text-slate-900"
            >
              Voir le score live
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {[
              { icon: "🔒", text: "100% client-side" },
              { icon: "🚫", text: "0 donnee stockee" },
              { icon: "📱", text: "4 apps supportees" },
              { icon: "⚡", text: "Analyse en 2 min" },
            ].map((b) => (
              <span
                key={b.text}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400"
              >
                <span>{b.icon}</span>
                {b.text}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── APPS SUPPORTED ────────────────────────────── */}
      <section className="border-y border-gray-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-8 sm:gap-12">
          {SUPPORTED_APPS.map((app) => (
            <span
              key={app.name}
              className="text-sm font-bold tracking-wide"
              style={{ color: app.color }}
            >
              {app.name}
            </span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            className="mb-10 text-center text-xl sm:text-2xl font-extrabold tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Comment ca marche
          </motion.h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative border border-gray-200 bg-white p-6 sm:p-8 text-center shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <span className="mb-4 block text-3xl">{step.icon}</span>
                <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                  {step.num}
                </div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">{step.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────── */}
      <section className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            className="mb-8 text-center text-xl sm:text-2xl font-extrabold tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Tout ce dont tu as besoin
          </motion.h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.a
                key={f.href}
                href={f.href}
                className={`group relative overflow-hidden border bg-white p-6 sm:p-8 transition hover:shadow-lg ${
                  f.highlight
                    ? "border-brand-200 sm:col-span-2 shadow-md"
                    : "border-gray-200 shadow-sm"
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                {f.highlight && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{
                      background: `linear-gradient(135deg, ${f.tagColor}, transparent 60%)`,
                    }}
                  />
                )}
                <div
                  className="text-[10px] font-bold tracking-[0.15em] uppercase"
                  style={{ color: f.tagColor }}
                >
                  {f.tag}
                </div>
                <h3 className={`mt-2 font-bold text-slate-900 ${f.highlight ? "text-xl sm:text-2xl" : "text-lg"}`}>
                  {f.title}
                </h3>
                <p className={`mt-2 text-slate-500 leading-relaxed ${f.highlight ? "text-sm sm:text-base max-w-xl" : "text-sm"}`}>
                  {f.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 group-hover:text-brand-600 transition">
                  {f.cta}
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY CTA ───────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            className="border border-gray-200 bg-white p-8 sm:p-12 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-4xl">🔒</span>
            <h2 className="mt-4 text-xl sm:text-2xl font-extrabold">
              Tes donnees restent chez toi
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed">
              Tout est analyse directement dans ton navigateur. Aucun fichier n'est envoye a un serveur.
              Aucune donnee personnelle n'est stockee. Zero tracking, zero compte, zero bullshit.
            </p>
            <a
              href="/wrapped"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
            >
              Commencer l'analyse
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="border-t border-gray-200 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-slate-400 space-y-2">
          <p className="font-medium text-slate-500">
            DatePulse — Swipe when it matters.
          </p>
          <p>
            <a href="/" className="hover:text-slate-700 transition">Accueil</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/wrapped" className="hover:text-slate-700 transition">Wrapped</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/score" className="hover:text-slate-700 transition">Score</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/insights" className="hover:text-slate-700 transition">Insights</a>
          </p>
          <p className="text-slate-300">
            Aucune donnee personnelle stockee sur nos serveurs.
          </p>
        </div>
      </footer>
    </div>
  );
}
