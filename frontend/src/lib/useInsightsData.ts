// useInsightsData.ts — Dual-mode hook for Insights page
// Returns personal data (from Wrapped → localStorage) or demo data (anonymized case study).

import { useMemo } from "react";
import { loadUserInsights, clearUserInsights } from "./insightsPersistence";
import { generateUserInsights, type InsightsDataSet } from "./insightsEngine";
import * as demo from "./insightsData";

export type InsightsMode = "personal" | "demo";

export interface UseInsightsResult {
  mode: InsightsMode;
  data: InsightsDataSet;
  source: string | null;
  clearData: () => void;
}

/** Build InsightsDataSet from static demo exports */
function buildDemoDataSet(): InsightsDataSet {
  return {
    heroStats: demo.HERO_STATS,
    conversationScores: demo.CONVERSATION_SCORES,
    profileComparison: demo.PROFILE_COMPARISON,
    tinderProblems: demo.TINDER_PROBLEMS,
    hingeQuickWins: demo.HINGE_QUICK_WINS,
    photoTiers: demo.PHOTO_TIERS,
    crossAppRoi: demo.CROSS_APP_ROI,
    openerPatterns: demo.OPENER_PATTERNS,
    topicRanking: demo.TOPIC_RANKING,
    ghostCauses: demo.GHOST_CAUSES,
    bestConvos: demo.BEST_CONVOS,
    messageBalance: demo.MESSAGE_BALANCE,
    openerLengthBars: demo.OPENER_LENGTH_BARS,
    questionDensity: demo.QUESTION_DENSITY,
    triggerWords: demo.TRIGGER_WORDS,
    weeklyGrid: demo.WEEKLY_GRID,
    monthlyIndex: demo.MONTHLY_INDEX,
    hingeMonthly: demo.HINGE_MONTHLY,
    hingeHourly: demo.HINGE_HOURLY,
    responseSpeed: demo.RESPONSE_SPEED,
    timingInsights: demo.TIMING_INSIGHTS,
    eloProxy: demo.ELO_PROXY,
    selectivityCliff: demo.SELECTIVITY_CLIFF,
    shadowbans: demo.SHADOWBANS,
    activityLevels: demo.ACTIVITY_LEVELS,
    subscriptionRoi: demo.SUBSCRIPTION_ROI,
    tinderMonthlyChart: demo.TINDER_MONTHLY_CHART,
    hingeMonthlyChart: demo.HINGE_MONTHLY_CHART,
    postCancelShadowbans: demo.POST_CANCEL_SHADOWBANS,
    darkPatterns: demo.DARK_PATTERNS,
    budgetOptimal: demo.BUDGET_OPTIMAL,
    photoStats: demo.PHOTO_STATS,
    beardData: demo.BEARD_DATA,
    franceVsUs: demo.FRANCE_VS_US,
    hypothesisThemes: demo.HYPOTHESIS_THEMES,
    reinforcementClusters: demo.REINFORCEMENT_CLUSTERS,
    contradictionPairs: demo.CONTRADICTION_PAIRS,
    costlyMistakes: demo.COSTLY_MISTAKES,
    targetMetrics: demo.TARGET_METRICS,
    tenCommandments: demo.TEN_COMMANDMENTS,
    sectionNarratives: demo.SECTION_NARRATIVES,
  };
}

export function useInsightsData(): UseInsightsResult {
  return useMemo(() => {
    const persisted = loadUserInsights();

    if (persisted) {
      try {
        const data = generateUserInsights(persisted);
        return {
          mode: "personal" as InsightsMode,
          data,
          source: persisted.source,
          clearData: () => {
            clearUserInsights();
            // Force page reload to switch to demo mode
            window.location.reload();
          },
        };
      } catch {
        // Fallback to demo on generation error
      }
    }

    return {
      mode: "demo" as InsightsMode,
      data: buildDemoDataSet(),
      source: null,
      clearData: () => {},
    };
  }, []);
}
