// Conversation Pulse — Intelligence Engine
// Analyzes full message content from RGPD exports to produce actionable conversation diagnostics.
// 100% client-side — no LLM, "vos donnees restent sur votre appareil".
//
// Based on 50 validated hypotheses (H1-H50).
// ⚠️ H18 (Wait J+1 = x3.5 msgs) BLACKLISTED — confounding non separable.
// NE JAMAIS presenter comme conseil prescriptif. Decision COMEX 2026-03-03.

import type { ConversationRecord, RawMessage, WrappedAppSource } from "./wrappedParser";
import type { AdvancedConversationInsights } from "./conversationAdvanced";
import { computeAdvancedInsights } from "./conversationAdvanced";

// ── Types ───────────────────────────────────────────────────────

export interface GhostBreakdown {
  neverReplied: number;     // match but 0 messages
  diedAtMsg2: number;       // 1-2 messages then silence (LE MUR)
  diedEarly: number;        // 3-10 messages
  sustained: number;        // 10+ messages
  total: number;
}

export interface SurvivalPoint {
  messageNumber: number;
  survivingPct: number;
}

export interface OpenerStats {
  avgLength: number;              // chars
  containsQuestion: number;       // % with "?"
  helloCount: number;             // count of generic "hello/salut/hey" openers (H50)
  frQuestionPersoRate: number;    // % FR + question + personalized
}

export interface ResponseTimeBuckets {
  under1h: number;
  under6h: number;
  under24h: number;
  over24h: number;
}

export interface EscalationStats {
  avgMessageNumber: number;       // avg message # of first escalation
  convosWithEscalation: number;
  convosTotal: number;
  optimalRange: { min: number; max: number };
  inOptimalRange: number;         // % in optimal window
}

export interface BalanceBreakdown {
  balanced: number;               // ratio 0.8-1.2
  overInvesting: number;          // ratio > 1.5
  underInvesting: number;         // ratio < 0.6
}

export interface FatigueTrend {
  monthlyOpenerLength: { month: string; avgLength: number }[];
  monthlyGhostRate: { month: string; rate: number }[];
}

export interface ScoreBreakdown {
  questionDensity: number;        // 0-20
  responseSpeed: number;          // 0-20
  openerQuality: number;          // 0-20
  escalationTiming: number;       // 0-20
  conversationBalance: number;    // 0-20
}

export interface ConversationInsights {
  // Ghost analysis (H17)
  ghostBreakdown: GhostBreakdown;
  survivalCurve: SurvivalPoint[];

  // Question density (H27)
  questionDensity: number;
  questionsByConvo: number[];
  zeroQuestionGhostRate: number;

  // Opener analysis (H43)
  openerStats: OpenerStats;

  // Response time (H34)
  responseTimeMedian: number;     // minutes
  responseTimeBuckets: ResponseTimeBuckets;

  // Escalation timing (H29)
  escalationStats: EscalationStats;

  // Double-text (H20)
  doubleTextRate: number;
  doubleTextSurvival: number;

  // Investment balance
  balanceByConvo: BalanceBreakdown;

  // Fatigue detection (H31)
  fatigueDetected: boolean;
  fatigueTrend?: FatigueTrend;

  // Conversation Pulse Score (0-100)
  score: number;
  scoreBreakdown: ScoreBreakdown;

  // Archetype
  archetype: string;
  archetypeDescription: string;

  // Metadata
  confidenceLevel: "population" | "hypothesis";
  conversationsAnalyzed: number;
  source: WrappedAppSource;

  // Advanced insights (H51-H70)
  advancedInsights?: AdvancedConversationInsights;
}

// ── Escalation detection regex (H29) ────────────────────────────

const ESCALATION_REGEX = /\b(date|caf[eé]|boire|verre|num[eé]ro|insta|snap|whatsapp|tel|t[eé]l[eé]phone|rendez[- ]?vous|rdv|resto|restaurant|sortir|retrouver|voir)\b/i;

// Generic opener poison words (H50)
// Match generic openers: "salut", "Hey!", "Coucou 😊", "Cc !", "Bonjour :)", etc.
const GENERIC_OPENERS = /^(hello|salut|hey|coucou|yo|bonjour|hi|hola|cc|slt|re|wesh|bjr)\s*[.!,;:)😊😁😄👋🙂🤗]*\s*$/iu;

// French + question + personalized heuristic
const FR_QUESTION_PERSO_REGEX = /[àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ]|(\b(tu|toi|ton|ta|tes|vous|votre|vos)\b.*\?)/i;

// ── Analysis functions ──────────────────────────────────────────

export function analyzeGhostBreakdown(
  conversations: ConversationRecord[],
  totalMatches: number
): GhostBreakdown {
  let neverReplied = 0;
  let diedAtMsg2 = 0;
  let diedEarly = 0;
  let sustained = 0;

  for (const convo of conversations) {
    const count = convo.messages.length;
    if (count === 0) {
      neverReplied++;
    } else if (count <= 2) {
      diedAtMsg2++;
    } else if (count <= 10) {
      diedEarly++;
    } else {
      sustained++;
    }
  }

  // Matches without any conversation = neverReplied
  const convosWithMessages = conversations.length;
  const ghostedMatches = Math.max(0, totalMatches - convosWithMessages);
  neverReplied += ghostedMatches;

  return {
    neverReplied,
    diedAtMsg2,
    diedEarly,
    sustained,
    total: totalMatches,
  };
}

export function computeSurvivalCurve(conversations: ConversationRecord[]): SurvivalPoint[] {
  const thresholds = [1, 2, 3, 5, 10, 15, 20, 30, 50];
  const total = conversations.length;
  if (total === 0) return [];

  return thresholds.map((threshold) => {
    const surviving = conversations.filter((c) => c.messages.length >= threshold).length;
    return {
      messageNumber: threshold,
      survivingPct: Math.round((surviving / total) * 100),
    };
  });
}

export function computeQuestionDensity(conversations: ConversationRecord[]): {
  density: number;
  byConvo: number[];
  zeroQuestionGhostRate: number;
} {
  let totalQuestions = 0;
  let totalSent = 0;
  const byConvo: number[] = [];
  let zeroQuestionConvos = 0;
  let zeroQuestionGhosted = 0;

  for (const convo of conversations) {
    const sentMsgs = convo.messages.filter((m) => m.direction === "sent");
    const questions = sentMsgs.filter((m) => m.body.includes("?")).length;
    totalQuestions += questions;
    totalSent += sentMsgs.length;
    byConvo.push(questions);

    if (questions === 0) {
      zeroQuestionConvos++;
      // Ghost = conversation died early (≤2 messages)
      if (convo.messages.length <= 2) {
        zeroQuestionGhosted++;
      }
    }
  }

  return {
    density: totalSent > 0 ? Math.round((totalQuestions / totalSent) * 100) / 100 : 0,
    byConvo,
    zeroQuestionGhostRate:
      zeroQuestionConvos > 0
        ? Math.round((zeroQuestionGhosted / zeroQuestionConvos) * 100)
        : 0,
  };
}

export function analyzeOpeners(conversations: ConversationRecord[]): OpenerStats {
  const openers: string[] = [];

  for (const convo of conversations) {
    // First sent message in the conversation
    const firstSent = convo.messages.find((m) => m.direction === "sent");
    if (firstSent && firstSent.body.trim().length > 0) {
      openers.push(firstSent.body.trim());
    }
  }

  if (openers.length === 0) {
    return { avgLength: 0, containsQuestion: 0, helloCount: 0, frQuestionPersoRate: 0 };
  }

  const avgLength = Math.round(openers.reduce((s, o) => s + o.length, 0) / openers.length);
  const withQuestion = openers.filter((o) => o.includes("?")).length;
  const helloCount = openers.filter((o) => GENERIC_OPENERS.test(o)).length;
  const frQuestionPerso = openers.filter((o) => FR_QUESTION_PERSO_REGEX.test(o)).length;

  return {
    avgLength,
    containsQuestion: Math.round((withQuestion / openers.length) * 100),
    helloCount,
    frQuestionPersoRate: Math.round((frQuestionPerso / openers.length) * 100),
  };
}

export function computeResponseTimes(conversations: ConversationRecord[]): {
  median: number; // minutes
  buckets: ResponseTimeBuckets;
} {
  const responseTimes: number[] = []; // in minutes

  for (const convo of conversations) {
    const msgs = convo.messages;
    for (let i = 1; i < msgs.length; i++) {
      // Look for: received message followed by a sent message
      if (msgs[i].direction === "sent" && msgs[i - 1].direction === "received") {
        const deltaMs = msgs[i].timestamp.getTime() - msgs[i - 1].timestamp.getTime();
        // Skip deltas < 5 seconds — likely same-batch export timestamps or bot-speed replies
        if (deltaMs >= 5000) {
          responseTimes.push(deltaMs / (60 * 1000)); // to minutes
        }
      }
    }
  }

  if (responseTimes.length === 0) {
    return { median: 0, buckets: { under1h: 0, under6h: 0, under24h: 0, over24h: 0 } };
  }

  responseTimes.sort((a, b) => a - b);
  const median = responseTimes[Math.floor(responseTimes.length / 2)];

  return {
    median: Math.max(1, Math.round(median)),
    buckets: {
      under1h: responseTimes.filter((t) => t < 60).length,
      under6h: responseTimes.filter((t) => t >= 60 && t < 360).length,
      under24h: responseTimes.filter((t) => t >= 360 && t < 1440).length,
      over24h: responseTimes.filter((t) => t >= 1440).length,
    },
  };
}

export function detectEscalation(
  conversations: ConversationRecord[],
  source: WrappedAppSource
): EscalationStats {
  const escalationMsgNumbers: number[] = [];
  let convosWithEscalation = 0;

  // Optimal range depends on app (H29)
  const optimalRange =
    source === "hinge"
      ? { min: 3, max: 8 }
      : { min: 8, max: 20 }; // Tinder/Bumble: later escalation works better

  for (const convo of conversations) {
    const sentMessages = convo.messages.filter((m) => m.direction === "sent");
    let found = false;
    for (let i = 0; i < sentMessages.length; i++) {
      if (ESCALATION_REGEX.test(sentMessages[i].body)) {
        escalationMsgNumbers.push(i + 1); // 1-indexed message number
        found = true;
        break; // Only first escalation per convo
      }
    }
    if (found) convosWithEscalation++;
  }

  const avgMessageNumber =
    escalationMsgNumbers.length > 0
      ? Math.round(escalationMsgNumbers.reduce((s, n) => s + n, 0) / escalationMsgNumbers.length)
      : 0;

  const inOptimalRange =
    escalationMsgNumbers.length > 0
      ? Math.round(
          (escalationMsgNumbers.filter((n) => n >= optimalRange.min && n <= optimalRange.max).length /
            escalationMsgNumbers.length) *
            100
        )
      : 0;

  return {
    avgMessageNumber,
    convosWithEscalation,
    convosTotal: conversations.length,
    optimalRange,
    inOptimalRange,
  };
}

export function detectDoubleText(conversations: ConversationRecord[]): {
  rate: number;
  survival: number;
} {
  let convosWithDoubleText = 0;
  let doubleTextSurvived = 0;

  for (const convo of conversations) {
    const msgs = convo.messages;
    let hasDoubleText = false;
    let doubleTextIdx = -1;

    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].direction === "sent" && msgs[i - 1].direction === "sent") {
        hasDoubleText = true;
        doubleTextIdx = i;
        break;
      }
    }

    if (hasDoubleText) {
      convosWithDoubleText++;
      // Survival = conversation continues with a received message after the double-text
      const hasResponseAfter = msgs.slice(doubleTextIdx + 1).some((m) => m.direction === "received");
      if (hasResponseAfter) doubleTextSurvived++;
    }
  }

  const total = conversations.length;
  return {
    rate: total > 0 ? Math.round((convosWithDoubleText / total) * 100) : 0,
    survival: convosWithDoubleText > 0 ? Math.round((doubleTextSurvived / convosWithDoubleText) * 100) : 0,
  };
}

export function computeInvestmentBalance(conversations: ConversationRecord[]): BalanceBreakdown {
  let balanced = 0;
  let overInvesting = 0;
  let underInvesting = 0;

  for (const convo of conversations) {
    const sent = convo.messages.filter((m) => m.direction === "sent").length;
    const received = convo.messages.filter((m) => m.direction === "received").length;
    // Skip one-sided or empty conversations — they are ghosts, not balance data
    if (received === 0 || sent === 0) continue;
    // Require at least 3 total messages for a meaningful ratio
    if (sent + received < 3) continue;
    const ratio = sent / received;
    if (ratio >= 0.6 && ratio <= 1.5) balanced++;
    else if (ratio > 1.5) overInvesting++;
    else underInvesting++;
  }

  return { balanced, overInvesting, underInvesting };
}

export function detectFatigue(conversations: ConversationRecord[]): {
  detected: boolean;
  trend?: FatigueTrend;
} {
  // Group openers by month
  const openersByMonth = new Map<string, number[]>();
  const ghostByMonth = new Map<string, { ghosted: number; total: number }>();

  for (const convo of conversations) {
    const firstSent = convo.messages.find((m) => m.direction === "sent");
    if (!firstSent) continue;
    const monthKey = `${firstSent.timestamp.getFullYear()}-${String(firstSent.timestamp.getMonth() + 1).padStart(2, "0")}`;

    // Opener length
    const lengths = openersByMonth.get(monthKey) ?? [];
    lengths.push(firstSent.body.length);
    openersByMonth.set(monthKey, lengths);

    // Ghost tracking per month
    const stats = ghostByMonth.get(monthKey) ?? { ghosted: 0, total: 0 };
    stats.total++;
    if (convo.messages.length <= 2) stats.ghosted++;
    ghostByMonth.set(monthKey, stats);
  }

  // Build monthly trends
  const months = [...openersByMonth.keys()].sort();
  if (months.length < 3) return { detected: false };

  const monthlyOpenerLength = months.map((m) => {
    const lengths = openersByMonth.get(m)!;
    return { month: m, avgLength: Math.round(lengths.reduce((s, l) => s + l, 0) / lengths.length) };
  });

  const monthlyGhostRate = months.map((m) => {
    const stats = ghostByMonth.get(m) ?? { ghosted: 0, total: 1 };
    return { month: m, rate: Math.round((stats.ghosted / stats.total) * 100) };
  });

  // Detect fatigue: 3+ consecutive months of declining opener length
  let consecutiveDeclines = 0;
  for (let i = 1; i < monthlyOpenerLength.length; i++) {
    if (monthlyOpenerLength[i].avgLength < monthlyOpenerLength[i - 1].avgLength) {
      consecutiveDeclines++;
    } else {
      consecutiveDeclines = 0;
    }
  }

  const detected = consecutiveDeclines >= 2; // 3+ months declining = 2+ consecutive declines

  return {
    detected,
    trend: { monthlyOpenerLength, monthlyGhostRate },
  };
}

// ── Conversation Pulse Score (0-100) ────────────────────────────

export function computeConversationPulseScore(params: {
  questionDensity: number;      // 0-1
  responseTimeMedian: number;   // minutes
  openerStats: OpenerStats;
  escalationStats: EscalationStats;
  balanceByConvo: BalanceBreakdown;
}): { score: number; breakdown: ScoreBreakdown } {
  const { questionDensity, responseTimeMedian, openerStats, escalationStats, balanceByConvo } = params;

  // Question density (0-20): target 0.15-0.30
  const qd = Math.min(20, Math.round(Math.min(1, questionDensity / 0.25) * 20));

  // Response speed (0-20): <30min=20, <60min=16, <120min=12, <360min=8, >360min=4
  // median=0 means no data — use neutral score instead of max
  let rs = 4;
  if (responseTimeMedian === 0) rs = 10; // no data → neutral
  else if (responseTimeMedian <= 30) rs = 20;
  else if (responseTimeMedian <= 60) rs = 16;
  else if (responseTimeMedian <= 120) rs = 12;
  else if (responseTimeMedian <= 360) rs = 8;

  // Opener quality (0-20): length + question + no generic hello
  let oq = 0;
  if (openerStats.avgLength >= 30) oq += 6;
  else if (openerStats.avgLength >= 15) oq += 3;
  if (openerStats.containsQuestion >= 50) oq += 7;
  else if (openerStats.containsQuestion >= 25) oq += 4;
  if (openerStats.helloCount === 0) oq += 4;
  else if (openerStats.helloCount <= 2) oq += 2;
  oq += Math.min(3, Math.round(openerStats.frQuestionPersoRate / 30));
  oq = Math.min(20, oq);

  // Escalation timing (0-20): in optimal range = high score
  let et = 0;
  if (escalationStats.convosWithEscalation > 0) {
    et = Math.min(20, Math.round((escalationStats.inOptimalRange / 100) * 14));
    // Bonus for having escalations at all
    const escalationRate = escalationStats.convosWithEscalation / Math.max(1, escalationStats.convosTotal);
    et += Math.min(6, Math.round(escalationRate * 6));
  }

  // Conversation balance (0-20): balanced convos / total
  const totalBalance = balanceByConvo.balanced + balanceByConvo.overInvesting + balanceByConvo.underInvesting;
  const cb = totalBalance > 0
    ? Math.min(20, Math.round((balanceByConvo.balanced / totalBalance) * 20))
    : 10; // neutral default

  const score = qd + rs + oq + et + cb;

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      questionDensity: qd,
      responseSpeed: rs,
      openerQuality: oq,
      escalationTiming: et,
      conversationBalance: cb,
    },
  };
}

// ── Archetype determination ─────────────────────────────────────

export function determineArchetype(breakdown: ScoreBreakdown): {
  name: string;
  description: string;
} {
  const { questionDensity, responseSpeed, openerQuality, escalationTiming, conversationBalance } = breakdown;

  // Connector Naturel: questions ≥15 + response ≥15 + balance ≥15
  if (questionDensity >= 15 && responseSpeed >= 15 && conversationBalance >= 15) {
    return {
      name: "Connector Naturel",
      description: "Tu poses les bonnes questions et tu ecoutes les reponses. Ton equilibre conversationnel est ton super-pouvoir.",
    };
  }

  // Explorateur Prudent: opener ≥15 + escalation < 10
  if (openerQuality >= 15 && escalationTiming < 10) {
    return {
      name: "Explorateur Prudent",
      description: "Tes openers sont top mais tu attends trop pour proposer un rendez-vous. Ose plus tot !",
    };
  }

  // Ghost Magnet Conscient: questions < 8 + response < 10
  if (questionDensity < 8 && responseSpeed < 10) {
    return {
      name: "Ghost Magnet Conscient",
      description: "Tes conversations s'eteignent par manque de questions et de reactivite. Deux leviers concrets a activer.",
    };
  }

  // Sprinter: escalation ≥15 + balance < 10
  if (escalationTiming >= 15 && conversationBalance < 10) {
    return {
      name: "Sprinter",
      description: "Tu vas droit au but mais tu donnes plus que tu ne recois. Ralentis pour mieux connecter.",
    };
  }

  // Equilibriste: all between 10-15
  if (
    questionDensity >= 10 && questionDensity <= 15 &&
    responseSpeed >= 10 && responseSpeed <= 15 &&
    openerQuality >= 10 && openerQuality <= 15 &&
    escalationTiming >= 10 && escalationTiming <= 15 &&
    conversationBalance >= 10 && conversationBalance <= 15
  ) {
    return {
      name: "Equilibriste",
      description: "Profil equilibre, des ajustements cibles peuvent tout changer. Tu es a un detail de l'excellence.",
    };
  }

  // Default fallback based on strongest axis
  const scores = [
    { name: "questions", score: questionDensity },
    { name: "response", score: responseSpeed },
    { name: "opener", score: openerQuality },
    { name: "escalation", score: escalationTiming },
    { name: "balance", score: conversationBalance },
  ];
  const strongest = scores.reduce((best, curr) => curr.score > best.score ? curr : best);

  if (strongest.name === "opener") {
    return {
      name: "Wordsmith",
      description: "Tes premiers messages sont ta force. Continue a soigner tes openers, c'est ta signature.",
    };
  }
  if (strongest.name === "response") {
    return {
      name: "Flash Responder",
      description: "Ta reactivite est impressionnante. Combine-la avec plus de questions pour maximiser l'impact.",
    };
  }

  return {
    name: "En Progression",
    description: "Ton profil conversationnel est en construction. Chaque conversation est une opportunite d'apprentissage.",
  };
}

// ── Score label ─────────────────────────────────────────────────

export function getConversationScoreLabel(score: number): string {
  if (score >= 80) return "Conversationnel Elite";
  if (score >= 60) return "Solide";
  if (score >= 40) return "En Developpement";
  return "Mode Rescue";
}

// ── Main entry point ────────────────────────────────────────────

export function computeConversationInsights(
  conversations: ConversationRecord[],
  source: WrappedAppSource,
  totalMatches?: number
): ConversationInsights {
  const matchCount = totalMatches ?? conversations.length;

  // Ghost breakdown
  const ghostBreakdown = analyzeGhostBreakdown(conversations, matchCount);

  // Survival curve
  const survivalCurve = computeSurvivalCurve(conversations);

  // Question density
  const qd = computeQuestionDensity(conversations);

  // Opener analysis
  const openerStats = analyzeOpeners(conversations);

  // Response times
  const rt = computeResponseTimes(conversations);

  // Escalation
  const escalationStats = detectEscalation(conversations, source);

  // Double-text
  const dt = detectDoubleText(conversations);

  // Balance
  const balanceByConvo = computeInvestmentBalance(conversations);

  // Fatigue
  const fatigue = detectFatigue(conversations);

  // CDS Score
  const { score, breakdown } = computeConversationPulseScore({
    questionDensity: qd.density,
    responseTimeMedian: rt.median,
    openerStats,
    escalationStats,
    balanceByConvo,
  });

  // Archetype
  const { name: archetype, description: archetypeDescription } = determineArchetype(breakdown);

  // Advanced insights (H51-H70) — non-blocking, optional enrichment
  let advancedInsights: AdvancedConversationInsights | undefined;
  try {
    if (conversations.length >= 5) {
      advancedInsights = computeAdvancedInsights(conversations, source);
    }
  } catch {
    // Graceful degradation: advanced insights are optional
  }

  return {
    ghostBreakdown,
    survivalCurve,
    questionDensity: qd.density,
    questionsByConvo: qd.byConvo,
    zeroQuestionGhostRate: qd.zeroQuestionGhostRate,
    openerStats,
    responseTimeMedian: rt.median,
    responseTimeBuckets: rt.buckets,
    escalationStats,
    doubleTextRate: dt.rate,
    doubleTextSurvival: dt.survival,
    balanceByConvo,
    fatigueDetected: fatigue.detected,
    fatigueTrend: fatigue.trend,
    score,
    scoreBreakdown: breakdown,
    archetype,
    archetypeDescription,
    confidenceLevel: "hypothesis", // All based on H1-H50 (n=1 CEO)
    conversationsAnalyzed: conversations.length,
    source,
    advancedInsights,
  };
}
