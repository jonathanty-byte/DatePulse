/**
 * Generate anonymized demoData.ts from real Tinder RGPD export (Format B).
 *
 * Usage: node scripts/generateDemoData.cjs [path/to/data.json]
 * Default: scripts/data.json
 *
 * Anonymization:
 * - All message bodies replaced with generic French dating conversation text
 * - All match IDs replaced with sequential IDs
 * - User bio replaced with generic bio
 * - Geolocation data stripped
 * - No names, emails, phone numbers, photos in output
 *
 * What is KEPT (aggregate stats, patterns):
 * - Daily swipe counts (likes, passes, superlikes)
 * - Daily match counts
 * - App opens count
 * - Message timestamps (real timing patterns)
 * - Message directions (sent/received)
 * - Message types (message, gif, etc.)
 * - Subscription type + dates
 * - Consumable purchase types + counts
 */

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2] || path.join(__dirname, "data.json");
const outputPath = path.join(__dirname, "..", "frontend", "src", "lib", "demoData.ts");

const json = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

// ── Anonymized message templates ─────────────────────────────────
const OPENERS_SENT = [
  "Salut ! Ton profil m'a interpellé",
  "Hey, comment ça va ?",
  "Hello ! Tu fais quoi dans la vie ?",
  "Salut, sympa ta dernière photo",
  "Coucou, tu connais un bon resto dans le coin ?",
  "Hey ! On a matché, c'est cool",
  "Salut, tu as l'air sympa",
  "Hello, belle soirée pour matcher non ?",
  "Ton sourire est contagieux",
  "Hey ! Dis-moi, tu es plutôt montagne ou plage ?",
];

const OPENERS_RECEIVED = [
  "Coucou !",
  "Salut toi",
  "Hello, comment ça va ?",
  "Hey, sympa ton profil",
  "Salut ! Tu fais quoi de beau ?",
  "Cc, tu viens d'où ?",
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
  "Ahah c'est marrant",
  "J'aime bien ta bio",
  "Tu as des frères et sœurs ?",
  "Pas mal comme idée",
  "C'est sympa ça",
  "Oui carrément",
  "Trop drôle",
  "Je te dis demain",
  "D'accord, à bientôt !",
  "On verra bien",
];

// Seeded PRNG for deterministic anonymization
let seed = 42;
function rng() {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Parse Usage (Format B) ───────────────────────────────────────
const usage = json.Usage;

// Swipes: generate one entry per swipe, spread across the day
const swipes = [];
const usageLikes = usage.swipes_likes || {};
const usagePasses = usage.swipes_passes || {};
const usageSuperlikes = usage.superlikes || {};

for (const [dateStr, count] of Object.entries(usageLikes)) {
  if (typeof count !== "number" || count <= 0) continue;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) continue;
  for (let i = 0; i < count; i++) {
    swipes.push({
      timestamp: d.toISOString(),
      direction: "like",
    });
  }
}

for (const [dateStr, count] of Object.entries(usagePasses)) {
  if (typeof count !== "number" || count <= 0) continue;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) continue;
  for (let i = 0; i < count; i++) {
    swipes.push({
      timestamp: d.toISOString(),
      direction: "pass",
    });
  }
}

for (const [dateStr, count] of Object.entries(usageSuperlikes)) {
  if (typeof count !== "number" || count <= 0) continue;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) continue;
  for (let i = 0; i < count; i++) {
    swipes.push({
      timestamp: d.toISOString(),
      direction: "superlike",
    });
  }
}

// Matches from Usage
const matches = [];
const usageMatches = usage.matches || {};
for (const [dateStr, count] of Object.entries(usageMatches)) {
  if (typeof count !== "number" || count <= 0) continue;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) continue;
  for (let i = 0; i < count; i++) {
    matches.push({
      timestamp: d.toISOString(),
      messagesCount: 0,
      userInitiated: false,
    });
  }
}

// App opens
const appOpens = Object.values(usage.app_opens || {}).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);

// ── Parse Messages (anonymize content, keep timing) ──────────────
const conversations = [];
const messageTimestamps = [];

if (Array.isArray(json.Messages)) {
  // Build a match_id → match index map for enrichment
  const matchById = {};
  let matchIdx = 0;

  for (const conv of json.Messages) {
    if (!conv || !Array.isArray(conv.messages)) continue;
    const anonMatchId = `Match ${conversations.length + 1}`;
    const msgs = [];
    let firstMsgDate = null;
    let lastMsgDate = null;
    let msgCountForMatch = 0;
    let userInitiated = false;

    for (let i = 0; i < conv.messages.length; i++) {
      const m = conv.messages[i];
      const sentDate = m.sent_date ? new Date(m.sent_date) : null;
      if (!sentDate || isNaN(sentDate.getTime())) continue;

      const isSent = m.from === "You";
      if (i === 0) userInitiated = isSent;

      // Track timestamps
      messageTimestamps.push(sentDate.toISOString());
      if (!firstMsgDate || sentDate < firstMsgDate) firstMsgDate = sentDate;
      if (!lastMsgDate || sentDate > lastMsgDate) lastMsgDate = sentDate;
      msgCountForMatch++;

      // Anonymize message body
      let anonBody;
      const msgType = m.type || "message";
      if (msgType === "gif") {
        anonBody = "[GIF]";
      } else if (i === 0) {
        anonBody = isSent ? pick(OPENERS_SENT) : pick(OPENERS_RECEIVED);
      } else {
        anonBody = pick(REPLIES);
      }

      msgs.push({
        timestamp: sentDate.toISOString(),
        direction: isSent ? "sent" : "received",
        body: anonBody,
        type: msgType,
      });
    }

    if (msgs.length === 0) continue;

    conversations.push({
      matchTimestamp: firstMsgDate ? firstMsgDate.toISOString() : null,
      matchId: anonMatchId,
      messages: msgs,
      firstMessageDate: firstMsgDate ? firstMsgDate.toISOString() : null,
      lastMessageDate: lastMsgDate ? lastMsgDate.toISOString() : null,
    });

    // Try to enrich corresponding match
    // Find a match on the same day as the first message
    if (firstMsgDate) {
      const matchDay = firstMsgDate.toISOString().slice(0, 10);
      for (let mi = 0; mi < matches.length; mi++) {
        const mDay = matches[mi].timestamp.slice(0, 10);
        if (mDay === matchDay && matches[mi].messagesCount === 0) {
          matches[mi].messagesCount = msgCountForMatch;
          matches[mi].userInitiated = userInitiated;
          matches[mi].firstMessageDate = firstMsgDate.toISOString();
          matches[mi].lastMessageDate = lastMsgDate ? lastMsgDate.toISOString() : undefined;
          matches[mi].matchId = anonMatchId;
          break;
        }
      }
    }
  }
}

// ── Purchases (anonymized — no geo, keep types + dates) ──────────
let purchases = undefined;
if (json.Purchases) {
  purchases = {};
  const subRaw = json.Purchases.subscription;
  if (Array.isArray(subRaw) && subRaw.length > 0) {
    const first = subRaw[0];
    purchases.subscription = {
      productType: first.product_type || "unknown",
      createDate: first.create_date,
      expireDate: first.expire_date || undefined,
    };
  }
  const consRaw = json.Purchases.consumable;
  if (Array.isArray(consRaw) && consRaw.length > 0) {
    const types = [...new Set(consRaw.map(c => c.product_type).filter(Boolean))];
    purchases.consumables = { count: consRaw.length, types };
  }
}

// ── Period ────────────────────────────────────────────────────────
const allDates = Object.keys(usage.app_opens || {}).sort();
const periodStart = allDates[0] || "2025-04-15";
const periodEnd = allDates[allDates.length - 1] || "2026-02-26";
const createDate = json.User?.create_date || periodStart;

// ── Profile (anonymized) ─────────────────────────────────────────
const bioLength = json.User?.bio?.length || 0;
const photoCount = json.User?.user_contents?.photos?.length || json.Photos?.length || 0;

// ── Boost tracking ───────────────────────────────────────────────
let boostTracking = undefined;
if (json.Purchases?.consumable) {
  const boosts = [];
  for (const c of json.Purchases.consumable) {
    const pt = (c.product_type || "").toLowerCase();
    const cd = c.create_date;
    if (pt.includes("boost") && cd) {
      boosts.push({ date: cd });
    }
  }
  if (boosts.length > 0) boostTracking = boosts;
}

// ── Generate TypeScript output ───────────────────────────────────

// Helper: serialize swipes as compact daily totals (expanded at runtime)
function serializeDailySwipes(swipeArr) {
  // Group by date → { likes, passes, superlikes }
  const days = {};
  for (const s of swipeArr) {
    const dateKey = s.timestamp.slice(0, 10); // "2025-04-15"
    if (!days[dateKey]) days[dateKey] = { likes: 0, passes: 0, superlikes: 0 };
    days[dateKey][s.direction === "like" ? "likes" : s.direction === "pass" ? "passes" : "superlikes"]++;
  }
  // Serialize as compact [date, likes, passes, superlikes] tuples
  const entries = Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([date, counts]) =>
    `  ["${date}", ${counts.likes}, ${counts.passes}, ${counts.superlikes}]`
  ).join(",\n");
}

// Helper: serialize matches
function serializeMatches(matchArr) {
  return matchArr.map(m => {
    let line = `  { timestamp: new Date("${m.timestamp}"), messagesCount: ${m.messagesCount}, userInitiated: ${m.userInitiated}`;
    if (m.firstMessageDate) line += `, firstMessageDate: new Date("${m.firstMessageDate}")`;
    if (m.lastMessageDate) line += `, lastMessageDate: new Date("${m.lastMessageDate}")`;
    if (m.matchId) line += `, matchId: "${m.matchId}"`;
    line += " }";
    return line;
  }).join(",\n");
}

// Helper: serialize conversations
function serializeConversations(convArr) {
  return convArr.map(c => {
    const msgsStr = c.messages.map(m => {
      const bodyEscaped = m.body.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      return `      { timestamp: new Date("${m.timestamp}"), direction: "${m.direction}" as const, body: "${bodyEscaped}"${m.type && m.type !== "message" ? `, type: "${m.type}"` : ""} }`;
    }).join(",\n");
    let line = `  {\n    matchTimestamp: new Date("${c.matchTimestamp}")`;
    if (c.matchId) line += `,\n    matchId: "${c.matchId}"`;
    line += `,\n    messages: [\n${msgsStr}\n    ]`;
    if (c.firstMessageDate) line += `,\n    firstMessageDate: new Date("${c.firstMessageDate}")`;
    if (c.lastMessageDate) line += `,\n    lastMessageDate: new Date("${c.lastMessageDate}")`;
    line += "\n  }";
    return line;
  }).join(",\n");
}

const output = `import type { ParsedData, RawSwipe, RawMatch, ConversationRecord, RawMessage } from "./wrappedParser";

// ── Demo data: Real anonymized Tinder RGPD export ──
// Source: CEO's actual data (${allDates.length} days, ${periodStart} to ${periodEnd})
// Anonymization: message bodies replaced, match IDs sequential, no names/geo/photos
// Stats preserved: ${swipes.length} swipes, ${matches.length} matches, ${conversations.length} conversations, ${appOpens} app opens

// Compact daily totals: [date, likes, passes, superlikes]
const dailySwipeData: [string, number, number, number][] = [
${serializeDailySwipes(swipes)}
];

// Expand daily totals into individual swipe records
const allSwipes: RawSwipe[] = [];
for (const [date, likes, passes, superlikes] of dailySwipeData) {
  const d = new Date(date);
  for (let i = 0; i < likes; i++) allSwipes.push({ timestamp: d, direction: "like" });
  for (let i = 0; i < passes; i++) allSwipes.push({ timestamp: d, direction: "pass" });
  for (let i = 0; i < superlikes; i++) allSwipes.push({ timestamp: d, direction: "superlike" });
}

const allMatches: RawMatch[] = [
${serializeMatches(matches)}
];

const conversations: ConversationRecord[] = [
${serializeConversations(conversations)}
];

const messageTimestamps: Date[] = [
${messageTimestamps.map(t => `  new Date("${t}")`).join(",\n")}
];

export const DEMO_PARSED_DATA: ParsedData = {
  source: "tinder",
  period: { start: new Date("${periodStart}"), end: new Date("${periodEnd}") },
  swipes: allSwipes,
  matches: allMatches,
  conversations,
  appOpens: ${appOpens},
  dailyOnly: true,
  messageTimestamps,
  createDate: new Date("${createDate}"),
  profile: {
    bio: "Un profil sympa avec une bio de ${bioLength} caracteres",
    photoCount: ${photoCount || 6},
  },
  ${purchases ? `purchases: {
    ${purchases.subscription ? `subscription: {
      productType: "${purchases.subscription.productType}",
      createDate: new Date("${purchases.subscription.createDate}"),
      ${purchases.subscription.expireDate ? `expireDate: new Date("${purchases.subscription.expireDate}"),` : ""}
    },` : ""}
    ${purchases.consumables ? `consumables: { count: ${purchases.consumables.count}, types: ${JSON.stringify(purchases.consumables.types)} },` : ""}
  },` : ""}
  ${boostTracking ? `boostTracking: [${boostTracking.map(b => `{ date: new Date("${b.date}") }`).join(", ")}],` : ""}
};
`;

fs.writeFileSync(outputPath, output, "utf-8");

// Summary
console.log("demoData.ts generated successfully!");
console.log("   Output:", outputPath);
console.log("   Period:", periodStart, "->", periodEnd, "(" + allDates.length + " days)");
console.log("   Swipes:", swipes.length, "(" + swipes.filter(s=>s.direction==="like").length, "likes,", swipes.filter(s=>s.direction==="pass").length, "passes,", swipes.filter(s=>s.direction==="superlike").length, "superlikes)");
console.log("   Matches:", matches.length, "(" + matches.filter(m=>m.messagesCount>0).length, "with messages)");
console.log("   Conversations:", conversations.length);
console.log("   Messages anonymized:", messageTimestamps.length);
console.log("   App opens:", appOpens);
console.log("   Match rate:", (matches.length / swipes.filter(s=>s.direction==="like").length * 100).toFixed(2) + "%");
console.log("   Subscription:", purchases?.subscription?.productType || "none");
console.log("");
console.log("Review the file before committing -- no PII should be present.");
