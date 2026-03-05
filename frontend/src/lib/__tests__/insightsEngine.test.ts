import { describe, it, expect } from "vitest";
import { generateUserInsights } from "../insightsEngine";
import type { PersistedUserInsights } from "../insightsPersistence";
import type { WrappedMetrics } from "../wrappedMetrics";
import type { ConversationInsights } from "../conversationIntelligence";
import type { AdvancedSwipeInsights } from "../swipeAdvanced";

// ── Minimal WrappedMetrics fixture ───────────────────────────────

function makeMetrics(overrides?: Partial<WrappedMetrics>): WrappedMetrics {
  return {
    totalSwipes: 1000,
    rightSwipes: 400,
    rightSwipeRate: 40,
    daysActive: 60,
    avgSwipesPerDay: 17,
    swipeToMatchRate: 5,
    matchToConvoRate: 60,
    ghostRate: 40,
    avgConvoLength: 12,
    userInitiatedRate: 50,
    longestConvo: 200,
    peakSwipeHour: 20,
    peakMatchHour: 21,
    swipesByHour: { 20: 100, 21: 80 },
    matchesByMonth: { "2025-06": 5, "2025-07": 8 },
    matchesInGreenLightPct: 65,
    estimatedTimeSavedHours: 10,
    estimatedTotalHours: 50,
    hoursPerMatch: 2.5,
    bestMonth: "2025-07",
    worstMonth: "2025-06",
    monthlyData: [
      { month: "2025-06", swipes: 500, matches: 5, rightSwipeRate: 40 },
      { month: "2025-07", swipes: 500, matches: 8, rightSwipeRate: 40 },
    ],
    periodStart: new Date("2025-04-01"),
    periodEnd: new Date("2025-08-30"),
    totalDays: 150,
    source: "tinder",
    dailyOnly: false,
    hourlyFromMessages: false,
    swipesByDayOfWeek: [
      { day: "Lun", dayFull: "Lundi", swipes: 150, matches: 3 },
      { day: "Mar", dayFull: "Mardi", swipes: 140, matches: 2 },
      { day: "Mer", dayFull: "Mercredi", swipes: 155, matches: 4 },
      { day: "Jeu", dayFull: "Jeudi", swipes: 160, matches: 2 },
      { day: "Ven", dayFull: "Vendredi", swipes: 130, matches: 3 },
      { day: "Sam", dayFull: "Samedi", swipes: 145, matches: 3 },
      { day: "Dim", dayFull: "Dimanche", swipes: 120, matches: 3 },
    ],
    bestDay: "Mercredi",
    worstDay: "Jeudi",
    totalMessagesSent: 500,
    totalMessagesReceived: 400,
    sentReceivedRatio: 1.25,
    adnDating: [],
    ...overrides,
  };
}

// ── Minimal ConversationInsights fixture ─────────────────────────

function makeConvInsights(overrides?: Partial<ConversationInsights>): ConversationInsights {
  return {
    ghostBreakdown: { total: 20, diedAtMsg1: 3, diedAtMsg2: 8, diedAtMsg3: 4, diedLater: 5 },
    questionDensity: 35,
    zeroQuestionGhostRate: 75,
    openerStats: {
      avgLength: 22,
      containsQuestion: 45,
      helloCount: 4,
      frQuestionPersoRate: 25,
    },
    responseTimeMedian: 42,
    responseTimeBuckets: { under1h: 60, under6h: 25, under24h: 10, over24h: 5 },
    escalationStats: {
      convosWithEscalation: 8,
      avgMessageNumber: 12,
      inOptimalRange: 50,
      optimalRange: { min: 10, max: 20 },
    },
    doubleTextRate: 15,
    doubleTextSurvival: 72,
    balanceByConvo: [],
    score: 62,
    scoreBreakdown: {
      openerQuality: 55, questionDensity: 70, responseSpeed: 80, escalation: 60, ghostResilience: 45,
    },
    archetype: "Le Stratege",
    advancedInsights: {
      topicSurvival: [],
      emojiImpact: { withEmoji: { count: 10, avgLength: 15 }, withoutEmoji: { count: 30, avgLength: 8 } },
      messageComplexity: { avgWordsPerMessage: 8, avgCharsPerMessage: 40, complexityTrend: "stable" },
    },
    ...overrides,
  } as ConversationInsights;
}

// ── Minimal AdvancedSwipeInsights fixture ────────────────────────

function makeSwipeInsights(overrides?: Partial<AdvancedSwipeInsights>): AdvancedSwipeInsights {
  return {
    swipeVelocityDecay: { decayPct: 60, decayRatio: 1.8, sessionsAnalyzed: 20 },
    matchClusteringPeriodicity: { clusters: 5, avgClusterSize: 3.2, avgGapDays: 8, periodicityDetected: true },
    postInactivitySurge: { surgeMultiplier: 1.8, inactivityGaps: 4, avgDaysInactive: 5 },
    selectivityOscillation: { oscillationScore: 22, oscillatingSessions: 8, stableSessions: 12 },
    lateNightDesperation: { lateNightPct: 12, lateNightMatchRate: 2, dayMatchRate: 5, matchRateDiff: -60 },
    droughtToBingeRebound: { droughts: 3, bingesAfterDrought: 2, bingeMatchRate: 1.5, normalMatchRate: 4, reboundPenalty: -0.6 },
    rightSwipeMomentum: { momentumCorrelation: 0.45, streakWeeks: 3 },
    matchQualityBySelectivity: { selectiveMatchConvoRate: 70, massLikeMatchConvoRate: 30, qualityMultiplier: 2.3 },
    diminishingReturns: { optimalDailyLikes: 25, matchRateAtOptimal: 6, matchRateAboveOptimal: 2, decayFactor: 0.5 },
    ...overrides,
  } as AdvancedSwipeInsights;
}

// ── Helpers ──────────────────────────────────────────────────────

function makePersisted(opts?: {
  metrics?: Partial<WrappedMetrics>;
  conv?: ConversationInsights;
  swipe?: AdvancedSwipeInsights;
}): PersistedUserInsights {
  return {
    version: 1,
    persistedAt: new Date().toISOString(),
    source: "tinder",
    metrics: makeMetrics(opts?.metrics),
    conversationInsights: opts?.conv,
    advancedSwipeInsights: opts?.swipe,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe("insightsEngine — generateUserInsights", () => {
  it("should return a valid InsightsDataSet with metrics only", () => {
    const result = generateUserInsights(makePersisted());

    // Structure checks
    expect(result.heroStats).toBeDefined();
    expect(result.hypothesisThemes).toBeInstanceOf(Array);
    expect(result.sectionNarratives).toBeDefined();
    expect(result.tenCommandments).toBeInstanceOf(Array);
    expect(result.targetMetrics).toBeInstanceOf(Array);

    // With only metrics, universal + metrics-based hypotheses should fire
    const totalHypotheses = result.hypothesisThemes.reduce((s, t) => s + t.hypotheses.length, 0);
    expect(totalHypotheses).toBeGreaterThanOrEqual(7);
  });

  it("should produce more hypotheses with ConversationInsights", () => {
    const metricsOnly = generateUserInsights(makePersisted());
    const withConv = generateUserInsights(makePersisted({ conv: makeConvInsights() }));

    const countH = (ds: ReturnType<typeof generateUserInsights>) =>
      ds.hypothesisThemes.reduce((s, t) => s + t.hypotheses.length, 0);

    expect(countH(withConv)).toBeGreaterThan(countH(metricsOnly));
    // Should include conversation-specific generators (H13, H17, H27, H34, etc.)
    expect(countH(withConv)).toBeGreaterThanOrEqual(15);
  });

  it("should produce the most hypotheses with all data", () => {
    const full = generateUserInsights(
      makePersisted({ conv: makeConvInsights(), swipe: makeSwipeInsights() })
    );

    const totalH = full.hypothesisThemes.reduce((s, t) => s + t.hypotheses.length, 0);
    // 32 generators total, some may share themes — deduplicated count across themes
    expect(totalH).toBeGreaterThanOrEqual(25);

    // Verdict counts should match
    const { confirmed, debunked, mixed, total } = full.heroStats.hypotheses;
    expect(total).toBe(confirmed + debunked + mixed);
    expect(total).toBeGreaterThanOrEqual(25);
  });

  it("should generate heroStats from metrics", () => {
    const result = generateUserInsights(makePersisted());
    const hs = result.heroStats;

    expect(hs.totalDays).toBeDefined();
    expect(hs.totalLikes).toBeDefined();
    expect(hs.totalMatches).toBeDefined();
    expect(hs.totalConvos).toBeDefined();
    // Source key should be "tinder"
    expect(hs.totalDays["tinder"]).toBe(150);
  });

  it("should generate weeklyGrid and monthlyIndex", () => {
    const result = generateUserInsights(makePersisted());

    expect(result.weeklyGrid.length).toBe(7);
    expect(result.monthlyIndex.length).toBe(2); // 2 months in fixture
  });

  it("should generate messageBalance from metrics", () => {
    const result = generateUserInsights(makePersisted());
    const mb = result.messageBalance;

    expect(mb.length).toBeGreaterThanOrEqual(2);
    // messageBalance uses category-based structure
    expect(mb.some(b => b.category.includes("ecris"))).toBe(true);
  });

  it("should generate conversationScores when ConversationInsights is available", () => {
    const result = generateUserInsights(makePersisted({ conv: makeConvInsights() }));

    expect(result.conversationScores.length).toBeGreaterThan(0);
    // Should have opener, questions, speed, escalation categories
    const categories = result.conversationScores.map(c => c.category);
    expect(categories).toContain("Openers");
  });

  it("should generate reinforcementClusters with full data", () => {
    const result = generateUserInsights(
      makePersisted({ conv: makeConvInsights(), swipe: makeSwipeInsights() })
    );

    // At least 2 clusters should have ≥2 matching hypotheses
    expect(result.reinforcementClusters.length).toBeGreaterThanOrEqual(2);
    result.reinforcementClusters.forEach(c => {
      expect(c.hypothesisIds.length).toBeGreaterThanOrEqual(2);
      expect(c.insight).toBeTruthy();
    });
  });

  it("should generate contradictionPairs when both sides exist", () => {
    const result = generateUserInsights(
      makePersisted({ conv: makeConvInsights(), swipe: makeSwipeInsights() })
    );

    // H3 + H86 contradiction should exist (both are metrics + swipe based)
    expect(result.contradictionPairs.length).toBeGreaterThanOrEqual(1);
  });

  it("should generate costlyMistakes for problematic metrics", () => {
    const result = generateUserInsights(
      makePersisted({ metrics: { rightSwipeRate: 75, ghostRate: 70, avgSwipesPerDay: 60 } })
    );

    expect(result.costlyMistakes.length).toBeGreaterThanOrEqual(2);
    // Should flag high like ratio
    expect(result.costlyMistakes.some(m => m.ref.includes("H4"))).toBe(true);
  });

  it("should generate targetMetrics for improvable metrics", () => {
    const result = generateUserInsights(
      makePersisted({ metrics: { rightSwipeRate: 60, avgSwipesPerDay: 50 } })
    );

    expect(result.targetMetrics.length).toBeGreaterThanOrEqual(2);
  });

  it("should generate tenCommandments (3-10 rules)", () => {
    const result = generateUserInsights(
      makePersisted({ conv: makeConvInsights() })
    );

    expect(result.tenCommandments.length).toBeGreaterThanOrEqual(3);
    expect(result.tenCommandments.length).toBeLessThanOrEqual(10);
    result.tenCommandments.forEach(c => {
      expect(c.rule).toBeTruthy();
      expect(c.data).toBeTruthy();
    });
  });

  it("should generate sectionNarratives with all required keys", () => {
    const result = generateUserInsights(makePersisted());
    const keys = ["hero", "profile", "conversations", "opener", "timing", "algorithm", "premium", "photo", "hypotheses", "action"];

    keys.forEach(k => {
      expect(result.sectionNarratives[k]).toBeTruthy();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────

  it("should handle zero swipes gracefully", () => {
    const result = generateUserInsights(
      makePersisted({ metrics: { totalSwipes: 0, rightSwipes: 0, rightSwipeRate: 0, avgSwipesPerDay: 0, swipeToMatchRate: 0 } })
    );

    expect(result.heroStats).toBeDefined();
    // Should not crash
    expect(result.hypothesisThemes).toBeInstanceOf(Array);
  });

  it("should handle extreme metrics without crashing", () => {
    const result = generateUserInsights(
      makePersisted({ metrics: { totalSwipes: 999999, rightSwipeRate: 100, avgSwipesPerDay: 500, ghostRate: 100 } })
    );

    expect(result.heroStats).toBeDefined();
    expect(result.costlyMistakes.length).toBeGreaterThan(0);
  });

  it("should use different app source correctly", () => {
    const data = makePersisted();
    data.source = "hinge";
    data.metrics.source = "hinge";
    const result = generateUserInsights(data);

    expect(result.heroStats.totalDays["hinge"]).toBe(150);
    expect(result.sectionNarratives.hero).toContain("Hinge");
  });
});
