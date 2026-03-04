// ============================================================
// swipeAdvanced.ts — Advanced Swipe Pattern Analysis (H71-H90)
// 20 hypotheses analyzing behavioral patterns from RawSwipe[],
// RawMatch[], and metadata (boosts, superlikes, subscriptions).
// Architecture mirrors conversationAdvanced.ts.
// ============================================================

import type { RawSwipe, RawMatch, ParsedData } from "./wrappedParser";
import type { WrappedMetrics } from "./wrappedMetrics";

// ── Types ────────────────────────────────────────────────────

export interface AdvancedSwipeInsights {
  // Cluster A — "L'Algorithme Fantome" (H71-H74)
  swipeVelocityDecay?: {
    avgEarlyGapMs: number;    // average inter-swipe gap first 30%
    avgLateGapMs: number;     // average inter-swipe gap last 30%
    decayRatio: number;       // late/early (>1 = slowing down)
    sessionsAnalyzed: number;
    sessionsWithDecay: number;
    decayPct: number;         // % sessions showing decay
  };

  matchClusteringPeriodicity?: {
    totalMatches: number;
    clusters: number;         // detected clusters
    avgClusterSize: number;
    maxGapDays: number;       // longest drought between clusters
    avgGapDays: number;
    periodicityDetected: boolean;
  };

  likeToMatchLatencyDrift?: {
    earlyAvgHours: number;    // avg latency first third
    lateAvgHours: number;     // avg latency last third
    driftDirection: "faster" | "slower" | "stable";
    driftPct: number;
    pairsAnalyzed: number;
  };

  postInactivitySurge?: {
    inactivityGaps: number;       // gaps of 3+ days
    surgeMatchRate: number;       // match rate in 48h after return
    normalMatchRate: number;      // baseline match rate
    surgeMultiplier: number;
    totalResumptions: number;
  };

  // Cluster B — "Psychologie du Swipe" (H75-H78)
  selectivityOscillation?: {
    sessionLikeRates: number[];   // like rate per session
    oscillationScore: number;     // std deviation of session like rates
    stableSessions: number;
    oscillatingSessions: number;
    stableMatchRate: number;
    oscillatingMatchRate: number;
  };

  passStreakMomentum?: {
    streaksFound: number;
    avgStreakLength: number;
    postStreakMatchRate: number;
    normalMatchRate: number;
    momentumMultiplier: number;
  };

  lateNightDesperation?: {
    lateNightSwipes: number;     // swipes 1-5 AM
    lateNightLikes: number;
    lateNightMatchRate: number;
    daySwipes: number;
    dayMatchRate: number;
    lateNightPct: number;
    matchRateDiff: number;
  };

  superlikeEfficiency?: {
    superlikesSent: number;
    superlikeMatchRate: number;
    normalMatchRate: number;
    efficiencyRatio: number;    // super/normal
    paradoxDetected: boolean;   // superlike rate < normal rate
  };

  // Cluster C — "Rythmes Caches" (H79-H82)
  circadianSignature?: {
    signatureHours: number[];    // top 3 most active hours
    stabilityScore: number;      // cosine similarity week-over-week
    deviationMatchRate: number;  // match rate when deviating
    normalMatchRate: number;
    weeksAnalyzed: number;
  };

  weeklyMicroCycles?: {
    avgWeeklyVolume: number;
    brokenWeeks: number;         // weeks with >50% volume deviation
    normalWeeks: number;
    brokenWeekMatchRate: number;
    normalWeekMatchRate: number;
    cyclePenalty: number;
  };

  monthStartRenewal?: {
    monthStartMatchRate: number; // days 1-3
    monthRestMatchRate: number;  // days 4-28/31
    renewalBoost: number;        // ratio
    monthsAnalyzed: number;
    monthStartMatches: number;
    monthRestMatches: number;
  };

  droughtToBingeRebound?: {
    droughts: number;            // periods with 0 matches for 5+ days
    bingesAfterDrought: number;  // high-volume days after drought
    bingeMatchRate: number;
    normalMatchRate: number;
    reboundPenalty: number;
  };

  // Cluster D — "Conversion Secrete" (H83-H86)
  firstSwipeBonus?: {
    firstSwipeLikes: number;
    firstSwipeMatches: number;
    firstSwipeMatchRate: number;
    restMatchRate: number;
    bonusMultiplier: number;
    sessionsAnalyzed: number;
  };

  rightSwipeMomentum?: {
    weeklyMatchRates: number[];
    momentumCorrelation: number;  // correlation between week N and N+1
    streakWeeks: number;          // longest improving streak
    weeksAnalyzed: number;
  };

  matchQualityBySelectivity?: {
    selectiveMatchConvoRate: number;   // % matches→convo when selective
    massLikeMatchConvoRate: number;    // % matches→convo when mass liking
    selectivityThreshold: number;      // like rate cutoff
    qualityMultiplier: number;
  };

  diminishingReturns?: {
    optimalDailyLikes: number;
    matchRateAtOptimal: number;
    matchRateAboveOptimal: number;
    decayFactor: number;
    daysAnalyzed: number;
  };

  // Cluster E — "Meta-Strategie" (H87-H90)
  activeVsPassiveDays?: {
    activeDays: number;           // days with at least 1 match
    passiveDays: number;          // days with swipes but 0 matches
    activeAvgSwipes: number;
    passiveAvgSwipes: number;
    activeAvgLikeRate: number;
    passiveAvgLikeRate: number;
  };

  appOpenDecisiveness?: {
    avgOpensPerDay: number;
    avgSwipesPerOpen: number;
    lowDecisivenessMatchRate: number;  // many opens, few swipes
    highDecisivenessMatchRate: number;
    decisivenessPenalty: number;
  };

  subscriptionTimingImpact?: {
    first7dMatchRate: number;
    last7dMatchRate: number;
    frontLoadingRatio: number;
    subscriptionPeriods: number;
  };

  swipePersonalityArchetype?: {
    archetype: SwipeArchetype;
    scores: Record<SwipeArchetype, number>;
    dominantTraits: string[];
    hypothesesUsed: number;
  };
}

export type SwipeArchetype =
  | "stratege"      // High selectivity, consistent timing, good results
  | "boulimique"    // Mass swiping, low selectivity, diminishing returns
  | "fantome"       // Long inactivity gaps, post-inactivity surges
  | "nocturne"      // Late night patterns, circadian deviation
  | "methodique"    // Stable rhythms, consistent weekly cycles
  | "rebelle";      // Oscillating behavior, streak-breaking patterns

// ── Helpers ──────────────────────────────────────────────────

interface SwipeSession {
  swipes: RawSwipe[];
  startTime: Date;
  endTime: Date;
}

/** Split swipes into sessions (gap > 30 min = new session). */
export function splitIntoSessions(swipes: RawSwipe[], gapMs: number = 30 * 60 * 1000): SwipeSession[] {
  if (swipes.length === 0) return [];
  const sorted = [...swipes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sessions: SwipeSession[] = [];
  let current: RawSwipe[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
    if (gap > gapMs) {
      sessions.push({
        swipes: current,
        startTime: current[0].timestamp,
        endTime: current[current.length - 1].timestamp,
      });
      current = [sorted[i]];
    } else {
      current.push(sorted[i]);
    }
  }
  sessions.push({
    swipes: current,
    startTime: current[0].timestamp,
    endTime: current[current.length - 1].timestamp,
  });
  return sessions;
}

/** Simple linear regression slope. */
export function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/** Compute autocorrelation at a given lag. */
export function computeAutocorrelation(values: number[], lag: number): number {
  const n = values.length;
  if (n <= lag) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, denom = 0;
  for (let i = 0; i < n; i++) {
    denom += (values[i] - mean) ** 2;
    if (i + lag < n) {
      num += (values[i] - mean) * (values[i + lag] - mean);
    }
  }
  return denom === 0 ? 0 : num / denom;
}

/** Date → "YYYY-MM-DD" */
function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date → "YYYY-MM" */
function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** Cosine similarity between two equal-length arrays. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** Standard deviation. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Pearson correlation between two arrays. */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

// ── H71: Swipe Velocity Decay ────────────────────────────────

export function analyzeSwipeVelocityDecay(
  swipes: RawSwipe[]
): AdvancedSwipeInsights["swipeVelocityDecay"] {
  if (swipes.length < 100) return undefined;
  const sessions = splitIntoSessions(swipes);
  const qualifying = sessions.filter((s) => s.swipes.length >= 10);
  if (qualifying.length < 3) return undefined;

  let sessionsWithDecay = 0;
  const earlyGaps: number[] = [];
  const lateGaps: number[] = [];

  for (const session of qualifying) {
    const gaps: number[] = [];
    for (let i = 1; i < session.swipes.length; i++) {
      gaps.push(session.swipes[i].timestamp.getTime() - session.swipes[i - 1].timestamp.getTime());
    }
    const third = Math.floor(gaps.length / 3);
    if (third < 1) continue;
    const early = gaps.slice(0, third);
    const late = gaps.slice(-third);
    const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
    const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
    earlyGaps.push(earlyAvg);
    lateGaps.push(lateAvg);
    if (lateAvg > earlyAvg * 1.3) sessionsWithDecay++;
  }

  if (earlyGaps.length === 0) return undefined;

  const avgEarly = earlyGaps.reduce((a, b) => a + b, 0) / earlyGaps.length;
  const avgLate = lateGaps.reduce((a, b) => a + b, 0) / lateGaps.length;

  return {
    avgEarlyGapMs: Math.round(avgEarly),
    avgLateGapMs: Math.round(avgLate),
    decayRatio: Math.round((avgLate / Math.max(avgEarly, 1)) * 100) / 100,
    sessionsAnalyzed: qualifying.length,
    sessionsWithDecay,
    decayPct: Math.round((sessionsWithDecay / qualifying.length) * 100),
  };
}

// ── H72: Match Clustering Periodicity ────────────────────────

export function analyzeMatchClusteringPeriodicity(
  matches: RawMatch[]
): AdvancedSwipeInsights["matchClusteringPeriodicity"] {
  if (matches.length < 15) return undefined;
  const sorted = [...matches].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Cluster matches within 48h of each other
  const clusters: RawMatch[][] = [];
  let current: RawMatch[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gapH = (sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime()) / (1000 * 3600);
    if (gapH <= 48) {
      current.push(sorted[i]);
    } else {
      clusters.push(current);
      current = [sorted[i]];
    }
  }
  clusters.push(current);

  const clusterSizes = clusters.map((c) => c.length);
  const gaps: number[] = [];
  for (let i = 1; i < clusters.length; i++) {
    const endPrev = clusters[i - 1][clusters[i - 1].length - 1].timestamp.getTime();
    const startNext = clusters[i][0].timestamp.getTime();
    gaps.push((startNext - endPrev) / (1000 * 3600 * 24));
  }

  return {
    totalMatches: matches.length,
    clusters: clusters.length,
    avgClusterSize: Math.round((clusterSizes.reduce((a, b) => a + b, 0) / clusterSizes.length) * 10) / 10,
    maxGapDays: gaps.length > 0 ? Math.round(Math.max(...gaps)) : 0,
    avgGapDays: gaps.length > 0 ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : 0,
    periodicityDetected: clusters.length >= 3 && clusterSizes.filter((s) => s >= 2).length >= 2,
  };
}

// ── H73: Like-to-Match Latency Drift ─────────────────────────

export function analyzeLikeToMatchLatencyDrift(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["likeToMatchLatencyDrift"] {
  if (swipes.length < 50 || matches.length < 10) return undefined;

  // Estimate latency: for each match, find nearest prior like
  const likes = swipes
    .filter((s) => s.direction === "like" || s.direction === "superlike")
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sortedMatches = [...matches].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const latencies: { time: number; latencyH: number }[] = [];
  for (const m of sortedMatches) {
    // Find closest like before the match
    let bestLike: RawSwipe | null = null;
    for (let i = likes.length - 1; i >= 0; i--) {
      if (likes[i].timestamp.getTime() <= m.timestamp.getTime()) {
        bestLike = likes[i];
        break;
      }
    }
    if (bestLike) {
      const latencyH = (m.timestamp.getTime() - bestLike.timestamp.getTime()) / (1000 * 3600);
      if (latencyH >= 0 && latencyH <= 168) {
        latencies.push({ time: m.timestamp.getTime(), latencyH });
      }
    }
  }

  if (latencies.length < 6) return undefined;
  const third = Math.floor(latencies.length / 3);
  const early = latencies.slice(0, third).map((l) => l.latencyH);
  const late = latencies.slice(-third).map((l) => l.latencyH);
  const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
  const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;

  const driftPct = earlyAvg > 0 ? Math.round(((lateAvg - earlyAvg) / earlyAvg) * 100) : 0;
  let direction: "faster" | "slower" | "stable" = "stable";
  if (driftPct > 15) direction = "slower";
  else if (driftPct < -15) direction = "faster";

  return {
    earlyAvgHours: Math.round(earlyAvg * 10) / 10,
    lateAvgHours: Math.round(lateAvg * 10) / 10,
    driftDirection: direction,
    driftPct: Math.abs(driftPct),
    pairsAnalyzed: latencies.length,
  };
}

// ── H74: Post-Inactivity Surge ───────────────────────────────

export function analyzePostInactivitySurge(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["postInactivitySurge"] {
  if (swipes.length < 100) return undefined;
  const sorted = [...swipes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Find days with swipes
  const dayMap = new Map<string, number>();
  for (const s of sorted) {
    const dk = dateKey(s.timestamp);
    dayMap.set(dk, (dayMap.get(dk) || 0) + 1);
  }
  const activeDays = [...dayMap.keys()].sort();
  if (activeDays.length < 14) return undefined;

  // Find inactivity gaps (3+ days)
  const gaps: { resumeDay: string; gapDays: number }[] = [];
  for (let i = 1; i < activeDays.length; i++) {
    const prev = new Date(activeDays[i - 1]).getTime();
    const curr = new Date(activeDays[i]).getTime();
    const gapDays = (curr - prev) / (1000 * 3600 * 24);
    if (gapDays >= 3) {
      gaps.push({ resumeDay: activeDays[i], gapDays });
    }
  }

  if (gaps.length === 0) return { inactivityGaps: 0, surgeMatchRate: 0, normalMatchRate: 0, surgeMultiplier: 1, totalResumptions: 0 };

  // Match rate in 48h after resumption
  const matchDays = new Map<string, number>();
  for (const m of matches) {
    const dk = dateKey(m.timestamp);
    matchDays.set(dk, (matchDays.get(dk) || 0) + 1);
  }

  let surgeMatches = 0;
  let surgeLikes = 0;
  const surgedays = new Set<string>();

  for (const gap of gaps) {
    const resumeDate = new Date(gap.resumeDay);
    for (let d = 0; d < 2; d++) {
      const day = new Date(resumeDate.getTime() + d * 86400000);
      const dk = dateKey(day);
      surgedays.add(dk);
      surgeMatches += matchDays.get(dk) || 0;
      // Count likes in those days
      for (const s of sorted) {
        if (dateKey(s.timestamp) === dk && (s.direction === "like" || s.direction === "superlike")) {
          surgeLikes++;
        }
      }
    }
  }

  // Normal rate (non-surge days)
  let normalLikes = 0;
  let normalMatches = 0;
  for (const [dk, count] of dayMap) {
    if (!surgedays.has(dk)) {
      for (const s of sorted) {
        if (dateKey(s.timestamp) === dk && (s.direction === "like" || s.direction === "superlike")) {
          normalLikes++;
        }
      }
      normalMatches += matchDays.get(dk) || 0;
    }
  }

  const surgeRate = surgeLikes > 0 ? Math.round((surgeMatches / surgeLikes) * 10000) / 100 : 0;
  const normalRate = normalLikes > 0 ? Math.round((normalMatches / normalLikes) * 10000) / 100 : 0;

  return {
    inactivityGaps: gaps.length,
    surgeMatchRate: surgeRate,
    normalMatchRate: normalRate,
    surgeMultiplier: normalRate > 0 ? Math.round((surgeRate / normalRate) * 100) / 100 : 1,
    totalResumptions: gaps.length,
  };
}

// ── H75: Selectivity Oscillation ─────────────────────────────

export function analyzeSelectivityOscillation(
  swipes: RawSwipe[]
): AdvancedSwipeInsights["selectivityOscillation"] {
  if (swipes.length < 200) return undefined;
  const sessions = splitIntoSessions(swipes);
  const qualifying = sessions.filter((s) => s.swipes.length >= 10);
  if (qualifying.length < 5) return undefined;

  const likeRates = qualifying.map((s) => {
    const likes = s.swipes.filter((sw) => sw.direction === "like" || sw.direction === "superlike").length;
    return Math.round((likes / s.swipes.length) * 100);
  });

  const sd = stdDev(likeRates);
  const threshold = 15; // >15 std dev = oscillating
  const stable = likeRates.filter((_, i) => {
    if (i === 0) return true;
    return Math.abs(likeRates[i] - likeRates[i - 1]) <= threshold;
  }).length;

  return {
    sessionLikeRates: likeRates,
    oscillationScore: Math.round(sd * 10) / 10,
    stableSessions: stable,
    oscillatingSessions: qualifying.length - stable,
    stableMatchRate: 0, // Would need match correlation — simplified
    oscillatingMatchRate: 0,
  };
}

// ── H76: Pass Streak Momentum ────────────────────────────────

export function analyzePassStreakMomentum(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["passStreakMomentum"] {
  if (swipes.length < 100) return undefined;
  const sorted = [...swipes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Find pass streaks of 5+
  const streaks: { endIndex: number; length: number }[] = [];
  let currentStreak = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].direction === "pass") {
      currentStreak++;
    } else {
      if (currentStreak >= 5) {
        streaks.push({ endIndex: i - 1, length: currentStreak });
      }
      currentStreak = 0;
    }
  }
  if (currentStreak >= 5) {
    streaks.push({ endIndex: sorted.length - 1, length: currentStreak });
  }

  if (streaks.length === 0) return undefined;

  // Check if the like right after a streak matches
  const matchTimes = new Set(matches.map((m) => dateKey(m.timestamp)));
  let postStreakLikes = 0;
  let postStreakMatches = 0;

  for (const streak of streaks) {
    const nextIdx = streak.endIndex + 1;
    if (nextIdx < sorted.length && sorted[nextIdx].direction === "like") {
      postStreakLikes++;
      // Approximate: check if a match happened same day
      if (matchTimes.has(dateKey(sorted[nextIdx].timestamp))) {
        postStreakMatches++;
      }
    }
  }

  // Normal match rate
  const totalLikes = sorted.filter((s) => s.direction === "like" || s.direction === "superlike").length;
  const normalRate = totalLikes > 0 ? (matches.length / totalLikes) * 100 : 0;
  const postRate = postStreakLikes > 0 ? (postStreakMatches / postStreakLikes) * 100 : 0;

  return {
    streaksFound: streaks.length,
    avgStreakLength: Math.round((streaks.reduce((a, b) => a + b.length, 0) / streaks.length) * 10) / 10,
    postStreakMatchRate: Math.round(postRate * 10) / 10,
    normalMatchRate: Math.round(normalRate * 10) / 10,
    momentumMultiplier: normalRate > 0 ? Math.round((postRate / normalRate) * 100) / 100 : 1,
  };
}

// ── H77: Late-Night Desperation ──────────────────────────────

export function analyzeLateNightDesperation(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["lateNightDesperation"] {
  if (swipes.length < 100) return undefined;

  const isLateNight = (d: Date) => {
    const h = d.getHours();
    return h >= 1 && h <= 5;
  };

  const lateSwipes = swipes.filter((s) => isLateNight(s.timestamp));
  const daySwipes = swipes.filter((s) => !isLateNight(s.timestamp));

  if (lateSwipes.length < 5) return undefined;

  const lateLikes = lateSwipes.filter((s) => s.direction === "like" || s.direction === "superlike").length;
  const dayLikes = daySwipes.filter((s) => s.direction === "like" || s.direction === "superlike").length;

  // Approximate match assignment by time proximity
  const lateMatches = matches.filter((m) => isLateNight(m.timestamp)).length;
  const dayMatches = matches.length - lateMatches;

  const lateRate = lateLikes > 0 ? Math.round((lateMatches / lateLikes) * 10000) / 100 : 0;
  const dayRate = dayLikes > 0 ? Math.round((dayMatches / dayLikes) * 10000) / 100 : 0;

  return {
    lateNightSwipes: lateSwipes.length,
    lateNightLikes: lateLikes,
    lateNightMatchRate: lateRate,
    daySwipes: daySwipes.length,
    dayMatchRate: dayRate,
    lateNightPct: Math.round((lateSwipes.length / swipes.length) * 100),
    matchRateDiff: Math.round((dayRate - lateRate) * 100) / 100,
  };
}

// ── H78: Superlike Efficiency Paradox ─────────────────────────

export function analyzeSuperlikeEfficiency(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["superlikeEfficiency"] {
  const superlikes = swipes.filter((s) => s.direction === "superlike");
  if (superlikes.length === 0) return undefined;

  const normalLikes = swipes.filter((s) => s.direction === "like");

  // Approximate superlike matches (matches on same day as superlike)
  const slDays = new Map<string, number>();
  for (const sl of superlikes) {
    const dk = dateKey(sl.timestamp);
    slDays.set(dk, (slDays.get(dk) || 0) + 1);
  }

  let slMatches = 0;
  for (const m of matches) {
    const dk = dateKey(m.timestamp);
    if (slDays.has(dk)) {
      const count = slDays.get(dk)!;
      if (count > 0) {
        slMatches++;
        slDays.set(dk, count - 1);
      }
    }
  }

  const slRate = superlikes.length > 0 ? Math.round((slMatches / superlikes.length) * 10000) / 100 : 0;
  const normalRate = normalLikes.length > 0
    ? Math.round(((matches.length - slMatches) / normalLikes.length) * 10000) / 100
    : 0;

  return {
    superlikesSent: superlikes.length,
    superlikeMatchRate: slRate,
    normalMatchRate: normalRate,
    efficiencyRatio: normalRate > 0 ? Math.round((slRate / normalRate) * 100) / 100 : 0,
    paradoxDetected: slRate < normalRate && superlikes.length >= 5,
  };
}

// ── H79: Circadian Signature ─────────────────────────────────

export function analyzeCircadianSignature(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["circadianSignature"] {
  if (swipes.length < 100) return undefined;

  // Build hourly distribution per week
  const weeklyHourly = new Map<number, number[]>();
  for (const s of swipes) {
    const week = Math.floor(s.timestamp.getTime() / (7 * 86400000));
    if (!weeklyHourly.has(week)) weeklyHourly.set(week, new Array(24).fill(0));
    weeklyHourly.get(week)![s.timestamp.getHours()]++;
  }

  const weeks = [...weeklyHourly.entries()].sort((a, b) => a[0] - b[0]);
  if (weeks.length < 2) return undefined;

  // Overall signature
  const totalHourly = new Array(24).fill(0);
  for (const [, h] of weeks) {
    for (let i = 0; i < 24; i++) totalHourly[i] += h[i];
  }
  const topHours = totalHourly
    .map((v, i) => ({ hour: i, count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((h) => h.hour);

  // Stability: cosine similarity between consecutive weeks
  const similarities: number[] = [];
  for (let i = 1; i < weeks.length; i++) {
    similarities.push(cosineSimilarity(weeks[i - 1][1], weeks[i][1]));
  }
  const avgSim = similarities.length > 0
    ? Math.round((similarities.reduce((a, b) => a + b, 0) / similarities.length) * 100) / 100
    : 0;

  // Deviation impact: weeks with low similarity to overall pattern
  const deviatingWeekNums = new Set<number>();
  const normalWeekNums = new Set<number>();
  for (const [weekNum, hourly] of weeks) {
    const sim = cosineSimilarity(hourly, totalHourly);
    if (sim < 0.7) deviatingWeekNums.add(weekNum);
    else normalWeekNums.add(weekNum);
  }

  const matchByWeek = new Map<number, number>();
  for (const m of matches) {
    const week = Math.floor(m.timestamp.getTime() / (7 * 86400000));
    matchByWeek.set(week, (matchByWeek.get(week) || 0) + 1);
  }

  let devMatches = 0, devWeeks = 0, normMatches = 0, normWeeks = 0;
  for (const w of deviatingWeekNums) { devMatches += matchByWeek.get(w) || 0; devWeeks++; }
  for (const w of normalWeekNums) { normMatches += matchByWeek.get(w) || 0; normWeeks++; }

  return {
    signatureHours: topHours,
    stabilityScore: avgSim,
    deviationMatchRate: devWeeks > 0 ? Math.round((devMatches / devWeeks) * 10) / 10 : 0,
    normalMatchRate: normWeeks > 0 ? Math.round((normMatches / normWeeks) * 10) / 10 : 0,
    weeksAnalyzed: weeks.length,
  };
}

// ── H80: Weekly Micro-Cycles ─────────────────────────────────

export function analyzeWeeklyMicroCycles(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["weeklyMicroCycles"] {
  if (swipes.length < 200) return undefined;

  const weekMap = new Map<number, number>();
  for (const s of swipes) {
    const week = Math.floor(s.timestamp.getTime() / (7 * 86400000));
    weekMap.set(week, (weekMap.get(week) || 0) + 1);
  }

  const weekKeys = [...weekMap.keys()].sort();
  if (weekKeys.length < 3) return undefined;

  const volumes = weekKeys.map((w) => weekMap.get(w)!);
  const avg = volumes.reduce((a, b) => a + b, 0) / volumes.length;

  const matchByWeek = new Map<number, number>();
  for (const m of matches) {
    const week = Math.floor(m.timestamp.getTime() / (7 * 86400000));
    matchByWeek.set(week, (matchByWeek.get(week) || 0) + 1);
  }

  let brokenMatches = 0, brokenWeeks = 0;
  let normalMatches = 0, normalWeeks = 0;

  for (let i = 0; i < weekKeys.length; i++) {
    const deviation = Math.abs(volumes[i] - avg) / avg;
    const m = matchByWeek.get(weekKeys[i]) || 0;
    if (deviation > 0.5) {
      brokenWeeks++;
      brokenMatches += m;
    } else {
      normalWeeks++;
      normalMatches += m;
    }
  }

  return {
    avgWeeklyVolume: Math.round(avg),
    brokenWeeks,
    normalWeeks,
    brokenWeekMatchRate: brokenWeeks > 0 ? Math.round((brokenMatches / brokenWeeks) * 10) / 10 : 0,
    normalWeekMatchRate: normalWeeks > 0 ? Math.round((normalMatches / normalWeeks) * 10) / 10 : 0,
    cyclePenalty: normalWeeks > 0 && brokenWeeks > 0
      ? Math.round(((normalMatches / normalWeeks) - (brokenMatches / brokenWeeks)) * 10) / 10
      : 0,
  };
}

// ── H81: Month-Start Renewal ─────────────────────────────────

export function analyzeMonthStartRenewal(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["monthStartRenewal"] {
  if (matches.length < 10) return undefined;

  // Need at least 2 months
  const months = new Set(swipes.map((s) => monthKey(s.timestamp)));
  if (months.size < 2) return undefined;

  const isMonthStart = (d: Date) => d.getDate() <= 3;

  const startLikes = swipes.filter((s) =>
    isMonthStart(s.timestamp) && (s.direction === "like" || s.direction === "superlike")
  ).length;
  const restLikes = swipes.filter((s) =>
    !isMonthStart(s.timestamp) && (s.direction === "like" || s.direction === "superlike")
  ).length;

  const startMatches = matches.filter((m) => isMonthStart(m.timestamp)).length;
  const restMatches = matches.filter((m) => !isMonthStart(m.timestamp)).length;

  const startRate = startLikes > 0 ? Math.round((startMatches / startLikes) * 10000) / 100 : 0;
  const restRate = restLikes > 0 ? Math.round((restMatches / restLikes) * 10000) / 100 : 0;

  return {
    monthStartMatchRate: startRate,
    monthRestMatchRate: restRate,
    renewalBoost: restRate > 0 ? Math.round((startRate / restRate) * 100) / 100 : 1,
    monthsAnalyzed: months.size,
    monthStartMatches: startMatches,
    monthRestMatches: restMatches,
  };
}

// ── H82: Drought-to-Binge Rebound ────────────────────────────

export function analyzeDroughtToBingeRebound(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["droughtToBingeRebound"] {
  if (swipes.length < 100) return undefined;

  const dayMatchMap = new Map<string, number>();
  for (const m of matches) {
    const dk = dateKey(m.timestamp);
    dayMatchMap.set(dk, (dayMatchMap.get(dk) || 0) + 1);
  }

  const daySwipeMap = new Map<string, { likes: number; total: number }>();
  for (const s of swipes) {
    const dk = dateKey(s.timestamp);
    const entry = daySwipeMap.get(dk) || { likes: 0, total: 0 };
    entry.total++;
    if (s.direction === "like" || s.direction === "superlike") entry.likes++;
    daySwipeMap.set(dk, entry);
  }

  const sortedDays = [...daySwipeMap.keys()].sort();
  if (sortedDays.length < 21) return undefined;

  // Find drought periods (5+ days with 0 matches)
  const droughts: { endDay: string; length: number }[] = [];
  let droughtLen = 0;
  for (const day of sortedDays) {
    if ((dayMatchMap.get(day) || 0) === 0) {
      droughtLen++;
    } else {
      if (droughtLen >= 5) {
        droughts.push({ endDay: day, length: droughtLen });
      }
      droughtLen = 0;
    }
  }

  // Check for binge right after drought
  const avgDaily = swipes.length / sortedDays.length;
  let bingesAfter = 0;
  let bingeLikes = 0;
  let bingeMatches = 0;
  const bingeDays = new Set<string>();

  for (const drought of droughts) {
    const idx = sortedDays.indexOf(drought.endDay);
    for (let d = idx; d < Math.min(idx + 3, sortedDays.length); d++) {
      const day = sortedDays[d];
      const entry = daySwipeMap.get(day);
      if (entry && entry.total > avgDaily * 2) {
        bingesAfter++;
        bingeLikes += entry.likes;
        bingeMatches += dayMatchMap.get(day) || 0;
        bingeDays.add(day);
      }
    }
  }

  // Normal rates
  let normalLikes = 0, normalMatches = 0;
  for (const [day, entry] of daySwipeMap) {
    if (!bingeDays.has(day)) {
      normalLikes += entry.likes;
      normalMatches += dayMatchMap.get(day) || 0;
    }
  }

  const bingeRate = bingeLikes > 0 ? Math.round((bingeMatches / bingeLikes) * 10000) / 100 : 0;
  const normalRate = normalLikes > 0 ? Math.round((normalMatches / normalLikes) * 10000) / 100 : 0;

  return {
    droughts: droughts.length,
    bingesAfterDrought: bingesAfter,
    bingeMatchRate: bingeRate,
    normalMatchRate: normalRate,
    reboundPenalty: normalRate > 0 ? Math.round(((normalRate - bingeRate) / normalRate) * 100) : 0,
  };
}

// ── H83: First-Swipe-of-Session Bonus ────────────────────────

export function analyzeFirstSwipeBonus(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["firstSwipeBonus"] {
  if (swipes.length < 100) return undefined;
  const sessions = splitIntoSessions(swipes);
  const qualifying = sessions.filter((s) => s.swipes.length >= 5);
  if (qualifying.length < 5) return undefined;

  const matchDays = new Set(matches.map((m) => dateKey(m.timestamp)));
  let firstLikes = 0, firstMatches = 0;
  let restLikes = 0, restMatches = 0;

  for (const session of qualifying) {
    const first = session.swipes[0];
    if (first.direction === "like" || first.direction === "superlike") {
      firstLikes++;
      if (matchDays.has(dateKey(first.timestamp))) firstMatches++;
    }
    for (let i = 1; i < session.swipes.length; i++) {
      const s = session.swipes[i];
      if (s.direction === "like" || s.direction === "superlike") {
        restLikes++;
        if (matchDays.has(dateKey(s.timestamp))) restMatches++;
      }
    }
  }

  const firstRate = firstLikes > 0 ? Math.round((firstMatches / firstLikes) * 10000) / 100 : 0;
  const restRate = restLikes > 0 ? Math.round((restMatches / restLikes) * 10000) / 100 : 0;

  return {
    firstSwipeLikes: firstLikes,
    firstSwipeMatches: firstMatches,
    firstSwipeMatchRate: firstRate,
    restMatchRate: restRate,
    bonusMultiplier: restRate > 0 ? Math.round((firstRate / restRate) * 100) / 100 : 1,
    sessionsAnalyzed: qualifying.length,
  };
}

// ── H84: Right-Swipe Momentum ────────────────────────────────

export function analyzeRightSwipeMomentum(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["rightSwipeMomentum"] {
  // Build weekly match rates
  const weekLikes = new Map<number, number>();
  const weekMatches = new Map<number, number>();

  for (const s of swipes) {
    if (s.direction === "like" || s.direction === "superlike") {
      const w = Math.floor(s.timestamp.getTime() / (7 * 86400000));
      weekLikes.set(w, (weekLikes.get(w) || 0) + 1);
    }
  }
  for (const m of matches) {
    const w = Math.floor(m.timestamp.getTime() / (7 * 86400000));
    weekMatches.set(w, (weekMatches.get(w) || 0) + 1);
  }

  const allWeeks = [...new Set([...weekLikes.keys(), ...weekMatches.keys()])].sort();
  if (allWeeks.length < 3) return undefined;

  const rates = allWeeks.map((w) => {
    const likes = weekLikes.get(w) || 0;
    const matches = weekMatches.get(w) || 0;
    return likes > 0 ? Math.round((matches / likes) * 10000) / 100 : 0;
  });

  // Correlation between week N and week N+1
  const x = rates.slice(0, -1);
  const y = rates.slice(1);
  const corr = pearsonCorrelation(x, y);

  // Longest improving streak
  let maxStreak = 0, currentStreak = 0;
  for (let i = 1; i < rates.length; i++) {
    if (rates[i] >= rates[i - 1]) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else currentStreak = 0;
  }

  return {
    weeklyMatchRates: rates,
    momentumCorrelation: Math.round(corr * 100) / 100,
    streakWeeks: maxStreak,
    weeksAnalyzed: allWeeks.length,
  };
}

// ── H85: Match Quality by Selectivity ────────────────────────

export function analyzeMatchQualityBySelectivity(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["matchQualityBySelectivity"] {
  if (matches.length < 10 || swipes.length < 100) return undefined;

  // Split days into selective (<40% like rate) and mass-like (>60%)
  const daySwipes = new Map<string, { likes: number; total: number }>();
  for (const s of swipes) {
    const dk = dateKey(s.timestamp);
    const entry = daySwipes.get(dk) || { likes: 0, total: 0 };
    entry.total++;
    if (s.direction === "like" || s.direction === "superlike") entry.likes++;
    daySwipes.set(dk, entry);
  }

  const dayMatches = new Map<string, RawMatch[]>();
  for (const m of matches) {
    const dk = dateKey(m.timestamp);
    if (!dayMatches.has(dk)) dayMatches.set(dk, []);
    dayMatches.get(dk)!.push(m);
  }

  let selectiveMatches = 0, selectiveConvos = 0;
  let massMatches = 0, massConvos = 0;

  for (const [dk, entry] of daySwipes) {
    if (entry.total < 5) continue;
    const likeRate = entry.likes / entry.total;
    const dayM = dayMatches.get(dk) || [];

    if (likeRate < 0.4) {
      selectiveMatches += dayM.length;
      selectiveConvos += dayM.filter((m) => m.messagesCount > 0).length;
    } else if (likeRate > 0.6) {
      massMatches += dayM.length;
      massConvos += dayM.filter((m) => m.messagesCount > 0).length;
    }
  }

  const selectiveRate = selectiveMatches > 0 ? Math.round((selectiveConvos / selectiveMatches) * 100) : 0;
  const massRate = massMatches > 0 ? Math.round((massConvos / massMatches) * 100) : 0;

  return {
    selectiveMatchConvoRate: selectiveRate,
    massLikeMatchConvoRate: massRate,
    selectivityThreshold: 40,
    qualityMultiplier: massRate > 0 ? Math.round((selectiveRate / massRate) * 100) / 100 : 1,
  };
}

// ── H86: Diminishing Returns Curve ───────────────────────────

export function analyzeDiminishingReturns(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["diminishingReturns"] {
  if (swipes.length < 100) return undefined;

  const dayLikes = new Map<string, number>();
  for (const s of swipes) {
    if (s.direction === "like" || s.direction === "superlike") {
      const dk = dateKey(s.timestamp);
      dayLikes.set(dk, (dayLikes.get(dk) || 0) + 1);
    }
  }

  const dayMatches = new Map<string, number>();
  for (const m of matches) {
    const dk = dateKey(m.timestamp);
    dayMatches.set(dk, (dayMatches.get(dk) || 0) + 1);
  }

  // Group days by like volume buckets
  const buckets: { range: string; maxLikes: number; totalLikes: number; totalMatches: number; days: number }[] = [
    { range: "1-10", maxLikes: 10, totalLikes: 0, totalMatches: 0, days: 0 },
    { range: "11-30", maxLikes: 30, totalLikes: 0, totalMatches: 0, days: 0 },
    { range: "31-60", maxLikes: 60, totalLikes: 0, totalMatches: 0, days: 0 },
    { range: "61+", maxLikes: Infinity, totalLikes: 0, totalMatches: 0, days: 0 },
  ];

  for (const [dk, likes] of dayLikes) {
    const m = dayMatches.get(dk) || 0;
    for (const bucket of buckets) {
      if (likes <= bucket.maxLikes) {
        bucket.totalLikes += likes;
        bucket.totalMatches += m;
        bucket.days++;
        break;
      }
    }
  }

  // Find optimal bucket (highest match rate with enough data)
  let bestRate = 0, bestBucket = 0;
  const rates = buckets.map((b) => b.totalLikes > 0 ? (b.totalMatches / b.totalLikes) * 100 : 0);
  for (let i = 0; i < rates.length; i++) {
    if (buckets[i].days >= 3 && rates[i] > bestRate) {
      bestRate = rates[i];
      bestBucket = i;
    }
  }

  const optimalMax = buckets[bestBucket]?.maxLikes === Infinity ? 61 : buckets[bestBucket]?.maxLikes || 30;
  const aboveOptimal = rates.slice(bestBucket + 1).filter((r) => r > 0);
  const aboveRate = aboveOptimal.length > 0 ? aboveOptimal.reduce((a, b) => a + b, 0) / aboveOptimal.length : 0;

  return {
    optimalDailyLikes: optimalMax,
    matchRateAtOptimal: Math.round(bestRate * 100) / 100,
    matchRateAboveOptimal: Math.round(aboveRate * 100) / 100,
    decayFactor: bestRate > 0 ? Math.round(((bestRate - aboveRate) / bestRate) * 100) : 0,
    daysAnalyzed: [...dayLikes.keys()].length,
  };
}

// ── H87: Active vs Passive Days ──────────────────────────────

export function analyzeActiveVsPassiveDays(
  swipes: RawSwipe[],
  matches: RawMatch[]
): AdvancedSwipeInsights["activeVsPassiveDays"] {
  if (swipes.length < 50) return undefined;

  const daySwipes = new Map<string, { total: number; likes: number }>();
  for (const s of swipes) {
    const dk = dateKey(s.timestamp);
    const entry = daySwipes.get(dk) || { total: 0, likes: 0 };
    entry.total++;
    if (s.direction === "like" || s.direction === "superlike") entry.likes++;
    daySwipes.set(dk, entry);
  }

  const matchDays = new Set(matches.map((m) => dateKey(m.timestamp)));

  let activeCount = 0, passiveCount = 0;
  let activeSwipes = 0, passiveSwipes = 0;
  let activeLikeRate = 0, passiveLikeRate = 0;

  for (const [dk, entry] of daySwipes) {
    if (matchDays.has(dk)) {
      activeCount++;
      activeSwipes += entry.total;
      activeLikeRate += entry.total > 0 ? entry.likes / entry.total : 0;
    } else {
      passiveCount++;
      passiveSwipes += entry.total;
      passiveLikeRate += entry.total > 0 ? entry.likes / entry.total : 0;
    }
  }

  return {
    activeDays: activeCount,
    passiveDays: passiveCount,
    activeAvgSwipes: activeCount > 0 ? Math.round(activeSwipes / activeCount) : 0,
    passiveAvgSwipes: passiveCount > 0 ? Math.round(passiveSwipes / passiveCount) : 0,
    activeAvgLikeRate: activeCount > 0 ? Math.round((activeLikeRate / activeCount) * 100) : 0,
    passiveAvgLikeRate: passiveCount > 0 ? Math.round((passiveLikeRate / passiveCount) * 100) : 0,
  };
}

// ── H88: App Open Decisiveness ───────────────────────────────

export function analyzeAppOpenDecisiveness(
  swipes: RawSwipe[],
  matches: RawMatch[],
  appOpens?: number
): AdvancedSwipeInsights["appOpenDecisiveness"] {
  if (!appOpens || appOpens === 0) return undefined;

  const daySwipes = new Map<string, number>();
  for (const s of swipes) {
    const dk = dateKey(s.timestamp);
    daySwipes.set(dk, (daySwipes.get(dk) || 0) + 1);
  }

  const daysActive = daySwipes.size;
  if (daysActive === 0) return undefined;

  const avgOpensPerDay = Math.round((appOpens / daysActive) * 10) / 10;
  const avgSwipesPerOpen = Math.round((swipes.length / appOpens) * 10) / 10;

  // Split days into decisive (swipes/open > median) and browsing
  const matchDays = new Map<string, number>();
  for (const m of matches) {
    const dk = dateKey(m.timestamp);
    matchDays.set(dk, (matchDays.get(dk) || 0) + 1);
  }

  // Approximate: days with fewer swipes = more browsing
  const avgDailySwipes = swipes.length / daysActive;
  let lowDecMatches = 0, lowDecDays = 0;
  let highDecMatches = 0, highDecDays = 0;

  for (const [dk, count] of daySwipes) {
    const m = matchDays.get(dk) || 0;
    if (count < avgDailySwipes * 0.5) {
      lowDecMatches += m;
      lowDecDays++;
    } else {
      highDecMatches += m;
      highDecDays++;
    }
  }

  const lowRate = lowDecDays > 0 ? Math.round((lowDecMatches / lowDecDays) * 100) / 100 : 0;
  const highRate = highDecDays > 0 ? Math.round((highDecMatches / highDecDays) * 100) / 100 : 0;

  return {
    avgOpensPerDay,
    avgSwipesPerOpen,
    lowDecisivenessMatchRate: lowRate,
    highDecisivenessMatchRate: highRate,
    decisivenessPenalty: highRate > 0 ? Math.round(((highRate - lowRate) / highRate) * 100) : 0,
  };
}

// ── H89: Subscription Timing Impact ──────────────────────────

export function analyzeSubscriptionTimingImpact(
  matches: RawMatch[],
  subscriptionPeriods?: { start: Date; end: Date }[]
): AdvancedSwipeInsights["subscriptionTimingImpact"] {
  if (!subscriptionPeriods || subscriptionPeriods.length === 0) return undefined;

  let first7dMatches = 0, last7dMatches = 0;
  let first7dDays = 0, last7dDays = 0;

  for (const sub of subscriptionPeriods) {
    const duration = (sub.end.getTime() - sub.start.getTime()) / (1000 * 3600 * 24);
    if (duration < 14) continue; // Need at least 2 weeks

    const first7end = new Date(sub.start.getTime() + 7 * 86400000);
    const last7start = new Date(sub.end.getTime() - 7 * 86400000);

    first7dDays += 7;
    last7dDays += 7;

    for (const m of matches) {
      if (m.timestamp >= sub.start && m.timestamp < first7end) first7dMatches++;
      if (m.timestamp >= last7start && m.timestamp <= sub.end) last7dMatches++;
    }
  }

  const first7rate = first7dDays > 0 ? Math.round((first7dMatches / first7dDays) * 100) / 100 : 0;
  const last7rate = last7dDays > 0 ? Math.round((last7dMatches / last7dDays) * 100) / 100 : 0;

  return {
    first7dMatchRate: first7rate,
    last7dMatchRate: last7rate,
    frontLoadingRatio: last7rate > 0 ? Math.round((first7rate / last7rate) * 100) / 100 : 1,
    subscriptionPeriods: subscriptionPeriods.length,
  };
}

// ── H90: Swipe Personality Archetype ─────────────────────────

export function analyzeSwipePersonalityArchetype(
  insights: Omit<AdvancedSwipeInsights, "swipePersonalityArchetype">
): AdvancedSwipeInsights["swipePersonalityArchetype"] {
  const scores: Record<SwipeArchetype, number> = {
    stratege: 0,
    boulimique: 0,
    fantome: 0,
    nocturne: 0,
    methodique: 0,
    rebelle: 0,
  };

  let hypothesesUsed = 0;

  // H71 — Velocity decay → fatigue indicator
  if (insights.swipeVelocityDecay) {
    hypothesesUsed++;
    if (insights.swipeVelocityDecay.decayPct > 60) scores.boulimique += 2;
    if (insights.swipeVelocityDecay.decayPct < 30) scores.methodique += 2;
  }

  // H72 — Match clustering → algo awareness
  if (insights.matchClusteringPeriodicity) {
    hypothesesUsed++;
    if (insights.matchClusteringPeriodicity.periodicityDetected) scores.stratege += 1;
  }

  // H74 — Post-inactivity surge
  if (insights.postInactivitySurge) {
    hypothesesUsed++;
    if (insights.postInactivitySurge.inactivityGaps >= 3) scores.fantome += 3;
    if (insights.postInactivitySurge.surgeMultiplier > 1.5) scores.fantome += 1;
  }

  // H75 — Selectivity oscillation
  if (insights.selectivityOscillation) {
    hypothesesUsed++;
    if (insights.selectivityOscillation.oscillationScore > 20) scores.rebelle += 2;
    if (insights.selectivityOscillation.oscillationScore < 10) scores.methodique += 2;
  }

  // H77 — Late night
  if (insights.lateNightDesperation) {
    hypothesesUsed++;
    if (insights.lateNightDesperation.lateNightPct > 15) scores.nocturne += 3;
    if (insights.lateNightDesperation.lateNightPct > 25) scores.nocturne += 2;
  }

  // H79 — Circadian signature
  if (insights.circadianSignature) {
    hypothesesUsed++;
    if (insights.circadianSignature.stabilityScore > 0.8) scores.methodique += 2;
    if (insights.circadianSignature.stabilityScore < 0.5) scores.rebelle += 1;
  }

  // H80 — Weekly cycles
  if (insights.weeklyMicroCycles) {
    hypothesesUsed++;
    if (insights.weeklyMicroCycles.brokenWeeks > insights.weeklyMicroCycles.normalWeeks) scores.rebelle += 2;
    else scores.methodique += 1;
  }

  // H82 — Drought-to-binge
  if (insights.droughtToBingeRebound) {
    hypothesesUsed++;
    if (insights.droughtToBingeRebound.bingesAfterDrought > 2) scores.boulimique += 2;
  }

  // H85 — Match quality by selectivity
  if (insights.matchQualityBySelectivity) {
    hypothesesUsed++;
    if (insights.matchQualityBySelectivity.qualityMultiplier > 1.5) scores.stratege += 2;
    if (insights.matchQualityBySelectivity.qualityMultiplier < 0.8) scores.boulimique += 1;
  }

  // H86 — Diminishing returns
  if (insights.diminishingReturns) {
    hypothesesUsed++;
    if (insights.diminishingReturns.decayFactor > 40) scores.boulimique += 2;
    if (insights.diminishingReturns.optimalDailyLikes <= 30) scores.stratege += 1;
  }

  // H87 — Active vs passive
  if (insights.activeVsPassiveDays) {
    hypothesesUsed++;
    const ratio = insights.activeVsPassiveDays.activeDays / Math.max(insights.activeVsPassiveDays.passiveDays, 1);
    if (ratio > 0.5) scores.stratege += 1;
    if (ratio < 0.2) scores.fantome += 1;
  }

  if (hypothesesUsed < 5) return undefined;

  // Determine archetype
  const maxScore = Math.max(...Object.values(scores));
  const archetype = (Object.entries(scores) as [SwipeArchetype, number][])
    .filter(([, s]) => s === maxScore)[0][0];

  // Build dominant traits
  const traits: string[] = [];
  if (scores.stratege >= 3) traits.push("Selectif et strategique");
  if (scores.boulimique >= 3) traits.push("Volume-driven, fatigable");
  if (scores.fantome >= 3) traits.push("Intermittent, profite des re-boosts");
  if (scores.nocturne >= 3) traits.push("Actif tard la nuit");
  if (scores.methodique >= 3) traits.push("Regulier et discipline");
  if (scores.rebelle >= 3) traits.push("Imprevisible, patterns casses");
  if (traits.length === 0) traits.push("Profil equilibre");

  return {
    archetype,
    scores,
    dominantTraits: traits,
    hypothesesUsed,
  };
}

// ── Main Aggregator ──────────────────────────────────────────

export function computeAdvancedSwipeInsights(
  data: ParsedData,
  metrics: WrappedMetrics
): AdvancedSwipeInsights | undefined {
  const swipes = data.swipes || [];
  const matches = data.matches || [];
  const dailyOnly = data.dailyOnly === true;

  if (swipes.length < 50) return undefined;

  const result: AdvancedSwipeInsights = {};

  // Cluster A — "L'Algorithme Fantome"
  if (!dailyOnly) {
    try { result.swipeVelocityDecay = analyzeSwipeVelocityDecay(swipes); } catch { /* graceful */ }
  }
  try { result.matchClusteringPeriodicity = analyzeMatchClusteringPeriodicity(matches); } catch { /* graceful */ }
  if (!dailyOnly) {
    try { result.likeToMatchLatencyDrift = analyzeLikeToMatchLatencyDrift(swipes, matches); } catch { /* graceful */ }
  }
  try { result.postInactivitySurge = analyzePostInactivitySurge(swipes, matches); } catch { /* graceful */ }

  // Cluster B — "Psychologie du Swipe"
  if (!dailyOnly) {
    try { result.selectivityOscillation = analyzeSelectivityOscillation(swipes); } catch { /* graceful */ }
    try { result.passStreakMomentum = analyzePassStreakMomentum(swipes, matches); } catch { /* graceful */ }
    try { result.lateNightDesperation = analyzeLateNightDesperation(swipes, matches); } catch { /* graceful */ }
  }
  try { result.superlikeEfficiency = analyzeSuperlikeEfficiency(swipes, matches); } catch { /* graceful */ }

  // Cluster C — "Rythmes Caches"
  if (!dailyOnly) {
    try { result.circadianSignature = analyzeCircadianSignature(swipes, matches); } catch { /* graceful */ }
  }
  try { result.weeklyMicroCycles = analyzeWeeklyMicroCycles(swipes, matches); } catch { /* graceful */ }
  try { result.monthStartRenewal = analyzeMonthStartRenewal(swipes, matches); } catch { /* graceful */ }
  try { result.droughtToBingeRebound = analyzeDroughtToBingeRebound(swipes, matches); } catch { /* graceful */ }

  // Cluster D — "Conversion Secrete"
  if (!dailyOnly) {
    try { result.firstSwipeBonus = analyzeFirstSwipeBonus(swipes, matches); } catch { /* graceful */ }
  }
  try { result.rightSwipeMomentum = analyzeRightSwipeMomentum(swipes, matches); } catch { /* graceful */ }
  try { result.matchQualityBySelectivity = analyzeMatchQualityBySelectivity(swipes, matches); } catch { /* graceful */ }
  try { result.diminishingReturns = analyzeDiminishingReturns(swipes, matches); } catch { /* graceful */ }

  // Cluster E — "Meta-Strategie"
  try { result.activeVsPassiveDays = analyzeActiveVsPassiveDays(swipes, matches); } catch { /* graceful */ }
  try {
    result.appOpenDecisiveness = analyzeAppOpenDecisiveness(
      swipes, matches, data.appOpens
    );
  } catch { /* graceful */ }

  // H89: Subscription timing — build periods from metrics
  try {
    const subPeriods = buildSubscriptionPeriods(data);
    if (subPeriods.length > 0) {
      result.subscriptionTimingImpact = analyzeSubscriptionTimingImpact(matches, subPeriods);
    }
  } catch { /* graceful */ }

  // H90: Archetype synthesis
  try { result.swipePersonalityArchetype = analyzeSwipePersonalityArchetype(result); } catch { /* graceful */ }

  return result;
}

// ── Subscription period extraction helper ────────────────────

function buildSubscriptionPeriods(data: ParsedData): { start: Date; end: Date }[] {
  const periods: { start: Date; end: Date }[] = [];

  // Hinge subscriptionPeriods (exact start/end from subscriptions.json)
  if (data.subscriptionPeriods) {
    for (const sub of data.subscriptionPeriods) {
      if (sub.start && sub.end && !isNaN(sub.start.getTime()) && !isNaN(sub.end.getTime())) {
        periods.push({ start: sub.start, end: sub.end });
      }
    }
  }

  // Tinder purchases.subscription (single subscription period)
  if (data.purchases?.subscription) {
    const sub = data.purchases.subscription;
    const start = sub.createDate;
    const end = sub.expireDate || new Date(start.getTime() + 30 * 86400000);
    if (!isNaN(start.getTime())) {
      periods.push({ start, end });
    }
  }

  return periods;
}
