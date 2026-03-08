import type { ParsedData, RawSwipe, RawMatch, ConversationRecord, RawMessage } from "./wrappedParser";

// ── Demo data: realistic Tinder profile (~12 months, calibrated from real exports) ──
//
// Inspired by real user ratios:
// - Right swipe rate: ~40% (selective)
// - Match rate on likes: ~3% (realistic for male users)
// - Ghost rate: ~60%
// - 12 months of activity

// ── Deterministic pseudo-random (seeded, no Math.random) ────────

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const rng = seededRng(42);

// ── Weighted random helpers ──────────────────────────────────────

function weightedPick(weights: number[], rand: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let threshold = rand * total;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return i;
  }
  return weights.length - 1;
}

// Realistic 24h activity distribution (peak 20-21h, lunch bump, dead at night)
const HOUR_WEIGHTS = [
  3, 2, 1, 1, 1, 2,     // 0-5h  (night, very low)
  3, 5, 7, 8, 8, 9,     // 6-11h (morning, gradual rise)
  12, 10, 9, 8, 9, 10,  // 12-17h (lunch peak, afternoon)
  14, 16, 18, 20, 17, 13, // 18-23h (evening peak)
];

// Day-of-week weights (0=Sun, 1=Mon, ..., 6=Sat) — more swipes on weekends
const DOW_WEIGHTS = [130, 85, 80, 90, 95, 75, 140]; // Sun Mon Tue Wed Thu Fri Sat

// ── Swipe generator ─────────────────────────────────────────────

const MONTHLY_ACTIVITY = [
  // month offset, swipes, rightPct
  { offset: 0,  swipes: 620, rightPct: 45 },  // Jan 2025 — New Year boost
  { offset: 1,  swipes: 540, rightPct: 42 },
  { offset: 2,  swipes: 480, rightPct: 40 },
  { offset: 3,  swipes: 350, rightPct: 38 },
  { offset: 4,  swipes: 310, rightPct: 36 },
  { offset: 5,  swipes: 280, rightPct: 35 },  // Jun — summer slowdown
  { offset: 6,  swipes: 200, rightPct: 33 },  // Jul — vacation
  { offset: 7,  swipes: 180, rightPct: 32 },  // Aug — low
  { offset: 8,  swipes: 420, rightPct: 40 },  // Sep — rentrée
  { offset: 9,  swipes: 500, rightPct: 42 },
  { offset: 10, swipes: 380, rightPct: 39 },
  { offset: 11, swipes: 260, rightPct: 35 },  // Dec — holidays slow
];

const allSwipes: RawSwipe[] = [];
const allMatches: RawMatch[] = [];

// Precompute DOW-weighted day picker for each month
function pickDayWeighted(year: number, monthOffset: number): number {
  const daysInMonth = new Date(year, monthOffset + 1, 0).getDate();
  // Build weights for each day based on its DOW
  const dayWeights: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, monthOffset, d).getDay();
    dayWeights.push(DOW_WEIGHTS[dow]);
  }
  return weightedPick(dayWeights, rng()) + 1; // 1-indexed day
}

for (const month of MONTHLY_ACTIVITY) {
  const rightCount = Math.round(month.swipes * month.rightPct / 100);
  const matchCount = Math.max(1, Math.round(rightCount * 0.03)); // ~3% match rate

  // Spread swipes across the month with realistic hour + DOW distributions
  for (let i = 0; i < month.swipes; i++) {
    const day = pickDayWeighted(2025, month.offset);
    const hour = weightedPick(HOUR_WEIGHTS, rng());
    const minute = Math.floor(rng() * 60);
    allSwipes.push({
      timestamp: new Date(2025, month.offset, day, hour, minute),
      direction: i < rightCount ? "like" : "pass",
    });
  }

  // Generate matches (also with realistic timing)
  for (let i = 0; i < matchCount; i++) {
    const day = pickDayWeighted(2025, month.offset);
    const hour = weightedPick(HOUR_WEIGHTS, rng());
    const isGhost = rng() < 0.60; // 60% ghost rate
    const msgCount = isGhost ? 0 : Math.floor(rng() * 25) + 2;
    const matchDate = new Date(2025, month.offset, day, hour);
    const firstMsgDate = new Date(matchDate);
    firstMsgDate.setHours(firstMsgDate.getHours() + Math.floor(rng() * 12) + 1);

    allMatches.push({
      timestamp: matchDate,
      messagesCount: msgCount,
      userInitiated: rng() > 0.45,
      ...(msgCount > 0 ? { firstMessageDate: firstMsgDate } : {}),
      ...(rng() < 0.25 && msgCount > 0 ? {
        unmatchDate: new Date(matchDate.getTime() + (Math.floor(rng() * 14) + 1) * 86400000)
      } : {}),
    });
  }
}

// ── Conversation generator ──────────────────────────────────────

const OPENERS = [
  "Salut ! Ton profil m'a interpellé",
  "Hey, comment ça va ?",
  "Hello ! Tu fais quoi dans la vie ?",
  "Salut, sympa ta dernière photo",
  "Coucou, tu connais un bon resto dans le coin ?",
  "Hey ! On a matché, c'est cool",
  "Salut, tu as l'air sympa",
  "Hello, belle soirée pour matcher non ?",
];

const REPLIES = [
  "Merci ! Et toi ?",
  "Ça va bien, toi ?",
  "Ahah sympa comme approche",
  "Oui je suis dans le marketing",
  "Haha, c'est gentil",
  "Tu fais quoi ce weekend ?",
  "Tu habites dans quel coin ?",
  "Je suis plutôt team apéro",
  "Oui j'adore voyager aussi",
  "Cool ! On pourrait se voir ?",
  "Mdrrr",
  "Ah ouais ?",
  "Intéressant, raconte",
  "C'est noté !",
  "Trop bien",
  "Haha j'avoue",
  "Grave",
  "Tu connais ce bar ?",
  "Non je connais pas, c'est où ?",
  "On se dit quoi alors ?",
];

const conversations: ConversationRecord[] = [];

// Only generate convos for non-ghosted matches
const convoMatches = allMatches.filter(m => m.messagesCount > 0);

for (const match of convoMatches) {
  const msgCount = match.messagesCount;
  const messages: RawMessage[] = [];
  const startDate = match.firstMessageDate || new Date(match.timestamp.getTime() + 3600000);
  let currentDate = new Date(startDate);

  for (let i = 0; i < msgCount; i++) {
    const isSent = i === 0 ? match.userInitiated : rng() > 0.45;
    const bodyPool = i === 0 && isSent ? OPENERS : REPLIES;
    const body = bodyPool[Math.floor(rng() * bodyPool.length)];

    messages.push({
      timestamp: new Date(currentDate),
      direction: isSent ? "sent" : "received",
      body,
      type: rng() < 0.05 ? "gif" : "message",
    });

    // Gap between messages: 5min to 8h
    currentDate = new Date(currentDate.getTime() + (Math.floor(rng() * 480) + 5) * 60000);
  }

  conversations.push({
    matchTimestamp: match.timestamp,
    messages,
    firstMessageDate: messages[0]?.timestamp,
    lastMessageDate: messages[messages.length - 1]?.timestamp,
  });
}

export const DEMO_PARSED_DATA: ParsedData = {
  source: "tinder",
  period: { start: new Date("2025-01-01"), end: new Date("2025-12-31") },
  swipes: allSwipes,
  matches: allMatches,
  conversations,
  createDate: new Date("2024-06-15"),
};
