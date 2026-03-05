import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveUserInsights, loadUserInsights, clearUserInsights, type PersistedUserInsights } from "../insightsPersistence";
import type { WrappedMetrics } from "../wrappedMetrics";

// Minimal WrappedMetrics fixture
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

function makePersistedData(metricsOverrides?: Partial<WrappedMetrics>): PersistedUserInsights {
  return {
    version: 1,
    persistedAt: new Date().toISOString(),
    source: "tinder",
    metrics: makeMetrics(metricsOverrides),
  };
}

describe("insightsPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should save and load user insights", () => {
    const data = makePersistedData();
    const saved = saveUserInsights(data);
    expect(saved).toBe(true);

    const loaded = loadUserInsights();
    expect(loaded).not.toBeNull();
    expect(loaded!.source).toBe("tinder");
    expect(loaded!.metrics.totalSwipes).toBe(1000);
  });

  it("should serialize and deserialize Date objects", () => {
    const data = makePersistedData();
    saveUserInsights(data);
    const loaded = loadUserInsights();

    expect(loaded!.metrics.periodStart).toBeInstanceOf(Date);
    expect(loaded!.metrics.periodEnd).toBeInstanceOf(Date);
    expect(loaded!.metrics.periodStart.toISOString()).toBe("2025-04-01T00:00:00.000Z");
  });

  it("should return null for empty localStorage", () => {
    expect(loadUserInsights()).toBeNull();
  });

  it("should return null for corrupted data", () => {
    localStorage.setItem("dp_user_insights", "not json");
    expect(loadUserInsights()).toBeNull();
  });

  it("should return null for version mismatch", () => {
    const data = makePersistedData();
    (data as any).version = 999;
    localStorage.setItem("dp_user_insights", JSON.stringify(data));
    expect(loadUserInsights()).toBeNull();
  });

  it("should clear user insights", () => {
    saveUserInsights(makePersistedData());
    expect(loadUserInsights()).not.toBeNull();

    clearUserInsights();
    expect(loadUserInsights()).toBeNull();
  });

  it("should handle quota exceeded gracefully", () => {
    // Mock localStorage.setItem to throw
    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const result = saveUserInsights(makePersistedData());
    expect(result).toBe(false);

    vi.restoreAllMocks();
  });
});
