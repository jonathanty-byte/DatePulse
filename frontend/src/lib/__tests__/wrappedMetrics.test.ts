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
