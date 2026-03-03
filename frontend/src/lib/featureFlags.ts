// Feature flags — Conversation Pulse kill switch + engagement tracking

import { track } from "@vercel/analytics";

const CP_KILL_DATE = new Date("2026-03-24"); // J+21

/** Check if Conversation Pulse feature is enabled (before kill date). */
export function isConversationPulseEnabled(): boolean {
  return new Date() < CP_KILL_DATE;
}

/** Track Conversation Pulse section engagement via IntersectionObserver. */
export function trackCPEngagement(section: string): void {
  try {
    track("cds_viewed", { section });
  } catch {
    // Analytics unavailable — no-op
  }
}

/** Track conversation data upload. */
export function trackConversationUpload(source: string, count: number): void {
  try {
    track("conversation_upload", { source, conversations: count });
  } catch {
    // Analytics unavailable — no-op
  }
}
