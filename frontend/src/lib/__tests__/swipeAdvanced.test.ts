// ============================================================
// swipeAdvanced.test.ts — Tests for H71-H90 swipe analysis
// ============================================================

import { describe, it, expect } from "vitest";
import type { RawSwipe, RawMatch } from "../wrappedParser";
import {
  splitIntoSessions,
  linearRegressionSlope,
  computeAutocorrelation,
  cosineSimilarity,
  analyzeSwipeVelocityDecay,
  analyzeMatchClusteringPeriodicity,
  analyzeLikeToMatchLatencyDrift,
  analyzePostInactivitySurge,
  analyzeSelectivityOscillation,
  analyzePassStreakMomentum,
  analyzeLateNightDesperation,
  analyzeSuperlikeEfficiency,
  analyzeCircadianSignature,
  analyzeWeeklyMicroCycles,
  analyzeMonthStartRenewal,
  analyzeDroughtToBingeRebound,
  analyzeFirstSwipeBonus,
  analyzeRightSwipeMomentum,
  analyzeMatchQualityBySelectivity,
  analyzeDiminishingReturns,
  analyzeActiveVsPassiveDays,
  analyzeAppOpenDecisiveness,
  analyzeSubscriptionTimingImpact,
  analyzeSwipePersonalityArchetype,
  computeAdvancedSwipeInsights,
} from "../swipeAdvanced";

// ── Test helpers ─────────────────────────────────────────────

const BASE = new Date("2025-06-01T10:00:00Z");

function makeSwipe(direction: "like" | "pass" | "superlike", minutesAfter: number): RawSwipe {
  return {
    timestamp: new Date(BASE.getTime() + minutesAfter * 60000),
    direction,
  };
}

function makeSwipes(count: number, direction: "like" | "pass" = "like", startMinute = 0, gapMinutes = 2): RawSwipe[] {
  return Array.from({ length: count }, (_, i) =>
    makeSwipe(direction, startMinute + i * gapMinutes)
  );
}

function makeMatch(minutesAfter: number, messagesCount = 0): RawMatch {
  return {
    timestamp: new Date(BASE.getTime() + minutesAfter * 60000),
    messagesCount,
    userInitiated: true,
  };
}

function makeSwipesOnDays(days: { day: number; likes: number; passes: number }[]): RawSwipe[] {
  const swipes: RawSwipe[] = [];
  for (const d of days) {
    const dayBase = new Date(BASE.getTime() + d.day * 86400000);
    dayBase.setHours(12, 0, 0, 0);
    for (let i = 0; i < d.likes; i++) {
      swipes.push({ timestamp: new Date(dayBase.getTime() + i * 120000), direction: "like" });
    }
    for (let i = 0; i < d.passes; i++) {
      swipes.push({ timestamp: new Date(dayBase.getTime() + (d.likes + i) * 120000), direction: "pass" });
    }
  }
  return swipes;
}

function makeMatchesOnDays(dayMinuteOffsets: number[]): RawMatch[] {
  return dayMinuteOffsets.map((m) => makeMatch(m * 1440)); // days → minutes
}

// ── Helper tests ─────────────────────────────────────────────

describe("splitIntoSessions", () => {
  it("groups swipes within 30min into one session", () => {
    const swipes = makeSwipes(10, "like", 0, 5); // 10 swipes, 5min apart
    const sessions = splitIntoSessions(swipes);
    expect(sessions.length).toBe(1);
    expect(sessions[0].swipes.length).toBe(10);
  });

  it("splits on gaps > 30min", () => {
    const s1 = makeSwipes(5, "like", 0, 2);
    const s2 = makeSwipes(5, "like", 60, 2); // 60 min later = new session
    const sessions = splitIntoSessions([...s1, ...s2]);
    expect(sessions.length).toBe(2);
  });

  it("returns empty for empty input", () => {
    expect(splitIntoSessions([])).toEqual([]);
  });
});

describe("linearRegressionSlope", () => {
  it("returns positive slope for increasing values", () => {
    expect(linearRegressionSlope([1, 2, 3, 4, 5])).toBeGreaterThan(0);
  });

  it("returns ~0 for flat values", () => {
    expect(Math.abs(linearRegressionSlope([5, 5, 5, 5]))).toBeLessThan(0.01);
  });

  it("returns 0 for single value", () => {
    expect(linearRegressionSlope([42])).toBe(0);
  });
});

describe("computeAutocorrelation", () => {
  it("returns high value for periodic signal", () => {
    const signal = [1, 0, 1, 0, 1, 0, 1, 0];
    expect(computeAutocorrelation(signal, 2)).toBeGreaterThan(0.5);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical arrays", () => {
    const a = [1, 2, 3];
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal arrays", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("handles empty arrays", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

// ── H71: Swipe Velocity Decay ────────────────────────────────

describe("analyzeSwipeVelocityDecay", () => {
  it("detects slowing inter-swipe gaps", () => {
    // 5 sessions of 15 swipes each, gap increases within each
    const swipes: RawSwipe[] = [];
    for (let s = 0; s < 5; s++) {
      const sessionStart = s * 180; // 3h apart = separate sessions (>30min gap)
      for (let i = 0; i < 15; i++) {
        // Gap increases: first 5 at 1min interval, last 5 at 5min interval
        const offset = sessionStart + (i < 5 ? i * 1 : 5 + (i - 5) * 5);
        swipes.push(makeSwipe("like", offset));
      }
    }
    // Pad to 100+
    const extra = makeSwipes(30, "like", 1200, 2);
    const result = analyzeSwipeVelocityDecay([...swipes, ...extra]);
    expect(result).toBeDefined();
    expect(result!.sessionsAnalyzed).toBeGreaterThanOrEqual(3);
  });

  it("returns undefined for fewer than 100 swipes", () => {
    expect(analyzeSwipeVelocityDecay(makeSwipes(50))).toBeUndefined();
  });
});

// ── H72: Match Clustering Periodicity ────────────────────────

describe("analyzeMatchClusteringPeriodicity", () => {
  it("detects clusters of matches", () => {
    const matches = [
      // Cluster 1: day 0-1
      ...makeMatchesOnDays([0, 0.5, 1]),
      // Gap
      // Cluster 2: day 10-11
      ...makeMatchesOnDays([10, 10.5, 11]),
      // Gap
      // Cluster 3: day 20-21
      ...makeMatchesOnDays([20, 20.5, 21]),
      // Fill to 15
      ...makeMatchesOnDays([30, 31, 40, 41, 50, 51]),
    ];
    const result = analyzeMatchClusteringPeriodicity(matches);
    expect(result).toBeDefined();
    expect(result!.clusters).toBeGreaterThanOrEqual(3);
    expect(result!.periodicityDetected).toBe(true);
  });

  it("returns undefined for fewer than 15 matches", () => {
    expect(analyzeMatchClusteringPeriodicity(makeMatchesOnDays([1, 2, 3]))).toBeUndefined();
  });
});

// ── H73: Like-to-Match Latency Drift ─────────────────────────

describe("analyzeLikeToMatchLatencyDrift", () => {
  it("detects increasing latency over time", () => {
    const swipes = makeSwipes(100, "like", 0, 30); // 100 likes over ~50h
    // Early matches come quickly, late matches come slowly
    const matches: RawMatch[] = [];
    for (let i = 0; i < 12; i++) {
      const likeTime = i * 8 * 30; // every 8th like
      const latency = i < 4 ? 60 : i < 8 ? 120 : 360; // increasing latency
      matches.push(makeMatch(likeTime + latency));
    }
    const result = analyzeLikeToMatchLatencyDrift(swipes, matches);
    expect(result).toBeDefined();
    expect(result!.pairsAnalyzed).toBeGreaterThanOrEqual(6);
  });

  it("returns undefined with insufficient data", () => {
    expect(analyzeLikeToMatchLatencyDrift(makeSwipes(10), [])).toBeUndefined();
  });
});

// ── H74: Post-Inactivity Surge ───────────────────────────────

describe("analyzePostInactivitySurge", () => {
  it("detects inactivity gaps of 3+ days", () => {
    // Need 14+ active days and 100+ swipes
    const swipes = makeSwipesOnDays([
      ...Array.from({ length: 5 }, (_, i) => ({ day: i, likes: 8, passes: 4 })),
      // 5-day gap (days 5-9 inactive)
      ...Array.from({ length: 5 }, (_, i) => ({ day: 10 + i, likes: 8, passes: 4 })),
      // Another 3-day gap (days 15-17 inactive)
      ...Array.from({ length: 5 }, (_, i) => ({ day: 18 + i, likes: 8, passes: 4 })),
    ]);
    const matches = makeMatchesOnDays([10, 10.5, 18]);
    const result = analyzePostInactivitySurge(swipes, matches);
    expect(result).toBeDefined();
    expect(result!.inactivityGaps).toBeGreaterThanOrEqual(1);
  });

  it("returns undefined for fewer than 100 swipes", () => {
    expect(analyzePostInactivitySurge(makeSwipes(50), [])).toBeUndefined();
  });
});

// ── H75: Selectivity Oscillation ─────────────────────────────

describe("analyzeSelectivityOscillation", () => {
  it("detects oscillating like rates", () => {
    // Alternating high/low like rate sessions
    const swipes: RawSwipe[] = [];
    for (let s = 0; s < 10; s++) {
      const sessionStart = s * 120;
      const likeRate = s % 2 === 0 ? 0.8 : 0.2;
      for (let i = 0; i < 25; i++) {
        const dir = Math.random() < likeRate ? "like" : "pass";
        swipes.push(makeSwipe(dir as "like" | "pass", sessionStart + i * 2));
      }
    }
    const result = analyzeSelectivityOscillation(swipes);
    expect(result).toBeDefined();
    expect(result!.oscillationScore).toBeGreaterThan(10);
  });

  it("returns undefined for fewer than 200 swipes", () => {
    expect(analyzeSelectivityOscillation(makeSwipes(100))).toBeUndefined();
  });
});

// ── H76: Pass Streak Momentum ────────────────────────────────

describe("analyzePassStreakMomentum", () => {
  it("finds pass streaks of 5+", () => {
    const swipes: RawSwipe[] = [
      ...makeSwipes(10, "pass", 0, 2),    // 10 passes
      makeSwipe("like", 25),               // then a like
      ...makeSwipes(90, "like", 30, 2),    // rest likes
    ];
    const result = analyzePassStreakMomentum(swipes, [makeMatch(25)]);
    expect(result).toBeDefined();
    expect(result!.streaksFound).toBeGreaterThanOrEqual(1);
  });

  it("returns undefined with not enough swipes", () => {
    expect(analyzePassStreakMomentum(makeSwipes(50), [])).toBeUndefined();
  });
});

// ── H77: Late-Night Desperation ──────────────────────────────

describe("analyzeLateNightDesperation", () => {
  it("identifies late night swipes (1-5 AM)", () => {
    const swipes: RawSwipe[] = [];
    // 80 daytime swipes at noon
    for (let i = 0; i < 80; i++) {
      const d = new Date("2025-06-01T12:00:00Z");
      d.setMinutes(d.getMinutes() + i * 2);
      swipes.push({ timestamp: d, direction: "like" });
    }
    // 25 late night swipes at 2 AM
    for (let i = 0; i < 25; i++) {
      const d = new Date("2025-06-02T02:00:00Z");
      d.setMinutes(d.getMinutes() + i * 2);
      swipes.push({ timestamp: d, direction: "like" });
    }
    const result = analyzeLateNightDesperation(swipes, []);
    expect(result).toBeDefined();
    expect(result!.lateNightSwipes).toBe(25);
    expect(result!.lateNightPct).toBeGreaterThan(10);
  });

  it("returns undefined with fewer than 100 swipes", () => {
    expect(analyzeLateNightDesperation(makeSwipes(50), [])).toBeUndefined();
  });
});

// ── H78: Superlike Efficiency Paradox ────────────────────────

describe("analyzeSuperlikeEfficiency", () => {
  it("detects superlikes and computes efficiency", () => {
    const swipes: RawSwipe[] = [
      ...makeSwipes(50, "like", 0, 2),
      ...Array.from({ length: 10 }, (_, i) => makeSwipe("superlike", 200 + i * 5)),
    ];
    const matches = [makeMatch(10), makeMatch(50)];
    const result = analyzeSuperlikeEfficiency(swipes, matches);
    expect(result).toBeDefined();
    expect(result!.superlikesSent).toBe(10);
  });

  it("returns undefined when no superlikes", () => {
    expect(analyzeSuperlikeEfficiency(makeSwipes(50, "like"), [])).toBeUndefined();
  });
});

// ── H79: Circadian Signature ─────────────────────────────────

describe("analyzeCircadianSignature", () => {
  it("computes stability score and top hours", () => {
    // Consistent pattern over 3 weeks: always swipe at a fixed local hour
    const swipes: RawSwipe[] = [];
    for (let week = 0; week < 3; week++) {
      for (let day = 0; day < 7; day++) {
        const d = new Date(2025, 5, 1 + week * 7 + day, 20, 0, 0); // local time 20h
        for (let i = 0; i < 10; i++) {
          const ts = new Date(d.getTime() + i * 180000); // 3 min apart
          swipes.push({ timestamp: ts, direction: "like" });
        }
      }
    }
    const result = analyzeCircadianSignature(swipes, []);
    expect(result).toBeDefined();
    expect(result!.signatureHours).toContain(20);
    expect(result!.stabilityScore).toBeGreaterThan(0.5);
  });

  it("returns undefined with fewer than 100 swipes", () => {
    expect(analyzeCircadianSignature(makeSwipes(50), [])).toBeUndefined();
  });
});

// ── H80: Weekly Micro-Cycles ─────────────────────────────────

describe("analyzeWeeklyMicroCycles", () => {
  it("detects broken weeks (high volume deviation)", () => {
    const swipes: RawSwipe[] = [];
    // 4 normal weeks of 30 swipes + 1 burst week of 120
    for (let week = 0; week < 5; week++) {
      const count = week === 2 ? 120 : 30;
      for (let i = 0; i < count; i++) {
        const d = new Date(BASE.getTime() + (week * 7 * 86400000) + i * 120000);
        swipes.push({ timestamp: d, direction: "like" });
      }
    }
    const result = analyzeWeeklyMicroCycles(swipes, []);
    expect(result).toBeDefined();
    expect(result!.brokenWeeks).toBeGreaterThanOrEqual(1);
  });

  it("returns undefined with fewer than 200 swipes", () => {
    expect(analyzeWeeklyMicroCycles(makeSwipes(100), [])).toBeUndefined();
  });
});

// ── H81: Month-Start Renewal ─────────────────────────────────

describe("analyzeMonthStartRenewal", () => {
  it("compares month-start vs rest match rates", () => {
    const swipes: RawSwipe[] = [];
    // 2 months of swipes
    for (let m = 0; m < 2; m++) {
      for (let d = 1; d <= 28; d++) {
        const date = new Date(`2025-0${m + 6}-${String(d).padStart(2, "0")}T12:00:00Z`);
        for (let i = 0; i < 5; i++) {
          swipes.push({ timestamp: new Date(date.getTime() + i * 60000), direction: "like" });
        }
      }
    }
    // Matches concentrated at month start
    const matches = [
      { timestamp: new Date("2025-06-01T14:00:00Z"), messagesCount: 3, userInitiated: true },
      { timestamp: new Date("2025-06-02T14:00:00Z"), messagesCount: 2, userInitiated: true },
      { timestamp: new Date("2025-07-01T14:00:00Z"), messagesCount: 1, userInitiated: true },
      { timestamp: new Date("2025-06-15T14:00:00Z"), messagesCount: 0, userInitiated: true },
      { timestamp: new Date("2025-06-20T14:00:00Z"), messagesCount: 0, userInitiated: true },
      { timestamp: new Date("2025-07-10T14:00:00Z"), messagesCount: 0, userInitiated: true },
      { timestamp: new Date("2025-07-15T14:00:00Z"), messagesCount: 0, userInitiated: true },
      { timestamp: new Date("2025-07-20T14:00:00Z"), messagesCount: 0, userInitiated: true },
      { timestamp: new Date("2025-06-10T14:00:00Z"), messagesCount: 0, userInitiated: true },
      { timestamp: new Date("2025-06-25T14:00:00Z"), messagesCount: 0, userInitiated: true },
    ] as RawMatch[];
    const result = analyzeMonthStartRenewal(swipes, matches);
    expect(result).toBeDefined();
    expect(result!.monthsAnalyzed).toBeGreaterThanOrEqual(2);
    expect(result!.monthStartMatches).toBeGreaterThanOrEqual(2);
  });

  it("returns undefined with fewer than 10 matches", () => {
    expect(analyzeMonthStartRenewal(makeSwipes(100), makeMatchesOnDays([1, 2]))).toBeUndefined();
  });
});

// ── H82: Drought-to-Binge Rebound ────────────────────────────

describe("analyzeDroughtToBingeRebound", () => {
  it("detects drought followed by binge", () => {
    // Normal days, then drought, then binge
    const swipes = makeSwipesOnDays([
      ...Array.from({ length: 7 }, (_, i) => ({ day: i, likes: 10, passes: 5 })),
      // Days 7-14: active but 0 matches → drought
      ...Array.from({ length: 8 }, (_, i) => ({ day: 7 + i, likes: 10, passes: 5 })),
      // Day 15: binge
      { day: 15, likes: 60, passes: 10 },
      { day: 16, likes: 50, passes: 10 },
      // Continue
      ...Array.from({ length: 5 }, (_, i) => ({ day: 17 + i, likes: 10, passes: 5 })),
    ]);

    // Matches only on days 0-6 (creating drought from day 7+)
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch(i * 1440, 3)
    );

    const result = analyzeDroughtToBingeRebound(swipes, matches);
    expect(result).toBeDefined();
  });

  it("returns undefined with fewer than 100 swipes", () => {
    expect(analyzeDroughtToBingeRebound(makeSwipes(50), [])).toBeUndefined();
  });
});

// ── H83: First-Swipe-of-Session Bonus ────────────────────────

describe("analyzeFirstSwipeBonus", () => {
  it("analyzes first swipe vs rest", () => {
    // Multiple sessions
    const swipes: RawSwipe[] = [];
    for (let s = 0; s < 15; s++) {
      const start = s * 120; // 2h apart
      swipes.push(makeSwipe("like", start));
      for (let i = 1; i < 10; i++) {
        swipes.push(makeSwipe(i % 3 === 0 ? "like" : "pass", start + i * 2));
      }
    }
    const result = analyzeFirstSwipeBonus(swipes, [makeMatch(0)]);
    expect(result).toBeDefined();
    expect(result!.sessionsAnalyzed).toBeGreaterThanOrEqual(5);
    expect(result!.firstSwipeLikes).toBeGreaterThan(0);
  });

  it("returns undefined with fewer than 100 swipes", () => {
    expect(analyzeFirstSwipeBonus(makeSwipes(50), [])).toBeUndefined();
  });
});

// ── H84: Right-Swipe Momentum ────────────────────────────────

describe("analyzeRightSwipeMomentum", () => {
  it("computes weekly match rates and correlation", () => {
    const swipes: RawSwipe[] = [];
    const matches: RawMatch[] = [];
    // 5 weeks of data
    for (let w = 0; w < 5; w++) {
      for (let d = 0; d < 7; d++) {
        const dayOffset = (w * 7 + d) * 1440;
        for (let i = 0; i < 10; i++) {
          swipes.push(makeSwipe("like", dayOffset + i * 2));
        }
        if (d < (w + 1)) { // Increasing matches each week
          matches.push(makeMatch(dayOffset + 30));
        }
      }
    }
    const result = analyzeRightSwipeMomentum(swipes, matches);
    expect(result).toBeDefined();
    expect(result!.weeksAnalyzed).toBeGreaterThanOrEqual(3);
    expect(result!.weeklyMatchRates.length).toBeGreaterThan(0);
  });
});

// ── H85: Match Quality by Selectivity ────────────────────────

describe("analyzeMatchQualityBySelectivity", () => {
  it("compares selective vs mass-like days", () => {
    const swipes = makeSwipesOnDays([
      // Selective day (30% like rate)
      { day: 0, likes: 3, passes: 7 },
      { day: 1, likes: 3, passes: 7 },
      { day: 2, likes: 3, passes: 7 },
      { day: 3, likes: 3, passes: 7 },
      { day: 4, likes: 3, passes: 7 },
      // Mass-like day (80% like rate)
      { day: 5, likes: 8, passes: 2 },
      { day: 6, likes: 8, passes: 2 },
      { day: 7, likes: 8, passes: 2 },
      { day: 8, likes: 8, passes: 2 },
      { day: 9, likes: 8, passes: 2 },
    ]);
    const matches: RawMatch[] = [
      { timestamp: new Date(BASE.getTime() + 0 * 86400000 + 43200000), messagesCount: 5, userInitiated: true },
      { timestamp: new Date(BASE.getTime() + 1 * 86400000 + 43200000), messagesCount: 3, userInitiated: true },
      { timestamp: new Date(BASE.getTime() + 5 * 86400000 + 43200000), messagesCount: 0, userInitiated: true },
      { timestamp: new Date(BASE.getTime() + 6 * 86400000 + 43200000), messagesCount: 0, userInitiated: true },
      // Need 10 total
      ...Array.from({ length: 6 }, (_, i) => ({
        timestamp: new Date(BASE.getTime() + (i + 10) * 86400000 + 43200000),
        messagesCount: 0,
        userInitiated: true,
      } as RawMatch)),
    ];
    const result = analyzeMatchQualityBySelectivity(swipes, matches);
    expect(result).toBeDefined();
  });

  it("returns undefined with insufficient data", () => {
    expect(analyzeMatchQualityBySelectivity(makeSwipes(50), [])).toBeUndefined();
  });
});

// ── H86: Diminishing Returns ─────────────────────────────────

describe("analyzeDiminishingReturns", () => {
  it("finds optimal daily like count", () => {
    const swipes = makeSwipesOnDays([
      // Low volume days with good match rate
      ...Array.from({ length: 5 }, (_, i) => ({ day: i, likes: 8, passes: 2 })),
      // High volume days with worse match rate
      ...Array.from({ length: 5 }, (_, i) => ({ day: 10 + i, likes: 50, passes: 10 })),
    ]);
    const matches = [
      ...makeMatchesOnDays([0, 1, 2]), // 3 matches in low volume
      makeMatch(10 * 1440, 0),          // 1 match in high volume
    ];
    const result = analyzeDiminishingReturns(swipes, matches);
    expect(result).toBeDefined();
    expect(result!.daysAnalyzed).toBeGreaterThan(0);
  });

  it("returns undefined with fewer than 100 swipes", () => {
    expect(analyzeDiminishingReturns(makeSwipes(50), [])).toBeUndefined();
  });
});

// ── H87: Active vs Passive Days ──────────────────────────────

describe("analyzeActiveVsPassiveDays", () => {
  it("separates days with/without matches", () => {
    const swipes = makeSwipesOnDays([
      { day: 0, likes: 15, passes: 5 },
      { day: 1, likes: 15, passes: 5 },
      { day: 2, likes: 30, passes: 10 },
    ]);
    const matches = [makeMatch(0)]; // Match only on day 0
    const result = analyzeActiveVsPassiveDays(swipes, matches);
    expect(result).toBeDefined();
    expect(result!.activeDays).toBe(1);
    expect(result!.passiveDays).toBe(2);
  });

  it("returns undefined with fewer than 50 swipes", () => {
    expect(analyzeActiveVsPassiveDays(makeSwipes(20), [])).toBeUndefined();
  });
});

// ── H88: App Open Decisiveness ───────────────────────────────

describe("analyzeAppOpenDecisiveness", () => {
  it("computes decisiveness metrics", () => {
    const swipes = makeSwipesOnDays([
      { day: 0, likes: 20, passes: 10 },
      { day: 1, likes: 5, passes: 2 },
      { day: 2, likes: 20, passes: 10 },
    ]);
    const matches = [makeMatch(0)];
    const result = analyzeAppOpenDecisiveness(swipes, matches, 30);
    expect(result).toBeDefined();
    expect(result!.avgOpensPerDay).toBeGreaterThan(0);
    expect(result!.avgSwipesPerOpen).toBeGreaterThan(0);
  });

  it("returns undefined when no appOpens data", () => {
    expect(analyzeAppOpenDecisiveness(makeSwipes(100), [], undefined)).toBeUndefined();
  });
});

// ── H89: Subscription Timing Impact ──────────────────────────

describe("analyzeSubscriptionTimingImpact", () => {
  it("compares first 7d vs last 7d of subscription", () => {
    const start = new Date("2025-06-01T00:00:00Z");
    const end = new Date("2025-07-01T00:00:00Z");
    const matches: RawMatch[] = [
      // First 7 days
      { timestamp: new Date("2025-06-02T12:00:00Z"), messagesCount: 3, userInitiated: true },
      { timestamp: new Date("2025-06-03T12:00:00Z"), messagesCount: 2, userInitiated: true },
      { timestamp: new Date("2025-06-05T12:00:00Z"), messagesCount: 1, userInitiated: true },
      // Last 7 days
      { timestamp: new Date("2025-06-27T12:00:00Z"), messagesCount: 0, userInitiated: true },
    ];
    const result = analyzeSubscriptionTimingImpact(matches, [{ start, end }]);
    expect(result).toBeDefined();
    expect(result!.first7dMatchRate).toBeGreaterThan(result!.last7dMatchRate);
    expect(result!.frontLoadingRatio).toBeGreaterThan(1);
  });

  it("returns undefined without subscription data", () => {
    expect(analyzeSubscriptionTimingImpact([], undefined)).toBeUndefined();
  });
});

// ── H90: Swipe Personality Archetype ─────────────────────────

describe("analyzeSwipePersonalityArchetype", () => {
  it("determines archetype from insights", () => {
    const result = analyzeSwipePersonalityArchetype({
      swipeVelocityDecay: { avgEarlyGapMs: 2000, avgLateGapMs: 6000, decayRatio: 3, sessionsAnalyzed: 10, sessionsWithDecay: 8, decayPct: 80 },
      matchClusteringPeriodicity: { totalMatches: 20, clusters: 4, avgClusterSize: 5, maxGapDays: 10, avgGapDays: 5, periodicityDetected: true },
      postInactivitySurge: { inactivityGaps: 5, surgeMatchRate: 3, normalMatchRate: 1, surgeMultiplier: 3, totalResumptions: 5 },
      selectivityOscillation: { sessionLikeRates: [20, 80, 30, 70], oscillationScore: 25, stableSessions: 1, oscillatingSessions: 3, stableMatchRate: 2, oscillatingMatchRate: 1 },
      lateNightDesperation: { lateNightSwipes: 50, lateNightLikes: 40, lateNightMatchRate: 0.5, daySwipes: 200, dayMatchRate: 1.5, lateNightPct: 20, matchRateDiff: 1 },
      circadianSignature: { signatureHours: [20, 21, 22], stabilityScore: 0.4, deviationMatchRate: 0.5, normalMatchRate: 1.5, weeksAnalyzed: 4 },
      weeklyMicroCycles: { avgWeeklyVolume: 50, brokenWeeks: 3, normalWeeks: 1, brokenWeekMatchRate: 0.5, normalWeekMatchRate: 1.5, cyclePenalty: 1 },
      droughtToBingeRebound: { droughts: 3, bingesAfterDrought: 3, bingeMatchRate: 0.3, normalMatchRate: 1, reboundPenalty: 70 },
      matchQualityBySelectivity: { selectiveMatchConvoRate: 60, massLikeMatchConvoRate: 20, selectivityThreshold: 40, qualityMultiplier: 3 },
      diminishingReturns: { optimalDailyLikes: 20, matchRateAtOptimal: 3, matchRateAboveOptimal: 0.5, decayFactor: 83, daysAnalyzed: 30 },
      activeVsPassiveDays: { activeDays: 10, passiveDays: 20, activeAvgSwipes: 25, passiveAvgSwipes: 40, activeAvgLikeRate: 35, passiveAvgLikeRate: 55 },
    });

    expect(result).toBeDefined();
    expect(result!.archetype).toBeTruthy();
    expect(result!.hypothesesUsed).toBeGreaterThanOrEqual(5);
    expect(result!.dominantTraits.length).toBeGreaterThan(0);
  });

  it("returns undefined with fewer than 5 hypotheses", () => {
    const result = analyzeSwipePersonalityArchetype({});
    expect(result).toBeUndefined();
  });
});

// ── Aggregator ───────────────────────────────────────────────

describe("computeAdvancedSwipeInsights", () => {
  it("returns undefined for fewer than 50 swipes", () => {
    const result = computeAdvancedSwipeInsights(
      { swipes: makeSwipes(20), matches: [], source: "tinder", startDate: BASE, endDate: BASE, dailyOnly: false } as any,
      { totalSwipes: 20, appOpensPerDay: 0, totalDays: 1 } as any
    );
    expect(result).toBeUndefined();
  });

  it("returns object with at least some defined fields for sufficient data", () => {
    const swipes = makeSwipesOnDays(
      Array.from({ length: 30 }, (_, i) => ({ day: i, likes: 10, passes: 5 }))
    );
    const matches = makeMatchesOnDays(Array.from({ length: 20 }, (_, i) => i * 2));

    const result = computeAdvancedSwipeInsights(
      { swipes, matches, source: "tinder", startDate: BASE, endDate: BASE, dailyOnly: false } as any,
      { totalSwipes: swipes.length, appOpensPerDay: 5, totalDays: 30 } as any
    );
    expect(result).toBeDefined();
    // At least some insights should be present
    const definedKeys = Object.values(result!).filter((v) => v !== undefined);
    expect(definedKeys.length).toBeGreaterThan(0);
  });

  it("skips timestamp-dependent analyses when dailyOnly=true", () => {
    const swipes = makeSwipesOnDays(
      Array.from({ length: 30 }, (_, i) => ({ day: i, likes: 10, passes: 5 }))
    );
    const matches = makeMatchesOnDays(Array.from({ length: 20 }, (_, i) => i * 2));

    const result = computeAdvancedSwipeInsights(
      { swipes, matches, source: "tinder", startDate: BASE, endDate: BASE, dailyOnly: true } as any,
      { totalSwipes: swipes.length, appOpensPerDay: 0, totalDays: 30 } as any
    );
    expect(result).toBeDefined();
    // Timestamp-dependent should be undefined
    expect(result!.swipeVelocityDecay).toBeUndefined();
    expect(result!.selectivityOscillation).toBeUndefined();
    expect(result!.lateNightDesperation).toBeUndefined();
    expect(result!.circadianSignature).toBeUndefined();
    expect(result!.firstSwipeBonus).toBeUndefined();
  });

  it("handles empty swipes gracefully", () => {
    const result = computeAdvancedSwipeInsights(
      { swipes: [], matches: [], source: "tinder", startDate: BASE, endDate: BASE } as any,
      { totalSwipes: 0, appOpensPerDay: 0, totalDays: 0 } as any
    );
    expect(result).toBeUndefined();
  });
});
