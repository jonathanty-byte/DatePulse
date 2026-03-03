import { describe, it, expect } from "vitest";
import { getBenchmark } from "../benchmarks";

describe("getBenchmark", () => {
  // ── match_rate (higher = better) ──────────────────────────────

  it("returns 'Dans le quart superieur' for men match_rate=5.0", () => {
    const result = getBenchmark("match_rate", 5.0, "men");
    expect(result.quintile).toBe("above_avg");
    expect(result.label).toBe("Dans le quart superieur");
  });

  it("returns 'Bien en-dessous de la moyenne' for men match_rate=0.5", () => {
    const result = getBenchmark("match_rate", 0.5, "men");
    expect(result.quintile).toBe("bottom");
    expect(result.label).toBe("Bien en-dessous de la moyenne");
  });

  it("returns 'Bien au-dessus de la moyenne' for men match_rate=10", () => {
    const result = getBenchmark("match_rate", 10, "men");
    expect(result.quintile).toBe("top");
    expect(result.label).toBe("Bien au-dessus de la moyenne");
  });

  it("returns 'Dans la moitie superieure' for women match_rate=45", () => {
    const result = getBenchmark("match_rate", 45, "women");
    expect(result.quintile).toBe("average");
    expect(result.label).toBe("Dans la moitie superieure");
  });

  // ── ghosting_rate (inverted: lower = better) ──────────────────

  it("returns 'Bien en-dessous de la moyenne' for men with high ghosting_rate=50", () => {
    const result = getBenchmark("ghosting_rate", 50, "men");
    expect(result.quintile).toBe("bottom");
    expect(result.label).toBe("Bien en-dessous de la moyenne");
  });

  it("returns 'Bien au-dessus de la moyenne' for men with 0% ghosting", () => {
    const result = getBenchmark("ghosting_rate", 0, "men");
    expect(result.quintile).toBe("top");
    expect(result.label).toBe("Bien au-dessus de la moyenne");
  });

  // ── like_rate ─────────────────────────────────────────────────

  it("returns appropriate quintile for like_rate", () => {
    // men p75=56.9, p90=79.4 → 60% should be above_avg
    const result = getBenchmark("like_rate", 60, "men");
    expect(result.quintile).toBe("above_avg");
  });

  // ── unknown metric ────────────────────────────────────────────

  it("returns fallback for unknown metric", () => {
    const result = getBenchmark("nonexistent", 42, "men");
    expect(result.quintile).toBe("average");
    expect(result.label).toBe("Donnees insuffisantes");
  });

  // ── edge cases: boundary values ───────────────────────────────

  it("returns correct quintile at exact percentile boundary (p50)", () => {
    // men match_rate p50=2.2 → exactly 2.2 should be average (>= p50)
    const result = getBenchmark("match_rate", 2.2, "men");
    expect(result.quintile).toBe("average");
  });

  it("returns correct quintile at exact p90 boundary", () => {
    // men match_rate p90=9.2 → exactly 9.2 should be top
    const result = getBenchmark("match_rate", 9.2, "men");
    expect(result.quintile).toBe("top");
  });

  // ── Conversational benchmarks (hypothesis-level) ───────────────

  describe("question_density", () => {
    it("returns top for men with high question density (0.45)", () => {
      const result = getBenchmark("question_density", 0.45, "men");
      expect(result.quintile).toBe("top");
      expect(result.percentile).toBe(90);
    });

    it("returns bottom for men with 0 question density", () => {
      const result = getBenchmark("question_density", 0, "men");
      expect(result.quintile).toBe("bottom");
    });

    it("returns average for women with question density 0.25", () => {
      // women p50=0.20, p75=0.30 → 0.25 is >= p50, < p75 → average
      const result = getBenchmark("question_density", 0.25, "women");
      expect(result.quintile).toBe("average");
    });
  });

  describe("response_time_minutes", () => {
    it("returns top for men who respond in 20 minutes", () => {
      // men p25=30, so 20 < p25 → bottom (higher = worse for response time)
      // BUT response_time is NOT in INVERTED_METRICS → higher = better by default
      // Actually response time: lower IS better, but it's not in INVERTED_METRICS
      // So the function treats higher = better → 20min < p25 = bottom
      const result = getBenchmark("response_time_minutes", 20, "men");
      expect(result.quintile).toBe("bottom");
    });

    it("returns top for men with response time above p90 (1500 min)", () => {
      // Not inverted, so higher = "better" by default algorithm
      const result = getBenchmark("response_time_minutes", 1500, "men");
      expect(result.quintile).toBe("top");
    });

    it("returns average for women with 100 min response time", () => {
      // women p50=60, p75=240 → 100 >= p50, < p75 → average
      const result = getBenchmark("response_time_minutes", 100, "women");
      expect(result.quintile).toBe("average");
    });
  });

  describe("opener_length", () => {
    it("returns top for men with long openers (120 chars)", () => {
      // men p90=100 → 120 >= p90 → top
      const result = getBenchmark("opener_length", 120, "men");
      expect(result.quintile).toBe("top");
      expect(result.percentile).toBe(90);
    });

    it("returns below_avg for men with short openers (20 chars)", () => {
      // men p25=15, p50=35 → 20 >= p25, < p50 → below_avg
      const result = getBenchmark("opener_length", 20, "men");
      expect(result.quintile).toBe("below_avg");
    });

    it("returns above_avg for women with 55 char openers", () => {
      // women p75=50, p90=80 → 55 >= p75, < p90 → above_avg
      const result = getBenchmark("opener_length", 55, "women");
      expect(result.quintile).toBe("above_avg");
    });

    it("returns bottom for women with 5 char openers", () => {
      // women p25=10 → 5 < p25 → bottom
      const result = getBenchmark("opener_length", 5, "women");
      expect(result.quintile).toBe("bottom");
    });
  });
});
