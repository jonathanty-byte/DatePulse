import React from "react";
import { motion } from "framer-motion";
import type { InsightsDataSet } from "../lib/insightsEngine";
import type {
  Hypothesis,
  Verdict,
  Severity,
  Recommendation,
} from "../lib/insightsData";
import { SectionTitle, NarrativeIntro, SpotlightCard, ExpandToggle, MiniBar } from "./SharedInsightComponents";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────

interface PremiumInsightsSectionProps {
  data: InsightsDataSet;
  appSource: string;
}

// ── Colors ───────────────────────────────────────────────────────

const VERDICT_COLORS: Record<Verdict, { bg: string; text: string; border: string; label: string }> = {
  confirmed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Confirme" },
  debunked: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Infirme" },
  mixed: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Nuance" },
};

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  good: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

const APP_PRIMARY: Record<string, string> = {
  tinder: "#ec4899",
  bumble: "#f59e0b",
  hinge: "#8b5cf6",
  happn: "#f97316",
};

// ── Card wrapper (matches WrappedReport style) ───────────────────

function Card({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={`border border-gray-200 bg-white p-5 sm:p-6 shadow-sm ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Verdict badge ────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT_COLORS[verdict];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${v.bg} ${v.text} border ${v.border}`}>
      {verdict === "confirmed" ? "✓" : verdict === "debunked" ? "✗" : "~"} {v.label}
    </span>
  );
}

// ── Impact dots ──────────────────────────────────────────────────

function ImpactDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex gap-0.5" title={`Impact: ${level}/3`}>
      {[1, 2, 3].map(i => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= level ? "bg-brand-500" : "bg-gray-200"}`} />
      ))}
    </span>
  );
}

// ── Recommendation pill ──────────────────────────────────────────

function RecommendationPill({ rec }: { rec: Recommendation }) {
  const styles = {
    do: { icon: "✓", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    dont: { icon: "✗", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    tip: { icon: "💡", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  };
  const s = styles[rec.type];
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${s.bg} ${s.border}`}>
      <span className="text-sm mt-0.5">{s.icon}</span>
      <span className={`text-sm ${s.text}`}>{rec.text}</span>
    </div>
  );
}

// ── Single hypothesis card (always expanded, no toggle) ─────────

function HypothesisCard({ h, color }: { h: Hypothesis; color: string }) {
  return (
    <Card delay={0}>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-xs font-mono text-slate-400">{h.id}</span>
        <VerdictBadge verdict={h.verdict} />
        <ImpactDots level={h.impact} />
      </div>
      <h4 className="font-semibold text-slate-900 text-sm sm:text-base">{h.title}</h4>
      <p className="mt-2 text-sm text-slate-600">{h.insight}</p>

      {/* Stats — always visible */}
      {h.stats && h.stats.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {h.stats.map((s, i) => (
            <div key={i} className={`rounded-lg px-3 py-2 ${SEVERITY_COLORS[s.severity || "good"].bg}`}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`font-bold text-sm ${SEVERITY_COLORS[s.severity || "good"].text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bars — compact MiniBar instead of full BarChart */}
      {h.bars && h.bars.length > 0 && (
        <div className="mt-3">
          <MiniBar bars={h.bars} />
        </div>
      )}

      {/* Recommendations — always visible */}
      {h.recommendations && h.recommendations.length > 0 && (
        <div className="mt-3 space-y-2">
          {h.recommendations.map((r, i) => (
            <RecommendationPill key={i} rec={r} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Teaser component (always visible — above the paywall) ────────

export function PremiumInsightsTeaser({ data, appSource }: PremiumInsightsSectionProps) {
  const color = APP_PRIMARY[appSource] || "#6366f1";
  const heroH = data.heroStats.hypotheses;

  return (
    <div className="space-y-6 mt-10">
      {/* ─── PREMIUM HEADER ─── */}
      <motion.div
        className="text-center space-y-3 py-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200">
          <span className="text-xs font-semibold text-brand-600">Analyse approfondie</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold">
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            Tes Insights personnalises
          </span>
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {heroH.total} hypotheses testees contre tes donnees reelles.{" "}
          {heroH.confirmed} confirmees, {heroH.debunked} infirmees, {heroH.mixed} nuancees.
        </p>
      </motion.div>

      {/* ─── HERO STATS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SpotlightCard
          value={heroH.total}
          label="hypotheses testees"
          sublabel="contre tes donnees"
          color={color}
          icon="🔬"
        />
        <SpotlightCard
          value={heroH.confirmed}
          label="confirmees"
          sublabel={`${heroH.total > 0 ? Math.round((heroH.confirmed / heroH.total) * 100) : 0}% des tests`}
          color="#22c55e"
          icon="✓"
        />
        <SpotlightCard
          value={heroH.debunked}
          label="infirmees"
          sublabel="mythes casses"
          color="#ef4444"
          icon="✗"
        />
        <SpotlightCard
          value={heroH.mixed}
          label="nuancees"
          sublabel="ca depend"
          color="#f59e0b"
          icon="~"
        />
      </div>
    </div>
  );
}

// ── Main component (gated behind paywall) ────────────────────────

export default function PremiumInsightsSection({ data, appSource }: PremiumInsightsSectionProps) {
  const color = APP_PRIMARY[appSource] || "#6366f1";
  const narratives = data.sectionNarratives;

  // Filter out empty sections
  const hasConversationScores = data.conversationScores.length > 0;
  const hasHypotheses = data.hypothesisThemes.length > 0;
  const hasClusters = data.reinforcementClusters.length > 0;
  const hasContradictions = data.contradictionPairs.length > 0;
  const hasCostlyMistakes = data.costlyMistakes.length > 0;
  const hasTargetMetrics = data.targetMetrics.length > 0;
  const hasCommandments = data.tenCommandments.length > 0;
  const hasWeeklyGrid = data.weeklyGrid.length > 0;
  const hasMonthlyIndex = data.monthlyIndex.length > 0;
  const hasMessageBalance = data.messageBalance.length > 0;

  return (
    <div className="space-y-10">

      {/* ─── CONVERSATION SCORES RADAR ─── */}
      {hasConversationScores && (
        <section className="space-y-4">
          <SectionTitle emoji="💬" title="Score conversationnel" subtitle={narratives.conversations || undefined} />
          <Card>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data.conversationScores}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar
                    dataKey="score"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const d = payload[0].payload as { category: string; score: number; detail: string };
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                          <p className="font-semibold text-sm">{d.category}: {d.score}/10</p>
                          <p className="text-xs text-slate-500">{d.detail}</p>
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* ─── HYPOTHESES BY THEME ─── */}
      {hasHypotheses && (
        <section className="space-y-6">
          <SectionTitle emoji="🧪" title="Hypotheses testees" subtitle={narratives.hypotheses || "La science du dating, pas l'intuition."} />
          {data.hypothesisThemes.map((theme) => (
            <div key={theme.id} className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{theme.emoji}</span> {theme.title}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ({theme.hypotheses.length} hypothese{theme.hypotheses.length > 1 ? "s" : ""})
                </span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {theme.hypotheses.map((h) => (
                  <HypothesisCard key={h.id} h={h} color={color} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ─── REINFORCEMENT CLUSTERS ─── */}
      {hasClusters && (
        <section className="space-y-4">
          <SectionTitle emoji="🔗" title="Patterns convergents" subtitle="Quand plusieurs hypotheses pointent dans la meme direction" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.reinforcementClusters.map((cluster) => (
              <Card key={cluster.id}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{cluster.emoji}</span>
                  <div>
                    <h4 className="font-bold text-slate-900">{cluster.name}</h4>
                    <p className="text-sm text-brand-600 font-medium">{cluster.tagline}</p>
                    <p className="mt-1 text-sm text-slate-600">{cluster.description}</p>
                    <p className="mt-2 text-xs text-slate-400">{cluster.insight}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cluster.hypothesisIds.map(id => (
                        <span key={id} className="px-1.5 py-0.5 bg-brand-50 text-brand-600 text-xs rounded font-mono">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── CONTRADICTIONS ─── */}
      {hasContradictions && (
        <section className="space-y-4">
          <SectionTitle emoji="⚡" title="Contradictions detectees" subtitle="Quand les donnees se contredisent — et pourquoi" />
          <div className="space-y-3">
            {data.contradictionPairs.map((cp) => (
              <Card key={cp.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-mono border border-amber-200">
                    {cp.pair[0]}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-mono border border-amber-200">
                    {cp.pair[1]}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{cp.title}</h4>
                <p className="mt-1 text-sm text-slate-600">{cp.description}</p>
                <div className="mt-2 px-3 py-2 bg-brand-50 rounded-lg border border-brand-100">
                  <p className="text-xs font-semibold text-brand-700">Resolution</p>
                  <p className="text-sm text-brand-600">{cp.resolution}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── COSTLY MISTAKES ─── */}
      {hasCostlyMistakes && (
        <section className="space-y-4">
          <SectionTitle emoji="💸" title="Erreurs couteuses" subtitle={narratives.action || "Les erreurs qui t'ont coute le plus cher"} />
          <div className="space-y-3">
            {data.costlyMistakes.map((cm, i) => {
              const sev = SEVERITY_COLORS[cm.severity];
              return (
                <Card key={i}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900 text-sm">{cm.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sev.bg} ${sev.text}`}>
                          {cm.cost}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{cm.detail}</p>
                      <span className="mt-1 inline-block text-xs text-slate-400 font-mono">{cm.ref}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── WEEKLY GRID ─── */}
      {hasWeeklyGrid && (
        <section className="space-y-4">
          <SectionTitle emoji="📅" title="Grille hebdomadaire" subtitle={narratives.timing || "Le timing est le multiplicateur cache"} />
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-gray-100">
                    <th className="text-left py-2 pr-3">Jour</th>
                    <th className="text-right py-2 px-2">Likes</th>
                    <th className="text-right py-2 px-2">Matchs</th>
                    <th className="text-right py-2 pl-2">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeklyGrid.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-3 font-medium text-slate-900">{row.day}</td>
                      <td className="py-2 px-2 text-right text-slate-600">{row.tinderLikes}</td>
                      <td className="py-2 px-2 text-right text-slate-600">{row.tinderMatchs}</td>
                      <td className="py-2 pl-2 text-right text-slate-500">{row.tinderConv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* ─── MONTHLY INDEX CHART ─── */}
      {hasMonthlyIndex && (
        <section className="space-y-4">
          <SectionTitle emoji="📈" title="Evolution mensuelle" subtitle={narratives.profile || undefined} />
          <Card>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyIndex} margin={{ left: -10, right: 10 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const d = payload[0].payload as { month: string; tinderLikes: number; tinderMatchs: number; likeRatio: string; insight: string };
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
                          <p className="font-semibold">{d.month}</p>
                          <p>Likes: {d.tinderLikes} | Matchs: {d.tinderMatchs}</p>
                          <p>Like ratio: {d.likeRatio}</p>
                          <p className="text-slate-500">{d.insight}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="tinderLikes" fill={color} opacity={0.3} radius={[2, 2, 0, 0]} name="Likes" />
                  <Bar dataKey="tinderMatchs" fill={color} radius={[2, 2, 0, 0]} name="Matchs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* ─── MESSAGE BALANCE ─── */}
      {hasMessageBalance && (
        <section className="space-y-4">
          <SectionTitle emoji="⚖️" title="Equilibre conversationnel" />
          <Card>
            <div className="space-y-3">
              {data.messageBalance.map((mb, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-700">{mb.category}</span>
                    <span className="text-sm font-semibold text-slate-900">{mb.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: i === 1 ? "#22c55e" : i === 0 ? "#ef4444" : "#6366f1" }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${mb.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{mb.interpretation}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* ─── TARGET METRICS ─── */}
      {hasTargetMetrics && (
        <section className="space-y-4">
          <SectionTitle emoji="🎯" title="Objectifs mesurables" subtitle="Tes leviers d'amelioration concrets" />
          <div className="space-y-3">
            {data.targetMetrics.map((tm, i) => (
              <Card key={i}>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 text-sm">{tm.metric}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{tm.why}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400 line-through">{tm.before}</p>
                    <p className="font-bold text-brand-600">{tm.target}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── TEN COMMANDMENTS ─── */}
      {hasCommandments && (
        <section className="space-y-4">
          <SectionTitle emoji="📜" title="Tes regles personnalisees" subtitle="Ancrees dans tes donnees, pas dans des conseils generiques" />
          <div className="space-y-2">
            {data.tenCommandments.map((cmd, i) => (
              <Card key={i} delay={i * 0.05}>
                <div className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{cmd.rule}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{cmd.data}</p>
                    <span className="text-xs text-slate-400 font-mono">{cmd.ref}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
