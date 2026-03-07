import { motion } from "framer-motion";
import NavBar from "../components/NavBar";
import {
  ChapterBlock,
  ChapterInterstitial,
  fadeIn,
} from "../components/SharedInsightComponents";

// ── Chapter icon SVGs (matching WrappedReport) ──────────────────

const sz = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Icons = {
  overview: <svg {...sz}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  timing: <svg {...sz}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>,
  conversion: <svg {...sz}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
  conversations: <svg {...sz}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  dna: <svg {...sz}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  pulse: <svg {...sz}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  swipe: <svg {...sz}><path d="M14 9V5a3 3 0 00-6 0v4" /><path d="M18 8h-1a3 3 0 00-3 3v0" /><rect x="5" y="9" width="14" height="12" rx="2" /></svg>,
};

// ── Preview chapters ────────────────────────────────────────────

const CHAPTERS = [
  {
    number: 1,
    title: "Vue d'ensemble",
    subtitle: "Tes chiffres cles en un coup d'oeil",
    icon: Icons.overview,
    accent: "#6366f1",
    bg: "bg-slate-50/60",
    previews: ["Swipes totaux, matchs, taux de conversion", "Funnel complet : likes → matchs → conversations", "Comparaison avec les benchmarks du marche"],
  },
  {
    number: 2,
    title: "Timing & Strategie",
    subtitle: "Quand tu performes le mieux",
    icon: Icons.timing,
    accent: "#3b82f6",
    bg: "bg-blue-50/60",
    previews: ["Heatmap jour × heure de tes meilleurs matchs", "Evolution mensuelle de ton activite", "Creneaux optimaux personnalises"],
  },
  {
    number: 3,
    title: "Conversion & Investissement",
    subtitle: "Ce qui marche et ce qui coute",
    icon: Icons.conversion,
    accent: "#f43f5e",
    bg: "bg-rose-50/60",
    previews: ["Impact reel de tes boosts et super likes", "ROI de tes abonnements premium", "Match rate avant vs apres chaque investissement"],
  },
  {
    number: 4,
    title: "Conversations",
    subtitle: "Pourquoi certaines conversations meurent",
    icon: Icons.conversations,
    accent: "#f59e0b",
    bg: "bg-amber-50/60",
    previews: ["Ghost rate et causes identifiees", "Temps de reponse moyen et son impact", "Equilibre des messages dans tes echanges"],
  },
  {
    number: 5,
    title: "ADN Dating & Verdict",
    subtitle: "Ton profil comportemental complet",
    icon: Icons.dna,
    accent: "#8b5cf6",
    bg: "bg-violet-50/60",
    previews: ["Radar chart de tes forces et faiblesses", "Archetype comportemental personnalise", "Plan d'action base sur tes donnees reelles"],
  },
];

const PREMIUM_CHAPTERS = [
  {
    title: "Conversation Pulse",
    subtitle: "15 analyses conversationnelles avancees",
    icon: Icons.pulse,
    accent: "#10b981",
    sections: ["Analyse des openers", "Detection des patterns de ghost", "Impact des questions", "Equilibre et tempo", "Score conversationnel global"],
  },
  {
    title: "Swipe Pulse",
    subtitle: "5 analyses comportementales de swipe",
    icon: Icons.swipe,
    accent: "#06b6d4",
    sections: ["Fatigue de swipe", "Selectivite et ses effets", "Archetype de swiper", "Patterns temporels", "Correlations cachees"],
  },
];

// ── Blurred preview block ───────────────────────────────────────

function BlurredPreview({ items, accent }: { items: string[]; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Fake content — blurred */}
      <div className="filter blur-[6px] pointer-events-none select-none space-y-3 p-5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl" style={{ backgroundColor: `${accent}20` }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 rounded-full bg-slate-200" style={{ width: `${70 + (i * 10) % 30}%` }} />
              <div className="h-2.5 rounded-full bg-slate-100" style={{ width: `${50 + (i * 15) % 40}%` }} />
            </div>
            <div className="h-8 w-16 rounded-lg" style={{ backgroundColor: `${accent}15` }} />
          </div>
        ))}
        {/* Fake chart */}
        <div className="mt-2 flex items-end gap-1.5 h-20 px-2">
          {[40, 65, 55, 80, 45, 70, 90, 60, 75, 50, 85, 65].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: `${accent}30` }} />
          ))}
        </div>
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white/90 via-white/60 to-white/30 backdrop-blur-[1px]">
        <div className="text-center px-4">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-100">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Upload tes donnees pour debloquer</p>
          <p className="mt-1 text-xs text-slate-400">Tes stats personnalisees apparaitront ici</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────

export default function Insights() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />

      {/* Apercu badge */}
      <div className="border-b border-indigo-100 bg-indigo-50/50 px-4 py-3 text-center">
        <p className="text-xs sm:text-sm text-indigo-600 font-medium">
          Apercu du rapport premium — Upload tes donnees RGPD pour obtenir ton analyse personnalisee
        </p>
      </div>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-10 space-y-8">

        {/* ── Hero ── */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Voici ce que tes donnees revelent
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-500 leading-relaxed">
            7 chapitres, 90+ hypotheses testees, un verdict personnalise. Tout est genere a partir de ton export RGPD, 100% dans ton navigateur.
          </p>
          <a
            href="/wrapped"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 hover:shadow-brand-500/40"
          >
            Analyser mes donnees
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </motion.div>

        {/* ── Free chapters preview ── */}
        {CHAPTERS.map((ch, i) => (
          <motion.div key={ch.number} {...fadeIn(i * 0.08)}>
            <ChapterInterstitial
              number={ch.number}
              title={ch.title}
              subtitle={ch.subtitle}
              icon={ch.icon}
              accent={ch.accent}
            />
            <ChapterBlock id={`ch-${ch.number}`} bg={ch.bg} accent={ch.accent}>
              {/* Section descriptions */}
              <div className="space-y-2 mb-4">
                {ch.previews.map((p, j) => (
                  <div key={j} className="flex items-start gap-2.5">
                    <svg className="h-4 w-4 mt-0.5 shrink-0" style={{ color: ch.accent }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-sm text-slate-600">{p}</span>
                  </div>
                ))}
              </div>
              <BlurredPreview items={ch.previews} accent={ch.accent} />
            </ChapterBlock>
          </motion.div>
        ))}

        {/* ── Premium chapters teaser ── */}
        <motion.div {...fadeIn(0.1)} className="space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
              Premium
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Analyses approfondies
            </h2>
            <p className="text-sm text-slate-400">20 sections supplementaires debloquees avec tes donnees</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PREMIUM_CHAPTERS.map((pc) => (
              <div
                key={pc.title}
                className="rounded-2xl border border-gray-200/60 p-6 space-y-4"
                style={{ borderLeftWidth: 4, borderLeftColor: pc.accent, background: `${pc.accent}08` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex shrink-0 items-center justify-center w-9 h-9 rounded-lg text-white"
                    style={{ background: `linear-gradient(135deg, ${pc.accent}, ${pc.accent}cc)` }}
                  >
                    {pc.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{pc.title}</h3>
                    <p className="text-xs text-slate-400">{pc.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {pc.sections.map((s) => (
                    <div key={s} className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pc.accent }} />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Feature list ── */}
        <motion.div {...fadeIn(0.1)} className="rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50/50 to-purple-50/50 p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">Ce que ton rapport contient</h2>
          <p className="text-xs text-slate-400 mb-5">Genere automatiquement a partir de ton export RGPD</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
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
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <svg className="h-4 w-4 mt-0.5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm text-slate-600">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Final CTA ── */}
        <motion.div {...fadeIn(0.1)} className="text-center space-y-4 py-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Pret a decouvrir tes stats ?
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Upload ton fichier JSON ou ZIP. Tout est analyse dans ton navigateur — aucune donnee n'est envoyee a un serveur.
          </p>
          <a
            href="/wrapped"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-10 py-4 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 hover:shadow-brand-500/40"
          >
            Analyser mes donnees
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1">🔒 100% client-side</span>
            <span className="flex items-center gap-1">🚫 0 donnee stockee</span>
            <span className="flex items-center gap-1">⚡ 2 min</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
