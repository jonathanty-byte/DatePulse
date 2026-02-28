import { describe, it, expect } from "vitest";
import {
  enrichMatchesWithMessages,
  findClosestMatch,
  expandDailyCountsToSwipes,
  parseUploadedFiles,
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

// ── Hinge parser ────────────────────────────────────────────────

function makeFile(name: string, content: unknown): File {
  const json = JSON.stringify(content);
  return new File([json], name, { type: "application/json" });
}

describe("Hinge parser (parseUploadedFiles)", () => {
  const hingeMatches = [
    // Entry 1: like only (no match)
    { like: [{ timestamp: "2025-06-20 10:00:00", like: [{ timestamp: "2025-06-20 10:00:00" }] }] },
    // Entry 2: like only
    { like: [{ timestamp: "2025-06-21 14:00:00", like: [{ timestamp: "2025-06-21 14:00:00" }] }] },
    // Entry 3: match with chats
    {
      match: [{ timestamp: "2025-06-22 06:00:00" }],
      like: [{ timestamp: "2025-06-21 16:00:00", like: [{ timestamp: "2025-06-21 16:00:00" }] }],
      chats: [
        { body: "Hey!", timestamp: "2025-06-22 20:00:00" },
        { body: "Salut!", timestamp: "2025-06-22 21:00:00" },
        { body: "Ca va?", timestamp: "2025-06-23 10:00:00" },
      ],
    },
    // Entry 4: match ghosted (no chats)
    {
      match: [{ timestamp: "2025-06-25 05:00:00" }],
      chats: [],
    },
    // Entry 5: block/pass (no like, no match)
    { block: [{ block_type: "remove", timestamp: "2025-07-01 12:00:00" }] },
  ];

  it("parses likes as right swipes", async () => {
    const files = [makeFile("matches.json", hingeMatches)];
    const data = await parseUploadedFiles(files);
    expect(data.source).toBe("hinge");
    // 3 likes (entries 1, 2, 3) + 1 pass (entry 5) = 4 swipes
    const likes = data.swipes.filter((s) => s.direction === "like");
    expect(likes).toHaveLength(3);
  });

  it("parses matches with message counts", async () => {
    const files = [makeFile("matches.json", hingeMatches)];
    const data = await parseUploadedFiles(files);
    expect(data.matches).toHaveLength(2);
    // First match has 3 chats
    expect(data.matches[0].messagesCount).toBe(3);
    // Second match ghosted
    expect(data.matches[1].messagesCount).toBe(0);
  });

  it("parses blocks as passes", async () => {
    const files = [makeFile("matches.json", hingeMatches)];
    const data = await parseUploadedFiles(files);
    const passes = data.swipes.filter((s) => s.direction === "pass");
    expect(passes).toHaveLength(1);
  });

  it("collects message timestamps", async () => {
    const files = [makeFile("matches.json", hingeMatches)];
    const data = await parseUploadedFiles(files);
    expect(data.messageTimestamps).toBeDefined();
    expect(data.messageTimestamps!.length).toBe(3);
  });

  it("parses subscriptions from companion file", async () => {
    const subscriptions = [
      { price: 58.33, currency: "EUR", purchase_date: "2025-06-19", start_date: "2025-06-19", end_date: "2025-09-19", subscription_duration: "3 Month" },
      { price: 14.57, currency: "EUR", purchase_date: "2025-11-20", start_date: "2025-11-20", end_date: "2025-12-20", subscription_duration: "1 Month" },
    ];
    const files = [
      makeFile("matches.json", hingeMatches),
      makeFile("subscriptions.json", subscriptions),
    ];
    const data = await parseUploadedFiles(files);
    expect(data.purchases).toBeDefined();
    expect(data.purchases!._hingeTotalEur).toBeCloseTo(72.9, 1);
  });

  it("computes correct period from all timestamps", async () => {
    const files = [makeFile("matches.json", hingeMatches)];
    const data = await parseUploadedFiles(files);
    expect(data.period.start.getFullYear()).toBe(2025);
    expect(data.period.end.getFullYear()).toBe(2025);
    // Period should span from June 20 to July 1
    expect(data.period.start.getMonth()).toBe(5); // June = 5
    expect(data.period.end.getMonth()).toBe(6); // July = 6
  });
});
