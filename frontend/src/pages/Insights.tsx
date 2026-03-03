import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, Legend, AreaChart, Area, ReferenceArea,
} from "recharts";
import NavBar from "../components/NavBar";
import {
  HERO_STATS,
  CONVERSATION_SCORES,
  PROFILE_COMPARISON,
  TINDER_PROBLEMS,
  HINGE_QUICK_WINS,
  PHOTO_TIERS,
  CROSS_APP_ROI,
  OPENER_PATTERNS,
  TOPIC_RANKING,
  GHOST_CAUSES,
  BEST_CONVOS,
  MESSAGE_BALANCE,
  OPENER_LENGTH_BARS,
  QUESTION_DENSITY,
  TRIGGER_WORDS,
  WEEKLY_GRID,
  MONTHLY_INDEX,
  HINGE_MONTHLY,
  HINGE_HOURLY,
  RESPONSE_SPEED,
  TIMING_INSIGHTS,
  ELO_PROXY,
  SELECTIVITY_CLIFF,
  SHADOWBANS,
  ACTIVITY_LEVELS,
  SUBSCRIPTION_ROI,
  TINDER_MONTHLY_CHART,
  HINGE_MONTHLY_CHART,
  POST_CANCEL_SHADOWBANS,
  DARK_PATTERNS,
  BUDGET_OPTIMAL,
  PHOTO_STATS,
  BEARD_DATA,
  FRANCE_VS_US,
  HYPOTHESIS_THEMES,
  COSTLY_MISTAKES,
  TARGET_METRICS,
  TEN_COMMANDMENTS,
  SECTION_NARRATIVES,
  type Verdict,
  type Severity,
  type App,
  type BarData,
} from "../lib/insightsData";

// === ANIMATION HELPERS ===

// Scroll-triggered animation — the single most impactful premium change
const fadeIn = (delay: number = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.5 },
});

// Immediate animation for hero (above fold)
const fadeHero = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6 },
});

// === PREMIUM COMPONENTS ===

function AnimatedCounter({ target, duration = 1400, prefix = "", suffix = "", className = "" }: {
  target: number; duration?: number; prefix?: string; suffix?: string; className?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);
  return <span ref={ref} className={className}>{prefix}{count.toLocaleString("fr-FR")}{suffix}</span>;
}

function SpotlightCard({ value, label, sublabel, color, icon }: {
  value: React.ReactNode; label: string; sublabel?: string; color: string; icon?: string;
}) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8 text-center"
      style={{ background: `linear-gradient(135deg, ${color}10 0%, transparent 60%)`, borderColor: `${color}30` }}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {icon && <span className="absolute top-3 right-4 text-4xl opacity-[0.07]">{icon}</span>}
      <div className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color }}>{value}</div>
      <div className="mt-2 text-sm font-medium text-gray-300">{label}</div>
      {sublabel && <div className="mt-1 text-xs text-gray-500">{sublabel}</div>}
    </motion.div>
  );
}

function NarrativeIntro({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.p
      className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-3xl"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      {text}
    </motion.p>
  );
}

function ProgressRing({ value, max = 10, size = 60, label, color = "#6366f1" }: {
  value: number; max?: number; size?: number; label: string; color?: string;
}) {
  const strokeW = 4;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const pct = value / max;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} className="text-white/[0.06]" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: circ * (1 - pct) }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[80px]">{label}</span>
    </div>
  );
}

// === UTILITY COMPONENTS ===

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.02] p-5 ${className}`}>
      {children}
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cfg = {
    confirmed: { bg: "bg-green-500/20", text: "text-green-400", label: "Confirme", icon: "✓" },
    debunked: { bg: "bg-red-500/20", text: "text-red-400", label: "Refute", icon: "✗" },
    mixed: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Mixte", icon: "~" },
  }[verdict];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function AppTag({ app }: { app: App }) {
  const c = { tinder: "bg-pink-500/20 text-pink-400", hinge: "bg-violet-500/20 text-violet-400", both: "bg-brand-500/20 text-brand-400" }[app];
  const l = { tinder: "Tinder", hinge: "Hinge", both: "Both" }[app];
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${c}`}>{l}</span>;
}

function SeverityDot({ severity }: { severity: Severity }) {
  const c = { critical: "bg-red-500", warning: "bg-amber-500", good: "bg-green-500" }[severity];
  return <span className={`inline-block h-2 w-2 rounded-full ${c}`} />;
}

function ImpactDots({ impact }: { impact: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3].map((d) => (
        <span key={d} className={`h-1.5 w-1.5 rounded-full ${d <= impact ? "bg-brand-400" : "bg-gray-700"}`} />
      ))}
    </span>
  );
}

function MiniBar({ bars, maxOverride }: { bars: BarData[]; maxOverride?: number }) {
  const mx = maxOverride ?? Math.max(...bars.map((b) => b.value));
  return (
    <div className="space-y-1.5">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-[11px] text-gray-400 truncate">{b.label}</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: b.color || "#6366f1" }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(b.value / mx) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="w-10 text-right text-[11px] font-medium text-gray-300">{b.value}</span>
        </div>
      ))}
    </div>
  );
}

function ComparisonTable({ rows }: { rows: { metric: string; tinder: string; hinge: string; verdict?: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className="px-3 py-2 text-gray-300">Metrique</th>
            <th className="px-3 py-2 text-pink-400">Tinder</th>
            <th className="px-3 py-2 text-violet-400">Hinge</th>
            <th className="hidden px-3 py-2 text-gray-300 sm:table-cell">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metric} className="border-b border-white/5 last:border-0">
              <td className="px-3 py-1.5 text-gray-300">{r.metric}</td>
              <td className="px-3 py-1.5 text-pink-300">{r.tinder}</td>
              <td className="px-3 py-1.5 text-violet-300">{r.hinge}</td>
              <td className="hidden px-3 py-1.5 text-gray-500 sm:table-cell">{r.verdict}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpandToggle({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition">
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▸</span>{title}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionTitle({ emoji, title, subtitle, delay = 0 }: { emoji: string; title: string; subtitle?: string; delay?: number }) {
  return (
    <motion.div {...fadeIn(delay)} className="space-y-1">
      <h2 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
        <span className="text-3xl">{emoji}</span>
        <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{title}</span>
      </h2>
      {subtitle && <p className="text-xs text-gray-500 pl-12">{subtitle}</p>}
    </motion.div>
  );
}

// === SECTION NAV ===

const NAV_ITEMS = [
  { id: "hero", emoji: "📊", label: "Vue globale" },
  { id: "profile", emoji: "👤", label: "Profil" },
  { id: "conversations", emoji: "💬", label: "Conversations" },
  { id: "opener", emoji: "✉️", label: "Opener" },
  { id: "timing", emoji: "⏰", label: "Timing" },
  { id: "algorithm", emoji: "🎯", label: "Algorithme" },
  { id: "premium", emoji: "💎", label: "Premium" },
  { id: "photo", emoji: "📷", label: "Photo" },
  { id: "hypotheses", emoji: "🔬", label: "Hypotheses" },
  { id: "action", emoji: "🚀", label: "Plan" },
];

function SectionNav() {
  return (
    <div className="sticky top-[52px] z-40 -mx-4 bg-[#080b14]/90 backdrop-blur-md border-b border-white/5 px-4 py-2">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {NAV_ITEMS.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition hover:bg-white/[0.06] hover:text-gray-200"
          >
            <span>{n.emoji}</span>
            <span className="hidden sm:inline">{n.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// === PAGE ===

export default function Insights() {
  const [hypothesisFilter, setHypothesisFilter] = useState<string>("all");

  const filteredThemes = HYPOTHESIS_THEMES.map((t) => ({
    ...t,
    hypotheses: t.hypotheses.filter((h) =>
      hypothesisFilter === "all" ? true : hypothesisFilter === t.id ? true : h.verdict === hypothesisFilter
    ),
  })).filter((t) => t.hypotheses.length > 0);

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <NavBar />
      <main className="mx-auto max-w-5xl space-y-24 px-4 pb-20 pt-20">
        <SectionNav />

        {/* ========== HERO ========== */}
        <section id="hero" className="scroll-mt-28 space-y-8 pt-4">
          {/* Headline */}
          <motion.div {...fadeHero(0)} className="text-center space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                <AnimatedCounter target={552} className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" /> jours
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 font-medium">de dating decryptes, 50 hypotheses testees</p>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">{SECTION_NARRATIVES.hero}</p>
          </motion.div>

          {/* 3 big stat spotlight cards */}
          <motion.div {...fadeHero(0.2)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SpotlightCard
              value={<AnimatedCounter target={14468} className="text-4xl sm:text-5xl font-extrabold" />}
              label="likes envoyes" sublabel="Tinder + Hinge combines"
              color="#6366f1" icon="💜"
            />
            <SpotlightCard
              value={<AnimatedCounter target={129} className="text-4xl sm:text-5xl font-extrabold" />}
              label="matchs obtenus" sublabel="0.89% de conversion globale"
              color="#8b5cf6" icon="🔥"
            />
            <SpotlightCard
              value={<AnimatedCounter target={73} className="text-4xl sm:text-5xl font-extrabold" />}
              label="conversations" sublabel="57% des matchs exploites"
              color="#ec4899" icon="💬"
            />
          </motion.div>

          {/* Verdict bar */}
          <motion.div {...fadeHero(0.3)} className="space-y-2">
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              <div className="bg-green-500/80 transition-all" style={{ width: `${(28 / 50) * 100}%` }} />
              <div className="bg-red-500/80 transition-all" style={{ width: `${(12 / 50) * 100}%` }} />
              <div className="bg-amber-500/80 transition-all" style={{ width: `${(10 / 50) * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-400 font-medium">28 confirmees</span>
              <span className="text-red-400 font-medium">12 refutees</span>
              <span className="text-amber-400 font-medium">10 mixtes</span>
            </div>
          </motion.div>

          {/* Conversation score rings */}
          <motion.div {...fadeHero(0.4)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-5">Score conversationnel</h3>
              <div className="grid grid-cols-3 gap-6 sm:grid-cols-6 justify-items-center">
                {CONVERSATION_SCORES.map((s) => (
                  <ProgressRing
                    key={s.category}
                    value={s.score}
                    label={s.category}
                    color={s.score >= 8 ? "#22c55e" : s.score >= 6 ? "#6366f1" : "#f59e0b"}
                  />
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </section>

        {/* ========== PROFILE ========== */}
        <section id="profile" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="👤" title="Diagnostic Profil" />
          <NarrativeIntro text={SECTION_NARRATIVES.profile} />

          {/* ROI highlight */}
          <SpotlightCard
            value="8x"
            label="Hinge est 8x plus efficace que Tinder"
            sublabel="9 min par convo longue vs 75 min — en temps investi par resultat"
            color="#8b5cf6" icon="⚡"
          />

          {/* Comparison table */}
          <motion.div {...fadeIn(0.1)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Tinder vs Hinge — face a face</h3>
              <ComparisonTable rows={PROFILE_COMPARISON} />
            </GlassCard>
          </motion.div>

          {/* Problems + Quick Wins side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div {...fadeIn(0.15)}>
              <GlassCard className="border-red-500/20 h-full">
                <h3 className="text-sm font-semibold text-red-400 mb-3">Problemes Tinder</h3>
                <div className="space-y-3">
                  {TINDER_PROBLEMS.map((p) => (
                    <div key={p.title} className="flex items-start gap-2">
                      <SeverityDot severity={p.severity} />
                      <div>
                        <p className="text-xs font-medium text-gray-200">{p.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{p.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
            <motion.div {...fadeIn(0.2)}>
              <GlassCard className="border-green-500/20 h-full">
                <h3 className="text-sm font-semibold text-green-400 mb-3">Quick Wins Hinge</h3>
                <div className="space-y-3">
                  {HINGE_QUICK_WINS.map((q) => (
                    <div key={q.title}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-200">{q.title}</span>
                        <span className="text-[10px] text-green-400/70 bg-green-500/10 rounded px-1.5 py-0.5">{q.impact}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{q.detail}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Photo tiers */}
          <motion.div {...fadeIn(0.25)}>
            <ExpandToggle title="Photo ranking par tier (S/A/B/C)">
              <GlassCard>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {PHOTO_TIERS.map((t) => (
                    <div key={t.tier}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold" style={{ color: t.color }}>Tier {t.tier}</span>
                      </div>
                      {t.photos.map((p) => (
                        <div key={p.name} className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1">
                          <span>{p.emoji}</span><span>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </ExpandToggle>
          </motion.div>

          {/* Cross-app ROI */}
          <motion.div {...fadeIn(0.3)}>
            <ExpandToggle title="ROI detaille Tinder vs Hinge">
              <ComparisonTable rows={CROSS_APP_ROI} />
            </ExpandToggle>
          </motion.div>
        </section>

        {/* ========== CONVERSATIONS ========== */}
        <section id="conversations" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="💬" title="Conversations" />
          <NarrativeIntro text={SECTION_NARRATIVES.conversations} />

          {/* Ghost cause spotlight */}
          <SpotlightCard
            value={<><AnimatedCounter target={83} suffix="%" className="text-4xl sm:text-5xl font-extrabold" /></>}
            label="des ghosts Tinder = aucun sujet identifiable"
            sublabel="100% sur Hinge. La cause #1 du ghost n'est pas toi — c'est l'absence de sujet."
            color="#ef4444" icon="👻"
          />

          {/* Opener patterns */}
          <motion.div {...fadeIn(0.1)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Types d'openers — impact mesure</h3>
              <MiniBar bars={OPENER_PATTERNS.map((o) => ({ label: o.type, value: o.avgMsgs, color: o.color }))} />
              <p className="mt-3 text-[11px] text-gray-500">Msgs moyens par conversation selon le type d'opener utilise</p>
            </GlassCard>
          </motion.div>

          {/* Topic ranking */}
          <motion.div {...fadeIn(0.15)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Sujets gagnants — par longueur de convo</h3>
              <div className="space-y-2">
                {TOPIC_RANKING.map((t) => (
                  <div key={t.topic} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{t.emoji}</span>
                    <span className="text-xs text-gray-300 w-24 shrink-0">{t.topic}</span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-brand-500/70"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(t.avgMsgs / 45) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <span className="text-xs text-green-400 font-medium w-14 text-right">{t.delta}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Best convos + message balance */}
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div {...fadeIn(0.2)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Top 3 conversations</h3>
                <div className="space-y-3">
                  {BEST_CONVOS.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
                      <span className="text-2xl font-extrabold text-brand-400/30">#{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200">{c.name}</span>
                          <AppTag app={c.app} />
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{c.highlight}</p>
                      </div>
                      <span className="text-2xl font-extrabold text-brand-400">{c.msgs}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
            <motion.div {...fadeIn(0.25)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Equilibre des messages</h3>
                <div className="space-y-3">
                  {MESSAGE_BALANCE.map((m) => (
                    <div key={m.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">{m.category}</span>
                        <span className="text-gray-300 font-medium">{m.pct}%</span>
                      </div>
                      <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.04]">
                        <motion.div
                          className={`absolute inset-y-0 left-0 rounded-full ${m.pct >= 50 ? "bg-green-500/60" : m.pct >= 20 ? "bg-amber-500/60" : "bg-brand-500/60"}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${m.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{m.interpretation}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          <motion.div {...fadeIn(0.3)}>
            <ExpandToggle title="Causes detaillees du ghost">
              <GlassCard>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className="px-3 py-2 text-gray-300">Cause</th>
                        <th className="px-3 py-2 text-pink-400">Tinder</th>
                        <th className="px-3 py-2 text-violet-400">Hinge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GHOST_CAUSES.map((g) => (
                        <tr key={g.cause} className="border-b border-white/5 last:border-0">
                          <td className="px-3 py-1.5 text-gray-300">{g.cause}</td>
                          <td className="px-3 py-1.5 text-pink-300">{g.tinderGhost}</td>
                          <td className="px-3 py-1.5 text-violet-300">{g.hingeGhost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </ExpandToggle>
          </motion.div>
        </section>

        {/* ========== OPENER FORMULA ========== */}
        <section id="opener" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="✉️" title="La Formule de l'Opener Parfait" />
          <NarrativeIntro text={SECTION_NARRATIVES.opener} />

          {/* The formula — hero card */}
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-green-500/30 p-6 sm:p-8 text-center"
            style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, transparent 60%)" }}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs text-green-400/70 uppercase tracking-wider font-semibold mb-3">La formule gagnante</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              FR + QUESTION + PERSO
            </p>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-green-400"><AnimatedCounter target={78} suffix=".8" /></span>
                <p className="text-xs text-gray-400 mt-1">msgs moy</p>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-green-400"><AnimatedCounter target={22} suffix="%" /></span>
                <p className="text-xs text-gray-400 mt-1">ghost rate</p>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-green-400"><AnimatedCounter target={44} suffix="%" /></span>
                <p className="text-xs text-gray-400 mt-1">convos longues</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">vs 2.2 msgs et 67% ghost pour un "hey salut ca va" — H43</p>
          </motion.div>

          {/* Length + questions side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div {...fadeIn(0.1)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Longueur optimale</h3>
                <MiniBar bars={OPENER_LENGTH_BARS} />
                <p className="mt-2 text-[11px] text-gray-500">Sweet spot : 50-100 caracteres. Court (20-50c) = catastrophe.</p>
              </GlassCard>
            </motion.div>
            <motion.div {...fadeIn(0.15)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Densite de questions</h3>
                <MiniBar bars={QUESTION_DENSITY} maxOverride={50} />
                <p className="mt-2 text-[11px] text-gray-500">0 questions = 100% ghost. 3-5 = 0% ghost.</p>
              </GlassCard>
            </motion.div>
          </div>

          {/* Trigger words */}
          <motion.div {...fadeIn(0.2)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Mots declencheurs</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {TRIGGER_WORDS.map((t) => (
                  <div key={t.word} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                    <span className="text-xs text-gray-300">{t.word}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${t.verdict === "critical" ? "text-red-400" : "text-green-400"}`}>
                        {t.ghostRate}% ghost
                      </span>
                      <SeverityDot severity={t.verdict} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </section>

        {/* ========== TIMING ========== */}
        <section id="timing" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="⏰" title="Timing & Strategie" />
          <NarrativeIntro text={SECTION_NARRATIVES.timing} />

          {/* Weekly grid — swipe volumes + conversion */}
          <motion.div {...fadeIn(0.1)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Tes swipes par jour — volume vs conversion Tinder</h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <th className="px-2 py-2 text-gray-300">Jour</th>
                      <th className="px-2 py-2 text-pink-400">Likes</th>
                      <th className="px-2 py-2 text-pink-400">Matchs</th>
                      <th className="px-2 py-2 text-pink-400">Conv.</th>
                      <th className="px-2 py-2 text-violet-400">Hinge L/j</th>
                      <th className="px-2 py-2 text-violet-400">Conv.</th>
                      <th className="px-2 py-2 text-gray-300">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKLY_GRID.map((w) => {
                      const isBest = w.overall.includes("Meilleur") || w.overall.includes("Hinge day");
                      const isWorst = w.overall.includes("Pire") || w.overall.includes("piege");
                      return (
                        <tr key={w.day} className={`border-b border-white/5 last:border-0 ${isBest ? "bg-green-500/[0.05]" : isWorst ? "bg-red-500/[0.03]" : ""}`}>
                          <td className="px-2 py-1.5 text-gray-300 font-medium">{w.day}</td>
                          <td className={`px-2 py-1.5 font-mono ${w.tinderLikes > 2000 ? "text-red-400 font-bold" : "text-pink-300"}`}>{w.tinderLikes.toLocaleString("fr-FR")}</td>
                          <td className="px-2 py-1.5 text-pink-300">{w.tinderMatchs}</td>
                          <td className={`px-2 py-1.5 font-bold ${parseFloat(w.tinderConv) >= 0.9 ? "text-green-400" : parseFloat(w.tinderConv) <= 0.55 ? "text-red-400" : "text-pink-300"}`}>{w.tinderConv}</td>
                          <td className={`px-2 py-1.5 font-mono ${w.hingeLikes > 12 ? "text-red-400 font-bold" : "text-violet-300"}`}>{w.hingeLikes}/j</td>
                          <td className={`px-2 py-1.5 font-bold ${parseFloat(w.hingeConv) >= 2.5 ? "text-green-400" : parseFloat(w.hingeConv) <= 1.15 ? "text-red-400" : "text-violet-300"}`}>{w.hingeConv}</td>
                          <td className={`px-2 py-1.5 text-[10px] font-medium ${isBest ? "text-green-400" : isWorst ? "text-red-400" : "text-gray-600"}`}>{w.overall || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-gray-500">Dimanche = 2 769 likes (2x la moyenne) pour 0.65% de conv = le piege du mass-like. Vendredi = 1 233 likes pour 0.97% = BEST.</p>
            </GlassCard>
          </motion.div>

          {/* Monthly Tinder — likes + matchs + conversion + like ratio */}
          <motion.div {...fadeIn(0.15)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Evolution mensuelle Tinder — volume, selectivite, conversion</h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <th className="px-2 py-2 text-gray-300">Mois</th>
                      <th className="px-2 py-2 text-pink-400">Likes</th>
                      <th className="px-2 py-2 text-pink-400">Matchs</th>
                      <th className="px-2 py-2 text-pink-400">Conv.</th>
                      <th className="px-2 py-2 text-gray-300">Like ratio</th>
                      <th className="px-2 py-2 text-gray-400">Analyse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHLY_INDEX.map((m) => (
                      <tr key={m.month} className={`border-b border-white/5 last:border-0 ${m.tinderConv >= 1.1 ? "bg-green-500/[0.05]" : m.tinderConv <= 0.3 ? "bg-red-500/[0.03]" : ""}`}>
                        <td className="px-2 py-1.5 text-gray-300 font-medium text-[11px]">{m.month}</td>
                        <td className="px-2 py-1.5 text-pink-300 font-mono">{m.tinderLikes.toLocaleString("fr-FR")}</td>
                        <td className="px-2 py-1.5 text-pink-300">{m.tinderMatchs}</td>
                        <td className={`px-2 py-1.5 font-bold ${m.tinderConv >= 1.0 ? "text-green-400" : m.tinderConv <= 0.35 ? "text-red-400" : "text-pink-300"}`}>{m.tinderConv}%</td>
                        <td className={`px-2 py-1.5 ${parseInt(m.likeRatio) > 50 ? "text-red-400" : parseInt(m.likeRatio) <= 35 ? "text-green-400" : "text-gray-400"}`}>{m.likeRatio}</td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-500">{m.insight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-gray-500">Pattern clair : moins tu likes, mieux tu convertis. Jan (396 likes, 1.26%) vs Jun (2 348 likes, 0.85%).</p>
            </GlassCard>
          </motion.div>

          {/* Monthly Hinge — likes + matchs + conversion */}
          <motion.div {...fadeIn(0.18)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-violet-400 mb-3">Evolution mensuelle Hinge — honeymoon decay puis rebond</h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <th className="px-2 py-2 text-gray-300">Mois</th>
                      <th className="px-2 py-2 text-violet-400">Likes</th>
                      <th className="px-2 py-2 text-violet-400">Matchs</th>
                      <th className="px-2 py-2 text-violet-400">Conv.</th>
                      <th className="px-2 py-2 text-gray-400">Analyse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HINGE_MONTHLY.map((m) => (
                      <tr key={m.month} className={`border-b border-white/5 last:border-0 ${m.hingeConv >= 2.0 ? "bg-green-500/[0.05]" : m.hingeConv <= 0.9 ? "bg-red-500/[0.03]" : ""}`}>
                        <td className="px-2 py-1.5 text-gray-300 font-medium text-[11px]">{m.month}</td>
                        <td className="px-2 py-1.5 text-violet-300 font-mono">{m.hingeLikes}</td>
                        <td className="px-2 py-1.5 text-violet-300">{m.hingeMatchs}</td>
                        <td className={`px-2 py-1.5 font-bold ${m.hingeConv >= 2.0 ? "text-green-400" : m.hingeConv <= 0.9 ? "text-red-400" : "text-violet-300"}`}>{m.hingeConv}%</td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-500">{m.insight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-gray-500">Conv chute de 3.4% → 0.8% en 5 mois (honeymoon decay). Rebond Nov a 2.2% apres pause Oct. Reset tous les 3 mois recommande.</p>
            </GlassCard>
          </motion.div>

          {/* Hinge hourly + Response speed side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div {...fadeIn(0.2)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-violet-400 mb-3">Hinge — Quand tu likes vs quand tu matches</h3>
                {HINGE_HOURLY.map((h) => (
                  <div key={h.slot} className="mb-2.5 last:mb-0">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">{h.slot}</span>
                      <span className="text-gray-600">{h.pct}% likes → {h.matchPct}% matchs</span>
                    </div>
                    <div className="flex gap-1 mt-0.5">
                      <div className="flex-1 relative h-3 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-violet-500/40" initial={{ width: 0 }} whileInView={{ width: `${h.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-violet-300">{h.likes} L</span>
                      </div>
                      <div className="flex-1 relative h-3 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-green-500/40" initial={{ width: 0 }} whileInView={{ width: `${h.matchPct * 2}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-green-300">{h.matchs} M</span>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="mt-2 text-[10px] text-gray-500">Tu likes a 44% le soir mais seulement 29% des matchs y tombent. La nuit (3% likes) = 17% des matchs.</p>
              </GlassCard>
            </motion.div>
            <motion.div {...fadeIn(0.25)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Vitesse de reponse → longueur de convo</h3>
                {RESPONSE_SPEED.map((r) => (
                  <div key={r.speed} className="mb-2 last:mb-0">
                    <span className="text-[11px] text-gray-400">{r.speed}</span>
                    <div className="flex gap-2 mt-0.5">
                      <div className="flex-1">
                        <div className="relative h-3 rounded-full bg-white/[0.04] overflow-hidden">
                          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-pink-500/60" initial={{ width: 0 }} whileInView={{ width: `${(r.tinderMsgs / 153) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} />
                        </div>
                        <span className="text-[9px] text-pink-400">{r.tinderMsgs} msgs</span>
                      </div>
                      <div className="flex-1">
                        <div className="relative h-3 rounded-full bg-white/[0.04] overflow-hidden">
                          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-violet-500/60" initial={{ width: 0 }} whileInView={{ width: `${(r.hingeMsgs / 153) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} />
                        </div>
                        <span className="text-[9px] text-violet-400">{r.hingeMsgs} msgs</span>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="mt-2 text-[10px] text-gray-500">Reponse &lt;1h = x5.8 Tinder, x21.9 Hinge vs reponse &gt;24h</p>
              </GlassCard>
            </motion.div>
          </div>

          {/* Timing insights from real data */}
          <motion.div {...fadeIn(0.25)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Revelations timing — issues de tes donnees</h3>
              <div className="space-y-3">
                {TIMING_INSIGHTS.map((t, i) => (
                  <motion.div
                    key={t.ref}
                    className={`rounded-lg px-3 py-2.5 border ${t.severity === "critical" ? "bg-red-500/[0.04] border-red-500/10" : t.severity === "warning" ? "bg-amber-500/[0.04] border-amber-500/10" : "bg-green-500/[0.04] border-green-500/10"}`}
                    {...fadeIn(0.05 * i)}
                  >
                    <div className="flex items-start gap-2">
                      <SeverityDot severity={t.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-200">{t.title}</span>
                          <span className="text-[9px] text-gray-600 font-mono">{t.ref}</span>
                        </div>
                        <p className="text-xs font-semibold mt-1" style={{ color: t.severity === "critical" ? "#f87171" : t.severity === "warning" ? "#fbbf24" : "#4ade80" }}>{t.data}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </section>

        {/* ========== ALGORITHM ========== */}
        <section id="algorithm" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="🎯" title="L'Algorithme" />
          <NarrativeIntro text={SECTION_NARRATIVES.algorithm} />

          {/* Shadowban spotlight */}
          <SpotlightCard
            value={<AnimatedCounter target={2124} className="text-4xl sm:text-5xl font-extrabold" />}
            label="likes envoyes dans le vide"
            sublabel="7 shadowbans non detectes = 20% de ton total de likes, gaspilles"
            color="#ef4444" icon="🚫"
          />

          {/* ELO timeline */}
          <motion.div {...fadeIn(0.1)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">ELO proxy — score de desirabilite estime</h3>
              <div className="flex items-end gap-1 sm:gap-2 h-32">
                {ELO_PROXY.map((e) => {
                  const h = Math.max(4, (e.score / 1.88) * 100);
                  return (
                    <div key={e.period} className="flex-1 flex flex-col items-center justify-end gap-1">
                      <span className="text-[9px] text-gray-400 font-medium">{e.score.toFixed(1)}</span>
                      <motion.div
                        className="w-full rounded-t-sm"
                        style={{ backgroundColor: e.score >= 1.0 ? "#22c55e" : e.score >= 0.5 ? "#f59e0b" : "#ef4444" }}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                      />
                      <span className="text-[8px] text-gray-500 -rotate-45 origin-top-left whitespace-nowrap">{e.period}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-gray-500">Chaque pic ELO arrive APRES une periode de repos. L'algo recompense la rarete.</p>
            </GlassCard>
          </motion.div>

          {/* Selectivity cliff + Activity */}
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div {...fadeIn(0.15)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">La falaise de selectivite</h3>
                <MiniBar bars={SELECTIVITY_CLIFF.map(b => ({
                  ...b,
                  label: b.label,
                  value: b.value * 100,
                }))} maxOverride={110} />
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2">
                  <p className="text-[11px] text-red-400 font-medium">Au-dessus de 50% de like ratio, ta conversion chute de ÷3</p>
                </div>
              </GlassCard>
            </motion.div>
            <motion.div {...fadeIn(0.2)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Multiplicateur d'activite</h3>
                {ACTIVITY_LEVELS.map((a) => (
                  <div key={a.level} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs text-gray-400">{a.level}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-300">{a.matchesPerDay.toFixed(2)} match/jour</span>
                      <span className="text-sm font-bold text-brand-400">{a.multiplier}</span>
                    </div>
                  </div>
                ))}
              </GlassCard>
            </motion.div>
          </div>

          <motion.div {...fadeIn(0.25)}>
            <ExpandToggle title="Detail des 7 shadowbans">
              <GlassCard>
                <div className="space-y-2">
                  {SHADOWBANS.map((s) => (
                    <div key={s.period} className="flex items-center justify-between rounded-lg bg-red-500/[0.03] px-3 py-2">
                      <span className="text-xs text-gray-400 font-mono">{s.period}</span>
                      <span className="text-xs text-gray-300">{s.duration}</span>
                      <span className="text-xs text-red-400 font-medium">{s.likesWasted} likes</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </ExpandToggle>
          </motion.div>
        </section>

        {/* ========== PREMIUM ========== */}
        <section id="premium" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="💎" title="Premium & Budget" />
          <NarrativeIntro text={SECTION_NARRATIVES.premium} />

          {/* Two spotlight cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SpotlightCard
              value={<><AnimatedCounter target={240} className="text-4xl sm:text-5xl font-extrabold" /> EUR</>}
              label="depenses totales (Tinder + Hinge)"
              sublabel="5 mois payes sur 8. Match rate paid 0.75% vs free 0.77%. Zero impact."
              color="#ef4444" icon="💸"
            />
            <SpotlightCard
              value={<><AnimatedCounter target={3} className="text-4xl sm:text-5xl font-extrabold" /> shadowbans</>}
              label="declenches par tes annulations"
              sublabel="Chaque resiliation = punition algorithmique. 1 661 likes perdus."
              color="#f59e0b" icon="⚡"
            />
          </div>

          {/* Subscription ROI — real spending data */}
          <motion.div {...fadeIn(0.1)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Tes depenses reelles — ROI mesure</h3>
              <div className="space-y-2">
                {SUBSCRIPTION_ROI.map((s) => (
                  <div key={s.name} className={`rounded-lg px-3 py-2.5 border ${s.verdict === "critical" ? "bg-red-500/[0.04] border-red-500/10" : s.verdict === "warning" ? "bg-amber-500/[0.04] border-amber-500/10" : "bg-green-500/[0.04] border-green-500/10"}`}>
                    <div className="flex items-start gap-2">
                      <SeverityDot severity={s.verdict} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-200">{s.name}</span>
                          <span className="text-xs font-bold text-red-400">{s.spent}</span>
                          <span className="text-[10px] text-gray-600">{s.duration}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{s.result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Tinder: Monthly temporal chart — shadowbans & recovery */}
          <motion.div {...fadeIn(0.15)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Tinder — Chronologie mensuelle : shadowbans & rebonds</h3>
              <p className="text-[10px] text-gray-500 mb-3">Chaque vallee = shadowban. Chaque pic = recovery post-repos. Fond violet = tu payais.</p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={TINDER_MONTHLY_CHART} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="tinderConvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  {/* Background bands: paid subscription periods */}
                  <ReferenceArea x1="Avr" x2="Jun" fill="#8b5cf6" fillOpacity={0.07} />
                  <ReferenceArea x1="Aou" x2="Sep" fill="#8b5cf6" fillOpacity={0.07} />
                  <ReferenceArea x1="Oct" x2="Dec" fill="#8b5cf6" fillOpacity={0.07} />
                  {/* Vertical lines: cancellation moments */}
                  <ReferenceLine x="Jun" stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: "Annul. #1", fill: "#ef4444", fontSize: 8, position: "top" }} />
                  <ReferenceLine x="Sep" stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: "Annul. #2", fill: "#ef4444", fontSize: 8, position: "top" }} />
                  <ReferenceLine x="Dec" stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: "Annul. #3", fill: "#ef4444", fontSize: 8, position: "top" }} />
                  <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 1.4]} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 11, maxWidth: 280 }}
                    labelStyle={{ color: "#d1d5db", fontWeight: 600 }}
                    formatter={(value: number, _name: string, props: any) => {
                      const p = props?.payload;
                      if (!p) return [`${value}%`, "Conv."];
                      const statusLabel = p.status === "paid" ? "💎 Paye" : p.status === "mixed" ? "⚡ Mixte" : "🆓 Gratuit";
                      return [
                        `${p.conv}% (${p.matchs} matchs / ${p.likes} likes)${p.hasShadowban ? " ⚠️ SB" : ""}`,
                        statusLabel,
                      ];
                    }}
                    labelFormatter={(_label: any, payload: any[]) => {
                      const p = payload?.[0]?.payload;
                      return p ? `${p.month} — ${p.insight}` : "";
                    }}
                  />
                  <ReferenceLine y={0.75} stroke="#6b7280" strokeDasharray="3 3" label={{ value: "Moy. 0.75%", fill: "#9ca3af", fontSize: 9, position: "right" }} />
                  <Area
                    type="monotone"
                    dataKey="conv"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#tinderConvGrad)"
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      if (typeof cx !== "number" || typeof cy !== "number") return <circle key={`td-${index}`} r={0} />;
                      const isSB = payload?.hasShadowban;
                      return (
                        <circle
                          key={`td-${index}`}
                          cx={cx}
                          cy={cy}
                          r={isSB ? 6 : 4}
                          fill={isSB ? "#ef4444" : "#10b981"}
                          stroke={isSB ? "#991b1b" : "#065f46"}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: "#6366f1" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500/20 border border-purple-500/40 inline-block" /> Periode payee</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Mois avec shadowban</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Mois clean</span>
                <span className="flex items-center gap-1 text-red-400/60">┆ Annulation</span>
                <span className="ml-auto italic text-emerald-400/70">Meilleurs mois = FREE + post-shadowban</span>
              </div>
            </GlassCard>
          </motion.div>

          {/* Hinge: Monthly temporal chart — no shadowbans */}
          <motion.div {...fadeIn(0.2)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Hinge — Chronologie mensuelle : decline & rebonds</h3>
              <p className="text-[10px] text-gray-500 mb-3">Decline naturel (pool epuise), puis rebond a chaque reactivation. Aucun shadowban post-annulation.</p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={HINGE_MONTHLY_CHART} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="hingeConvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  {/* Background bands: Hinge+ subscription periods */}
                  <ReferenceArea x1="Jun" x2="Sep" fill="#8b5cf6" fillOpacity={0.07} />
                  <ReferenceArea x1="Nov" x2="Dec" fill="#8b5cf6" fillOpacity={0.07} />
                  <ReferenceArea x1="Jan" x2="Jan" fill="#8b5cf6" fillOpacity={0.07} />
                  <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 3.8]} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 11, maxWidth: 260 }}
                    labelStyle={{ color: "#d1d5db", fontWeight: 600 }}
                    formatter={(value: number, _name: string, props: any) => {
                      const p = props?.payload;
                      if (!p) return [`${value}%`, "Conv."];
                      const statusLabel = p.status === "paid" ? "💎 Paye" : p.status === "mixed" ? "⚡ Mixte" : "🆓 Gratuit";
                      return [
                        `${p.conv}% (${p.matchs} matchs / ${p.likes} likes)`,
                        statusLabel,
                      ];
                    }}
                    labelFormatter={(_label: any, payload: any[]) => {
                      const p = payload?.[0]?.payload;
                      return p ? `${p.month} — ${p.insight}` : "";
                    }}
                  />
                  <ReferenceLine y={1.63} stroke="#6b7280" strokeDasharray="3 3" label={{ value: "Moy. 1.63%", fill: "#9ca3af", fontSize: 9, position: "right" }} />
                  <Area
                    type="monotone"
                    dataKey="conv"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#hingeConvGrad)"
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      if (typeof cx !== "number" || typeof cy !== "number") return <circle key={`hd-${index}`} r={0} />;
                      const isPaid = payload?.status === "paid";
                      return (
                        <circle
                          key={`hd-${index}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={isPaid ? "#8b5cf6" : "#10b981"}
                          stroke={isPaid ? "#4c1d95" : "#065f46"}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: "#8b5cf6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500/20 border border-purple-500/40 inline-block" /> Periode payee (87.47 EUR)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Mois paye</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Mois free</span>
                <span className="ml-auto italic text-purple-400/70">Pas de punition post-annulation (≠ Tinder)</span>
              </div>
            </GlassCard>
          </motion.div>

          {/* Post-cancellation shadowbans */}
          <motion.div {...fadeIn(0.25)}>
            <GlassCard className="border-red-500/20">
              <h3 className="text-sm font-semibold text-red-400 mb-3">Tinder — Shadowbans post-annulation</h3>
              <div className="space-y-2">
                {POST_CANCEL_SHADOWBANS.map((s) => (
                  <div key={s.cancellation} className="rounded-lg px-3 py-2.5 bg-red-500/[0.04] border border-red-500/10">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-gray-400">Annulation</span>
                      <span className="font-medium text-gray-200">{s.cancellation}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px]">
                      <span className="text-red-400 font-bold">→ Shadowban {s.duration}</span>
                      <span className="text-gray-500">{s.likesWasted} likes perdus</span>
                      <span className="text-green-400/70">Recovery ELO : {s.recoveryElo}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-3 italic">Chaque recovery ELO est SUPERIEUR au precedent (1.22 → 1.69 → 1.88). Le repos force est benefique. Hinge ne punit PAS les resilies.</p>
            </GlassCard>
          </motion.div>

          {/* Budget + Dark patterns */}
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div {...fadeIn(0.15)}>
              <GlassCard className="h-full border-green-500/20">
                <h3 className="text-sm font-semibold text-green-400 mb-3">Budget optimal recommande</h3>
                <div className="space-y-2">
                  {BUDGET_OPTIMAL.map((b) => (
                    <div key={b.item} className={`text-xs ${b.item === "TOTAL" ? "border-t border-white/10 pt-2 mt-2" : ""}`}>
                      <div className={`flex items-center justify-between ${b.item === "TOTAL" ? "font-bold text-green-400" : "text-gray-300"}`}>
                        <span>{b.item}</span>
                        <span>{b.cost}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">{b.why}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
            <motion.div {...fadeIn(0.2)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-red-400 mb-3">Dark Patterns Match Group</h3>
                <ExpandToggle title={`${DARK_PATTERNS.length} patterns documentes`}>
                  <div className="space-y-2 mt-2">
                    {DARK_PATTERNS.map((d) => (
                      <div key={d.pattern} className="text-[11px] text-gray-400 border-b border-white/5 pb-2 last:border-0">
                        <span className="font-medium text-gray-300">{d.pattern}</span>
                        <p className="text-gray-500 mt-0.5">{d.mechanism}</p>
                        <p className="text-green-400/70 mt-0.5">Defense : {d.defense}</p>
                      </div>
                    ))}
                  </div>
                </ExpandToggle>
              </GlassCard>
            </motion.div>
          </div>
        </section>

        {/* ========== PHOTO ========== */}
        <section id="photo" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="📷" title="Photo Science" />
          <NarrativeIntro text={SECTION_NARRATIVES.photo} />

          {/* Photo stats grid */}
          <motion.div {...fadeIn(0.1)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Stats photo — impact mesure</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PHOTO_STATS.map((p) => (
                  <div key={p.metric} className="rounded-lg bg-white/[0.03] p-3 text-center">
                    <p className="text-lg sm:text-xl font-bold text-brand-400">{p.impact}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{p.metric}</p>
                    <p className="text-[9px] text-gray-600">{p.source}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Beard + France comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div {...fadeIn(0.15)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Barbe — style optimal</h3>
                <MiniBar bars={BEARD_DATA.map(b => ({
                  label: `${b.style}${b.preferred ? " ⭐" : ""}`,
                  value: b.attractiveness,
                  color: b.preferred ? "#22c55e" : "#6366f1",
                }))} />
                <p className="mt-2 text-[10px] text-gray-500">Heavy stubble (10 jours) = LE PLUS attractif selon les etudes</p>
              </GlassCard>
            </motion.div>
            <motion.div {...fadeIn(0.2)}>
              <GlassCard className="h-full">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">France vs US/UK</h3>
                <div className="space-y-2">
                  {FRANCE_VS_US.map((f) => (
                    <div key={f.aspect} className="text-[11px] border-b border-white/5 pb-1.5 last:border-0">
                      <span className="text-gray-300 font-medium">{f.aspect}</span>
                      <div className="flex gap-4 mt-0.5">
                        <span className="text-brand-400">🇫🇷 {f.france}</span>
                        <span className="text-gray-500">🇺🇸 {f.usuk}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </section>

        {/* ========== 50 HYPOTHESES ========== */}
        <section id="hypotheses" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="🔬" title="50 Hypotheses" subtitle="Testees contre tes donnees reelles" />
          <NarrativeIntro text={SECTION_NARRATIVES.hypotheses} />

          {/* Filter pills */}
          <motion.div {...fadeIn(0.1)} className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Toutes (50)" },
              { id: "confirmed", label: "✓ Confirmees (28)" },
              { id: "debunked", label: "✗ Refutees (12)" },
              { id: "mixed", label: "~ Mixtes (10)" },
              ...HYPOTHESIS_THEMES.map((t) => ({ id: t.id, label: `${t.emoji} ${t.title}` })),
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setHypothesisFilter(f.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  hypothesisFilter === f.id
                    ? "border-brand-500 bg-brand-500/20 text-brand-300"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </motion.div>

          {/* Hypothesis grid */}
          {filteredThemes.map((theme) => (
            <div key={theme.id} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <span>{theme.emoji}</span>{theme.title}
                <span className="text-[10px] text-gray-500">({theme.hypotheses.length})</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {theme.hypotheses.map((h, i) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard className="h-full">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-brand-400/70 bg-brand-500/10 rounded px-1.5 py-0.5">{h.id}</span>
                          <ImpactDots impact={h.impact} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AppTag app={h.app} />
                          <VerdictBadge verdict={h.verdict} />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-200 mb-1.5">{h.title}</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{h.insight}</p>
                      {h.bars && (
                        <div className="mt-3">
                          <MiniBar bars={h.bars} />
                        </div>
                      )}
                      {h.stats && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {h.stats.map((s) => (
                            <div key={s.label} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                              <p className={`text-sm font-bold ${s.severity === "good" ? "text-green-400" : s.severity === "critical" ? "text-red-400" : "text-gray-300"}`}>{s.value}</p>
                              <p className="text-[9px] text-gray-500">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ========== ACTION PLAN ========== */}
        <section id="action" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="🚀" title="Plan d'Action" />
          <NarrativeIntro text={SECTION_NARRATIVES.action} />

          {/* Top 2 costly mistakes as spotlights */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SpotlightCard
              value={<><AnimatedCounter target={284} className="text-4xl sm:text-5xl font-extrabold" /> EUR</>}
              label="perdus en Tinder Platinum"
              sublabel="Match rate: 0.75% pendant → 0.77% apres. Zero impact."
              color="#ef4444" icon="💸"
            />
            <SpotlightCard
              value={<AnimatedCounter target={2124} className="text-4xl sm:text-5xl font-extrabold" />}
              label="likes envoyes dans le vide"
              sublabel="7 shadowbans = 20% de tes likes totaux gaspilles"
              color="#ef4444" icon="🚫"
            />
          </div>

          {/* Remaining costly mistakes */}
          <motion.div {...fadeIn(0.1)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-red-400 mb-1">Autres erreurs couteuses</h3>
              <div className="space-y-3 mt-3">
                {COSTLY_MISTAKES.slice(2).map((m) => (
                  <div key={m.title} className="flex items-start gap-3 rounded-lg bg-white/[0.02] p-3">
                    <SeverityDot severity={m.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-200">{m.title}</span>
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">{m.cost}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{m.detail}</p>
                      <span className="inline-block mt-1 text-[9px] font-mono text-brand-400/70 bg-brand-500/10 px-1.5 py-0.5 rounded">{m.ref}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Target metrics */}
          <motion.div {...fadeIn(0.15)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Metriques cibles</h3>
              <p className="text-xs text-gray-500 mb-3">Basees sur les leviers identifies dans tes 50 hypotheses</p>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <th className="px-3 py-2 text-gray-300">Metrique</th>
                      <th className="px-3 py-2 text-red-400">Avant</th>
                      <th className="px-3 py-2 text-green-400">Cible</th>
                      <th className="hidden px-3 py-2 text-gray-300 sm:table-cell">Source data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TARGET_METRICS.map((t) => (
                      <tr key={t.metric} className="border-b border-white/5 last:border-0">
                        <td className="px-3 py-1.5 text-gray-300 font-medium">{t.metric}</td>
                        <td className="px-3 py-1.5 text-red-400">{t.before}</td>
                        <td className="px-3 py-1.5 text-green-400 font-medium">{t.target}</td>
                        <td className="hidden px-3 py-1.5 text-gray-500 sm:table-cell">{t.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>

          {/* 10 commandments — data-driven with stagger */}
          <motion.div {...fadeIn(0.2)}>
            <GlassCard className="border-brand-500/20">
              <h3 className="text-sm font-semibold text-brand-400 mb-1">Les 10 Commandements</h3>
              <p className="text-xs text-gray-500 mb-4">Chacun ancre dans tes donnees reelles</p>
              <div className="space-y-3">
                {TEN_COMMANDMENTS.map((cmd, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-400 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 leading-snug">{cmd.rule}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="text-gray-400">{cmd.data}</span>
                        <span className="ml-2 text-[10px] font-mono text-brand-400/70 bg-brand-500/10 px-1.5 py-0.5 rounded">{cmd.ref}</span>
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </section>

        {/* Footer */}
        <motion.footer {...fadeIn(0.1)} className="border-t border-white/5 pt-8 text-center text-xs text-gray-600">
          <p>Analyse basee sur {HERO_STATS.totalDays.tinder + HERO_STATS.totalDays.hinge} jours de donnees RGPD</p>
          <p className="mt-1">Tinder (300j, 91 matchs, 12 143 likes) · Hinge (252j, 38 matchs, 2 325 likes)</p>
          <p className="mt-1">50 hypotheses testees · 7 rapports analyses · Donnees 100% personnalisees</p>
        </motion.footer>
      </main>
    </div>
  );
}
