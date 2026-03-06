import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { InsightsDataSet } from "../lib/insightsEngine";
import type {
  Hypothesis,
  Verdict,
  Severity,
  App,
  Recommendation,
} from "../lib/insightsData";
import {
  fadeIn,
  GlassCard,
  AnimatedCounter,
  SpotlightCard,
  NarrativeIntro,
  MiniBar,
  ExpandToggle,
  SectionTitle,
  ProgressRing,
  SectionNav,
} from "./SharedInsightComponents";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────

interface PremiumInsightsSectionProps {
  data: InsightsDataSet;
  appSource: string;
}

// ── Colors ───────────────────────────────────────────────────────

const APP_PRIMARY: Record<string, string> = {
  tinder: "#ec4899",
  bumble: "#f59e0b",
  hinge: "#8b5cf6",
  happn: "#f97316",
};

const APP_LABEL: Record<string, string> = {
  tinder: "Tinder",
  bumble: "Bumble",
  hinge: "Hinge",
  happn: "Happn",
};

// ── Utility components (same as Insights.tsx) ────────────────────

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cfg = {
    confirmed: { bg: "bg-green-50", text: "text-green-600", label: "Confirme", icon: "✓" },
    debunked: { bg: "bg-red-50", text: "text-red-500", label: "Refute", icon: "✗" },
    mixed: { bg: "bg-amber-50", text: "text-amber-600", label: "Mixte", icon: "~" },
  }[verdict];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function AppTag({ app }: { app: App }) {
  const c = { tinder: "bg-pink-500/20 text-pink-400", hinge: "bg-violet-500/20 text-violet-400", both: "bg-brand-50 text-brand-500" }[app];
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
        <span key={d} className={`h-1.5 w-1.5 rounded-full ${d <= impact ? "bg-brand-400" : "bg-gray-200"}`} />
      ))}
    </span>
  );
}

function ComparisonTable({ rows, col1Label, col2Label }: {
  rows: { metric: string; tinder: string; hinge: string; verdict?: string }[];
  col1Label?: string;
  col2Label?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-white">
            <th className="px-3 py-2 text-slate-600">Metrique</th>
            <th className="px-3 py-2 text-pink-400">{col1Label || "Tinder"}</th>
            <th className="px-3 py-2 text-violet-400">{col2Label || "Hinge"}</th>
            <th className="hidden px-3 py-2 text-slate-600 sm:table-cell">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metric} className="border-b border-gray-200 last:border-0">
              <td className="px-3 py-1.5 text-slate-600">{r.metric}</td>
              <td className="px-3 py-1.5 text-pink-300">{r.tinder}</td>
              <td className="px-3 py-1.5 text-violet-300">{r.hinge}</td>
              <td className="hidden px-3 py-1.5 text-slate-400 sm:table-cell">{r.verdict}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Teaser component (always visible — above the paywall) ────────

export function PremiumInsightsTeaser({ data, appSource }: PremiumInsightsSectionProps) {
  const color = APP_PRIMARY[appSource] || "#6366f1";
  const heroH = data.heroStats.hypotheses;

  return (
    <div className="space-y-6 mt-10">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SpotlightCard value={heroH.total} label="hypotheses testees" sublabel="contre tes donnees" color={color} icon="🔬" />
        <SpotlightCard value={heroH.confirmed} label="confirmees" sublabel={`${heroH.total > 0 ? Math.round((heroH.confirmed / heroH.total) * 100) : 0}% des tests`} color="#22c55e" icon="✓" />
        <SpotlightCard value={heroH.debunked} label="infirmees" sublabel="mythes casses" color="#ef4444" icon="✗" />
        <SpotlightCard value={heroH.mixed} label="nuancees" sublabel="ca depend" color="#f59e0b" icon="~" />
      </div>
    </div>
  );
}

// ── Main component (gated behind paywall) ────────────────────────

export default function PremiumInsightsSection({ data, appSource }: PremiumInsightsSectionProps) {
  const color = APP_PRIMARY[appSource] || "#6366f1";
  const appLabel = APP_LABEL[appSource] || appSource;
  const narratives = data.sectionNarratives;
  const [hypothesisFilter, setHypothesisFilter] = useState<string>("all");

  // Data availability checks
  const has = {
    conversationScores: data.conversationScores.length > 0,
    profileComparison: data.profileComparison.length > 0,
    tinderProblems: data.tinderProblems.length > 0,
    hingeQuickWins: data.hingeQuickWins.length > 0,
    photoTiers: data.photoTiers.length > 0,
    crossAppRoi: data.crossAppRoi.length > 0,
    openerPatterns: data.openerPatterns.length > 0,
    topicRanking: data.topicRanking.length > 0,
    ghostCauses: data.ghostCauses.length > 0,
    bestConvos: data.bestConvos.length > 0,
    messageBalance: data.messageBalance.length > 0,
    openerLengthBars: data.openerLengthBars.length > 0,
    questionDensity: data.questionDensity.length > 0,
    triggerWords: data.triggerWords.length > 0,
    weeklyGrid: data.weeklyGrid.length > 0,
    monthlyIndex: data.monthlyIndex.length > 0,
    hingeMonthly: data.hingeMonthly.length > 0,
    hingeHourly: data.hingeHourly.length > 0,
    responseSpeed: data.responseSpeed.length > 0,
    timingInsights: data.timingInsights.length > 0,
    eloProxy: data.eloProxy.length > 0,
    selectivityCliff: data.selectivityCliff.length > 0,
    shadowbans: data.shadowbans.length > 0,
    activityLevels: data.activityLevels.length > 0,
    subscriptionRoi: data.subscriptionRoi.length > 0,
    tinderMonthlyChart: data.tinderMonthlyChart.length > 0,
    hingeMonthlyChart: data.hingeMonthlyChart.length > 0,
    postCancelShadowbans: data.postCancelShadowbans.length > 0,
    darkPatterns: data.darkPatterns.length > 0,
    budgetOptimal: data.budgetOptimal.length > 0,
    photoStats: data.photoStats.length > 0,
    beardData: data.beardData.length > 0,
    franceVsUs: data.franceVsUs.length > 0,
    hypotheses: data.hypothesisThemes.length > 0,
    clusters: data.reinforcementClusters.length > 0,
    contradictions: data.contradictionPairs.length > 0,
    costlyMistakes: data.costlyMistakes.length > 0,
    targetMetrics: data.targetMetrics.length > 0,
    commandments: data.tenCommandments.length > 0,
  };

  const hasProfile = has.profileComparison || has.tinderProblems || has.hingeQuickWins || has.photoTiers || has.crossAppRoi;
  const hasConversations = has.conversationScores || has.openerPatterns || has.topicRanking || has.bestConvos || has.messageBalance || has.ghostCauses;
  const hasOpener = has.openerLengthBars || has.questionDensity || has.triggerWords;
  const hasTiming = has.weeklyGrid || has.monthlyIndex || has.hingeMonthly || has.hingeHourly || has.responseSpeed || has.timingInsights;
  const hasAlgorithm = has.eloProxy || has.selectivityCliff || has.shadowbans || has.activityLevels;
  const hasPremium = has.subscriptionRoi || has.tinderMonthlyChart || has.hingeMonthlyChart || has.postCancelShadowbans || has.darkPatterns || has.budgetOptimal;
  const hasPhoto = has.photoStats || has.beardData || has.franceVsUs;
  const hasAction = has.costlyMistakes || has.targetMetrics || has.commandments;

  // Build nav items based on available data
  const navItems = [
    hasProfile && { id: "pi-profile", emoji: "👤", label: "Profil" },
    hasConversations && { id: "pi-conversations", emoji: "💬", label: "Conversations" },
    hasOpener && { id: "pi-opener", emoji: "✉️", label: "Opener" },
    hasTiming && { id: "pi-timing", emoji: "⏰", label: "Timing" },
    hasAlgorithm && { id: "pi-algorithm", emoji: "🎯", label: "Algorithme" },
    hasPremium && { id: "pi-premium", emoji: "💎", label: "Premium" },
    hasPhoto && { id: "pi-photo", emoji: "📷", label: "Photo" },
    has.hypotheses && { id: "pi-hypotheses", emoji: "🔬", label: "Hypotheses" },
    has.clusters && { id: "pi-clusters", emoji: "🔗", label: "Clusters" },
    hasAction && { id: "pi-action", emoji: "🚀", label: "Plan" },
  ].filter(Boolean) as { id: string; emoji: string; label: string }[];

  // Hypothesis filtering
  const heroH = data.heroStats.hypotheses;
  const filteredThemes = data.hypothesisThemes.map((t) => ({
    ...t,
    hypotheses: t.hypotheses.filter((h) =>
      hypothesisFilter === "all" ? true : hypothesisFilter === t.id ? true : h.verdict === hypothesisFilter
    ),
  })).filter((t) => t.hypotheses.length > 0);

  // Compute avg for AreaChart reference lines
  const tinderAvgConv = has.tinderMonthlyChart
    ? data.tinderMonthlyChart.reduce((s, d) => s + d.conv, 0) / data.tinderMonthlyChart.length
    : 0;
  const hingeAvgConv = has.hingeMonthlyChart
    ? data.hingeMonthlyChart.reduce((s, d) => s + d.conv, 0) / data.hingeMonthlyChart.length
    : 0;

  return (
    <div className="space-y-24">
      {navItems.length > 0 && <SectionNav items={navItems} badgeLabel="Insights" />}

      {/* ═══════════ HERO ═══════════ */}
      <section className="space-y-6">
        {/* Verdict bar */}
        {heroH.total > 0 && (
          <motion.div {...fadeIn(0)} className="space-y-2">
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              <div className="bg-green-500/80 transition-all" style={{ width: `${(heroH.confirmed / heroH.total) * 100}%` }} />
              <div className="bg-red-500/80 transition-all" style={{ width: `${(heroH.debunked / heroH.total) * 100}%` }} />
              <div className="bg-amber-500/80 transition-all" style={{ width: `${(heroH.mixed / heroH.total) * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-600 font-medium">{heroH.confirmed} confirmees</span>
              <span className="text-red-500 font-medium">{heroH.debunked} refutees</span>
              <span className="text-amber-600 font-medium">{heroH.mixed} mixtes</span>
            </div>
          </motion.div>
        )}

        {/* Conversation score rings */}
        {has.conversationScores && (
          <motion.div {...fadeIn(0.1)}>
            <GlassCard>
              <h3 className="text-sm font-semibold text-slate-600 mb-5">Score conversationnel</h3>
              <div className="grid grid-cols-3 gap-6 sm:grid-cols-6 justify-items-center">
                {data.conversationScores.map((s) => (
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
        )}
      </section>

      {/* ═══════════ PROFILE ═══════════ */}
      {hasProfile && (
        <section id="pi-profile" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="👤" title="Diagnostic Profil" />
          {narratives.profile && <NarrativeIntro text={narratives.profile} />}

          {has.profileComparison && (
            <motion.div {...fadeIn(0.1)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">{appLabel} — face a face</h3>
                <ComparisonTable rows={data.profileComparison} />
              </GlassCard>
            </motion.div>
          )}

          {/* Problems + Quick Wins */}
          {(has.tinderProblems || has.hingeQuickWins) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {has.tinderProblems && (
                <motion.div {...fadeIn(0.15)}>
                  <GlassCard className="border-red-200 h-full">
                    <h3 className="text-sm font-semibold text-red-500 mb-3">Problemes detectes</h3>
                    <div className="space-y-3">
                      {data.tinderProblems.map((p) => (
                        <div key={p.title} className="flex items-start gap-2">
                          <SeverityDot severity={p.severity} />
                          <div>
                            <p className="text-xs font-medium text-slate-800">{p.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{p.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
              {has.hingeQuickWins && (
                <motion.div {...fadeIn(0.2)}>
                  <GlassCard className="border-green-200 h-full">
                    <h3 className="text-sm font-semibold text-green-600 mb-3">Quick Wins</h3>
                    <div className="space-y-3">
                      {data.hingeQuickWins.map((q) => (
                        <div key={q.title}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-800">{q.title}</span>
                            <span className="text-[10px] text-green-600 bg-green-50 rounded px-1.5 py-0.5">{q.impact}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{q.detail}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>
          )}

          {has.photoTiers && (
            <motion.div {...fadeIn(0.25)}>
              <ExpandToggle title="Photo ranking par tier (S/A/B/C)">
                <GlassCard>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {data.photoTiers.map((t) => (
                      <div key={t.tier}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold" style={{ color: t.color }}>Tier {t.tier}</span>
                        </div>
                        {t.photos.map((p) => (
                          <div key={p.name} className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                            <span>{p.emoji}</span><span>{p.name}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </ExpandToggle>
            </motion.div>
          )}

          {has.crossAppRoi && (
            <motion.div {...fadeIn(0.3)}>
              <ExpandToggle title="ROI detaille par app">
                <ComparisonTable rows={data.crossAppRoi} />
              </ExpandToggle>
            </motion.div>
          )}
        </section>
      )}

      {/* ═══════════ CONVERSATIONS ═══════════ */}
      {hasConversations && (
        <section id="pi-conversations" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="💬" title="Conversations" />
          {narratives.conversations && <NarrativeIntro text={narratives.conversations} />}

          {has.openerPatterns && (
            <motion.div {...fadeIn(0.1)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Types d'openers — impact mesure</h3>
                <MiniBar bars={data.openerPatterns.map((o) => ({ label: o.type, value: o.avgMsgs, color: o.color }))} />
                <p className="mt-3 text-[11px] text-slate-400">Msgs moyens par conversation selon le type d'opener utilise</p>
              </GlassCard>
            </motion.div>
          )}

          {has.topicRanking && (
            <motion.div {...fadeIn(0.15)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Sujets gagnants — par longueur de convo</h3>
                <div className="space-y-2">
                  {data.topicRanking.map((t) => (
                    <div key={t.topic} className="flex items-center gap-3">
                      <span className="text-lg w-7 text-center">{t.emoji}</span>
                      <span className="text-xs text-slate-600 w-24 shrink-0">{t.topic}</span>
                      <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full bg-brand-500/70"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(t.avgMsgs / Math.max(...data.topicRanking.map(x => x.avgMsgs), 1)) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                      <span className="text-xs text-green-600 font-medium w-14 text-right">{t.delta}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Best convos + message balance */}
          {(has.bestConvos || has.messageBalance) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {has.bestConvos && (
                <motion.div {...fadeIn(0.2)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Top conversations</h3>
                    <div className="space-y-3">
                      {data.bestConvos.map((c, i) => (
                        <div key={c.name} className="flex items-center gap-3 rounded-lg bg-white p-3">
                          <span className="text-2xl font-extrabold text-brand-500/30">#{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{c.name}</span>
                              <AppTag app={c.app} />
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{c.highlight}</p>
                          </div>
                          <span className="text-2xl font-extrabold text-brand-500">{c.msgs}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
              {has.messageBalance && (
                <motion.div {...fadeIn(0.25)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Equilibre des messages</h3>
                    <div className="space-y-3">
                      {data.messageBalance.map((m) => (
                        <div key={m.category}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500">{m.category}</span>
                            <span className="text-slate-600 font-medium">{m.pct}%</span>
                          </div>
                          <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
                            <motion.div
                              className={`absolute inset-y-0 left-0 rounded-full ${m.pct >= 50 ? "bg-green-500/60" : m.pct >= 20 ? "bg-amber-500/60" : "bg-brand-500/60"}`}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${m.pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{m.interpretation}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>
          )}

          {has.ghostCauses && (
            <motion.div {...fadeIn(0.3)}>
              <ExpandToggle title="Causes detaillees du ghost">
                <GlassCard>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-white">
                          <th className="px-3 py-2 text-slate-600">Cause</th>
                          <th className="px-3 py-2 text-pink-400">{appLabel}</th>
                          <th className="px-3 py-2 text-violet-400">Hinge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ghostCauses.map((g) => (
                          <tr key={g.cause} className="border-b border-gray-200 last:border-0">
                            <td className="px-3 py-1.5 text-slate-600">{g.cause}</td>
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
          )}
        </section>
      )}

      {/* ═══════════ OPENER FORMULA ═══════════ */}
      {hasOpener && (
        <section id="pi-opener" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="✉️" title="La Formule de l'Opener" />
          {narratives.opener && <NarrativeIntro text={narratives.opener} />}

          {(has.openerLengthBars || has.questionDensity) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {has.openerLengthBars && (
                <motion.div {...fadeIn(0.1)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Longueur optimale</h3>
                    <MiniBar bars={data.openerLengthBars} />
                  </GlassCard>
                </motion.div>
              )}
              {has.questionDensity && (
                <motion.div {...fadeIn(0.15)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Densite de questions</h3>
                    <MiniBar bars={data.questionDensity} maxOverride={50} />
                  </GlassCard>
                </motion.div>
              )}
            </div>
          )}

          {has.triggerWords && (
            <motion.div {...fadeIn(0.2)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Mots declencheurs</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.triggerWords.map((t) => (
                    <div key={t.word} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                      <span className="text-xs text-slate-600">{t.word}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${t.verdict === "critical" ? "text-red-500" : "text-green-600"}`}>
                          {t.ghostRate}% ghost
                        </span>
                        <SeverityDot severity={t.verdict} />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </section>
      )}

      {/* ═══════════ TIMING ═══════════ */}
      {hasTiming && (
        <section id="pi-timing" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="⏰" title="Timing & Strategie" />
          {narratives.timing && <NarrativeIntro text={narratives.timing} />}

          {/* Weekly grid — full table */}
          {has.weeklyGrid && (
            <motion.div {...fadeIn(0.1)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Tes swipes par jour — volume vs conversion</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="px-2 py-2 text-slate-600">Jour</th>
                        <th className="px-2 py-2" style={{ color }}>Likes</th>
                        <th className="px-2 py-2" style={{ color }}>Matchs</th>
                        <th className="px-2 py-2" style={{ color }}>Conv.</th>
                        <th className="px-2 py-2 text-slate-600">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.weeklyGrid.map((w) => {
                        const isBest = w.overall?.includes("Meilleur") || w.overall?.includes("BEST");
                        const isWorst = w.overall?.includes("Pire") || w.overall?.includes("piege");
                        return (
                          <tr key={w.day} className={`border-b border-gray-200 last:border-0 ${isBest ? "bg-green-500/[0.05]" : isWorst ? "bg-red-500/[0.03]" : ""}`}>
                            <td className="px-2 py-1.5 text-slate-600 font-medium">{w.day}</td>
                            <td className="px-2 py-1.5 font-mono" style={{ color }}>{w.tinderLikes.toLocaleString("fr-FR")}</td>
                            <td className="px-2 py-1.5" style={{ color }}>{w.tinderMatchs}</td>
                            <td className={`px-2 py-1.5 font-bold ${parseFloat(w.tinderConv) >= 0.9 ? "text-green-600" : parseFloat(w.tinderConv) <= 0.55 ? "text-red-500" : "text-slate-500"}`}>{w.tinderConv}</td>
                            <td className={`px-2 py-1.5 text-[10px] font-medium ${isBest ? "text-green-600" : isWorst ? "text-red-500" : "text-slate-400"}`}>{w.overall || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Monthly index table */}
          {has.monthlyIndex && (
            <motion.div {...fadeIn(0.15)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Evolution mensuelle — volume, selectivite, conversion</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="px-2 py-2 text-slate-600">Mois</th>
                        <th className="px-2 py-2" style={{ color }}>Likes</th>
                        <th className="px-2 py-2" style={{ color }}>Matchs</th>
                        <th className="px-2 py-2" style={{ color }}>Conv.</th>
                        <th className="px-2 py-2 text-slate-600">Like ratio</th>
                        <th className="px-2 py-2 text-slate-500">Analyse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlyIndex.map((m) => (
                        <tr key={m.month} className={`border-b border-gray-200 last:border-0 ${m.tinderConv >= 1.1 ? "bg-green-500/[0.05]" : m.tinderConv <= 0.3 ? "bg-red-500/[0.03]" : ""}`}>
                          <td className="px-2 py-1.5 text-slate-600 font-medium text-[11px]">{m.month}</td>
                          <td className="px-2 py-1.5 font-mono" style={{ color }}>{m.tinderLikes.toLocaleString("fr-FR")}</td>
                          <td className="px-2 py-1.5" style={{ color }}>{m.tinderMatchs}</td>
                          <td className={`px-2 py-1.5 font-bold ${m.tinderConv >= 1.0 ? "text-green-600" : m.tinderConv <= 0.35 ? "text-red-500" : "text-slate-500"}`}>{m.tinderConv}%</td>
                          <td className={`px-2 py-1.5 ${parseInt(m.likeRatio) > 50 ? "text-red-500" : parseInt(m.likeRatio) <= 35 ? "text-green-600" : "text-slate-500"}`}>{m.likeRatio}</td>
                          <td className="px-2 py-1.5 text-[10px] text-slate-400">{m.insight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Hinge monthly table */}
          {has.hingeMonthly && (
            <motion.div {...fadeIn(0.18)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-violet-400 mb-3">Hinge — Evolution mensuelle</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="px-2 py-2 text-slate-600">Mois</th>
                        <th className="px-2 py-2 text-violet-400">Likes</th>
                        <th className="px-2 py-2 text-violet-400">Matchs</th>
                        <th className="px-2 py-2 text-violet-400">Conv.</th>
                        <th className="px-2 py-2 text-slate-500">Analyse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.hingeMonthly.map((m) => (
                        <tr key={m.month} className={`border-b border-gray-200 last:border-0 ${m.hingeConv >= 2.0 ? "bg-green-500/[0.05]" : m.hingeConv <= 0.9 ? "bg-red-500/[0.03]" : ""}`}>
                          <td className="px-2 py-1.5 text-slate-600 font-medium text-[11px]">{m.month}</td>
                          <td className="px-2 py-1.5 text-violet-300 font-mono">{m.hingeLikes}</td>
                          <td className="px-2 py-1.5 text-violet-300">{m.hingeMatchs}</td>
                          <td className={`px-2 py-1.5 font-bold ${m.hingeConv >= 2.0 ? "text-green-600" : m.hingeConv <= 0.9 ? "text-red-500" : "text-violet-300"}`}>{m.hingeConv}%</td>
                          <td className="px-2 py-1.5 text-[10px] text-slate-400">{m.insight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Hinge hourly + Response speed side by side */}
          {(has.hingeHourly || has.responseSpeed) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {has.hingeHourly && (
                <motion.div {...fadeIn(0.2)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-violet-400 mb-3">Quand tu likes vs quand tu matches</h3>
                    {data.hingeHourly.map((h) => (
                      <div key={h.slot} className="mb-2.5 last:mb-0">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">{h.slot}</span>
                          <span className="text-slate-400">{h.pct}% likes → {h.matchPct}% matchs</span>
                        </div>
                        <div className="flex gap-1 mt-0.5">
                          <div className="flex-1 relative h-3 rounded-full bg-gray-100 overflow-hidden">
                            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-violet-500/40" initial={{ width: 0 }} whileInView={{ width: `${h.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} />
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-violet-300">{h.likes} L</span>
                          </div>
                          <div className="flex-1 relative h-3 rounded-full bg-gray-100 overflow-hidden">
                            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-green-500/40" initial={{ width: 0 }} whileInView={{ width: `${h.matchPct * 2}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} />
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-green-300">{h.matchs} M</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </GlassCard>
                </motion.div>
              )}
              {has.responseSpeed && (
                <motion.div {...fadeIn(0.25)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Vitesse de reponse → longueur de convo</h3>
                    {data.responseSpeed.map((r) => (
                      <div key={r.speed} className="mb-2 last:mb-0">
                        <span className="text-[11px] text-slate-500">{r.speed}</span>
                        <div className="flex gap-2 mt-0.5">
                          <div className="flex-1">
                            <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: `${color}99` }} initial={{ width: 0 }} whileInView={{ width: `${(r.tinderMsgs / Math.max(...data.responseSpeed.map(x => Math.max(x.tinderMsgs, x.hingeMsgs)), 1)) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} />
                            </div>
                            <span className="text-[9px]" style={{ color }}>{r.tinderMsgs} msgs</span>
                          </div>
                          <div className="flex-1">
                            <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div className="absolute inset-y-0 left-0 rounded-full bg-violet-500/60" initial={{ width: 0 }} whileInView={{ width: `${(r.hingeMsgs / Math.max(...data.responseSpeed.map(x => Math.max(x.tinderMsgs, x.hingeMsgs)), 1)) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} />
                            </div>
                            <span className="text-[9px] text-violet-400">{r.hingeMsgs} msgs</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </GlassCard>
                </motion.div>
              )}
            </div>
          )}

          {/* Timing insights */}
          {has.timingInsights && (
            <motion.div {...fadeIn(0.25)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Revelations timing — issues de tes donnees</h3>
                <div className="space-y-3">
                  {data.timingInsights.map((t, i) => (
                    <motion.div
                      key={t.ref}
                      className={`rounded-lg px-3 py-2.5 border ${t.severity === "critical" ? "bg-red-50 border-red-200" : t.severity === "warning" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}
                      {...fadeIn(0.05 * i)}
                    >
                      <div className="flex items-start gap-2">
                        <SeverityDot severity={t.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800">{t.title}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{t.ref}</span>
                          </div>
                          <p className="text-xs font-semibold mt-1" style={{ color: t.severity === "critical" ? "#f87171" : t.severity === "warning" ? "#fbbf24" : "#4ade80" }}>{t.data}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{t.detail}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </section>
      )}

      {/* ═══════════ ALGORITHM ═══════════ */}
      {hasAlgorithm && (
        <section id="pi-algorithm" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="🎯" title="L'Algorithme" />
          {narratives.algorithm && <NarrativeIntro text={narratives.algorithm} />}

          {/* ELO timeline */}
          {has.eloProxy && (
            <motion.div {...fadeIn(0.1)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">ELO proxy — score de desirabilite estime</h3>
                <div className="flex gap-1 sm:gap-2 h-32">
                  {data.eloProxy.map((e) => {
                    const maxElo = Math.max(...data.eloProxy.map(x => x.score), 1);
                    const h = Math.max(4, (e.score / maxElo) * 100);
                    return (
                      <div key={e.period} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <span className="text-[9px] text-slate-500 font-medium">{e.score.toFixed(1)}</span>
                        <motion.div
                          className="w-full rounded-t-sm"
                          style={{ backgroundColor: e.score >= 1.0 ? "#22c55e" : e.score >= 0.5 ? "#f59e0b" : "#ef4444" }}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6 }}
                        />
                        <span className="text-[8px] text-slate-400 -rotate-45 origin-top-left whitespace-nowrap">{e.period}</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Selectivity cliff + Activity */}
          {(has.selectivityCliff || has.activityLevels) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {has.selectivityCliff && (
                <motion.div {...fadeIn(0.15)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">La falaise de selectivite</h3>
                    <MiniBar bars={data.selectivityCliff.map(b => ({
                      ...b,
                      value: b.value * 100,
                    }))} maxOverride={110} />
                    <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2">
                      <p className="text-[11px] text-red-500 font-medium">Au-dessus de 50% de like ratio, ta conversion chute</p>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
              {has.activityLevels && (
                <motion.div {...fadeIn(0.2)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Multiplicateur d'activite</h3>
                    {data.activityLevels.map((a) => (
                      <div key={a.level} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                        <span className="text-xs text-slate-500">{a.level}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-600">{a.matchesPerDay.toFixed(2)} match/jour</span>
                          <span className="text-sm font-bold text-brand-500">{a.multiplier}</span>
                        </div>
                      </div>
                    ))}
                  </GlassCard>
                </motion.div>
              )}
            </div>
          )}

          {has.shadowbans && (
            <motion.div {...fadeIn(0.25)}>
              <ExpandToggle title={`Detail des ${data.shadowbans.length} shadowbans`}>
                <GlassCard>
                  <div className="space-y-2">
                    {data.shadowbans.map((s) => (
                      <div key={s.period} className="flex items-center justify-between rounded-lg bg-red-500/[0.03] px-3 py-2">
                        <span className="text-xs text-slate-500 font-mono">{s.period}</span>
                        <span className="text-xs text-slate-600">{s.duration}</span>
                        <span className="text-xs text-red-500 font-medium">{s.likesWasted} likes</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </ExpandToggle>
            </motion.div>
          )}
        </section>
      )}

      {/* ═══════════ PREMIUM & BUDGET ═══════════ */}
      {hasPremium && (
        <section id="pi-premium" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="💎" title="Premium & Budget" />
          {narratives.premium && <NarrativeIntro text={narratives.premium} />}

          {/* Subscription ROI */}
          {has.subscriptionRoi && (
            <motion.div {...fadeIn(0.1)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Tes depenses reelles — ROI mesure</h3>
                <div className="space-y-2">
                  {data.subscriptionRoi.map((s) => (
                    <div key={s.name} className={`rounded-lg px-3 py-2.5 border ${s.verdict === "critical" ? "bg-red-50 border-red-200" : s.verdict === "warning" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                      <div className="flex items-start gap-2">
                        <SeverityDot severity={s.verdict} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800">{s.name}</span>
                            <span className="text-xs font-bold text-red-500">{s.spent}</span>
                            <span className="text-[10px] text-slate-400">{s.duration}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{s.result}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Tinder monthly AreaChart */}
          {has.tinderMonthlyChart && (
            <motion.div {...fadeIn(0.15)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-1">Chronologie mensuelle — conversion & tendance</h3>
                <p className="text-[10px] text-slate-400 mb-3">Chaque point montre la conversion du mois. Dots colores : vert = clean, rouge = shadowban, violet = paye.</p>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.tinderMonthlyChart} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="piConvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
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
                    <ReferenceLine y={Math.round(tinderAvgConv * 100) / 100} stroke="#6b7280" strokeDasharray="3 3" label={{ value: `Moy. ${tinderAvgConv.toFixed(2)}%`, fill: "#9ca3af", fontSize: 9, position: "right" }} />
                    <Area
                      type="monotone"
                      dataKey="conv"
                      stroke={color}
                      strokeWidth={2.5}
                      fill="url(#piConvGrad)"
                      dot={(props: any) => {
                        const { cx, cy, payload, index } = props;
                        if (typeof cx !== "number" || typeof cy !== "number") return <circle key={`td-${index}`} r={0} />;
                        const isSB = payload?.hasShadowban;
                        const isPaid = payload?.status === "paid";
                        return (
                          <circle
                            key={`td-${index}`}
                            cx={cx}
                            cy={cy}
                            r={isSB ? 6 : 4}
                            fill={isSB ? "#ef4444" : isPaid ? "#8b5cf6" : "#10b981"}
                            stroke={isSB ? "#991b1b" : isPaid ? "#4c1d95" : "#065f46"}
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: color }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Mois avec shadowban</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Mois paye</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Mois clean</span>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Hinge monthly AreaChart */}
          {has.hingeMonthlyChart && (
            <motion.div {...fadeIn(0.2)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-violet-400 mb-1">Hinge — Chronologie mensuelle</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.hingeMonthlyChart} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="piHingeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#d1d5db", fontWeight: 600 }}
                      formatter={(value: number, _name: string, props: any) => {
                        const p = props?.payload;
                        if (!p) return [`${value}%`, "Conv."];
                        return [`${p.conv}% (${p.matchs} matchs / ${p.likes} likes)`, p.status === "paid" ? "💎 Paye" : "🆓 Gratuit"];
                      }}
                      labelFormatter={(_label: any, payload: any[]) => {
                        const p = payload?.[0]?.payload;
                        return p ? `${p.month} — ${p.insight}` : "";
                      }}
                    />
                    <ReferenceLine y={Math.round(hingeAvgConv * 100) / 100} stroke="#6b7280" strokeDasharray="3 3" label={{ value: `Moy. ${hingeAvgConv.toFixed(2)}%`, fill: "#9ca3af", fontSize: 9, position: "right" }} />
                    <Area
                      type="monotone"
                      dataKey="conv"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fill="url(#piHingeGrad)"
                      dot={(props: any) => {
                        const { cx, cy, payload, index } = props;
                        if (typeof cx !== "number" || typeof cy !== "number") return <circle key={`hd-${index}`} r={0} />;
                        const isPaid = payload?.status === "paid";
                        return (
                          <circle key={`hd-${index}`} cx={cx} cy={cy} r={4}
                            fill={isPaid ? "#8b5cf6" : "#10b981"} stroke={isPaid ? "#4c1d95" : "#065f46"} strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: "#8b5cf6" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>
          )}

          {/* Post-cancellation shadowbans */}
          {has.postCancelShadowbans && (
            <motion.div {...fadeIn(0.25)}>
              <GlassCard className="border-red-200">
                <h3 className="text-sm font-semibold text-red-500 mb-3">Shadowbans post-annulation</h3>
                <div className="space-y-2">
                  {data.postCancelShadowbans.map((s) => (
                    <div key={s.cancellation} className="rounded-lg px-3 py-2.5 bg-red-500/[0.04] border border-red-500/10">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-slate-500">Annulation</span>
                        <span className="font-medium text-slate-800">{s.cancellation}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px]">
                        <span className="text-red-500 font-bold">→ Shadowban {s.duration}</span>
                        <span className="text-slate-400">{s.likesWasted} likes perdus</span>
                        <span className="text-green-600/70">Recovery ELO : {s.recoveryElo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Budget + Dark patterns */}
          {(has.budgetOptimal || has.darkPatterns) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {has.budgetOptimal && (
                <motion.div {...fadeIn(0.15)}>
                  <GlassCard className="h-full border-green-200">
                    <h3 className="text-sm font-semibold text-green-600 mb-3">Budget optimal recommande</h3>
                    <div className="space-y-2">
                      {data.budgetOptimal.map((b) => (
                        <div key={b.item} className={`text-xs ${b.item === "TOTAL" ? "border-t border-gray-200 pt-2 mt-2" : ""}`}>
                          <div className={`flex items-center justify-between ${b.item === "TOTAL" ? "font-bold text-green-600" : "text-slate-600"}`}>
                            <span>{b.item}</span>
                            <span>{b.cost}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{b.why}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
              {has.darkPatterns && (
                <motion.div {...fadeIn(0.2)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-red-500 mb-3">Dark Patterns</h3>
                    <ExpandToggle title={`${data.darkPatterns.length} patterns documentes`}>
                      <div className="space-y-2 mt-2">
                        {data.darkPatterns.map((d) => (
                          <div key={d.pattern} className="text-[11px] text-slate-500 border-b border-gray-200 pb-2 last:border-0">
                            <span className="font-medium text-slate-600">{d.pattern}</span>
                            <p className="text-slate-400 mt-0.5">{d.mechanism}</p>
                            <p className="text-green-600/70 mt-0.5">Defense : {d.defense}</p>
                          </div>
                        ))}
                      </div>
                    </ExpandToggle>
                  </GlassCard>
                </motion.div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ═══════════ PHOTO SCIENCE ═══════════ */}
      {hasPhoto && (
        <section id="pi-photo" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="📷" title="Photo Science" />
          {narratives.photo && <NarrativeIntro text={narratives.photo} />}

          {has.photoStats && (
            <motion.div {...fadeIn(0.1)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Stats photo — impact mesure</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {data.photoStats.map((p) => (
                    <div key={p.metric} className="rounded-lg bg-white p-3 text-center">
                      <p className="text-lg sm:text-xl font-bold text-brand-500">{p.impact}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{p.metric}</p>
                      <p className="text-[9px] text-slate-400">{p.source}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {(has.beardData || has.franceVsUs) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {has.beardData && (
                <motion.div {...fadeIn(0.15)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Barbe — style optimal</h3>
                    <MiniBar bars={data.beardData.map(b => ({
                      label: `${b.style}${b.preferred ? " ⭐" : ""}`,
                      value: b.attractiveness,
                      color: b.preferred ? "#22c55e" : "#6366f1",
                    }))} />
                  </GlassCard>
                </motion.div>
              )}
              {has.franceVsUs && (
                <motion.div {...fadeIn(0.2)}>
                  <GlassCard className="h-full">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">France vs US/UK</h3>
                    <div className="space-y-2">
                      {data.franceVsUs.map((f) => (
                        <div key={f.aspect} className="text-[11px] border-b border-gray-200 pb-1.5 last:border-0">
                          <span className="text-slate-600 font-medium">{f.aspect}</span>
                          <div className="flex gap-4 mt-0.5">
                            <span className="text-brand-500">🇫🇷 {f.france}</span>
                            <span className="text-slate-400">🇺🇸 {f.usuk}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ═══════════ HYPOTHESES ═══════════ */}
      {has.hypotheses && (
        <section id="pi-hypotheses" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="🔬" title={`${heroH.total} Hypotheses`} subtitle="Testees contre tes donnees reelles" />
          {narratives.hypotheses && <NarrativeIntro text={narratives.hypotheses} />}

          {/* Filter pills */}
          <motion.div {...fadeIn(0.1)} className="flex flex-wrap gap-2">
            {[
              { id: "all", label: `Toutes (${heroH.total})` },
              { id: "confirmed", label: `✓ Confirmees (${heroH.confirmed})` },
              { id: "debunked", label: `✗ Refutees (${heroH.debunked})` },
              { id: "mixed", label: `~ Mixtes (${heroH.mixed})` },
              ...data.hypothesisThemes.map((t) => ({ id: t.id, label: `${t.emoji} ${t.title}` })),
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setHypothesisFilter(f.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  hypothesisFilter === f.id
                    ? "border-brand-500 bg-brand-50 text-brand-500"
                    : "border-gray-200 bg-white text-slate-500 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </motion.div>

          {/* Hypothesis grid */}
          {filteredThemes.map((theme) => (
            <div key={theme.id} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <span>{theme.emoji}</span>{theme.title}
                <span className="text-[10px] text-slate-400">({theme.hypotheses.length})</span>
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
                          <span className="text-[10px] font-mono text-brand-500/70 bg-brand-500/10 rounded px-1.5 py-0.5">{h.id}</span>
                          <ImpactDots impact={h.impact} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AppTag app={h.app} />
                          <VerdictBadge verdict={h.verdict} />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mb-1.5">{h.title}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{h.insight}</p>
                      {h.bars && (
                        <div className="mt-3">
                          <MiniBar bars={h.bars} />
                        </div>
                      )}
                      {h.stats && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {h.stats.map((s) => (
                            <div key={s.label} className="rounded-lg bg-white px-2.5 py-1.5">
                              <p className={`text-sm font-bold ${s.severity === "good" ? "text-green-600" : s.severity === "critical" ? "text-red-500" : "text-slate-600"}`}>{s.value}</p>
                              <p className="text-[9px] text-slate-400">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {h.recommendations && h.recommendations.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-gray-200 pt-3">
                          {h.recommendations.map((rec, ri) => {
                            const icon = rec.type === "do" ? "✅" : rec.type === "dont" ? "🚫" : "💡";
                            const textColor = rec.type === "do" ? "text-green-600/90" : rec.type === "dont" ? "text-red-500/90" : "text-amber-600/90";
                            return (
                              <div key={ri} className="flex items-start gap-1.5">
                                <span className="text-[10px] mt-px shrink-0">{icon}</span>
                                <span className={`text-[11px] leading-relaxed ${textColor}`}>{rec.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ═══════════ CLUSTERS ═══════════ */}
      {has.clusters && (
        <section id="pi-clusters" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="🔗" title="Clusters de Renforcement" subtitle="Patterns ou les hypotheses convergent — et tensions qui les nuancent" />

          <div className="grid gap-4 sm:grid-cols-2">
            {data.reinforcementClusters.map((cluster, ci) => (
              <motion.div
                key={cluster.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: ci * 0.06 }}
              >
                <GlassCard className="h-full border-brand-500/10">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-10 w-10 items-center justify-center bg-brand-50 text-xl">{cluster.emoji}</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{cluster.name}</h4>
                      <span className="text-[10px] text-brand-500/80 font-medium uppercase tracking-wider">{cluster.tagline}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{cluster.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {cluster.hypothesisIds.map((hid) => (
                      <span key={hid} className="text-[10px] font-mono text-brand-500/70 bg-brand-500/10 rounded px-1.5 py-0.5">{hid}</span>
                    ))}
                  </div>
                  <div className="rounded-lg bg-green-500/5 border border-green-500/10 px-3 py-2">
                    <p className="text-[11px] text-green-600/90 leading-relaxed">
                      <span className="font-semibold">Insight :</span> {cluster.insight}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Contradictions */}
          {has.contradictions && (
            <motion.div {...fadeIn(0.1)}>
              <GlassCard className="border-amber-200">
                <h3 className="text-sm font-semibold text-amber-600 mb-1 flex items-center gap-2">
                  <span>⚡</span> Tensions & Contradictions
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">Des hypotheses qui semblent se contredire — mais chacune a une resolution nuancee</p>
                <div className="space-y-4">
                  {data.contradictionPairs.map((c, i) => (
                    <motion.div
                      key={c.id}
                      className="rounded-lg bg-white border border-gray-200 p-3"
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono text-red-500/80 bg-red-500/10 rounded px-1.5 py-0.5">{c.pair[0]}</span>
                        <span className="text-[10px] text-amber-600">vs</span>
                        <span className="text-[10px] font-mono text-red-500/80 bg-red-500/10 rounded px-1.5 py-0.5">{c.pair[1]}</span>
                        <span className="text-xs font-medium text-slate-600 ml-1">{c.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{c.description}</p>
                      <div className="rounded bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                        <p className="text-[11px] text-amber-600/90 leading-relaxed">
                          <span className="font-semibold">Resolution :</span> {c.resolution}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </section>
      )}

      {/* ═══════════ ACTION PLAN ═══════════ */}
      {hasAction && (
        <section id="pi-action" className="scroll-mt-28 space-y-6">
          <SectionTitle emoji="🚀" title="Plan d'Action" />
          {narratives.action && <NarrativeIntro text={narratives.action} />}

          {/* Costly mistakes */}
          {has.costlyMistakes && (
            <motion.div {...fadeIn(0.1)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-red-500 mb-1">Erreurs couteuses</h3>
                <div className="space-y-3 mt-3">
                  {data.costlyMistakes.map((m) => (
                    <div key={m.title} className="flex items-start gap-3 rounded-lg bg-white p-3">
                      <SeverityDot severity={m.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-800">{m.title}</span>
                          <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">{m.cost}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{m.detail}</p>
                        <span className="inline-block mt-1 text-[9px] font-mono text-brand-500/70 bg-brand-500/10 px-1.5 py-0.5 rounded">{m.ref}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Target metrics table */}
          {has.targetMetrics && (
            <motion.div {...fadeIn(0.15)}>
              <GlassCard>
                <h3 className="text-sm font-semibold text-slate-600 mb-1">Metriques cibles</h3>
                <p className="text-xs text-slate-400 mb-3">Basees sur les leviers identifies dans tes hypotheses</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="px-3 py-2 text-slate-600">Metrique</th>
                        <th className="px-3 py-2 text-red-500">Avant</th>
                        <th className="px-3 py-2 text-green-600">Cible</th>
                        <th className="hidden px-3 py-2 text-slate-600 sm:table-cell">Source data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.targetMetrics.map((t) => (
                        <tr key={t.metric} className="border-b border-gray-200 last:border-0">
                          <td className="px-3 py-1.5 text-slate-600 font-medium">{t.metric}</td>
                          <td className="px-3 py-1.5 text-red-500">{t.before}</td>
                          <td className="px-3 py-1.5 text-green-600 font-medium">{t.target}</td>
                          <td className="hidden px-3 py-1.5 text-slate-400 sm:table-cell">{t.why}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* 10 commandments */}
          {has.commandments && (
            <motion.div {...fadeIn(0.2)}>
              <GlassCard className="border-brand-500/20">
                <h3 className="text-sm font-semibold text-brand-500 mb-1">Tes Commandements</h3>
                <p className="text-xs text-slate-400 mb-4">Ancres dans tes donnees reelles</p>
                <div className="space-y-3">
                  {data.tenCommandments.map((cmd, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-500 mt-0.5"
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{cmd.rule}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="text-slate-500">{cmd.data}</span>
                          <span className="ml-2 text-[10px] font-mono text-brand-500/70 bg-brand-500/10 px-1.5 py-0.5 rounded">{cmd.ref}</span>
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </section>
      )}
    </div>
  );
}
