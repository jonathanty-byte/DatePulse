import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import NavBar from "../components/NavBar";
import { computeScore } from "../lib/scoring";
import type { AppName } from "../lib/data";

const TrailerPlayer = lazy(() => import("../components/TrailerPlayer"));

const SUPPORTED_APPS: { name: string; color: string }[] = [
  { name: "Tinder", color: "#ec4899" },
  { name: "Hinge", color: "#8b5cf6" },
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

// ── Report showcase: CSS mockup visualizations ──────────────────

function FunnelPreview() {
  const steps = [
    { label: "Swipes", value: "12,847", pct: 100, color: "#6366f1" },
    { label: "Matchs", value: "847", pct: 38, color: "#8b5cf6" },
    { label: "Conversations", value: "312", pct: 16, color: "#a78bfa" },
  ];
  return (
    <div className="space-y-2.5">
      {steps.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 w-24 text-right font-medium">{s.label}</span>
          <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full flex items-center justify-end px-3"
              style={{ backgroundColor: s.color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${s.pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="text-[11px] font-bold text-white">{s.value}</span>
            </motion.div>
          </div>
        </div>
      ))}
      <div className="flex justify-between px-1 pt-1">
        <span className="text-[10px] text-indigo-500 font-semibold">Match rate: 6.6%</span>
        <span className="text-[10px] text-slate-400">Conv. rate: 36.8%</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-1 text-center">187h investies sur les apps</p>
    </div>
  );
}

function HeatmapPreview() {
  const data = [
    [0.05, 0.1, 0.3, 0.7, 0.9, 0.4],
    [0.05, 0.15, 0.4, 0.8, 0.95, 0.5],
    [0.05, 0.2, 0.5, 0.75, 0.85, 0.4],
    [0.05, 0.15, 0.4, 0.8, 0.9, 0.5],
    [0.1, 0.25, 0.5, 0.85, 1.0, 0.6],
    [0.2, 0.4, 0.7, 0.95, 1.0, 0.7],
    [0.2, 0.35, 0.6, 0.9, 0.95, 0.6],
  ];
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  const hours = ["6h", "10h", "14h", "18h", "21h", "0h"];

  return (
    <div>
      <div className="flex gap-[3px] mb-1 ml-6">
        {hours.map((h) => (
          <span key={h} className="flex-1 text-[9px] text-slate-400 text-center">{h}</span>
        ))}
      </div>
      <div className="space-y-[3px]">
        {data.map((row, i) => (
          <div key={i} className="flex items-center gap-[3px]">
            <span className="w-5 text-[9px] text-slate-400 text-right font-medium">{days[i]}</span>
            {row.map((v, j) => (
              <motion.div
                key={j}
                className="flex-1 h-5 rounded-sm"
                style={{ backgroundColor: `rgba(59, 130, 246, ${v})` }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (i * 6 + j) * 0.02 }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 mt-2.5">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-blue-100" />
          <span className="text-[9px] text-slate-400">Calme</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-blue-500" />
          <span className="text-[9px] text-slate-400">Pic</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-blue-700" />
          <span className="text-[9px] text-slate-400">Optimal</span>
        </div>
      </div>
    </div>
  );
}

function ConversationPreview() {
  return (
    <div className="space-y-3">
      <div className="flex justify-center mb-1">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
          67% — Au-dessus de la moyenne
        </span>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Ghost rate</span>
          <span className="font-bold text-amber-600">67%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
            initial={{ width: 0 }}
            whileInView={{ width: "67%" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Reponse en &lt;1h</span>
          <span className="font-bold text-emerald-600">34%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500"
            initial={{ width: 0 }}
            whileInView={{ width: "34%" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          />
        </div>
      </div>
      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Messages envoyes</span>
          <span className="font-semibold text-slate-700">1,247</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Temps moyen de reponse</span>
          <span className="font-semibold text-slate-700">4h12</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Ratio msg envoyes/recus</span>
          <span className="font-semibold text-slate-700">1.3x</span>
        </div>
      </div>
    </div>
  );
}

function SurvivalPreview() {
  const data = [100, 58, 34, 22, 18, 15, 13, 12];
  const w = 280;
  const h = 120;
  const pad = { top: 10, right: 10, bottom: 18, left: 30 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const toX = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
  const toY = (v: number) => pad.top + (1 - v / 100) * plotH;

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");
  const areaPath = linePath + ` L${toX(data.length - 1)},${toY(0)} L${toX(0)},${toY(0)} Z`;

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
        {/* Red danger zone (messages 1-3) */}
        <rect x={toX(0)} y={pad.top} width={toX(2) - toX(0)} height={plotH} fill="rgba(239, 68, 68, 0.08)" />
        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="rgba(239, 68, 68, 0.1)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        />
        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {/* Dots */}
        {data.map((v, i) => (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={i < 3 ? 3.5 : 2.5} fill={i < 3 ? "#ef4444" : "#94a3b8"} />
        ))}
        {/* X labels */}
        {data.map((_, i) => (
          <text key={i} x={toX(i)} y={h - 4} textAnchor="middle" fontSize={8} fill="#94a3b8" fontFamily="system-ui">
            {i + 1}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-3 mt-2">
        <span className="flex items-center gap-1 text-[9px] text-red-500 font-semibold">
          <span className="inline-block w-2 h-2 rounded-sm bg-red-100 border border-red-300" />
          Zone critique
        </span>
        <span className="text-[10px] font-semibold text-red-500">66% perdus avant le 3e message</span>
      </div>
    </div>
  );
}

function VerdictPreview() {
  const rings = [
    { label: "Questions", value: 8, color: "#6366f1" },
    { label: "Reactivite", value: 14, color: "#3b82f6" },
    { label: "Openers", value: 5, color: "#f43f5e" },
    { label: "Escalation", value: 9, color: "#f59e0b" },
    { label: "Equilibre", value: 6, color: "#10b981" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5">
        <div className="shrink-0">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-200 flex flex-col items-center justify-center border-4 border-amber-300/50">
            <span className="text-2xl font-black text-amber-700 leading-none">42</span>
            <span className="text-[9px] text-amber-500 font-medium">/100</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Marge de progression identifiee</div>
          <div className="text-base font-bold text-slate-900">5 axes concrets pour remonter</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            "Des leviers clairs pour ameliorer ton profil, tes conversations et ton timing."
          </p>
        </div>
      </div>
      <div className="flex justify-between gap-1">
        {rings.map((ring) => {
          const pct = (ring.value / 20) * 100;
          const r = 14;
          const circ = 2 * Math.PI * r;
          const dashOffset = circ * (1 - pct / 100);
          return (
            <div key={ring.label} className="flex flex-col items-center gap-0.5">
              <svg width={36} height={36} viewBox="0 0 36 36">
                <circle cx={18} cy={18} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3} />
                <circle
                  cx={18} cy={18} r={r} fill="none"
                  stroke={ring.color} strokeWidth={3}
                  strokeDasharray={circ} strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
                <text x={18} y={19} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill="#334155" fontFamily="system-ui">
                  {ring.value}
                </text>
              </svg>
              <span className="text-[8px] text-slate-400 leading-none">{ring.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyPreview() {
  const months = [
    { label: "Jan", h: 95 },
    { label: "Fev", h: 78 },
    { label: "Mar", h: 65 },
    { label: "Avr", h: 55 },
    { label: "Mai", h: 48 },
    { label: "Jun", h: 42 },
    { label: "Jul", h: 38 },
    { label: "Aou", h: 35 },
    { label: "Sep", h: 60 },
    { label: "Oct", h: 72 },
    { label: "Nov", h: 58 },
    { label: "Dec", h: 45 },
  ];
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: 96 }}>
        {months.map((m, i) => {
          const color =
            m.h > 70 ? "#f43f5e" : m.h >= 50 ? "#fb923c" : "#e2e8f0";
          return (
            <div key={m.label} className="flex-1 flex flex-col items-end justify-end h-full">
              <motion.div
                className="w-full rounded-t-sm"
                style={{ backgroundColor: color, height: `${m.h}%` }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {months.map((m) => (
          <span key={m.label} className="flex-1 text-[8px] text-slate-400 text-center leading-none">{m.label}</span>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-rose-500 mt-2.5 text-center">
        Meilleur mois: Janvier — 10 matchs
      </p>
    </div>
  );
}

function ArchetypePreview() {
  const traits = ["Selectif", "Regulier", "Strategique"];
  return (
    <div className="flex flex-col items-center text-center space-y-2.5">
      <motion.div
        className="text-5xl"
        initial={{ scale: 0, rotate: -20 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
      >
        ♟️
      </motion.div>
      <div>
        <div className="text-[10px] text-violet-500 font-semibold uppercase tracking-wider">Ton archetype</div>
        <div className="text-base font-bold text-slate-900 mt-0.5">Le Stratege Selectif</div>
      </div>
      <div className="flex gap-1.5">
        {traits.map((t, i) => (
          <motion.span
            key={t}
            className="rounded-full px-2.5 py-1 text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-200"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            {t}
          </motion.span>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px]">
        Tu sais ce que tu veux et tu ne perds pas de temps.
      </p>
    </div>
  );
}

function RecommendationsPreview() {
  const recos = [
    { problem: "Openers trop courts (32 car.)", action: "Vise 60+ caracteres", color: "#ef4444" },
    { problem: "Reponse trop rapide (4 min)", action: "Attends 15-30 min", color: "#f59e0b" },
    { problem: "Escalation tardive (msg #18)", action: "Propose un date au msg 8-12", color: "#10b981" },
  ];
  return (
    <div className="space-y-2">
      {recos.map((r, i) => (
        <motion.div
          key={i}
          className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12, duration: 0.4 }}
        >
          <div className="w-1 h-full min-h-[28px] rounded-full shrink-0 mt-0.5" style={{ backgroundColor: r.color }} />
          <div>
            <div className="text-[11px] font-semibold text-slate-700">{r.problem}</div>
            <div className="text-[10px] font-medium mt-0.5" style={{ color: r.color }}>→ {r.action}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const SHOWCASE = [
  {
    title: "Funnel complet",
    subtitle: "Swipes, matchs, conversations — ton vrai taux de conversion",
    accent: "#6366f1",
    Preview: FunnelPreview,
    wide: true,
  },
  {
    title: "Timing optimal",
    subtitle: "Tes meilleurs creneaux jour par jour",
    accent: "#3b82f6",
    Preview: HeatmapPreview,
  },
  {
    title: "Conversations",
    subtitle: "Ghost rate, tempo, equilibre des messages",
    accent: "#f59e0b",
    Preview: ConversationPreview,
  },
  {
    title: "Courbe de survie",
    subtitle: "Combien de conversations survivent apres chaque message",
    accent: "#ef4444",
    Preview: SurvivalPreview,
  },
  {
    title: "Ton archetype",
    subtitle: "Ton profil comportemental de dating identifie par IA",
    accent: "#8b5cf6",
    Preview: ArchetypePreview,
  },
  {
    title: "Recommandations personnalisees",
    subtitle: "Des actions concretes basees sur TES donnees",
    accent: "#10b981",
    Preview: RecommendationsPreview,
  },
  {
    title: "Evolution mensuelle",
    subtitle: "Tes performances mois par mois sur toute la periode",
    accent: "#f43f5e",
    Preview: MonthlyPreview,
  },
  {
    title: "Verdict personnalise",
    subtitle: "Ton score global et 5 axes de progression",
    accent: "#f59e0b",
    Preview: VerdictPreview,
    wide: true,
  },
];

// ── Feature list ────────────────────────────────────────────────

const REPORT_FEATURES = [
  "Funnel complet likes → matchs → conversations",
  "Heatmap jour/heure de tes matchs",
  "Ghost rate et causes identifiees",
  "Impact reel de tes boosts et super likes",
  "Score conversationnel sur 6 dimensions",
  "Radar chart ADN Dating personnalise",
  "ROI de tes abonnements premium",
  "Archetype comportemental de swipe",
  "Evolution mensuelle detaillee",
  "Plan d'action personnalise",
  "Image partageable de tes stats",
  "90+ hypotheses testees sur TES donnees",
];

// ── Remotion Trailer (lazy-loaded) ──────────────────────────────

// ── Page ────────────────────────────────────────────────────────

export default function Home() {
  const [liveScore, setLiveScore] = useState<number>(0);
  const [liveApp] = useState<AppName>("tinder");
  const [showTrailer, setShowTrailer] = useState(true);

  useEffect(() => {
    const update = () => setLiveScore(computeScore(new Date(), liveApp).score);
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [liveApp]);

  const handleTrailerEnd = () => {
    setShowTrailer(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      {showTrailer && (
        <div className="fixed inset-0 z-50 bg-[#f8f9fc]">
          <Suspense fallback={
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-slate-400 text-sm">Chargement...</div>
            </div>
          }>
            <TrailerPlayer onEnd={handleTrailerEnd} />
          </Suspense>
        </div>
      )}
      <NavBar />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
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
              { icon: "📱", text: "2 apps supportees" },
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

      {/* ── REPORT SHOWCASE ──────────────────────────── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-4"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Ce que ton rapport revele
              </span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
              8 chapitres, 90+ analyses statistiques, un verdict personnalise.
              Voici un apercu avec de vraies donnees Tinder.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {SHOWCASE.map((item, i) => (
              <motion.div
                key={item.title}
                className={`rounded-2xl border border-gray-200/60 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow ${
                  item.wide ? "sm:col-span-2" : ""
                }`}
                style={{ borderLeftWidth: 4, borderLeftColor: item.accent }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                </div>
                <item.Preview />
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-10 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <a
              href="/wrapped"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-10 py-4 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 hover:shadow-brand-500/40"
            >
              Voir mon rapport personnalise
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <p className="mt-3 text-xs text-slate-400">
              Upload ton fichier RGPD — tes vrais chiffres remplacent cet exemple
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20 border-t border-gray-100">
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

      {/* ── WHAT'S INCLUDED ──────────────────────────── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50/50 to-purple-50/50 p-6 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">Ce que ton rapport contient</h2>
            <p className="text-xs text-slate-400 mb-5">Genere automatiquement a partir de ton export RGPD</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {REPORT_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-sm text-slate-600">{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
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
            DatePulse — Swipe au bon moment.
          </p>
          <p>
            <a href="/" className="hover:text-slate-700 transition">Accueil</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/wrapped" className="hover:text-slate-700 transition">Wrapped</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/score" className="hover:text-slate-700 transition">Score</a>
          </p>
          <p className="text-slate-300">
            Aucune donnee personnelle stockee sur nos serveurs.
          </p>
        </div>
      </footer>
    </div>
  );
}
