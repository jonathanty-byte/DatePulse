import { describe, it, expect } from "vitest";
import { computeWrappedMetrics, getVerdict } from "../wrappedMetrics";
import type { ParsedData, RawSwipe, RawMatch } from "../wrappedParser";

// ── Helpers ─────────────────────────────────────────────────────

function makeSwipe(date: string, direction: "like" | "pass" = "like"): RawSwipe {
  return { timestamp: new Date(date), direction };
}

function makeMatch(date: string, msgs = 0, initiated = false): RawMatch {
  return { timestamp: new Date(date), messagesCount: msgs, userInitiated: initiated };
}

function makeMinimalData(overrides?: Partial<ParsedData>): ParsedData {
  return {
    source: "tinder",
    period: {
      start: new Date("2025-01-01"),
      end: new Date("2025-06-30"),
    },
    swipes: [
      makeSwipe("2025-01-15T20:00:00", "like"),
      makeSwipe("2025-01-15T20:01:00", "pass"),
      makeSwipe("2025-02-10T20:00:00", "like"),
      makeSwipe("2025-02-10T20:01:00", "like"),
      makeSwipe("2025-03-05T20:00:00", "like"),
      makeSwipe("2025-03-05T20:01:00", "pass"),
      makeSwipe("2025-03-05T20:02:00", "pass"),
      makeSwipe("2025-03-05T20:03:00", "like"),
      makeSwipe("2025-04-01T20:00:00", "like"),
      makeSwipe("2025-04-01T20:01:00", "like"),
    ],
    matches: [
      makeMatch("2025-01-15T21:00:00", 5, true),
      makeMatch("2025-02-10T21:00:00", 0, false),
      makeMatch("2025-04-01T21:00:00", 3, true),
    ],
    ...overrides,
  };
}

// ── computeWrappedMetrics smoke test ────────────────────────────

describe("computeWrappedMetrics", () => {
  it("computes basic metrics from minimal data", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);

    expect(m.totalSwipes).toBe(10);
    expect(m.rightSwipes).toBe(7); // 7 likes (count from test data)
    expect(m.rightSwipeRate).toBe(70); // 7/10 = 70%
    expect(m.source).toBe("tinder");
  });

  it("computes swipeToMatchRate correctly", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    // 3 matches / 7 right swipes = 43%
    expect(m.swipeToMatchRate).toBe(43);
  });

  it("computes ghostRate correctly", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    // 1 ghosted (0 messages) out of 3 matches = 33%
    expect(m.ghostRate).toBe(33);
  });

  it("handles 0 likes → 0% swipeToMatchRate", () => {
    const data = makeMinimalData({
      swipes: [makeSwipe("2025-01-15", "pass")],
      matches: [],
    });
    const m = computeWrappedMetrics(data);
    expect(m.swipeToMatchRate).toBe(0);
  });

  it("handles 0 matches → 0% ghostRate", () => {
    const data = makeMinimalData({ matches: [] });
    const m = computeWrappedMetrics(data);
    expect(m.ghostRate).toBe(0);
  });

  it("handles all matches ghosted", () => {
    const data = makeMinimalData({
      matches: [
        makeMatch("2025-01-15T21:00:00", 0),
        makeMatch("2025-02-10T21:00:00", 0),
      ],
    });
    const m = computeWrappedMetrics(data);
    expect(m.ghostRate).toBe(100);
  });

  it("handles none ghosted", () => {
    const data = makeMinimalData({
      matches: [
        makeMatch("2025-01-15T21:00:00", 5),
        makeMatch("2025-02-10T21:00:00", 3),
      ],
    });
    const m = computeWrappedMetrics(data);
    expect(m.ghostRate).toBe(0);
  });

  it("computes day-of-week data", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    expect(m.swipesByDayOfWeek).toHaveLength(7);
    expect(m.swipesByDayOfWeek.every((d) => d.day.length > 0)).toBe(true);
    expect(m.bestDay.length).toBeGreaterThan(0);
    expect(m.worstDay.length).toBeGreaterThan(0);
  });

  it("computes ADN dating axes", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    expect(m.adnDating).toHaveLength(5);
    expect(m.adnDating.every((a) => a.value >= 0 && a.value <= 100)).toBe(true);
    expect(m.adnDating.map((a) => a.axis)).toEqual([
      "Selectivite", "Conversion", "Engagement", "Regularite", "Timing",
    ]);
  });

  it("computes messages sent/received", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    // Total messages sent = 5 + 0 + 3 = 8
    expect(m.totalMessagesSent).toBe(8);
    // No messagesReceived data → estimate = 8 * 0.8 = 6.4 → 6
    expect(m.totalMessagesReceived).toBe(6);
  });

  it("computes tenure when createDate available", () => {
    const data = makeMinimalData({ createDate: new Date("2024-01-01") });
    const m = computeWrappedMetrics(data);
    expect(m.createDate).toBeDefined();
    expect(m.tenureMonths).toBeGreaterThan(0);
  });

  it("computes purchases when available", () => {
    const data = makeMinimalData({
      purchases: {
        subscription: {
          productType: "tinder_gold",
          createDate: new Date("2025-01-01"),
          expireDate: new Date("2025-04-01"),
        },
        consumables: { count: 3, types: ["boost"] },
      },
    });
    const m = computeWrappedMetrics(data);
    expect(m.purchasesTotal).toBeGreaterThan(0);
    expect(m.subscriptionType).toBe("tinder_gold");
    expect(m.boostCount).toBe(3);
    expect(m.costPerMatch).toBeGreaterThan(0);
  });
});

// ── getVerdict ──────────────────────────────────────────────────

describe("getVerdict", () => {
  it("returns ghost verdict when ghostRate > 50", () => {
    const data = makeMinimalData({
      matches: [
        makeMatch("2025-01-15", 0),
        makeMatch("2025-02-10", 0),
        makeMatch("2025-03-05", 1),
      ],
    });
    const m = computeWrappedMetrics(data);
    const v = getVerdict(m);
    expect(v.ctaHref).toBe("/coach");
  });

  it("returns like-too-much verdict when rightSwipeRate > 70", () => {
    const data = makeMinimalData({
      swipes: [
        makeSwipe("2025-01-15", "like"),
        makeSwipe("2025-01-15", "like"),
        makeSwipe("2025-01-15", "like"),
        makeSwipe("2025-01-15", "like"),
        makeSwipe("2025-01-15", "pass"),
      ],
      matches: [makeMatch("2025-01-15", 3)],
    });
    const m = computeWrappedMetrics(data);
    const v = getVerdict(m);
    expect(v.icon).toBe("\u{1F6A8}");
    expect(v.ctaHref).toBe("/audit");
  });

  it("returns default verdict for balanced profile", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    const v = getVerdict(m);
    expect(v.ctaHref).toBeDefined();
    expect(v.title.length).toBeGreaterThan(0);
  });
});

// ── Deep Insights: funnel ──────────────────────────────────────

describe("funnel metrics", () => {
  it("computes funnel with we_met data", () => {
    const data = makeMinimalData({
      source: "hinge",
      weMet: [
        { didMeet: "Yes", timestamp: new Date("2025-03-01") },
        { didMeet: "No", timestamp: new Date("2025-03-15") },
        { didMeet: "Yes", timestamp: new Date("2025-04-10") },
      ],
    });
    const m = computeWrappedMetrics(data);
    expect(m.funnel).toBeDefined();
    expect(m.funnel!.dates).toBe(2); // 2 "Yes"
    expect(m.funnel!.likes).toBe(7);
    expect(m.funnel!.matches).toBe(3);
    expect(m.funnel!.convoToDatePct).toBeGreaterThan(0);
  });

  it("computes funnel without we_met (dates=0)", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    expect(m.funnel).toBeDefined();
    expect(m.funnel!.dates).toBe(0);
    expect(m.funnel!.convoToDatePct).toBe(0);
  });
});

// ── Deep Insights: comment impact ──────────────────────────────

describe("comment impact", () => {
  it("computes boost factor from comment stats", () => {
    const data = makeMinimalData({
      source: "hinge",
      commentStats: {
        commented: 100,
        commentedMatched: 5,
        plain: 400,
        plainMatched: 8,
      },
    });
    const m = computeWrappedMetrics(data);
    expect(m.commentImpact).toBeDefined();
    // commented rate = 5/100 = 5%, plain rate = 8/400 = 2% → boost = 2.5
    expect(m.commentImpact!.commentedMatchRate).toBe(5);
    expect(m.commentImpact!.plainMatchRate).toBe(2);
    expect(m.commentImpact!.boostFactor).toBe(2.5);
    expect(m.commentImpact!.commentRate).toBe(20); // 100/500
  });

  it("returns undefined when no comment data", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    expect(m.commentImpact).toBeUndefined();
  });
});

// ── Deep Insights: response time ─────────────────────────────

describe("response time", () => {
  it("computes median and buckets from firstMessageDate", () => {
    const data = makeMinimalData({
      matches: [
        // Match at 10:00, first msg at 10:30 → 0.5h
        { timestamp: new Date("2025-01-15T10:00:00"), messagesCount: 3, userInitiated: true, firstMessageDate: new Date("2025-01-15T10:30:00") },
        // Match at 12:00, first msg at 15:00 → 3h
        { timestamp: new Date("2025-02-10T12:00:00"), messagesCount: 2, userInitiated: false, firstMessageDate: new Date("2025-02-10T15:00:00") },
        // Match at 08:00, first msg next day at 18:00 → 34h
        { timestamp: new Date("2025-03-05T08:00:00"), messagesCount: 5, userInitiated: true, firstMessageDate: new Date("2025-03-06T18:00:00") },
      ],
    });
    const m = computeWrappedMetrics(data);
    expect(m.responseTime).toBeDefined();
    // Sorted: 0.5h, 3h, 34h → median = 3h
    expect(m.responseTime!.medianHours).toBe(3);
    expect(m.responseTime!.under1h).toBe(1);
    expect(m.responseTime!.under6h).toBe(1); // 1-6h bucket
    expect(m.responseTime!.over24h).toBe(1);
    expect(m.responseTime!.fastResponseRate).toBe(67); // 2/3
  });

  it("returns undefined when no firstMessageDate", () => {
    const data = makeMinimalData(); // default matches have no firstMessageDate
    const m = computeWrappedMetrics(data);
    expect(m.responseTime).toBeUndefined();
  });
});

// ── Deep Insights: unmatch data ─────────────────────────────

describe("unmatch data", () => {
  it("computes survival rate and duration", () => {
    const data = makeMinimalData({
      matches: [
        // Unmatched after 10 days
        { timestamp: new Date("2025-01-15T10:00:00"), messagesCount: 3, userInitiated: true, unmatchDate: new Date("2025-01-25T10:00:00") },
        // Unmatched after 20 days
        { timestamp: new Date("2025-02-10T10:00:00"), messagesCount: 0, userInitiated: false, unmatchDate: new Date("2025-03-02T10:00:00") },
        // Survived
        { timestamp: new Date("2025-04-01T10:00:00"), messagesCount: 5, userInitiated: true },
      ],
    });
    const m = computeWrappedMetrics(data);
    expect(m.unmatchData).toBeDefined();
    expect(m.unmatchData!.totalUnmatched).toBe(2);
    expect(m.unmatchData!.survivedMatches).toBe(1);
    expect(m.unmatchData!.survivalRate).toBe(33); // 1/3
    expect(m.unmatchData!.avgDurationDays).toBe(15); // (10+20)/2
  });

  it("returns undefined when no unmatchDate", () => {
    const data = makeMinimalData(); // default matches have no unmatchDate
    const m = computeWrappedMetrics(data);
    expect(m.unmatchData).toBeUndefined();
  });
});

// ── Deep Insights: premium ROI ──────────────────────────────

describe("premium ROI", () => {
  it("computes premium vs free match rates", () => {
    // Swipes: 4 during premium (June 2025), 6 during free
    // Matches: 2 during premium, 1 during free
    const data = makeMinimalData({
      swipes: [
        // Premium period: June 2025
        makeSwipe("2025-06-10T20:00:00", "like"),
        makeSwipe("2025-06-11T20:00:00", "like"),
        makeSwipe("2025-06-12T20:00:00", "like"),
        makeSwipe("2025-06-13T20:00:00", "like"),
        // Free period
        makeSwipe("2025-01-15T20:00:00", "like"),
        makeSwipe("2025-01-16T20:00:00", "like"),
        makeSwipe("2025-02-10T20:00:00", "like"),
        makeSwipe("2025-03-05T20:00:00", "like"),
        makeSwipe("2025-04-01T20:00:00", "like"),
        makeSwipe("2025-04-02T20:00:00", "like"),
      ],
      matches: [
        makeMatch("2025-06-10T21:00:00", 3), // premium
        makeMatch("2025-06-12T21:00:00", 2), // premium
        makeMatch("2025-01-15T21:00:00", 1), // free
      ],
      subscriptionPeriods: [
        { start: new Date("2025-06-01"), end: new Date("2025-06-30"), price: 30, currency: "EUR" },
      ],
    });
    const m = computeWrappedMetrics(data);
    expect(m.premiumROI).toBeDefined();
    expect(m.premiumROI!.premiumMatchRate).toBe(50); // 2/4
    expect(m.premiumROI!.freeMatchRate).toBeCloseTo(16.7, 0); // 1/6
    expect(m.premiumROI!.boostFactor).toBeGreaterThan(1);
    expect(m.premiumROI!.totalSpent).toBe(30);
    expect(m.premiumROI!.isWorthIt).toBe(true);
  });

  it("returns undefined when no subscriptionPeriods", () => {
    const data = makeMinimalData();
    const m = computeWrappedMetrics(data);
    expect(m.premiumROI).toBeUndefined();
  });
});
