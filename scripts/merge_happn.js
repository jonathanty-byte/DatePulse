#!/usr/bin/env node
/**
 * merge_happn.js — Merge Happn RGPD export (multi-folder JSONs) into a single uploadable file.
 *
 * Usage: node scripts/merge_happn.js <path-to-all-data> [output.json]
 *
 * The Happn RGPD export contains ~20 folders, each with a single UUID-named JSON file.
 * This script reads them all and produces one merged JSON that wrappedParser can handle.
 */

const fs = require("fs");
const path = require("path");

const allDataDir = process.argv[2];
const outputPath = process.argv[3] || "happn_export.json";

if (!allDataDir) {
  console.error("Usage: node scripts/merge_happn.js <path-to-all-data> [output.json]");
  console.error("  Example: node scripts/merge_happn.js Personal/Happn/Active_Account/all-data happn_export.json");
  process.exit(1);
}

if (!fs.existsSync(allDataDir)) {
  console.error(`Error: directory not found: ${allDataDir}`);
  process.exit(1);
}

/**
 * Read the first JSON file inside a subfolder.
 * Returns parsed JSON or null if folder doesn't exist / is empty.
 */
function readSubfolder(folderName) {
  const dir = path.join(allDataDir, folderName);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  const content = fs.readFileSync(path.join(dir, files[0]), "utf-8");
  return JSON.parse(content);
}

// ── Read all subfolders ──────────────────────────────────────────

const relationshipsRaw = readSubfolder("relationships");
const chatsRaw = readSubfolder("chats");
const charmsRaw = readSubfolder("charms");
const ordersRaw = readSubfolder("orders");
const boostRaw = readSubfolder("boost");
const usersRaw = readSubfolder("users");
const crossingsRaw = readSubfolder("crossings");

// ── Build merged output ──────────────────────────────────────────

const merged = {
  __happn: true,
  relationships: relationshipsRaw?.relationships || [],
  crossings: crossingsRaw?.crossings || [],
  chats: {},
  charms: charmsRaw?.charms || [],
  orders: {
    orders: ordersRaw?.orders || [],
    subscriptions: ordersRaw?.subscriptions || [],
  },
  boost: {
    finished_boost: boostRaw?.finished_boost || [],
  },
  users: {
    profile: usersRaw?.profile || {},
  },
};

// Chats: the raw file is { "contactId": [{date, body, user_id, contact_id}], ... }
// Keep the structure as-is (keyed by contact ID)
if (chatsRaw && typeof chatsRaw === "object") {
  merged.chats = chatsRaw;
}

// ── Stats ────────────────────────────────────────────────────────

const stats = {
  relationships: merged.relationships.length,
  likes: merged.relationships.filter((r) => r.status_a_b === 1).length,
  passes: merged.relationships.filter((r) => r.status_a_b === 2).length,
  matches: merged.relationships.filter((r) => r.status_a_b === 3).length,
  conversations: Object.keys(merged.chats).length,
  messages: Object.values(merged.chats).reduce(
    (sum, msgs) => sum + (Array.isArray(msgs) ? msgs.length : 0),
    0
  ),
  charms: merged.charms.length,
  boosts: merged.boost.finished_boost.length,
  orders: merged.orders.orders.length,
};

console.log("Happn RGPD merge complete:");
console.log(`  Relationships: ${stats.relationships} (${stats.likes} likes, ${stats.passes} passes, ${stats.matches} matches)`);
console.log(`  Conversations: ${stats.conversations} (${stats.messages} messages)`);
console.log(`  Charms: ${stats.charms}`);
console.log(`  Boosts: ${stats.boosts}`);
console.log(`  Orders: ${stats.orders}`);

// ── Write output ─────────────────────────────────────────────────

fs.writeFileSync(outputPath, JSON.stringify(merged), "utf-8");
console.log(`\nOutput written to: ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)} MB)`);
