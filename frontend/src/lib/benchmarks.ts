// SwipeStats Intelligence — Benchmark distributions
// Source: swipestats_analysis.json (n=1209, international dataset)

export type Gender = "men" | "women";
export type QuintileLabel = "top" | "above_avg" | "average" | "below_avg" | "bottom";

export interface BenchmarkResult {
  quintile: QuintileLabel;
  label: string;
  emoji: string;
  percentile?: number;
}

// Hardcoded percentile distributions from SwipeStats analysis
const BENCHMARKS: Record<string, Record<Gender, { p25: number; p50: number; p75: number; p90: number }>> = {
  // ── Population benchmarks (SwipeStats, n=1209) ──
  match_rate: {
    men: { p25: 1.0, p50: 2.2, p75: 4.6, p90: 9.2 },
    women: { p25: 29.5, p50: 39.8, p75: 50.6, p90: 61.1 },
  },
  like_rate: {
    men: { p25: 18.8, p50: 36.5, p75: 56.9, p90: 79.4 },
    women: { p25: 2.2, p50: 4.6, p75: 9.5, p90: 15.9 },
  },
  ghosting_rate: {
    men: { p25: 0, p50: 3.2, p75: 10.0, p90: 22.4 },
    women: { p25: 9.8, p50: 21.9, p75: 35.5, p90: 53.5 },
  },
  avg_convo_length: {
    men: { p25: 3.8, p50: 6.4, p75: 11.3, p90: 20.0 },
    women: { p25: 4.4, p50: 7.1, p75: 9.8, p90: 18.0 },
  },
  sent_received_ratio: {
    men: { p25: 1.0, p50: 1.1, p75: 1.3, p90: 1.5 },
    women: { p25: 0.7, p50: 0.8, p75: 0.9, p90: 1.1 },
  },

  // ── Conversational benchmarks (hypothesis, n=1 CEO, H27/H34/H43/H26) ──
  // confidenceLevel: "hypothesis"
  question_density: {
    men: { p25: 0.05, p50: 0.15, p75: 0.25, p90: 0.40 },
    women: { p25: 0.10, p50: 0.20, p75: 0.30, p90: 0.45 },
  },
  response_time_minutes: {
    men: { p25: 30, p50: 120, p75: 360, p90: 1440 },
    women: { p25: 20, p50: 60, p75: 240, p90: 720 },
  },
  opener_length: {
    men: { p25: 15, p50: 35, p75: 65, p90: 100 },
    women: { p25: 10, p50: 25, p75: 50, p90: 80 },
  },
};

// Metrics where lower = better (inverted ranking)
const INVERTED_METRICS = new Set(["ghosting_rate"]);

export const BENCHMARK_DISCLAIMER = "Base sur 1 209 profils internationaux (SwipeStats)";

export const AVAILABLE_METRICS = Object.keys(BENCHMARKS);

/**
 * Compare a user's metric value against the benchmark distribution.
 * Returns a quintile label and human-readable description.
 */
export function getBenchmark(metric: string, value: number, gender: Gender): BenchmarkResult {
  const dist = BENCHMARKS[metric]?.[gender];
  if (!dist) {
    return { quintile: "average", label: "Donnees insuffisantes", emoji: "—" };
  }

  const inverted = INVERTED_METRICS.has(metric);

  if (inverted) {
    // Lower = better: below p25 is top, above p90 is bottom
    if (value <= dist.p25) return { quintile: "top", label: "Bien au-dessus de la moyenne", emoji: "🏆", percentile: 90 };
    if (value <= dist.p50) return { quintile: "above_avg", label: "Dans le quart superieur", emoji: "💪", percentile: 75 };
    if (value <= dist.p75) return { quintile: "average", label: "Dans la moitie superieure", emoji: "👍", percentile: 50 };
    if (value <= dist.p90) return { quintile: "below_avg", label: "En-dessous de la moyenne", emoji: "📉", percentile: 25 };
    return { quintile: "bottom", label: "Bien en-dessous de la moyenne", emoji: "⚠️", percentile: 10 };
  }

  // Normal: higher = better
  if (value >= dist.p90) return { quintile: "top", label: "Bien au-dessus de la moyenne", emoji: "🏆", percentile: 90 };
  if (value >= dist.p75) return { quintile: "above_avg", label: "Dans le quart superieur", emoji: "💪", percentile: 75 };
  if (value >= dist.p50) return { quintile: "average", label: "Dans la moitie superieure", emoji: "👍", percentile: 50 };
  if (value >= dist.p25) return { quintile: "below_avg", label: "En-dessous de la moyenne", emoji: "📉", percentile: 25 };
  return { quintile: "bottom", label: "Bien en-dessous de la moyenne", emoji: "⚠️", percentile: 10 };
}
