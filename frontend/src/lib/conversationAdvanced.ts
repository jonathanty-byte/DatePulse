// Advanced Conversation Hypotheses (H51-H70)
// Deep conversational analytics beyond the base H1-H50.
// All functions are pure, client-side, and operate on ConversationRecord[].

import type { ConversationRecord, RawMessage, WrappedAppSource } from "./wrappedParser";

// ── Types ───────────────────────────────────────────────────────

export interface AdvancedConversationInsights {
  // H51 — Gap Critique: first silence >6h in active convo predicts death
  criticalGap: {
    totalAnalyzed: number;
    convosWithGap: number;
    survivalAfterGap: number; // %
    avgGapMinutes: number;
  };

  // H52 — Rhythm Acceleration: decreasing response gaps predict escalation
  rhythmAcceleration: {
    accelerating: number;
    decelerating: number;
    stable: number;
    accelerationEscalationRate: number; // %
    decelerationEscalationRate: number; // %
  };

  // H53 — Formality Shift: vous→tu transition position vs survival
  formalityShift: {
    convosWithVous: number;
    convosWithShift: number;
    avgShiftMsgNumber: number;
    shiftSurvivalRate: number; // %
    noShiftSurvivalRate: number; // %
  } | null;

  // H54 — Temporal Sync: same response hour each day = ritual
  temporalSync: {
    synced: number;
    unsynced: number;
    syncSurvivalRate: number; // %
    unsyncSurvivalRate: number; // %
  };

  // H55 — Length Mirroring: convergence of message lengths
  lengthMirroring: {
    avgMirrorScore: number; // 0-1
    highMirrorSurvival: number; // %
    lowMirrorSurvival: number; // %
  };

  // H56 — Question Reciprocity: received "?" / sent "?"
  questionReciprocity: {
    avgRatio: number;
    lowReciprocityGhostRate: number; // % (ratio < 0.3)
    highReciprocityGhostRate: number; // % (ratio > 0.7)
  };

  // H57 — Initiative Ratio: who breaks silences
  initiativeRatio: {
    userBreaks: number;
    matchBreaks: number;
    overInitiatingPct: number; // % convos user breaks >80%
    overInitiatingGhostRate: number; // %
  };

  // H58 — Lexical Richness: type-token ratio
  lexicalRichness: {
    avgTTR: number;
    highTTRsurvival: number; // %
    lowTTRsurvival: number; // %
  };

  // H59 — Emoji Dynamics: density drop = disengagement
  emojiDynamics: {
    avgDensityFirst3: number;
    avgDensityLast3: number;
    densityDropGhostRate: number; // %
    densityStableGhostRate: number; // %
  };

  // H60 — Early Humor: laugh received in first 3 exchanges
  earlyHumor: {
    convosWithEarlyLaugh: number;
    earlyLaughSurvival: number; // %
    noEarlyLaughSurvival: number; // %
  };

  // H61 — Message #3 Quality: the real first substantive message
  message3Quality: {
    avgLength: number;
    withQuestionPct: number; // %
    questionSurvival: number; // %
    noQuestionSurvival: number; // %
  };

  // H62 — Conversation Shapes: diamond, cliff, plateau, erratic
  conversationShapes: {
    diamond: number;
    cliff: number;
    plateau: number;
    erratic: number;
    diamondSurvival: number; // %
    cliffSurvival: number; // %
  };

  // H63 — Inclusive Pronouns: on/nous → escalation predictor
  inclusivePronouns: {
    convosWithInclusive: number;
    inclusiveEscalationRate: number; // %
    noInclusiveEscalationRate: number; // %
    avgFirstInclusiveMsg: number;
  };

  // H64 — Learning Curve: do openers improve over time?
  learningCurve: {
    quintiles: { period: string; avgOpenerScore: number; survivalRate: number }[];
    trend: "improving" | "declining" | "stable";
  };

  // H65 — Simultaneity: concurrent active convos vs quality
  simultaneity: {
    avgActiveConvos: number;
    qualityByLoad: { active: number; avgResponseMin: number; avgMsgLength: number }[];
    overloadThreshold: number;
  };

  // H66 — Day-of-Week Conversations: survival by initiation day
  dayOfWeekConvos: { day: string; count: number; avgSurvivalMsgs: number; escalationRate: number }[];

  // H67 — GIF Disengagement: rising GIF ratio = death signal
  gifDisengagement: {
    convosWithGifIncrease: number;
    gifIncreaseGhostRate: number; // %
    noGifChangeGhostRate: number; // %
  };

  // H68 — Match-to-Message Window: time from match to 1st msg
  matchToMessageWindow: {
    buckets: { label: string; count: number; survivalRate: number }[];
  };

  // H69 — Short Message Kill: ultra-short sent msgs at positions 2-5
  shortMessageKill: {
    convosWithShortEarly: number;
    shortEarlyGhostRate: number; // %
    normalGhostRate: number; // %
  };

  // H70 — Response Time Asymmetry: speed ratio drift > 3:1 = death
  responseTimeAsymmetry: {
    asymmetricConvos: number;
    asymmetricGhostRate: number; // %
    symmetricGhostRate: number; // %
    avgAsymmetryRatio: number;
  };
}

// ── Regex / constants ───────────────────────────────────────────

const VOUS_REGEX = /\b(vous|votre|vos)\b/i;
const TU_REGEX = /\b(tu|toi|ton|ta|tes|t')\b/i;
const INCLUSIVE_REGEX = /\b(on\s+(?:pourrait|devrait|va|peut|se|fait)|nous|notre|nos|ensemble)\b/i;
const ESCALATION_REGEX = /\b(date|caf[eé]|boire|verre|num[eé]ro|insta|snap|whatsapp|tel|t[eé]l[eé]phone|rendez[- ]?vous|rdv|resto|restaurant|sortir|retrouver|voir)\b/i;
const LAUGH_REGEX = /(?:haha|hihi|mdr|lol|ptdr|😂|🤣|😆|xD)/i;
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu;
const SHORT_MSG_THRESHOLD = 5; // chars
const SILENCE_THRESHOLD_MIN = 120; // 2h in minutes

// ── Helpers ─────────────────────────────────────────────────────

function isSurvived(convo: ConversationRecord, threshold = 10): boolean {
  return convo.messages.length >= threshold;
}

function getResponseGaps(msgs: RawMessage[]): { gap: number; breakerDir: "sent" | "received" }[] {
  const gaps: { gap: number; breakerDir: "sent" | "received" }[] = [];
  for (let i = 1; i < msgs.length; i++) {
    const deltaMin = (msgs[i].timestamp.getTime() - msgs[i - 1].timestamp.getTime()) / 60000;
    if (deltaMin >= 0) {
      gaps.push({ gap: deltaMin, breakerDir: msgs[i].direction });
    }
  }
  return gaps;
}

function hasEscalation(convo: ConversationRecord): boolean {
  return convo.messages.some((m) => m.direction === "sent" && ESCALATION_REGEX.test(m.body));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// ── H51: Critical Gap ──────────────────────────────────────────

export function analyzeCriticalGap(conversations: ConversationRecord[]): AdvancedConversationInsights["criticalGap"] {
  // Filter convos with ≥5 messages where initial gaps were <2h
  const eligible: { convo: ConversationRecord; gapMin: number }[] = [];

  for (const convo of conversations) {
    if (convo.messages.length < 5) continue;
    const gaps = getResponseGaps(convo.messages);
    // Check first 3 gaps are fast (<2h)
    const firstGaps = gaps.slice(0, 3);
    if (firstGaps.length < 3 || firstGaps.some((g) => g.gap >= SILENCE_THRESHOLD_MIN)) continue;
    // Find first gap >6h (360min) after the fast start
    const bigGap = gaps.slice(3).find((g) => g.gap > 360);
    if (bigGap) {
      eligible.push({ convo, gapMin: bigGap.gap });
    }
  }

  const survived = eligible.filter((e) => isSurvived(e.convo, 15)).length;
  const avgGap = eligible.length > 0 ? Math.round(eligible.reduce((s, e) => s + e.gapMin, 0) / eligible.length) : 0;

  return {
    totalAnalyzed: conversations.filter((c) => c.messages.length >= 5).length,
    convosWithGap: eligible.length,
    survivalAfterGap: eligible.length > 0 ? Math.round((survived / eligible.length) * 100) : 0,
    avgGapMinutes: avgGap,
  };
}

// ── H52: Rhythm Acceleration ────────────────────────────────────

export function analyzeRhythmAcceleration(conversations: ConversationRecord[]): AdvancedConversationInsights["rhythmAcceleration"] {
  let accelerating = 0;
  let decelerating = 0;
  let stable = 0;
  let accEscalation = 0;
  let decEscalation = 0;

  for (const convo of conversations) {
    if (convo.messages.length < 6) continue;
    const gaps = getResponseGaps(convo.messages).map((g) => g.gap);
    if (gaps.length < 4) continue;

    // Simple linear regression slope on gap times
    const n = gaps.length;
    const xMean = (n - 1) / 2;
    const yMean = gaps.reduce((s, g) => s + g, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (gaps[i] - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den !== 0 ? num / den : 0;
    const esc = hasEscalation(convo);

    if (slope < -5) {
      accelerating++;
      if (esc) accEscalation++;
    } else if (slope > 5) {
      decelerating++;
      if (esc) decEscalation++;
    } else {
      stable++;
    }
  }

  return {
    accelerating,
    decelerating,
    stable,
    accelerationEscalationRate: accelerating > 0 ? Math.round((accEscalation / accelerating) * 100) : 0,
    decelerationEscalationRate: decelerating > 0 ? Math.round((decEscalation / decelerating) * 100) : 0,
  };
}

// ── H53: Formality Shift ────────────────────────────────────────

export function analyzeFormalityShift(conversations: ConversationRecord[]): AdvancedConversationInsights["formalityShift"] {
  let convosWithVous = 0;
  let convosWithShift = 0;
  const shiftPositions: number[] = [];
  let shiftSurvived = 0;
  let noShiftSurvived = 0;
  let noShiftTotal = 0;

  for (const convo of conversations) {
    if (convo.messages.length < 4) continue;
    const sentMsgs = convo.messages.filter((m) => m.direction === "sent");
    let hasVous = false;
    let shiftAt = -1;
    let foundTu = false;

    for (let i = 0; i < sentMsgs.length; i++) {
      if (VOUS_REGEX.test(sentMsgs[i].body)) hasVous = true;
      if (hasVous && !foundTu && TU_REGEX.test(sentMsgs[i].body)) {
        foundTu = true;
        shiftAt = i + 1;
      }
    }

    if (hasVous) {
      convosWithVous++;
      if (foundTu && shiftAt > 0) {
        convosWithShift++;
        shiftPositions.push(shiftAt);
        if (isSurvived(convo)) shiftSurvived++;
      } else {
        noShiftTotal++;
        if (isSurvived(convo)) noShiftSurvived++;
      }
    }
  }

  if (convosWithVous === 0) return null;

  return {
    convosWithVous,
    convosWithShift,
    avgShiftMsgNumber: shiftPositions.length > 0 ? Math.round(shiftPositions.reduce((s, p) => s + p, 0) / shiftPositions.length) : 0,
    shiftSurvivalRate: convosWithShift > 0 ? Math.round((shiftSurvived / convosWithShift) * 100) : 0,
    noShiftSurvivalRate: noShiftTotal > 0 ? Math.round((noShiftSurvived / noShiftTotal) * 100) : 0,
  };
}

// ── H54: Temporal Sync ──────────────────────────────────────────

export function analyzeTemporalSync(conversations: ConversationRecord[]): AdvancedConversationInsights["temporalSync"] {
  let synced = 0;
  let unsynced = 0;
  let syncSurvived = 0;
  let unsyncSurvived = 0;

  for (const convo of conversations) {
    if (convo.messages.length < 6) continue;
    // Get hours of user responses and match responses
    const userHours = convo.messages.filter((m) => m.direction === "sent").map((m) => m.timestamp.getHours());
    const matchHours = convo.messages.filter((m) => m.direction === "received").map((m) => m.timestamp.getHours());

    if (userHours.length < 3 || matchHours.length < 3) continue;

    // Stddev of hours — low = consistent timing
    const stddev = (arr: number[]) => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
    };

    const userStd = stddev(userHours);
    const matchStd = stddev(matchHours);
    // Synced if both have low variance (< 4 hours stddev)
    const isSynced = userStd < 4 && matchStd < 4;

    if (isSynced) {
      synced++;
      if (isSurvived(convo)) syncSurvived++;
    } else {
      unsynced++;
      if (isSurvived(convo)) unsyncSurvived++;
    }
  }

  return {
    synced,
    unsynced,
    syncSurvivalRate: synced > 0 ? Math.round((syncSurvived / synced) * 100) : 0,
    unsyncSurvivalRate: unsynced > 0 ? Math.round((unsyncSurvived / unsynced) * 100) : 0,
  };
}

// ── H55: Length Mirroring ───────────────────────────────────────

export function analyzeLengthMirroring(conversations: ConversationRecord[]): AdvancedConversationInsights["lengthMirroring"] {
  const scores: { score: number; survived: boolean }[] = [];

  for (const convo of conversations) {
    if (convo.messages.length < 6) continue;
    const ratios: number[] = [];

    for (let i = 1; i < convo.messages.length; i++) {
      if (convo.messages[i].direction !== convo.messages[i - 1].direction) {
        const len1 = Math.max(1, convo.messages[i - 1].body.length);
        const len2 = Math.max(1, convo.messages[i].body.length);
        ratios.push(Math.min(len1, len2) / Math.max(len1, len2)); // 0-1, 1=perfect mirror
      }
    }

    if (ratios.length >= 3) {
      const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
      scores.push({ score: avgRatio, survived: isSurvived(convo) });
    }
  }

  const highMirror = scores.filter((s) => s.score > 0.5);
  const lowMirror = scores.filter((s) => s.score <= 0.3);

  return {
    avgMirrorScore: scores.length > 0 ? Math.round((scores.reduce((s, x) => s + x.score, 0) / scores.length) * 100) / 100 : 0,
    highMirrorSurvival: highMirror.length > 0 ? Math.round((highMirror.filter((s) => s.survived).length / highMirror.length) * 100) : 0,
    lowMirrorSurvival: lowMirror.length > 0 ? Math.round((lowMirror.filter((s) => s.survived).length / lowMirror.length) * 100) : 0,
  };
}

// ── H56: Question Reciprocity ───────────────────────────────────

export function analyzeQuestionReciprocity(conversations: ConversationRecord[]): AdvancedConversationInsights["questionReciprocity"] {
  const ratios: { ratio: number; ghosted: boolean }[] = [];

  for (const convo of conversations) {
    if (convo.messages.length < 4) continue;
    const sentQ = convo.messages.filter((m) => m.direction === "sent" && m.body.includes("?")).length;
    const recvQ = convo.messages.filter((m) => m.direction === "received" && m.body.includes("?")).length;
    if (sentQ === 0) continue; // Can't compute ratio
    const ratio = recvQ / sentQ;
    ratios.push({ ratio, ghosted: convo.messages.length <= 4 });
  }

  const low = ratios.filter((r) => r.ratio < 0.3);
  const high = ratios.filter((r) => r.ratio >= 0.7);

  return {
    avgRatio: ratios.length > 0 ? Math.round((ratios.reduce((s, r) => s + r.ratio, 0) / ratios.length) * 100) / 100 : 0,
    lowReciprocityGhostRate: low.length > 0 ? Math.round((low.filter((r) => r.ghosted).length / low.length) * 100) : 0,
    highReciprocityGhostRate: high.length > 0 ? Math.round((high.filter((r) => r.ghosted).length / high.length) * 100) : 0,
  };
}

// ── H57: Initiative Ratio ───────────────────────────────────────

export function analyzeInitiativeRatio(conversations: ConversationRecord[]): AdvancedConversationInsights["initiativeRatio"] {
  let totalUserBreaks = 0;
  let totalMatchBreaks = 0;
  let overInitiating = 0;
  let overInitiatingGhosted = 0;

  for (const convo of conversations) {
    const gaps = getResponseGaps(convo.messages);
    const silences = gaps.filter((g) => g.gap >= SILENCE_THRESHOLD_MIN);
    if (silences.length < 2) continue;

    const userBreaks = silences.filter((g) => g.breakerDir === "sent").length;
    const matchBreaks = silences.filter((g) => g.breakerDir === "received").length;
    totalUserBreaks += userBreaks;
    totalMatchBreaks += matchBreaks;

    const total = userBreaks + matchBreaks;
    if (total > 0 && userBreaks / total > 0.8) {
      overInitiating++;
      if (!isSurvived(convo)) overInitiatingGhosted++;
    }
  }

  return {
    userBreaks: totalUserBreaks,
    matchBreaks: totalMatchBreaks,
    overInitiatingPct: overInitiating,
    overInitiatingGhostRate: overInitiating > 0 ? Math.round((overInitiatingGhosted / overInitiating) * 100) : 0,
  };
}

// ── H58: Lexical Richness ───────────────────────────────────────

export function analyzeLexicalRichness(conversations: ConversationRecord[]): AdvancedConversationInsights["lexicalRichness"] {
  const results: { ttr: number; survived: boolean }[] = [];

  for (const convo of conversations) {
    const sentMsgs = convo.messages.filter((m) => m.direction === "sent");
    if (sentMsgs.length < 3) continue;

    const allWords = sentMsgs.map((m) => m.body.toLowerCase()).join(" ").split(/[\s,.!?;:'"()\-]+/).filter((w) => w.length > 1);
    if (allWords.length < 10) continue;

    const uniqueWords = new Set(allWords);
    const ttr = uniqueWords.size / allWords.length;
    results.push({ ttr, survived: isSurvived(convo) });
  }

  results.sort((a, b) => a.ttr - b.ttr);
  const q1 = Math.floor(results.length * 0.25);
  const q3 = Math.floor(results.length * 0.75);

  const low = results.slice(0, q1);
  const high = results.slice(q3);

  return {
    avgTTR: results.length > 0 ? Math.round((results.reduce((s, r) => s + r.ttr, 0) / results.length) * 100) / 100 : 0,
    highTTRsurvival: high.length > 0 ? Math.round((high.filter((r) => r.survived).length / high.length) * 100) : 0,
    lowTTRsurvival: low.length > 0 ? Math.round((low.filter((r) => r.survived).length / low.length) * 100) : 0,
  };
}

// ── H59: Emoji Dynamics ─────────────────────────────────────────

function emojiDensity(body: string): number {
  const emojis = body.match(EMOJI_REGEX);
  return body.length > 0 ? (emojis?.length ?? 0) / body.length : 0;
}

export function analyzeEmojiDynamics(conversations: ConversationRecord[]): AdvancedConversationInsights["emojiDynamics"] {
  const results: { dropRate: number; ghosted: boolean; first3: number; last3: number }[] = [];

  for (const convo of conversations) {
    const sent = convo.messages.filter((m) => m.direction === "sent");
    if (sent.length < 6) continue;

    const first3 = sent.slice(0, 3).reduce((s, m) => s + emojiDensity(m.body), 0) / 3;
    const last3 = sent.slice(-3).reduce((s, m) => s + emojiDensity(m.body), 0) / 3;
    const drop = first3 > 0 ? (first3 - last3) / first3 : 0;

    results.push({ dropRate: drop, ghosted: !isSurvived(convo), first3, last3 });
  }

  const dropped = results.filter((r) => r.dropRate > 0.3);
  const stable = results.filter((r) => r.dropRate <= 0.3);

  return {
    avgDensityFirst3: results.length > 0 ? Math.round((results.reduce((s, r) => s + r.first3, 0) / results.length) * 1000) / 1000 : 0,
    avgDensityLast3: results.length > 0 ? Math.round((results.reduce((s, r) => s + r.last3, 0) / results.length) * 1000) / 1000 : 0,
    densityDropGhostRate: dropped.length > 0 ? Math.round((dropped.filter((r) => r.ghosted).length / dropped.length) * 100) : 0,
    densityStableGhostRate: stable.length > 0 ? Math.round((stable.filter((r) => r.ghosted).length / stable.length) * 100) : 0,
  };
}

// ── H60: Early Humor ────────────────────────────────────────────

export function analyzeEarlyHumor(conversations: ConversationRecord[]): AdvancedConversationInsights["earlyHumor"] {
  let withLaugh = 0;
  let laughSurvived = 0;
  let noLaugh = 0;
  let noLaughSurvived = 0;

  for (const convo of conversations) {
    if (convo.messages.length < 4) continue;
    // Check for laugh in first 6 messages (3 exchanges), RECEIVED only
    const earlyReceived = convo.messages.slice(0, 6).filter((m) => m.direction === "received");
    const hasLaugh = earlyReceived.some((m) => LAUGH_REGEX.test(m.body));

    if (hasLaugh) {
      withLaugh++;
      if (isSurvived(convo)) laughSurvived++;
    } else {
      noLaugh++;
      if (isSurvived(convo)) noLaughSurvived++;
    }
  }

  return {
    convosWithEarlyLaugh: withLaugh,
    earlyLaughSurvival: withLaugh > 0 ? Math.round((laughSurvived / withLaugh) * 100) : 0,
    noEarlyLaughSurvival: noLaugh > 0 ? Math.round((noLaughSurvived / noLaugh) * 100) : 0,
  };
}

// ── H61: Message #3 Quality ─────────────────────────────────────

export function analyzeMessage3Quality(conversations: ConversationRecord[]): AdvancedConversationInsights["message3Quality"] {
  const msg3s: { length: number; hasQuestion: boolean; survived: boolean }[] = [];

  for (const convo of conversations) {
    // Get the 3rd SENT message (the real substantive one after opener + reply)
    const sentMsgs = convo.messages.filter((m) => m.direction === "sent");
    if (sentMsgs.length < 2) continue; // Need at least 2 sent messages (opener + msg3)
    // msg3 = 2nd sent message (index 1), since opener is index 0
    const msg3 = sentMsgs[1];
    msg3s.push({
      length: msg3.body.length,
      hasQuestion: msg3.body.includes("?"),
      survived: isSurvived(convo),
    });
  }

  const withQ = msg3s.filter((m) => m.hasQuestion);
  const noQ = msg3s.filter((m) => !m.hasQuestion);

  return {
    avgLength: msg3s.length > 0 ? Math.round(msg3s.reduce((s, m) => s + m.length, 0) / msg3s.length) : 0,
    withQuestionPct: msg3s.length > 0 ? Math.round((withQ.length / msg3s.length) * 100) : 0,
    questionSurvival: withQ.length > 0 ? Math.round((withQ.filter((m) => m.survived).length / withQ.length) * 100) : 0,
    noQuestionSurvival: noQ.length > 0 ? Math.round((noQ.filter((m) => m.survived).length / noQ.length) * 100) : 0,
  };
}

// ── H62: Conversation Shapes ────────────────────────────────────

export function analyzeConversationShapes(conversations: ConversationRecord[]): AdvancedConversationInsights["conversationShapes"] {
  const shapes: { shape: "diamond" | "cliff" | "plateau" | "erratic"; survived: boolean }[] = [];

  for (const convo of conversations) {
    if (convo.messages.length < 6) continue;
    const sent = convo.messages.filter((m) => m.direction === "sent");
    if (sent.length < 4) continue;

    const lengths = sent.map((m) => m.body.length);
    const mid = Math.floor(lengths.length / 2);
    const firstHalf = lengths.slice(0, mid);
    const secondHalf = lengths.slice(mid);
    const firstAvg = firstHalf.reduce((s, l) => s + l, 0) / firstHalf.length;
    const midAvg = lengths.slice(Math.max(0, mid - 1), mid + 2).reduce((s, l) => s + l, 0) / Math.min(3, lengths.length);
    const secondAvg = secondHalf.reduce((s, l) => s + l, 0) / secondHalf.length;

    let shape: "diamond" | "cliff" | "plateau" | "erratic";
    if (midAvg > firstAvg * 1.2 && midAvg > secondAvg * 1.2) {
      shape = "diamond"; // peaks in middle
    } else if (firstAvg > secondAvg * 2) {
      shape = "cliff"; // drops sharply
    } else if (Math.abs(firstAvg - secondAvg) / Math.max(firstAvg, 1) < 0.3) {
      shape = "plateau"; // relatively flat
    } else {
      shape = "erratic";
    }

    shapes.push({ shape, survived: isSurvived(convo) });
  }

  const count = (s: string) => shapes.filter((x) => x.shape === s).length;
  const survRate = (s: string) => {
    const group = shapes.filter((x) => x.shape === s);
    return group.length > 0 ? Math.round((group.filter((x) => x.survived).length / group.length) * 100) : 0;
  };

  return {
    diamond: count("diamond"),
    cliff: count("cliff"),
    plateau: count("plateau"),
    erratic: count("erratic"),
    diamondSurvival: survRate("diamond"),
    cliffSurvival: survRate("cliff"),
  };
}

// ── H63: Inclusive Pronouns ─────────────────────────────────────

export function analyzeInclusivePronouns(conversations: ConversationRecord[]): AdvancedConversationInsights["inclusivePronouns"] {
  let withInclusive = 0;
  let inclusiveEscalated = 0;
  let noInclusive = 0;
  let noInclusiveEscalated = 0;
  const firstPositions: number[] = [];

  for (const convo of conversations) {
    if (convo.messages.length < 4) continue;
    let foundAt = -1;
    for (let i = 0; i < convo.messages.length; i++) {
      if (INCLUSIVE_REGEX.test(convo.messages[i].body)) {
        foundAt = i + 1;
        break;
      }
    }

    const esc = hasEscalation(convo);
    if (foundAt > 0) {
      withInclusive++;
      firstPositions.push(foundAt);
      if (esc) inclusiveEscalated++;
    } else {
      noInclusive++;
      if (esc) noInclusiveEscalated++;
    }
  }

  return {
    convosWithInclusive: withInclusive,
    inclusiveEscalationRate: withInclusive > 0 ? Math.round((inclusiveEscalated / withInclusive) * 100) : 0,
    noInclusiveEscalationRate: noInclusive > 0 ? Math.round((noInclusiveEscalated / noInclusive) * 100) : 0,
    avgFirstInclusiveMsg: firstPositions.length > 0 ? Math.round(firstPositions.reduce((s, p) => s + p, 0) / firstPositions.length) : 0,
  };
}

// ── H64: Learning Curve ─────────────────────────────────────────

export function analyzeLearningCurve(conversations: ConversationRecord[]): AdvancedConversationInsights["learningCurve"] {
  // Sort conversations by match date
  const sorted = [...conversations]
    .filter((c) => c.messages.length > 0)
    .sort((a, b) => (a.firstMessageDate?.getTime() ?? 0) - (b.firstMessageDate?.getTime() ?? 0));

  if (sorted.length < 5) return { quintiles: [], trend: "stable" };

  const chunkSize = Math.ceil(sorted.length / 5);
  const quintiles: { period: string; avgOpenerScore: number; survivalRate: number }[] = [];

  for (let i = 0; i < 5; i++) {
    const chunk = sorted.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length === 0) continue;

    const openerScores = chunk.map((c) => {
      const opener = c.messages.find((m) => m.direction === "sent");
      if (!opener) return 0;
      let score = 0;
      score += Math.min(5, opener.body.length / 10); // length up to 5pts
      if (opener.body.includes("?")) score += 3; // question
      if (!/^(hello|salut|hey|coucou|yo|bonjour|hi|cc|slt)\.?\s*!*$/i.test(opener.body.trim())) score += 2; // not generic
      return score;
    });

    const survived = chunk.filter((c) => isSurvived(c)).length;

    // Period label from first and last convo dates
    const first = chunk[0].firstMessageDate ?? chunk[0].matchTimestamp;
    const last = chunk[chunk.length - 1].firstMessageDate ?? chunk[chunk.length - 1].matchTimestamp;
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const period = fmt(first) === fmt(last) ? fmt(first) : `${fmt(first)} → ${fmt(last)}`;

    quintiles.push({
      period,
      avgOpenerScore: Math.round((openerScores.reduce((s, v) => s + v, 0) / openerScores.length) * 10) / 10,
      survivalRate: chunk.length > 0 ? Math.round((survived / chunk.length) * 100) : 0,
    });
  }

  // Determine trend
  const scores = quintiles.map((q) => q.avgOpenerScore);
  let trend: "improving" | "declining" | "stable" = "stable";
  if (scores.length >= 3) {
    const firstAvg = scores.slice(0, 2).reduce((s, v) => s + v, 0) / 2;
    const lastAvg = scores.slice(-2).reduce((s, v) => s + v, 0) / 2;
    if (lastAvg > firstAvg + 0.5) trend = "improving";
    else if (lastAvg < firstAvg - 0.5) trend = "declining";
  }

  return { quintiles, trend };
}

// ── H65: Simultaneity ───────────────────────────────────────────

export function analyzeSimultaneity(conversations: ConversationRecord[]): AdvancedConversationInsights["simultaneity"] {
  // Build a day-by-day map of active conversations
  const dayActivity = new Map<string, { activeConvos: number; responseTimes: number[]; msgLengths: number[] }>();

  for (const convo of conversations) {
    for (const msg of convo.messages) {
      if (msg.direction !== "sent") continue;
      const dayKey = msg.timestamp.toISOString().slice(0, 10);
      const entry = dayActivity.get(dayKey) ?? { activeConvos: 0, responseTimes: [], msgLengths: [] };
      entry.msgLengths.push(msg.body.length);
      dayActivity.set(dayKey, entry);
    }
  }

  // Count active convos per day (had a message within last 48h)
  const allDays = [...dayActivity.keys()].sort();
  for (const day of allDays) {
    const dayDate = new Date(day);
    let active = 0;
    for (const convo of conversations) {
      const hasRecentMsg = convo.messages.some((m) => {
        const delta = dayDate.getTime() - m.timestamp.getTime();
        return delta >= 0 && delta < 48 * 3600000;
      });
      if (hasRecentMsg) active++;
    }
    const entry = dayActivity.get(day)!;
    entry.activeConvos = active;
  }

  // Aggregate by active convo count
  const byLoad = new Map<number, { responseTimes: number[]; msgLengths: number[] }>();
  for (const [, entry] of dayActivity) {
    const bucket = Math.min(entry.activeConvos, 8); // cap at 8+
    const existing = byLoad.get(bucket) ?? { responseTimes: [], msgLengths: [] };
    existing.msgLengths.push(...entry.msgLengths);
    byLoad.set(bucket, existing);
  }

  const qualityByLoad = [...byLoad.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([active, data]) => ({
      active,
      avgResponseMin: 0, // TODO: would need per-day response times
      avgMsgLength: data.msgLengths.length > 0 ? Math.round(data.msgLengths.reduce((s, l) => s + l, 0) / data.msgLengths.length) : 0,
    }));

  const avgActive = allDays.length > 0
    ? Math.round(([...dayActivity.values()].reduce((s, e) => s + e.activeConvos, 0) / allDays.length) * 10) / 10
    : 0;

  // Find overload threshold (where avgMsgLength drops >30% from baseline)
  const baseline = qualityByLoad.find((q) => q.active <= 2)?.avgMsgLength ?? 50;
  const overload = qualityByLoad.find((q) => q.avgMsgLength < baseline * 0.7);

  return {
    avgActiveConvos: avgActive,
    qualityByLoad,
    overloadThreshold: overload?.active ?? 0,
  };
}

// ── H66: Day-of-Week Conversations ──────────────────────────────

export function analyzeDayOfWeekConvos(conversations: ConversationRecord[]): AdvancedConversationInsights["dayOfWeekConvos"] {
  const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const byDay: { count: number; survivalSum: number; escalated: number }[] = Array.from({ length: 7 }, () => ({ count: 0, survivalSum: 0, escalated: 0 }));

  for (const convo of conversations) {
    const firstMsg = convo.messages.find((m) => m.direction === "sent");
    if (!firstMsg) continue;
    const dow = firstMsg.timestamp.getDay();
    byDay[dow].count++;
    byDay[dow].survivalSum += convo.messages.length;
    if (hasEscalation(convo)) byDay[dow].escalated++;
  }

  return DAYS.map((day, i) => ({
    day,
    count: byDay[i].count,
    avgSurvivalMsgs: byDay[i].count > 0 ? Math.round(byDay[i].survivalSum / byDay[i].count) : 0,
    escalationRate: byDay[i].count > 0 ? Math.round((byDay[i].escalated / byDay[i].count) * 100) : 0,
  }));
}

// ── H67: GIF Disengagement ──────────────────────────────────────

export function analyzeGifDisengagement(conversations: ConversationRecord[]): AdvancedConversationInsights["gifDisengagement"] {
  let gifIncrease = 0;
  let gifIncreaseGhosted = 0;
  let noChange = 0;
  let noChangeGhosted = 0;

  for (const convo of conversations) {
    const sent = convo.messages.filter((m) => m.direction === "sent");
    if (sent.length < 6) continue;

    const firstHalf = sent.slice(0, Math.floor(sent.length / 2));
    const secondHalf = sent.slice(Math.floor(sent.length / 2));

    const gifRate = (msgs: RawMessage[]) => msgs.filter((m) => m.type === "gif" || /\.(gif|giphy)/i.test(m.body)).length / Math.max(1, msgs.length);

    const firstRate = gifRate(firstHalf);
    const secondRate = gifRate(secondHalf);
    const ghosted = !isSurvived(convo);

    if (secondRate > firstRate + 0.1) {
      gifIncrease++;
      if (ghosted) gifIncreaseGhosted++;
    } else {
      noChange++;
      if (ghosted) noChangeGhosted++;
    }
  }

  return {
    convosWithGifIncrease: gifIncrease,
    gifIncreaseGhostRate: gifIncrease > 0 ? Math.round((gifIncreaseGhosted / gifIncrease) * 100) : 0,
    noGifChangeGhostRate: noChange > 0 ? Math.round((noChangeGhosted / noChange) * 100) : 0,
  };
}

// ── H68: Match-to-Message Window ────────────────────────────────

export function analyzeMatchToMessageWindow(conversations: ConversationRecord[]): AdvancedConversationInsights["matchToMessageWindow"] {
  const bucketDefs = [
    { label: "< 1h", maxMin: 60 },
    { label: "1-6h", maxMin: 360 },
    { label: "6-24h", maxMin: 1440 },
    { label: "> 24h", maxMin: Infinity },
  ];

  const buckets = bucketDefs.map((d) => ({ label: d.label, count: 0, survived: 0 }));

  for (const convo of conversations) {
    const firstSent = convo.messages.find((m) => m.direction === "sent");
    if (!firstSent || !convo.matchTimestamp) continue;
    const deltaMin = (firstSent.timestamp.getTime() - convo.matchTimestamp.getTime()) / 60000;
    if (deltaMin < 0) continue; // bad data

    for (let i = 0; i < bucketDefs.length; i++) {
      const prev = i > 0 ? bucketDefs[i - 1].maxMin : 0;
      if (deltaMin >= prev && deltaMin < bucketDefs[i].maxMin) {
        buckets[i].count++;
        if (isSurvived(convo)) buckets[i].survived++;
        break;
      }
    }
  }

  return {
    buckets: buckets.map((b) => ({
      label: b.label,
      count: b.count,
      survivalRate: b.count > 0 ? Math.round((b.survived / b.count) * 100) : 0,
    })),
  };
}

// ── H69: Short Message Kill ─────────────────────────────────────

export function analyzeShortMessageKill(conversations: ConversationRecord[]): AdvancedConversationInsights["shortMessageKill"] {
  let withShort = 0;
  let shortGhosted = 0;
  let noShort = 0;
  let noShortGhosted = 0;

  for (const convo of conversations) {
    const sentMsgs = convo.messages.filter((m) => m.direction === "sent");
    if (sentMsgs.length < 3) continue;

    // Check positions 1-4 (0-indexed), i.e., messages 2-5 in human terms
    const earlyMsgs = sentMsgs.slice(1, 5);
    const hasShort = earlyMsgs.some((m) => m.body.trim().length <= SHORT_MSG_THRESHOLD);
    const ghosted = !isSurvived(convo);

    if (hasShort) {
      withShort++;
      if (ghosted) shortGhosted++;
    } else {
      noShort++;
      if (ghosted) noShortGhosted++;
    }
  }

  return {
    convosWithShortEarly: withShort,
    shortEarlyGhostRate: withShort > 0 ? Math.round((shortGhosted / withShort) * 100) : 0,
    normalGhostRate: noShort > 0 ? Math.round((noShortGhosted / noShort) * 100) : 0,
  };
}

// ── H70: Response Time Asymmetry ────────────────────────────────

export function analyzeResponseTimeAsymmetry(conversations: ConversationRecord[]): AdvancedConversationInsights["responseTimeAsymmetry"] {
  let asymmetric = 0;
  let asymmetricGhosted = 0;
  let symmetric = 0;
  let symmetricGhosted = 0;
  const ratios: number[] = [];

  for (const convo of conversations) {
    if (convo.messages.length < 6) continue;
    const userTimes: number[] = [];
    const matchTimes: number[] = [];

    for (let i = 1; i < convo.messages.length; i++) {
      const delta = (convo.messages[i].timestamp.getTime() - convo.messages[i - 1].timestamp.getTime()) / 60000;
      if (delta < 0) continue;
      if (convo.messages[i].direction === "sent" && convo.messages[i - 1].direction === "received") {
        userTimes.push(delta);
      } else if (convo.messages[i].direction === "received" && convo.messages[i - 1].direction === "sent") {
        matchTimes.push(delta);
      }
    }

    if (userTimes.length < 2 || matchTimes.length < 2) continue;

    const userMedian = median(userTimes);
    const matchMedian = median(matchTimes);
    if (matchMedian === 0 || userMedian === 0) continue;

    const ratio = Math.max(userMedian, matchMedian) / Math.min(userMedian, matchMedian);
    ratios.push(ratio);
    const ghosted = !isSurvived(convo);

    if (ratio > 3) {
      asymmetric++;
      if (ghosted) asymmetricGhosted++;
    } else {
      symmetric++;
      if (ghosted) symmetricGhosted++;
    }
  }

  return {
    asymmetricConvos: asymmetric,
    asymmetricGhostRate: asymmetric > 0 ? Math.round((asymmetricGhosted / asymmetric) * 100) : 0,
    symmetricGhostRate: symmetric > 0 ? Math.round((symmetricGhosted / symmetric) * 100) : 0,
    avgAsymmetryRatio: ratios.length > 0 ? Math.round((ratios.reduce((s, r) => s + r, 0) / ratios.length) * 10) / 10 : 1,
  };
}

// ── Main aggregator ─────────────────────────────────────────────

export function computeAdvancedInsights(
  conversations: ConversationRecord[],
  source: WrappedAppSource
): AdvancedConversationInsights {
  return {
    criticalGap: analyzeCriticalGap(conversations),
    rhythmAcceleration: analyzeRhythmAcceleration(conversations),
    formalityShift: analyzeFormalityShift(conversations),
    temporalSync: analyzeTemporalSync(conversations),
    lengthMirroring: analyzeLengthMirroring(conversations),
    questionReciprocity: analyzeQuestionReciprocity(conversations),
    initiativeRatio: analyzeInitiativeRatio(conversations),
    lexicalRichness: analyzeLexicalRichness(conversations),
    emojiDynamics: analyzeEmojiDynamics(conversations),
    earlyHumor: analyzeEarlyHumor(conversations),
    message3Quality: analyzeMessage3Quality(conversations),
    conversationShapes: analyzeConversationShapes(conversations),
    inclusivePronouns: analyzeInclusivePronouns(conversations),
    learningCurve: analyzeLearningCurve(conversations),
    simultaneity: analyzeSimultaneity(conversations),
    dayOfWeekConvos: analyzeDayOfWeekConvos(conversations),
    gifDisengagement: analyzeGifDisengagement(conversations),
    matchToMessageWindow: analyzeMatchToMessageWindow(conversations),
    shortMessageKill: analyzeShortMessageKill(conversations),
    responseTimeAsymmetry: analyzeResponseTimeAsymmetry(conversations),
  };
}
