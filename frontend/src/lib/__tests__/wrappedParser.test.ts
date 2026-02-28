import { describe, it, expect } from "vitest";
import {
  enrichMatchesWithMessages,
  findClosestMatch,
  expandDailyCountsToSwipes,
} from "../wrappedParser";
import type { RawMatch, RawSwipe } from "../wrappedParser";

// ── findClosestMatch ────────────────────────────────────────────

describe("findClosestMatch", () => {
  const baseMatch = (date: string): RawMatch => ({
    timestamp: new Date(date),
    messagesCount: 0,
    userInitiated: false,
  });

  it("returns match within 24h", () => {
    const matches = [baseMatch("2025-04-15T10:00:00")];
    const target = new Date("2025-04-15T20:00:00"); // 10h later
    const result = findClosestMatch(matches, target);
    expect(result).not.toBeNull();
    expect(result!.timestamp.toISOString()).toBe(matches[0].timestamp.toISOString());
  });

  it("returns null when beyond 24h", () => {
    const matches = [baseMatch("2025-04-15T10:00:00")];
    const target = new Date("2025-04-17T20:00:00"); // 2 days later
    const result = findClosestMatch(matches, target);
    expect(result).toBeNull();
  });

  it("returns exact match", () => {
    const matches = [
      baseMatch("2025-04-14T10:00:00"),
      baseMatch("2025-04-15T10:00:00"),
      baseMatch("2025-04-16T10:00:00"),
    ];
    const target = new Date("2025-04-15T10:00:00");
    const result = findClosestMatch(matches, target);
    expect(result).not.toBeNull();
    expect(result!.timestamp.toISOString()).toBe(matches[1].timestamp.toISOString());
  });

  it("returns closest when multiple within 24h", () => {
    const matches = [
      baseMatch("2025-04-15T08:00:00"),
      baseMatch("2025-04-15T12:00:00"),
      baseMatch("2025-04-15T20:00:00"),
    ];
    const target = new Date("2025-04-15T11:00:00");
    const result = findClosestMatch(matches, target);
    expect(result).not.toBeNull();
    // Closest to 11:00 is 12:00
    expect(result!.timestamp.getHours()).toBe(12);
  });

  it("returns null for empty matches array", () => {
    const result = findClosestMatch([], new Date());
    expect(result).toBeNull();
  });
});

// ── enrichMatchesWithMessages ───────────────────────────────────

describe("enrichMatchesWithMessages", () => {
  it("enriches match with message count via fuzzy +-24h", () => {
    const matches: RawMatch[] = [
      { timestamp: new Date("2025-04-15T10:00:00"), messagesCount: 0, userInitiated: false },
    ];
    const messages = [
      {
        match_date: "2025-04-15T12:00:00",
        messages: [
          { from: "You", sent_date: "2025-04-15T13:00:00", message: "Hey" },
          { from: "Other", sent_date: "2025-04-15T14:00:00", message: "Hi" },
          { from: "You", sent_date: "2025-04-15T15:00:00", message: "How are you" },
        ],
      },
    ];
    enrichMatchesWithMessages(matches, messages as unknown as Record<string, unknown>);
    expect(matches[0].messagesCount).toBe(3);
    expect(matches[0].userInitiated).toBe(true);
  });

  it("handles collision: 2 matches same day", () => {
    const matches: RawMatch[] = [
      { timestamp: new Date("2025-04-15T10:00:00"), messagesCount: 0, userInitiated: false },
      { timestamp: new Date("2025-04-15T14:00:00"), messagesCount: 0, userInitiated: false },
    ];
    const messages = [
      {
        match_date: "2025-04-15T09:00:00",
        messages: [{ from: "You", sent_date: "2025-04-15T09:30:00", message: "A" }],
      },
      {
        match_date: "2025-04-15T15:00:00",
        messages: [
          { from: "Other", sent_date: "2025-04-15T16:00:00", message: "B" },
          { from: "Other", sent_date: "2025-04-15T17:00:00", message: "C" },
        ],
      },
    ];
    enrichMatchesWithMessages(matches, messages as unknown as Record<string, unknown>);
    // First conv (09:00) should match to 10:00 match
    expect(matches[0].messagesCount).toBe(1);
    // Second conv (15:00) should match to 14:00 match
    expect(matches[1].messagesCount).toBe(2);
  });

  it("handles format without messages gracefully", () => {
    const matches: RawMatch[] = [
      { timestamp: new Date("2025-04-15T10:00:00"), messagesCount: 0, userInitiated: false },
    ];
    enrichMatchesWithMessages(matches, {} as Record<string, unknown>);
    expect(matches[0].messagesCount).toBe(0);
  });
});

// ── expandDailyCountsToSwipes ───────────────────────────────────

describe("expandDailyCountsToSwipes", () => {
  it("expands daily counts to individual swipes", () => {
    const out: RawSwipe[] = [];
    expandDailyCountsToSwipes(
      { "2025-04-15": 3, "2025-04-16": 2 },
      "like",
      out
    );
    expect(out).toHaveLength(5);
    expect(out.every((s) => s.direction === "like")).toBe(true);
  });

  it("handles undefined input", () => {
    const out: RawSwipe[] = [];
    expandDailyCountsToSwipes(undefined, "like", out);
    expect(out).toHaveLength(0);
  });

  it("skips zero and negative counts", () => {
    const out: RawSwipe[] = [];
    expandDailyCountsToSwipes(
      { "2025-04-15": 0, "2025-04-16": -1, "2025-04-17": 2 },
      "pass",
      out
    );
    expect(out).toHaveLength(2);
  });

  it("preserves correct day of week from date string", () => {
    const out: RawSwipe[] = [];
    // 2025-04-15 is a Tuesday
    expandDailyCountsToSwipes({ "2025-04-15": 1 }, "like", out);
    expect(out[0].timestamp.getDay()).toBe(2); // Tuesday = 2
  });
});
