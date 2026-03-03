import { describe, it, expect } from "vitest";
import type { ConversationRecord, RawMessage } from "../wrappedParser";
import {
  analyzeGhostBreakdown,
  computeSurvivalCurve,
  computeQuestionDensity,
  analyzeOpeners,
  computeResponseTimes,
  detectEscalation,
  detectDoubleText,
  computeInvestmentBalance,
  detectFatigue,
  computeConversationPulseScore,
  determineArchetype,
  computeConversationInsights,
  getConversationScoreLabel,
} from "../conversationIntelligence";

// ── Helper ──────────────────────────────────────────────────────

function makeConvo(
  messages: Partial<RawMessage>[],
  matchTimestamp?: string
): ConversationRecord {
  const msgs: RawMessage[] = messages.map((m, i) => ({
    timestamp: m.timestamp ?? new Date(`2025-04-15T${String(10 + i).padStart(2, "0")}:00:00`),
    direction: m.direction ?? "sent",
    body: m.body ?? "",
    type: m.type ?? "message",
  }));
  return {
    matchTimestamp: new Date(matchTimestamp ?? "2025-04-15T09:00:00"),
    messages: msgs,
    firstMessageDate: msgs.length > 0 ? msgs[0].timestamp : undefined,
    lastMessageDate: msgs.length > 0 ? msgs[msgs.length - 1].timestamp : undefined,
  };
}

// ── analyzeGhostBreakdown ───────────────────────────────────────

describe("analyzeGhostBreakdown", () => {
  it("classifies 0-message convos as neverReplied", () => {
    const convos = [makeConvo([])];
    const result = analyzeGhostBreakdown(convos, 5);
    // 5 total matches, 1 convo with 0 msgs, 4 matches without any convo = 5 neverReplied
    expect(result.neverReplied).toBe(5);
    expect(result.total).toBe(5);
  });

  it("classifies 1-2 messages as diedAtMsg2", () => {
    const convos = [
      makeConvo([{ body: "Hey", direction: "sent" }, { body: "Hi", direction: "received" }]),
    ];
    const result = analyzeGhostBreakdown(convos, 1);
    expect(result.diedAtMsg2).toBe(1);
  });

  it("classifies 3-10 messages as diedEarly", () => {
    const convos = [
      makeConvo(Array(7).fill({ body: "msg", direction: "sent" })),
    ];
    const result = analyzeGhostBreakdown(convos, 1);
    expect(result.diedEarly).toBe(1);
  });

  it("classifies 11+ messages as sustained", () => {
    const convos = [
      makeConvo(Array(15).fill({ body: "msg", direction: "sent" })),
    ];
    const result = analyzeGhostBreakdown(convos, 1);
    expect(result.sustained).toBe(1);
  });
});

// ── computeSurvivalCurve ────────────────────────────────────────

describe("computeSurvivalCurve", () => {
  it("returns correct survival percentages", () => {
    const convos = [
      makeConvo(Array(1).fill({ body: "a" })),
      makeConvo(Array(5).fill({ body: "b" })),
      makeConvo(Array(20).fill({ body: "c" })),
      makeConvo(Array(50).fill({ body: "d" })),
    ];
    const curve = computeSurvivalCurve(convos);
    expect(curve[0]).toEqual({ messageNumber: 1, survivingPct: 100 }); // all have ≥1
    expect(curve[1]).toEqual({ messageNumber: 2, survivingPct: 75 }); // 3 of 4 have ≥2
    const at5 = curve.find((p) => p.messageNumber === 5);
    expect(at5!.survivingPct).toBe(75); // 3 of 4 have ≥5
    const at20 = curve.find((p) => p.messageNumber === 20);
    expect(at20!.survivingPct).toBe(50); // 2 of 4 have ≥20
  });

  it("returns empty for no conversations", () => {
    expect(computeSurvivalCurve([])).toEqual([]);
  });
});

// ── computeQuestionDensity ──────────────────────────────────────

describe("computeQuestionDensity", () => {
  it("computes 0 density when no questions", () => {
    const convos = [
      makeConvo([
        { body: "Salut", direction: "sent" },
        { body: "Hello", direction: "sent" },
      ]),
    ];
    const result = computeQuestionDensity(convos);
    expect(result.density).toBe(0);
  });

  it("computes correct density: 3 questions out of 10 sent", () => {
    const msgs: Partial<RawMessage>[] = [];
    for (let i = 0; i < 10; i++) {
      msgs.push({
        body: i < 3 ? "Tu fais quoi ?" : "Cool",
        direction: "sent",
      });
    }
    const convos = [makeConvo(msgs)];
    const result = computeQuestionDensity(convos);
    expect(result.density).toBe(0.3);
  });

  it("tracks zero-question ghost rate", () => {
    const convos = [
      // Convo with 0 questions, 2 messages (ghost)
      makeConvo([
        { body: "Hey", direction: "sent" },
        { body: "Hi", direction: "received" },
      ]),
      // Convo with a question, 5 messages (not ghost)
      makeConvo([
        { body: "Tu aimes quoi ?", direction: "sent" },
        { body: "La musique", direction: "received" },
        { body: "Moi aussi", direction: "sent" },
        { body: "Cool", direction: "received" },
        { body: "On se voit ?", direction: "sent" },
      ]),
    ];
    const result = computeQuestionDensity(convos);
    expect(result.zeroQuestionGhostRate).toBe(100); // 1 zero-Q convo, 1 ghosted
  });
});

// ── analyzeOpeners ──────────────────────────────────────────────

describe("analyzeOpeners", () => {
  it("detects generic hello openers (H50)", () => {
    const convos = [
      makeConvo([{ body: "hello", direction: "sent" }]),
      makeConvo([{ body: "Salut!", direction: "sent" }]),
      makeConvo([{ body: "Tu aimes les chiens ?", direction: "sent" }]),
    ];
    const result = analyzeOpeners(convos);
    expect(result.helloCount).toBe(2); // "hello" and "Salut!"
    expect(result.containsQuestion).toBe(33); // 1 out of 3
  });

  it("computes average opener length", () => {
    const convos = [
      makeConvo([{ body: "Hey!", direction: "sent" }]),           // 4 chars
      makeConvo([{ body: "Tu fais quoi ce soir ?", direction: "sent" }]), // 22 chars
    ];
    const result = analyzeOpeners(convos);
    expect(result.avgLength).toBe(13); // (4 + 22) / 2
  });

  it("detects FR+question+personalized pattern", () => {
    const convos = [
      makeConvo([{ body: "Tu aimes la randonnee en ete ?", direction: "sent" }]),
      makeConvo([{ body: "Hey", direction: "sent" }]),
    ];
    const result = analyzeOpeners(convos);
    expect(result.frQuestionPersoRate).toBe(50); // 1 of 2 matches FR+question+perso
  });
});

// ── computeResponseTimes ────────────────────────────────────────

describe("computeResponseTimes", () => {
  it("computes median response time for alternating messages", () => {
    const convos = [
      makeConvo([
        { body: "Hey", direction: "received", timestamp: new Date("2025-04-15T10:00:00") },
        { body: "Salut", direction: "sent", timestamp: new Date("2025-04-15T10:30:00") },
        { body: "Ca va ?", direction: "received", timestamp: new Date("2025-04-15T11:00:00") },
        { body: "Oui !", direction: "sent", timestamp: new Date("2025-04-15T11:30:00") },
      ]),
    ];
    const result = computeResponseTimes(convos);
    expect(result.median).toBe(30); // 30 minutes
    expect(result.buckets.under1h).toBe(2);
  });

  it("returns 0 median for empty conversations", () => {
    const result = computeResponseTimes([]);
    expect(result.median).toBe(0);
  });
});

// ── detectEscalation ────────────────────────────────────────────

describe("detectEscalation", () => {
  it("detects 'cafe' as escalation keyword", () => {
    const convos = [
      makeConvo([
        { body: "Salut", direction: "sent" },
        { body: "Hello", direction: "received" },
        { body: "Tu fais quoi ?", direction: "sent" },
        { body: "Rien", direction: "received" },
        { body: "On se prend un cafe ?", direction: "sent" },
      ]),
    ];
    const result = detectEscalation(convos, "tinder");
    expect(result.convosWithEscalation).toBe(1);
    expect(result.avgMessageNumber).toBe(3); // 3rd sent message
  });

  it("uses different optimal range for Hinge vs Tinder", () => {
    const result = detectEscalation([], "hinge");
    expect(result.optimalRange.min).toBe(3);
    expect(result.optimalRange.max).toBe(8);

    const resultTinder = detectEscalation([], "tinder");
    expect(resultTinder.optimalRange.min).toBe(8);
  });
});

// ── detectDoubleText ────────────────────────────────────────────

describe("detectDoubleText", () => {
  it("detects double-text pattern", () => {
    const convos = [
      makeConvo([
        { body: "Hey", direction: "sent" },
        { body: "Tu es la ?", direction: "sent" }, // double text!
        { body: "Oui pardon", direction: "received" },
      ]),
    ];
    const result = detectDoubleText(convos);
    expect(result.rate).toBeGreaterThan(0);
    expect(result.survival).toBe(100); // response came after
  });

  it("returns 0 rate when no double-text", () => {
    const convos = [
      makeConvo([
        { body: "Hey", direction: "sent" },
        { body: "Hi", direction: "received" },
      ]),
    ];
    const result = detectDoubleText(convos);
    expect(result.rate).toBe(0);
  });
});

// ── computeInvestmentBalance ────────────────────────────────────

describe("computeInvestmentBalance", () => {
  it("classifies balanced conversation", () => {
    const convos = [
      makeConvo([
        { body: "A", direction: "sent" },
        { body: "B", direction: "received" },
        { body: "C", direction: "sent" },
        { body: "D", direction: "received" },
      ]),
    ];
    const result = computeInvestmentBalance(convos);
    expect(result.balanced).toBe(1);
    expect(result.overInvesting).toBe(0);
  });

  it("classifies over-investing when only sent messages", () => {
    const convos = [
      makeConvo([
        { body: "A", direction: "sent" },
        { body: "B", direction: "sent" },
        { body: "C", direction: "sent" },
      ]),
    ];
    const result = computeInvestmentBalance(convos);
    expect(result.overInvesting).toBe(1);
  });
});

// ── computeConversationPulseScore ───────────────────────────────

describe("computeConversationPulseScore", () => {
  it("returns high score for perfect inputs", () => {
    const { score } = computeConversationPulseScore({
      questionDensity: 0.3,
      responseTimeMedian: 20,
      openerStats: { avgLength: 50, containsQuestion: 80, helloCount: 0, frQuestionPersoRate: 60 },
      escalationStats: {
        avgMessageNumber: 5, convosWithEscalation: 10, convosTotal: 10,
        optimalRange: { min: 3, max: 8 }, inOptimalRange: 100,
      },
      balanceByConvo: { balanced: 10, overInvesting: 0, underInvesting: 0 },
    });
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("returns low score for poor inputs", () => {
    const { score } = computeConversationPulseScore({
      questionDensity: 0,
      responseTimeMedian: 500,
      openerStats: { avgLength: 3, containsQuestion: 0, helloCount: 10, frQuestionPersoRate: 0 },
      escalationStats: {
        avgMessageNumber: 0, convosWithEscalation: 0, convosTotal: 10,
        optimalRange: { min: 8, max: 20 }, inOptimalRange: 0,
      },
      balanceByConvo: { balanced: 0, overInvesting: 10, underInvesting: 0 },
    });
    expect(score).toBeLessThan(20);
  });

  it("clamps score between 0 and 100", () => {
    const { score } = computeConversationPulseScore({
      questionDensity: 10,
      responseTimeMedian: 0,
      openerStats: { avgLength: 200, containsQuestion: 100, helloCount: 0, frQuestionPersoRate: 100 },
      escalationStats: {
        avgMessageNumber: 5, convosWithEscalation: 10, convosTotal: 10,
        optimalRange: { min: 3, max: 8 }, inOptimalRange: 100,
      },
      balanceByConvo: { balanced: 10, overInvesting: 0, underInvesting: 0 },
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ── determineArchetype ──────────────────────────────────────────

describe("determineArchetype", () => {
  it("returns Connector Naturel for high questions+response+balance", () => {
    const result = determineArchetype({
      questionDensity: 18, responseSpeed: 18, openerQuality: 12,
      escalationTiming: 12, conversationBalance: 16,
    });
    expect(result.name).toBe("Connector Naturel");
  });

  it("returns Ghost Magnet Conscient for low questions+response", () => {
    const result = determineArchetype({
      questionDensity: 5, responseSpeed: 5, openerQuality: 12,
      escalationTiming: 12, conversationBalance: 12,
    });
    expect(result.name).toBe("Ghost Magnet Conscient");
  });

  it("returns Explorateur Prudent for high opener + low escalation", () => {
    const result = determineArchetype({
      questionDensity: 12, responseSpeed: 12, openerQuality: 18,
      escalationTiming: 5, conversationBalance: 12,
    });
    expect(result.name).toBe("Explorateur Prudent");
  });

  it("returns Sprinter for high escalation + low balance", () => {
    const result = determineArchetype({
      questionDensity: 12, responseSpeed: 12, openerQuality: 12,
      escalationTiming: 18, conversationBalance: 5,
    });
    expect(result.name).toBe("Sprinter");
  });
});

// ── getConversationScoreLabel ───────────────────────────────────

describe("getConversationScoreLabel", () => {
  it("returns correct labels for score ranges", () => {
    expect(getConversationScoreLabel(90)).toBe("Conversationnel Elite");
    expect(getConversationScoreLabel(70)).toBe("Solide");
    expect(getConversationScoreLabel(50)).toBe("En Developpement");
    expect(getConversationScoreLabel(20)).toBe("Mode Rescue");
  });
});

// ── computeConversationInsights (integration) ──────────────────

describe("computeConversationInsights", () => {
  it("computes full insights from conversations", () => {
    const convos = [
      makeConvo([
        { body: "Tu aimes les chiens ?", direction: "sent", timestamp: new Date("2025-04-15T10:00:00") },
        { body: "Oui j'adore !", direction: "received", timestamp: new Date("2025-04-15T10:30:00") },
        { body: "On se prend un cafe ?", direction: "sent", timestamp: new Date("2025-04-15T11:00:00") },
        { body: "Avec plaisir !", direction: "received", timestamp: new Date("2025-04-15T11:15:00") },
      ]),
      makeConvo([
        { body: "Hey", direction: "sent", timestamp: new Date("2025-04-16T10:00:00") },
      ]),
    ];
    const insights = computeConversationInsights(convos, "tinder", 5);
    expect(insights.conversationsAnalyzed).toBe(2);
    expect(insights.score).toBeGreaterThanOrEqual(0);
    expect(insights.score).toBeLessThanOrEqual(100);
    expect(insights.archetype).toBeTruthy();
    expect(insights.ghostBreakdown.total).toBe(5);
    expect(insights.survivalCurve.length).toBeGreaterThan(0);
    expect(insights.confidenceLevel).toBe("hypothesis");
  });

  it("handles empty conversations array without crash", () => {
    const insights = computeConversationInsights([], "tinder", 0);
    expect(insights.conversationsAnalyzed).toBe(0);
    expect(insights.score).toBeGreaterThanOrEqual(0);
    expect(insights.ghostBreakdown.total).toBe(0);
    expect(insights.survivalCurve).toEqual([]);
  });
});
