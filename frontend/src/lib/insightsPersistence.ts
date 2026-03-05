// insightsPersistence.ts — localStorage bridge between Wrapped and Insights pages
// Stores aggregated metrics from Wrapped analysis for personalized Insights.
// ~20KB total in localStorage. All Date objects serialized as ISO strings.

import type { WrappedMetrics } from "./wrappedMetrics";
import type { ConversationInsights } from "./conversationIntelligence";
import type { AdvancedSwipeInsights } from "./swipeAdvanced";

const STORAGE_KEY = "dp_user_insights";
const CURRENT_VERSION = 1;

export interface PersistedUserInsights {
  version: typeof CURRENT_VERSION;
  persistedAt: string;
  source: string;
  metrics: WrappedMetrics;
  conversationInsights?: ConversationInsights;
  advancedSwipeInsights?: AdvancedSwipeInsights;
}

// Fields in WrappedMetrics that are Date objects
const DATE_FIELDS = new Set(["periodStart", "periodEnd"]);

/** Save user insights to localStorage. Returns false on quota exceeded or error. */
export function saveUserInsights(data: PersistedUserInsights): boolean {
  try {
    const serialized = JSON.stringify(data, function (key, value) {
      // Serialize known Date fields — use this[key] to get original Date before toJSON()
      if (DATE_FIELDS.has(key) && this[key] instanceof Date) {
        return { __date: (this[key] as Date).toISOString() };
      }
      return value;
    });
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    // Graceful degradation on quota exceeded or serialization error
    return false;
  }
}

/** Load user insights from localStorage. Returns null if not found, invalid, or version mismatch. */
export function loadUserInsights(): PersistedUserInsights | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw, (_key, value) => {
      // Restore Date objects from ISO strings
      if (value && typeof value === "object" && "__date" in value) {
        return new Date(value.__date);
      }
      return value;
    }) as PersistedUserInsights;

    // Version check — reject incompatible formats
    if (!parsed || parsed.version !== CURRENT_VERSION) return null;

    return parsed;
  } catch {
    return null;
  }
}

/** Clear persisted user insights. */
export function clearUserInsights(): void {
  localStorage.removeItem(STORAGE_KEY);
}
