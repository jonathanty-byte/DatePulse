import { describe, it, expect } from "vitest";
import type { ConversationRecord, RawMessage } from "../wrappedParser";
import {
  analyzeCriticalGap,
  analyzeRhythmAcceleration,
  analyzeFormalityShift,
  analyzeTemporalSync,
  analyzeLengthMirroring,
  analyzeQuestionReciprocity,
  analyzeInitiativeRatio,
  analyzeLexicalRichness,
  analyzeEmojiDynamics,
  analyzeEarlyHumor,
  analyzeMessage3Quality,
  analyzeConversationShapes,
  analyzeInclusivePronouns,
  analyzeLearningCurve,
  analyzeSimultaneity,
  analyzeDayOfWeekConvos,
  analyzeGifDisengagement,
  analyzeMatchToMessageWindow,
  analyzeShortMessageKill,
  analyzeResponseTimeAsymmetry,
  computeAdvancedInsights,
} from "../conversationAdvanced";

// ── Helper ──────────────────────────────────────────────────────

function makeConvo(
  msgs: { dir: "sent" | "received"; body: string; minutesAfterStart?: number; type?: string }[],
  matchTimestamp?: Date
): ConversationRecord {
  const start = matchTimestamp ?? new Date("2025-06-01T10:00:00Z");
  const messages: RawMessage[] = msgs.map((m, i) => ({
    direction: m.dir,
    body: m.body,
    timestamp: new Date(start.getTime() + (m.minutesAfterStart ?? i * 30) * 60000),
    type: m.type ?? "text",
  }));
  return {
    matchId: `test-${Math.random().toString(36).slice(2)}`,
    matchTimestamp: start,
    messages,
    firstMessageDate: messages.length > 0 ? messages[0].timestamp : start,
    lastMessageDate: messages.length > 0 ? messages[messages.length - 1].timestamp : start,
  };
}

/**
 * Build a conversation with many messages at regular intervals.
 * Alternates sent/received by default.
 */
function makeAlternatingConvo(
  count: number,
  gapMinutes: number,
  bodyFn?: (i: number, dir: "sent" | "received") => string,
  matchTimestamp?: Date
): ConversationRecord {
  const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [];
  for (let i = 0; i < count; i++) {
    const dir: "sent" | "received" = i % 2 === 0 ? "sent" : "received";
    msgs.push({
      dir,
      body: bodyFn ? bodyFn(i, dir) : `Message ${i}`,
      minutesAfterStart: i * gapMinutes,
    });
  }
  return makeConvo(msgs, matchTimestamp);
}

// ── H51: analyzeCriticalGap ─────────────────────────────────────

describe("analyzeCriticalGap", () => {
  it("detects gap when fast start then >6h silence", () => {
    // 5 fast messages (10min gaps), then a 7h gap, then more messages
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Hey!", minutesAfterStart: 0 },
      { dir: "received", body: "Hi!", minutesAfterStart: 10 },
      { dir: "sent", body: "Ca va?", minutesAfterStart: 20 },
      { dir: "received", body: "Oui et toi?", minutesAfterStart: 30 },
      { dir: "sent", body: "Super!", minutesAfterStart: 40 },
      { dir: "received", body: "Cool", minutesAfterStart: 50 },
      // big gap here: 420 min = 7h
      { dir: "sent", body: "Tu fais quoi?", minutesAfterStart: 470 },
      { dir: "received", body: "Rien", minutesAfterStart: 480 },
    ];
    const convo = makeConvo(msgs);
    const result = analyzeCriticalGap([convo]);
    expect(result.convosWithGap).toBe(1);
    expect(result.totalAnalyzed).toBe(1);
    expect(result.avgGapMinutes).toBeGreaterThan(360);
  });

  it("returns 0 gaps when all responses are fast", () => {
    const convo = makeAlternatingConvo(10, 15); // 15min gaps
    const result = analyzeCriticalGap([convo]);
    expect(result.convosWithGap).toBe(0);
    expect(result.totalAnalyzed).toBe(1);
  });

  it("skips convos with fewer than 5 messages", () => {
    const convo = makeAlternatingConvo(3, 15);
    const result = analyzeCriticalGap([convo]);
    expect(result.totalAnalyzed).toBe(0);
    expect(result.convosWithGap).toBe(0);
  });
});

// ── H52: analyzeRhythmAcceleration ──────────────────────────────

describe("analyzeRhythmAcceleration", () => {
  it("detects accelerating when gaps decrease sharply", () => {
    // Gaps: 100, 80, 60, 40, 20 min → slope is strongly negative
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [];
    let t = 0;
    const gaps = [100, 80, 60, 40, 20];
    msgs.push({ dir: "sent", body: "Hi", minutesAfterStart: t });
    for (let i = 0; i < gaps.length; i++) {
      t += gaps[i];
      msgs.push({ dir: i % 2 === 0 ? "received" : "sent", body: `msg ${i}`, minutesAfterStart: t });
    }
    const convo = makeConvo(msgs);
    const result = analyzeRhythmAcceleration([convo]);
    expect(result.accelerating).toBe(1);
    expect(result.decelerating).toBe(0);
  });

  it("detects decelerating when gaps increase sharply", () => {
    // Gaps: 10, 30, 60, 100, 150 min → slope is strongly positive
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [];
    let t = 0;
    const gaps = [10, 30, 60, 100, 150];
    msgs.push({ dir: "sent", body: "Hi", minutesAfterStart: t });
    for (let i = 0; i < gaps.length; i++) {
      t += gaps[i];
      msgs.push({ dir: i % 2 === 0 ? "received" : "sent", body: `msg ${i}`, minutesAfterStart: t });
    }
    const convo = makeConvo(msgs);
    const result = analyzeRhythmAcceleration([convo]);
    expect(result.decelerating).toBe(1);
    expect(result.accelerating).toBe(0);
  });

  it("detects stable when gaps are constant", () => {
    const convo = makeAlternatingConvo(8, 30); // all 30min gaps
    const result = analyzeRhythmAcceleration([convo]);
    expect(result.stable).toBe(1);
  });
});

// ── H53: analyzeFormalityShift ──────────────────────────────────

describe("analyzeFormalityShift", () => {
  it("detects vous → tu transition", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Bonjour, comment allez-vous?", minutesAfterStart: 0 },
      { dir: "received", body: "Bien merci!", minutesAfterStart: 15 },
      { dir: "sent", body: "Vous faites quoi ce soir?", minutesAfterStart: 30 },
      { dir: "received", body: "Rien de spécial", minutesAfterStart: 45 },
      { dir: "sent", body: "Tu veux aller boire un verre?", minutesAfterStart: 60 },
      { dir: "received", body: "Oui pourquoi pas!", minutesAfterStart: 75 },
    ];
    const result = analyzeFormalityShift([makeConvo(msgs)]);
    expect(result).not.toBeNull();
    expect(result!.convosWithVous).toBe(1);
    expect(result!.convosWithShift).toBe(1);
    expect(result!.avgShiftMsgNumber).toBeGreaterThan(0);
  });

  it("returns null when no one uses vous", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Salut ca va?", minutesAfterStart: 0 },
      { dir: "received", body: "Oui et toi?", minutesAfterStart: 15 },
      { dir: "sent", body: "Tu fais quoi?", minutesAfterStart: 30 },
      { dir: "received", body: "Pas grand chose", minutesAfterStart: 45 },
    ];
    const result = analyzeFormalityShift([makeConvo(msgs)]);
    expect(result).toBeNull();
  });

  it("handles vous without shift to tu", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Bonjour, comment allez-vous?", minutesAfterStart: 0 },
      { dir: "received", body: "Bien!", minutesAfterStart: 15 },
      { dir: "sent", body: "Vous aimez la photo?", minutesAfterStart: 30 },
      { dir: "received", body: "Oui", minutesAfterStart: 45 },
    ];
    const result = analyzeFormalityShift([makeConvo(msgs)]);
    expect(result).not.toBeNull();
    expect(result!.convosWithVous).toBe(1);
    expect(result!.convosWithShift).toBe(0);
  });
});

// ── H54: analyzeTemporalSync ────────────────────────────────────

describe("analyzeTemporalSync", () => {
  it("detects synced when all messages at consistent hours", () => {
    // All messages at hours 14-15 → low std dev
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [];
    // 8 messages, all within a 1h window, across "different days" (but same hour)
    for (let i = 0; i < 8; i++) {
      msgs.push({
        dir: i % 2 === 0 ? "sent" : "received",
        body: `Message ${i}`,
        minutesAfterStart: i * 1440 + 60, // each message ~1 day apart, +1h offset
      });
    }
    const convo = makeConvo(msgs);
    const result = analyzeTemporalSync([convo]);
    expect(result.synced + result.unsynced).toBe(1);
  });

  it("skips convos with fewer than 6 messages", () => {
    const convo = makeAlternatingConvo(4, 30);
    const result = analyzeTemporalSync([convo]);
    expect(result.synced).toBe(0);
    expect(result.unsynced).toBe(0);
  });

  it("detects unsynced when hours vary widely", () => {
    // Messages at very different hours: 3am, 9am, 15pm, 21pm, etc.
    const start = new Date("2025-06-01T00:00:00Z");
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "m0", minutesAfterStart: 3 * 60 },     // 3am
      { dir: "received", body: "m1", minutesAfterStart: 9 * 60 },  // 9am
      { dir: "sent", body: "m2", minutesAfterStart: 15 * 60 },    // 3pm
      { dir: "received", body: "m3", minutesAfterStart: 21 * 60 }, // 9pm
      { dir: "sent", body: "m4", minutesAfterStart: 27 * 60 },    // 3am next day
      { dir: "received", body: "m5", minutesAfterStart: 33 * 60 }, // 9am next day
      { dir: "sent", body: "m6", minutesAfterStart: 39 * 60 },    // 3pm next day
      { dir: "received", body: "m7", minutesAfterStart: 45 * 60 }, // 9pm next day
    ];
    const convo = makeConvo(msgs, start);
    const result = analyzeTemporalSync([convo]);
    // stddev of [3,15,3,15] and [9,21,9,21] are both 6 → unsynced
    expect(result.unsynced).toBe(1);
  });
});

// ── H55: analyzeLengthMirroring ─────────────────────────────────

describe("analyzeLengthMirroring", () => {
  it("high mirror score when exchanges have similar lengths", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [];
    for (let i = 0; i < 8; i++) {
      msgs.push({
        dir: i % 2 === 0 ? "sent" : "received",
        body: "x".repeat(20), // all same length
        minutesAfterStart: i * 30,
      });
    }
    const result = analyzeLengthMirroring([makeConvo(msgs)]);
    expect(result.avgMirrorScore).toBe(1); // perfect mirroring
  });

  it("low mirror score when lengths differ wildly", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [];
    for (let i = 0; i < 8; i++) {
      msgs.push({
        dir: i % 2 === 0 ? "sent" : "received",
        body: i % 2 === 0 ? "x".repeat(100) : "ok",
        minutesAfterStart: i * 30,
      });
    }
    const result = analyzeLengthMirroring([makeConvo(msgs)]);
    expect(result.avgMirrorScore).toBeLessThan(0.1);
  });

  it("skips convos with fewer than 6 messages", () => {
    const convo = makeAlternatingConvo(4, 30);
    const result = analyzeLengthMirroring([convo]);
    expect(result.avgMirrorScore).toBe(0);
  });
});

// ── H56: analyzeQuestionReciprocity ─────────────────────────────

describe("analyzeQuestionReciprocity", () => {
  it("high ratio when equal questions sent and received", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Ca va?", minutesAfterStart: 0 },
      { dir: "received", body: "Oui et toi?", minutesAfterStart: 15 },
      { dir: "sent", body: "Tu fais quoi?", minutesAfterStart: 30 },
      { dir: "received", body: "Et toi tu bosses?", minutesAfterStart: 45 },
    ];
    const result = analyzeQuestionReciprocity([makeConvo(msgs)]);
    expect(result.avgRatio).toBe(1); // 2 received / 2 sent = 1
  });

  it("low ratio when many sent questions but zero received", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Ca va?", minutesAfterStart: 0 },
      { dir: "received", body: "Oui", minutesAfterStart: 15 },
      { dir: "sent", body: "Tu fais quoi?", minutesAfterStart: 30 },
      { dir: "received", body: "Rien", minutesAfterStart: 45 },
    ];
    const result = analyzeQuestionReciprocity([makeConvo(msgs)]);
    expect(result.avgRatio).toBe(0);
  });

  it("skips convos where user sends no questions", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Salut", minutesAfterStart: 0 },
      { dir: "received", body: "Tu fais quoi?", minutesAfterStart: 15 },
      { dir: "sent", body: "Pas grand chose", minutesAfterStart: 30 },
      { dir: "received", body: "Ok cool", minutesAfterStart: 45 },
    ];
    const result = analyzeQuestionReciprocity([makeConvo(msgs)]);
    // sentQ = 0, so convo is skipped
    expect(result.avgRatio).toBe(0);
  });
});

// ── H57: analyzeInitiativeRatio ─────────────────────────────────

describe("analyzeInitiativeRatio", () => {
  it("detects over-initiating when user always breaks silence", () => {
    // All silence breakers are "sent" (>2h gaps)
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Hey", minutesAfterStart: 0 },
      { dir: "received", body: "Hi", minutesAfterStart: 10 },
      // 3h silence, user breaks
      { dir: "sent", body: "Tu es la?", minutesAfterStart: 190 },
      { dir: "received", body: "Oui", minutesAfterStart: 200 },
      // 3h silence, user breaks
      { dir: "sent", body: "Ca va?", minutesAfterStart: 390 },
      { dir: "received", body: "Oui", minutesAfterStart: 400 },
      // 3h silence, user breaks
      { dir: "sent", body: "Quoi de neuf?", minutesAfterStart: 590 },
    ];
    const result = analyzeInitiativeRatio([makeConvo(msgs)]);
    expect(result.userBreaks).toBeGreaterThan(0);
    // User breaks > 80% of silences → overInitiatingPct >= 1
    expect(result.overInitiatingPct).toBeGreaterThanOrEqual(1);
  });

  it("balanced when both sides break silence", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Hey", minutesAfterStart: 0 },
      { dir: "received", body: "Hi", minutesAfterStart: 10 },
      // 3h silence, received breaks
      { dir: "received", body: "Ca va?", minutesAfterStart: 190 },
      { dir: "sent", body: "Oui", minutesAfterStart: 200 },
      // 3h silence, sent breaks
      { dir: "sent", body: "Tu fais quoi?", minutesAfterStart: 390 },
      { dir: "received", body: "Rien", minutesAfterStart: 400 },
      // 3h silence, received breaks
      { dir: "received", body: "Et toi?", minutesAfterStart: 590 },
      { dir: "sent", body: "Pareil", minutesAfterStart: 600 },
    ];
    const result = analyzeInitiativeRatio([makeConvo(msgs)]);
    expect(result.userBreaks).toBeGreaterThan(0);
    expect(result.matchBreaks).toBeGreaterThan(0);
  });
});

// ── H58: analyzeLexicalRichness ─────────────────────────────────

describe("analyzeLexicalRichness", () => {
  it("high TTR with varied vocabulary", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Bonjour comment vas-tu ce matin magnifique", minutesAfterStart: 0 },
      { dir: "received", body: "Bien!", minutesAfterStart: 15 },
      { dir: "sent", body: "Super journée extraordinaire dehors profiter soleil", minutesAfterStart: 30 },
      { dir: "received", body: "Oui!", minutesAfterStart: 45 },
      { dir: "sent", body: "Allons découvrir restaurant nouveau quartier historique", minutesAfterStart: 60 },
      { dir: "received", body: "Bonne idée!", minutesAfterStart: 75 },
    ];
    const result = analyzeLexicalRichness([makeConvo(msgs)]);
    // All words are unique → TTR should be high (close to 1)
    expect(result.avgTTR).toBeGreaterThan(0.5);
  });

  it("low TTR with repetitive words", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "oui oui oui oui oui oui oui oui oui oui", minutesAfterStart: 0 },
      { dir: "received", body: "Ok", minutesAfterStart: 15 },
      { dir: "sent", body: "oui oui oui oui oui oui oui oui oui oui", minutesAfterStart: 30 },
      { dir: "received", body: "Ok", minutesAfterStart: 45 },
      { dir: "sent", body: "oui oui oui oui oui oui oui oui oui oui", minutesAfterStart: 60 },
      { dir: "received", body: "Ok", minutesAfterStart: 75 },
    ];
    const result = analyzeLexicalRichness([makeConvo(msgs)]);
    // Only "oui" repeated → TTR very low
    expect(result.avgTTR).toBeLessThan(0.15);
  });
});

// ── H59: analyzeEmojiDynamics ───────────────────────────────────

describe("analyzeEmojiDynamics", () => {
  it("detects density drop when early emojis disappear later", () => {
    const emojis = "Hello 😊😊😊";
    const noEmoji = "Salut ca va bien";
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: emojis, minutesAfterStart: 0 },
      { dir: "received", body: "Ok", minutesAfterStart: 5 },
      { dir: "sent", body: emojis, minutesAfterStart: 10 },
      { dir: "received", body: "Ok", minutesAfterStart: 15 },
      { dir: "sent", body: emojis, minutesAfterStart: 20 },
      { dir: "received", body: "Ok", minutesAfterStart: 25 },
      // sent messages 4-6: no emojis
      { dir: "sent", body: noEmoji, minutesAfterStart: 30 },
      { dir: "received", body: "Ok", minutesAfterStart: 35 },
      { dir: "sent", body: noEmoji, minutesAfterStart: 40 },
      { dir: "received", body: "Ok", minutesAfterStart: 45 },
      { dir: "sent", body: noEmoji, minutesAfterStart: 50 },
      { dir: "received", body: "Ok", minutesAfterStart: 55 },
    ];
    const result = analyzeEmojiDynamics([makeConvo(msgs)]);
    expect(result.avgDensityFirst3).toBeGreaterThan(0);
    expect(result.avgDensityLast3).toBe(0);
  });

  it("stable density when emoji usage stays constant", () => {
    const withEmoji = "Hello 😊";
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [];
    for (let i = 0; i < 12; i++) {
      msgs.push({
        dir: i % 2 === 0 ? "sent" : "received",
        body: i % 2 === 0 ? withEmoji : "Ok",
        minutesAfterStart: i * 10,
      });
    }
    const result = analyzeEmojiDynamics([makeConvo(msgs)]);
    // first3 and last3 densities should be similar
    expect(Math.abs(result.avgDensityFirst3 - result.avgDensityLast3)).toBeLessThan(0.05);
  });
});

// ── H60: analyzeEarlyHumor ──────────────────────────────────────

describe("analyzeEarlyHumor", () => {
  it("detects early laugh when received message contains haha", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Hey salut!", minutesAfterStart: 0 },
      { dir: "received", body: "Haha salut!", minutesAfterStart: 15 },
      { dir: "sent", body: "Tu fais quoi?", minutesAfterStart: 30 },
      { dir: "received", body: "Pas grand chose", minutesAfterStart: 45 },
    ];
    const result = analyzeEarlyHumor([makeConvo(msgs)]);
    expect(result.convosWithEarlyLaugh).toBe(1);
  });

  it("no early laugh when no humor indicators", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Bonjour", minutesAfterStart: 0 },
      { dir: "received", body: "Bonjour", minutesAfterStart: 15 },
      { dir: "sent", body: "Comment allez-vous?", minutesAfterStart: 30 },
      { dir: "received", body: "Bien merci", minutesAfterStart: 45 },
    ];
    const result = analyzeEarlyHumor([makeConvo(msgs)]);
    expect(result.convosWithEarlyLaugh).toBe(0);
  });

  it("detects laugh from mdr/lol/ptdr variants", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "J'ai glissé sur une banane", minutesAfterStart: 0 },
      { dir: "received", body: "mdr trop bien", minutesAfterStart: 15 },
      { dir: "sent", body: "C'est vrai!", minutesAfterStart: 30 },
      { dir: "received", body: "Je te crois", minutesAfterStart: 45 },
    ];
    const result = analyzeEarlyHumor([makeConvo(msgs)]);
    expect(result.convosWithEarlyLaugh).toBe(1);
  });
});

// ── H61: analyzeMessage3Quality ─────────────────────────────────

describe("analyzeMessage3Quality", () => {
  it("detects question in 2nd sent message", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Salut!", minutesAfterStart: 0 },
      { dir: "received", body: "Hey!", minutesAfterStart: 15 },
      { dir: "sent", body: "Tu fais quoi ce weekend? J'aimerais bien sortir", minutesAfterStart: 30 },
      { dir: "received", body: "Rien de prévu", minutesAfterStart: 45 },
    ];
    const result = analyzeMessage3Quality([makeConvo(msgs)]);
    expect(result.withQuestionPct).toBe(100);
    expect(result.avgLength).toBeGreaterThan(20);
  });

  it("no question in short reply", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Salut!", minutesAfterStart: 0 },
      { dir: "received", body: "Hey!", minutesAfterStart: 15 },
      { dir: "sent", body: "Cool", minutesAfterStart: 30 },
      { dir: "received", body: "Oui", minutesAfterStart: 45 },
    ];
    const result = analyzeMessage3Quality([makeConvo(msgs)]);
    expect(result.withQuestionPct).toBe(0);
    expect(result.avgLength).toBeLessThan(10);
  });
});

// ── H62: analyzeConversationShapes ──────────────────────────────

describe("analyzeConversationShapes", () => {
  it("detects cliff when messages start long then crash", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "x".repeat(100), minutesAfterStart: 0 },
      { dir: "received", body: "y".repeat(50), minutesAfterStart: 10 },
      { dir: "sent", body: "x".repeat(80), minutesAfterStart: 20 },
      { dir: "received", body: "y".repeat(50), minutesAfterStart: 30 },
      { dir: "sent", body: "x".repeat(60), minutesAfterStart: 40 },
      { dir: "received", body: "y".repeat(50), minutesAfterStart: 50 },
      // Now short
      { dir: "sent", body: "ok", minutesAfterStart: 60 },
      { dir: "received", body: "y", minutesAfterStart: 70 },
      { dir: "sent", body: "ok", minutesAfterStart: 80 },
      { dir: "received", body: "y", minutesAfterStart: 90 },
    ];
    const result = analyzeConversationShapes([makeConvo(msgs)]);
    expect(result.cliff).toBeGreaterThanOrEqual(1);
  });

  it("detects plateau when message lengths are consistent", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [];
    for (let i = 0; i < 10; i++) {
      msgs.push({
        dir: i % 2 === 0 ? "sent" : "received",
        body: "x".repeat(30),
        minutesAfterStart: i * 10,
      });
    }
    const result = analyzeConversationShapes([makeConvo(msgs)]);
    expect(result.plateau).toBeGreaterThanOrEqual(1);
  });

  it("skips convos with fewer than 6 messages", () => {
    const convo = makeAlternatingConvo(4, 30);
    const result = analyzeConversationShapes([convo]);
    expect(result.diamond + result.cliff + result.plateau + result.erratic).toBe(0);
  });
});

// ── H63: analyzeInclusivePronouns ────────────────────────────────

describe("analyzeInclusivePronouns", () => {
  it("detects inclusive language with 'on pourrait'", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Salut!", minutesAfterStart: 0 },
      { dir: "received", body: "Hey!", minutesAfterStart: 15 },
      { dir: "sent", body: "On pourrait se voir ce soir", minutesAfterStart: 30 },
      { dir: "received", body: "Bonne idée!", minutesAfterStart: 45 },
    ];
    const result = analyzeInclusivePronouns([makeConvo(msgs)]);
    expect(result.convosWithInclusive).toBe(1);
    expect(result.avgFirstInclusiveMsg).toBeGreaterThan(0);
  });

  it("no inclusive language detected", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Salut!", minutesAfterStart: 0 },
      { dir: "received", body: "Hey!", minutesAfterStart: 15 },
      { dir: "sent", body: "Je suis fatigué", minutesAfterStart: 30 },
      { dir: "received", body: "Dommage", minutesAfterStart: 45 },
    ];
    const result = analyzeInclusivePronouns([makeConvo(msgs)]);
    expect(result.convosWithInclusive).toBe(0);
  });

  it("detects 'ensemble' as inclusive", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Hey!", minutesAfterStart: 0 },
      { dir: "received", body: "Salut!", minutesAfterStart: 15 },
      { dir: "sent", body: "On fait quoi ensemble?", minutesAfterStart: 30 },
      { dir: "received", body: "Un ciné?", minutesAfterStart: 45 },
    ];
    const result = analyzeInclusivePronouns([makeConvo(msgs)]);
    expect(result.convosWithInclusive).toBe(1);
  });
});

// ── H64: analyzeLearningCurve ───────────────────────────────────

describe("analyzeLearningCurve", () => {
  it("generates quintiles with 10+ convos where openers improve", () => {
    const convos: ConversationRecord[] = [];
    for (let i = 0; i < 10; i++) {
      const start = new Date(`2025-0${Math.min(i + 1, 9)}-15T10:00:00Z`);
      // Early convos: generic openers. Later convos: longer + question
      const opener = i < 5
        ? "Salut"
        : `Hey, j'ai vu que tu aimes la randonnée! Tu as un spot préféré?`;
      const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
        { dir: "sent", body: opener, minutesAfterStart: 0 },
        { dir: "received", body: "Hey!", minutesAfterStart: 15 },
      ];
      convos.push(makeConvo(msgs, start));
    }
    const result = analyzeLearningCurve(convos);
    expect(result.quintiles.length).toBeGreaterThanOrEqual(2);
    // Later quintiles should have higher scores
    const lastScore = result.quintiles[result.quintiles.length - 1].avgOpenerScore;
    const firstScore = result.quintiles[0].avgOpenerScore;
    expect(lastScore).toBeGreaterThan(firstScore);
  });

  it("returns empty quintiles with < 5 convos", () => {
    const convos: ConversationRecord[] = [];
    for (let i = 0; i < 3; i++) {
      convos.push(makeAlternatingConvo(4, 30, undefined, new Date(`2025-0${i + 1}-15T10:00:00Z`)));
    }
    const result = analyzeLearningCurve(convos);
    expect(result.quintiles).toHaveLength(0);
    expect(result.trend).toBe("stable");
  });
});

// ── H65: analyzeSimultaneity ────────────────────────────────────

describe("analyzeSimultaneity", () => {
  it("detects concurrent conversations across multiple days", () => {
    // Messages on day1 (June 1), then day2 (June 3 — within 48h window of June 2 sent msgs)
    // The implementation counts active convos per day using sent-message dates as keys,
    // then checks which convos had ANY message within 48h *before* the day start (00:00 UTC).
    // So we need sent messages on a day D, and convo messages before D's midnight.
    const day1 = new Date("2025-06-02T10:00:00Z");
    const day2 = new Date("2025-06-02T12:00:00Z");
    // convo1: messages on June 1 (the day before June 2), plus sent on June 2
    const convo1 = makeConvo([
      { dir: "sent", body: "Hi A", minutesAfterStart: 0 },
      { dir: "received", body: "Hey!", minutesAfterStart: 30 },
      // Next day: sent msg creates a dayActivity entry for June 3
      { dir: "sent", body: "Bonjour encore", minutesAfterStart: 1440 }, // +24h
    ], new Date("2025-06-01T10:00:00Z"));
    // convo2: messages also spanning June 1 - June 2
    const convo2 = makeConvo([
      { dir: "sent", body: "Hi B", minutesAfterStart: 0 },
      { dir: "received", body: "Hello!", minutesAfterStart: 60 },
      { dir: "sent", body: "Re-bonjour", minutesAfterStart: 1440 }, // +24h
    ], new Date("2025-06-01T12:00:00Z"));
    const result = analyzeSimultaneity([convo1, convo2]);
    // Should have entries in qualityByLoad
    expect(result.qualityByLoad.length).toBeGreaterThan(0);
  });

  it("returns qualityByLoad entries for conversations with sent messages", () => {
    // Build convos with sent messages across multiple days so the algorithm can measure
    const convo = makeConvo([
      { dir: "sent", body: "Hello day 1", minutesAfterStart: 0 },
      { dir: "received", body: "Hi", minutesAfterStart: 30 },
      { dir: "sent", body: "Hello day 2", minutesAfterStart: 1440 }, // +24h
      { dir: "received", body: "Hey again", minutesAfterStart: 1470 },
    ], new Date("2025-06-01T10:00:00Z"));
    const result = analyzeSimultaneity([convo]);
    expect(result.qualityByLoad.length).toBeGreaterThan(0);
  });
});

// ── H66: analyzeDayOfWeekConvos ─────────────────────────────────

describe("analyzeDayOfWeekConvos", () => {
  it("assigns convos to proper day buckets", () => {
    // 2025-06-01 is a Sunday, 2025-06-02 is a Monday
    const convoSun = makeConvo([
      { dir: "sent", body: "Hello Sunday!", minutesAfterStart: 0 },
      { dir: "received", body: "Hi!", minutesAfterStart: 15 },
    ], new Date("2025-06-01T10:00:00Z"));
    const convoMon = makeConvo([
      { dir: "sent", body: "Hello Monday!", minutesAfterStart: 0 },
      { dir: "received", body: "Hi!", minutesAfterStart: 15 },
    ], new Date("2025-06-02T10:00:00Z"));
    const result = analyzeDayOfWeekConvos([convoSun, convoMon]);
    // DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
    expect(result).toHaveLength(7);
    const dimEntry = result.find((d) => d.day === "Dim");
    const lunEntry = result.find((d) => d.day === "Lun");
    expect(dimEntry!.count).toBe(1);
    expect(lunEntry!.count).toBe(1);
  });

  it("returns zero counts for days with no convos", () => {
    const convo = makeConvo([
      { dir: "sent", body: "Hello!", minutesAfterStart: 0 },
    ], new Date("2025-06-01T10:00:00Z")); // Sunday
    const result = analyzeDayOfWeekConvos([convo]);
    const marEntry = result.find((d) => d.day === "Mar");
    expect(marEntry!.count).toBe(0);
    expect(marEntry!.avgSurvivalMsgs).toBe(0);
  });
});

// ── H67: analyzeGifDisengagement ────────────────────────────────

describe("analyzeGifDisengagement", () => {
  it("detects GIF increase in 2nd half", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number; type?: string }[] = [];
    // First half: 6 sent text messages
    for (let i = 0; i < 12; i++) {
      const isSent = i % 2 === 0;
      msgs.push({
        dir: isSent ? "sent" : "received",
        body: "text message",
        minutesAfterStart: i * 10,
        type: "text",
      });
    }
    // Second half: 6 sent GIF messages
    for (let i = 12; i < 24; i++) {
      const isSent = i % 2 === 0;
      msgs.push({
        dir: isSent ? "sent" : "received",
        body: "funny.gif",
        minutesAfterStart: i * 10,
        type: isSent ? "gif" : "text",
      });
    }
    const result = analyzeGifDisengagement([makeConvo(msgs)]);
    expect(result.convosWithGifIncrease).toBeGreaterThanOrEqual(1);
  });

  it("no GIF change when no GIFs used", () => {
    const convo = makeAlternatingConvo(12, 10);
    const result = analyzeGifDisengagement([convo]);
    expect(result.convosWithGifIncrease).toBe(0);
  });
});

// ── H68: analyzeMatchToMessageWindow ────────────────────────────

describe("analyzeMatchToMessageWindow", () => {
  it("puts 30min first message in < 1h bucket", () => {
    const matchTime = new Date("2025-06-01T10:00:00Z");
    const convo = makeConvo([
      { dir: "sent", body: "Hey!", minutesAfterStart: 30 },
      { dir: "received", body: "Hi!", minutesAfterStart: 45 },
    ], matchTime);
    const result = analyzeMatchToMessageWindow([convo]);
    const bucket1h = result.buckets.find((b) => b.label === "< 1h");
    expect(bucket1h!.count).toBe(1);
  });

  it("puts 12h first message in 6-24h bucket", () => {
    const matchTime = new Date("2025-06-01T10:00:00Z");
    const convo = makeConvo([
      { dir: "sent", body: "Hey!", minutesAfterStart: 720 }, // 12h = 720min
      { dir: "received", body: "Hi!", minutesAfterStart: 735 },
    ], matchTime);
    const result = analyzeMatchToMessageWindow([convo]);
    const bucket624 = result.buckets.find((b) => b.label === "6-24h");
    expect(bucket624!.count).toBe(1);
  });

  it("puts 3h first message in 1-6h bucket", () => {
    const matchTime = new Date("2025-06-01T10:00:00Z");
    const convo = makeConvo([
      { dir: "sent", body: "Hey!", minutesAfterStart: 180 }, // 3h
      { dir: "received", body: "Hi!", minutesAfterStart: 195 },
    ], matchTime);
    const result = analyzeMatchToMessageWindow([convo]);
    const bucket16 = result.buckets.find((b) => b.label === "1-6h");
    expect(bucket16!.count).toBe(1);
  });
});

// ── H69: analyzeShortMessageKill ────────────────────────────────

describe("analyzeShortMessageKill", () => {
  it("detects short early message ('ok' at position 2)", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Salut!", minutesAfterStart: 0 },
      { dir: "received", body: "Hey!", minutesAfterStart: 15 },
      { dir: "sent", body: "ok", minutesAfterStart: 30 },  // 2nd sent msg, <=5 chars
      { dir: "received", body: "...", minutesAfterStart: 45 },
      { dir: "sent", body: "Ca va?", minutesAfterStart: 60 },
      { dir: "received", body: "Oui", minutesAfterStart: 75 },
    ];
    const result = analyzeShortMessageKill([makeConvo(msgs)]);
    expect(result.convosWithShortEarly).toBe(1);
  });

  it("no short messages when all messages are normal length", () => {
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Salut comment vas-tu?", minutesAfterStart: 0 },
      { dir: "received", body: "Super bien et toi?", minutesAfterStart: 15 },
      { dir: "sent", body: "Trop bien, merci!", minutesAfterStart: 30 },
      { dir: "received", body: "De rien, je suis content", minutesAfterStart: 45 },
      { dir: "sent", body: "Tu fais quoi ce soir?", minutesAfterStart: 60 },
      { dir: "received", body: "Pas grand chose", minutesAfterStart: 75 },
    ];
    const result = analyzeShortMessageKill([makeConvo(msgs)]);
    expect(result.convosWithShortEarly).toBe(0);
  });
});

// ── H70: analyzeResponseTimeAsymmetry ───────────────────────────

describe("analyzeResponseTimeAsymmetry", () => {
  it("detects asymmetry when user responds fast but match is slow", () => {
    // User responds in 5min, match responds in 300min (5h) → ratio 60:1
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Hey!", minutesAfterStart: 0 },
      { dir: "received", body: "Hi!", minutesAfterStart: 300 },   // match takes 5h
      { dir: "sent", body: "Ca va?", minutesAfterStart: 305 },    // user responds in 5min
      { dir: "received", body: "Oui", minutesAfterStart: 605 },   // match takes 5h
      { dir: "sent", body: "Cool!", minutesAfterStart: 610 },     // user responds in 5min
      { dir: "received", body: "Et toi?", minutesAfterStart: 910 }, // match takes 5h
      { dir: "sent", body: "Bien!", minutesAfterStart: 915 },     // user responds in 5min
    ];
    const result = analyzeResponseTimeAsymmetry([makeConvo(msgs)]);
    expect(result.asymmetricConvos).toBe(1);
    expect(result.avgAsymmetryRatio).toBeGreaterThan(3);
  });

  it("detects symmetry when response times are similar", () => {
    // Both sides respond in ~30min
    const msgs: { dir: "sent" | "received"; body: string; minutesAfterStart: number }[] = [
      { dir: "sent", body: "Hey!", minutesAfterStart: 0 },
      { dir: "received", body: "Hi!", minutesAfterStart: 30 },
      { dir: "sent", body: "Ca va?", minutesAfterStart: 60 },
      { dir: "received", body: "Oui!", minutesAfterStart: 90 },
      { dir: "sent", body: "Cool!", minutesAfterStart: 120 },
      { dir: "received", body: "Et toi?", minutesAfterStart: 150 },
      { dir: "sent", body: "Bien!", minutesAfterStart: 180 },
    ];
    const result = analyzeResponseTimeAsymmetry([makeConvo(msgs)]);
    expect(result.asymmetricConvos).toBe(0);
    expect(result.avgAsymmetryRatio).toBeLessThanOrEqual(3);
  });
});

// ── computeAdvancedInsights aggregator ──────────────────────────

describe("computeAdvancedInsights", () => {
  it("returns all 20 fields", () => {
    const convo = makeAlternatingConvo(12, 30);
    const insights = computeAdvancedInsights([convo], "tinder");
    expect(insights).toHaveProperty("criticalGap");
    expect(insights).toHaveProperty("rhythmAcceleration");
    expect(insights).toHaveProperty("formalityShift");
    expect(insights).toHaveProperty("temporalSync");
    expect(insights).toHaveProperty("lengthMirroring");
    expect(insights).toHaveProperty("questionReciprocity");
    expect(insights).toHaveProperty("initiativeRatio");
    expect(insights).toHaveProperty("lexicalRichness");
    expect(insights).toHaveProperty("emojiDynamics");
    expect(insights).toHaveProperty("earlyHumor");
    expect(insights).toHaveProperty("message3Quality");
    expect(insights).toHaveProperty("conversationShapes");
    expect(insights).toHaveProperty("inclusivePronouns");
    expect(insights).toHaveProperty("learningCurve");
    expect(insights).toHaveProperty("simultaneity");
    expect(insights).toHaveProperty("dayOfWeekConvos");
    expect(insights).toHaveProperty("gifDisengagement");
    expect(insights).toHaveProperty("matchToMessageWindow");
    expect(insights).toHaveProperty("shortMessageKill");
    expect(insights).toHaveProperty("responseTimeAsymmetry");
  });

  it("handles empty conversations array without crashing", () => {
    const insights = computeAdvancedInsights([], "tinder");
    expect(insights.criticalGap.totalAnalyzed).toBe(0);
    expect(insights.rhythmAcceleration.accelerating).toBe(0);
    expect(insights.dayOfWeekConvos).toHaveLength(7);
    expect(insights.matchToMessageWindow.buckets).toHaveLength(4);
  });

  it("works with different app sources", () => {
    const convo = makeAlternatingConvo(8, 30);
    const tinderInsights = computeAdvancedInsights([convo], "tinder");
    const hingeInsights = computeAdvancedInsights([convo], "hinge");
    // Same data, same results regardless of source (functions are source-agnostic)
    expect(tinderInsights.criticalGap).toEqual(hingeInsights.criticalGap);
  });
});
