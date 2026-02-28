// ── Types ───────────────────────────────────────────────────────

export type WrappedAppSource = "tinder" | "bumble" | "hinge";

export interface RawSwipe {
  timestamp: Date;
  direction: "like" | "pass" | "superlike";
}

export interface RawMatch {
  timestamp: Date;
  messagesCount: number;
  userInitiated: boolean;
  lastMessageDate?: Date;
  firstMessageDate?: Date;
  hasComment?: boolean;
  unmatchDate?: Date;
}

export interface ParsedData {
  source: WrappedAppSource;
  period: { start: Date; end: Date };
  swipes: RawSwipe[];
  matches: RawMatch[];
  appOpens?: number;
  /** true when export only has daily totals (no per-swipe timestamps) */
  dailyOnly?: boolean;
  /** Message timestamps — used as activity proxy when dailyOnly is true */
  messageTimestamps?: Date[];
  profile?: {
    bio?: string;
    photoCount?: number;
  };
  purchases?: {
    subscription?: { productType: string; createDate: Date; expireDate?: Date };
    consumables?: { count: number; types: string[] };
    /** Hinge: exact total EUR from subscriptions.json */
    _hingeTotalEur?: number;
  };
  /** Daily message received counts {date: count} — Format B only */
  messagesReceived?: Record<string, number>;
  /** Account creation date */
  createDate?: Date;
  /** Raw active_time from Tinder export (format varies) */
  activeTime?: number | string;
  /** Hinge we_met feedback entries */
  weMet?: { didMeet: string; wasMyType?: boolean; timestamp: Date }[];
  /** Hinge subscription periods with price */
  subscriptionPeriods?: { start: Date; end: Date; price: number; currency: string }[];
  /** Comment stats for like→match conversion analysis (Hinge) */
  commentStats?: { commented: number; commentedMatched: number; plain: number; plainMatched: number };
}

// ── Main entry ──────────────────────────────────────────────────

/** Parse an uploaded RGPD data file. Supports .json and .zip (Tinder export format). */
export async function parseUploadedFile(file: File): Promise<ParsedData> {
  return parseUploadedFiles([file]);
}

/** Parse one or multiple uploaded RGPD files. Multi-file is used for Hinge exports
 *  (matches.json + subscriptions.json + user.json). */
export async function parseUploadedFiles(files: File[]): Promise<ParsedData> {
  if (files.length === 0) {
    throw new Error("Aucun fichier fourni.");
  }

  // Collect all JSON contents by filename
  const jsonByName: Record<string, unknown> = {};
  let zipFile: File | null = null;

  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".zip")) {
      zipFile = file;
    } else if (name.endsWith(".json")) {
      const text = await file.text();
      jsonByName[name] = JSON.parse(text);
    } else if (files.length === 1) {
      throw new Error(
        "Format non supporte. Utilise le fichier .json ou .zip de ton export RGPD."
      );
    }
    // Skip unsupported files in multi-file mode
  }

  // If we have a matches.json array → Hinge multi-file export
  if (jsonByName["matches.json"] && Array.isArray(jsonByName["matches.json"])) {
    return parseHingeExport(
      jsonByName["matches.json"] as unknown[],
      jsonByName["subscriptions.json"] as unknown[] | undefined,
      jsonByName["user.json"] as Record<string, unknown> | undefined,
    );
  }

  // Single JSON file (any name)
  const jsonEntries = Object.values(jsonByName);
  if (jsonEntries.length > 0) {
    const json = jsonEntries[0];
    return parseJsonData(json);
  }

  // ZIP fallback
  if (zipFile) {
    return parseZipFile(zipFile);
  }

  throw new Error(
    "Format non supporte. Utilise le fichier .json ou .zip de ton export RGPD."
  );
}

// ── JSON parsing ────────────────────────────────────────────────

function parseJsonData(json: unknown): ParsedData {
  // Hinge matches.json is an array at root level
  if (Array.isArray(json)) {
    return parseHingeExport(json);
  }

  const obj = json as Record<string, unknown>;
  const source = detectSource(obj);

  switch (source) {
    case "tinder":
      return parseTinderJson(obj);
    case "bumble":
      return parseBumbleJson(obj);
    case "hinge":
      return parseHingeExport([], undefined, obj);
  }
}

function detectSource(json: Record<string, unknown>): WrappedAppSource {
  // Tinder RGPD exports have specific keys
  if (
    json["Usage - Swipes likes"] ||
    json["Usage - Swipes passes"] ||
    json["Usage - Matches"] ||
    json["Swipes"] ||
    json["Usage"]
  ) {
    return "tinder";
  }
  // Bumble has different structure
  if (json["user"] && json["conversations"]) {
    return "bumble";
  }
  // Hinge
  if (json["user"] && json["matches"]) {
    return "hinge";
  }
  // Default to Tinder (most common)
  return "tinder";
}

// ── Tinder parser (primary) ─────────────────────────────────────

function parseTinderJson(json: Record<string, unknown>): ParsedData {
  const swipes: RawSwipe[] = [];
  const matches: RawMatch[] = [];
  let appOpens: number | undefined;
  let bio: string | undefined;
  let photoCount: number | undefined;
  let formatB = false;
  const messageTimestamps: Date[] = [];
  let purchases: ParsedData["purchases"] | undefined;
  let messagesReceived: Record<string, number> | undefined;
  let createDate: Date | undefined;
  let activeTime: number | string | undefined;

  try {
    // Tinder RGPD format varies between exports:
    // Format A (older): "Usage - Swipes likes" = array of date strings
    // Format B (2024+): "Usage" = { "swipes_likes": {"2025-04-15": 201, ...}, ... }
    //   where keys are dates and values are counts per day
    const usage = (json["Usage"] as Record<string, unknown>) ?? json;

    // Detect format: if usage has snake_case keys with dict values, it's Format B
    formatB =
      typeof usage === "object" &&
      usage !== null &&
      ("swipes_likes" in usage || "swipes_passes" in usage || "app_opens" in usage);

    if (formatB) {
      // Format B: { "swipes_likes": {"2025-04-15": 201}, ... }
      // Each key is a date, each value is a count — expand into individual swipes
      expandDailyCountsToSwipes(
        usage["swipes_likes"] as Record<string, number> | undefined,
        "like",
        swipes
      );
      expandDailyCountsToSwipes(
        usage["swipes_passes"] as Record<string, number> | undefined,
        "pass",
        swipes
      );
      expandDailyCountsToSwipes(
        usage["superlikes"] as Record<string, number> | undefined,
        "superlike",
        swipes
      );

      // Matches: { "2025-04-15": 1, "2025-04-16": 0, ... }
      const matchCounts = usage["matches"] as Record<string, number> | undefined;
      if (matchCounts && typeof matchCounts === "object") {
        for (const [dateStr, count] of Object.entries(matchCounts)) {
          if (typeof count !== "number" || count <= 0) continue;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) continue;
          for (let i = 0; i < count; i++) {
            matches.push({
              timestamp: d,
              messagesCount: 0,
              userInitiated: false,
            });
          }
        }
      }

      // App opens: sum all daily counts
      const openCounts = usage["app_opens"] as Record<string, number> | undefined;
      if (openCounts && typeof openCounts === "object") {
        appOpens = Object.values(openCounts).reduce(
          (sum, v) => sum + (typeof v === "number" ? v : 0),
          0
        );
      }
    } else {
      // Format A: "Usage - Swipes likes" = array of date strings
      const likeDates = extractDateArray(
        usage["Swipes likes"] ??
          usage["Usage - Swipes likes"] ??
          json["Usage - Swipes likes"]
      );
      for (const ts of likeDates) {
        swipes.push({ timestamp: ts, direction: "like" });
      }

      const passDates = extractDateArray(
        usage["Swipes passes"] ??
          usage["Usage - Swipes passes"] ??
          json["Usage - Swipes passes"]
      );
      for (const ts of passDates) {
        swipes.push({ timestamp: ts, direction: "pass" });
      }

      const superlikeDates = extractDateArray(
        usage["Superlikes"] ??
          usage["Usage - Superlikes"] ??
          json["Usage - Superlikes"]
      );
      for (const ts of superlikeDates) {
        swipes.push({ timestamp: ts, direction: "superlike" });
      }

      // Matches from array or object
      const matchData =
        json["Usage - Matches"] ?? usage["Matches"] ?? json["Matches"];
      if (Array.isArray(matchData)) {
        for (const m of matchData) {
          try {
            const ts = parseDate(m);
            if (ts)
              matches.push({
                timestamp: ts,
                messagesCount: 0,
                userInitiated: false,
              });
          } catch {
            /* skip invalid */
          }
        }
      } else if (typeof matchData === "object" && matchData !== null) {
        for (const [, value] of Object.entries(
          matchData as Record<string, unknown>
        )) {
          try {
            const ts = parseDate(value);
            if (ts)
              matches.push({
                timestamp: ts,
                messagesCount: 0,
                userInitiated: false,
              });
          } catch {
            /* skip */
          }
        }
      }

      // App opens (Format A)
      const opens =
        json["Usage - App Opens"] ?? usage["App Opens"] ?? json["App Opens"];
      if (typeof opens === "number") {
        appOpens = opens;
      } else if (typeof opens === "object" && opens !== null) {
        const count = (opens as Record<string, unknown>)["count"];
        if (typeof count === "number") appOpens = count;
      }
    }

    // Parse messages to enrich match data (both formats)
    const messages =
      json["Messages"] ?? json["Usage - Messages"] ?? usage["Messages"];
    if (
      Array.isArray(messages) ||
      (typeof messages === "object" && messages !== null)
    ) {
      enrichMatchesWithMessages(matches, messages as Record<string, unknown>);
    }

    // Extract message timestamps for hourly activity proxy (Format B)
    if (formatB && Array.isArray(messages)) {
      for (const conv of messages) {
        if (typeof conv !== "object" || conv === null) continue;
        const msgs = (conv as Record<string, unknown>)["messages"];
        if (!Array.isArray(msgs)) continue;
        for (const m of msgs) {
          const ts = parseDate((m as Record<string, unknown>)["sent_date"]);
          if (ts) messageTimestamps.push(ts);
        }
      }
    }

    // Profile info (both formats)
    const profile = json["User"] ?? json["Profile"] ?? json["profile"];
    if (typeof profile === "object" && profile !== null) {
      const p = profile as Record<string, unknown>;
      bio = typeof p["bio"] === "string" ? p["bio"] : undefined;
      const photos = json["Photos"];
      if (Array.isArray(photos)) photoCount = photos.length;
      else {
        const pPhotos = p["photos"];
        if (Array.isArray(pPhotos)) photoCount = pPhotos.length;
      }
    }

    // Purchases
    try {
      const purchasesRaw = json["Purchases"] as Record<string, unknown> | undefined;
      if (purchasesRaw) {
        const subRaw = purchasesRaw["subscription"] as Record<string, unknown>[] | undefined;
        const consRaw = purchasesRaw["consumable"] as Record<string, unknown>[] | undefined;
        if (subRaw || consRaw) {
          purchases = {};
          if (Array.isArray(subRaw) && subRaw.length > 0) {
            const first = subRaw[0];
            const cd = parseDate(first["create_date"]);
            if (cd) {
              purchases.subscription = {
                productType: String(first["product_type"] ?? "unknown"),
                createDate: cd,
                expireDate: parseDate(first["expire_date"]) ?? undefined,
              };
            }
          }
          if (Array.isArray(consRaw) && consRaw.length > 0) {
            const types = new Set<string>();
            for (const c of consRaw) {
              if (c["product_type"]) types.add(String(c["product_type"]));
            }
            purchases.consumables = { count: consRaw.length, types: [...types] };
          }
        }
      }
    } catch { /* defensive */ }

    // messages_received (Format B)
    if (formatB && usage["messages_received"]) {
      const mr = usage["messages_received"];
      if (typeof mr === "object" && mr !== null) {
        messagesReceived = mr as Record<string, number>;
      }
    }

    // User.create_date + active_time
    const userObj = json["User"] as Record<string, unknown> | undefined;
    if (userObj) {
      const cd = parseDate(userObj["create_date"]);
      if (cd) createDate = cd;
      if (userObj["active_time"] !== undefined) {
        activeTime = userObj["active_time"] as number | string;
      }
    }
  } catch {
    /* defensive: if anything fails, return what we have */
  }

  // Sort swipes by date
  swipes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  matches.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Compute period
  const allDates = [
    ...swipes.map((s) => s.timestamp),
    ...matches.map((m) => m.timestamp),
  ];
  const period = computePeriod(allDates);

  return {
    source: "tinder",
    period,
    swipes,
    matches,
    appOpens,
    dailyOnly: formatB,
    messageTimestamps: formatB && messageTimestamps.length > 0 ? messageTimestamps : undefined,
    profile: bio || photoCount ? { bio, photoCount } : undefined,
    purchases,
    messagesReceived,
    createDate,
    activeTime,
  };
}

// ── Bumble parser (stub) ────────────────────────────────────────

function parseBumbleJson(json: Record<string, unknown>): ParsedData {
  // Basic stub - Bumble RGPD format not yet validated
  const swipes: RawSwipe[] = [];
  const matches: RawMatch[] = [];

  try {
    const conversations = json["conversations"];
    if (Array.isArray(conversations)) {
      for (const conv of conversations) {
        try {
          const c = conv as Record<string, unknown>;
          const ts = parseDate(c["created"] ?? c["timestamp"]);
          if (ts) {
            const msgs = Array.isArray(c["messages"])
              ? c["messages"].length
              : 0;
            matches.push({
              timestamp: ts,
              messagesCount: msgs,
              userInitiated: false,
            });
          }
        } catch {
          /* skip */
        }
      }
    }
  } catch {
    /* defensive */
  }

  const allDates = matches.map((m) => m.timestamp);

  return {
    source: "bumble",
    period: computePeriod(allDates),
    swipes,
    matches,
  };
}

// ── Hinge parser (full — validated against real RGPD export) ────
//
// Hinge RGPD export is a directory with separate files:
//   matches.json     — array of { match?, like?, chats?, block?, we_met? }
//   subscriptions.json — array of { price, currency, purchase_date, start_date, end_date, ... }
//   user.json        — { identity, preferences, profile: { first_name, age, ... } }
//
// matches.json structure:
//   Entry with "like" key = outgoing like (right swipe). Hinge does NOT record passes.
//   Entry with "match" key = mutual match.
//   Entry with "chats" array = conversation messages { body, timestamp }.
//   Entry with "block" + block_type "remove" = unmatched/removed.
//   Entry with "we_met" = IRL meeting feedback.

function parseHingeExport(
  matchesArray: unknown[],
  subscriptionsArray?: unknown[],
  userJson?: Record<string, unknown>,
): ParsedData {
  const swipes: RawSwipe[] = [];
  const matches: RawMatch[] = [];
  const messageTimestamps: Date[] = [];
  const weMetData: ParsedData["weMet"] = [];
  // Comment stats: track likes with/without comment and whether they matched
  let commentedLikes = 0;
  let commentedMatched = 0;
  let plainLikes = 0;
  let plainMatched = 0;

  try {
    for (const entry of matchesArray) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;

      // ── Outgoing like = right swipe ──
      const likeArr = e["like"];
      let hasComment = false;
      if (Array.isArray(likeArr) && likeArr.length > 0) {
        const likeObj = likeArr[0] as Record<string, unknown>;
        const ts = parseDate(likeObj["timestamp"]);
        if (ts) {
          swipes.push({ timestamp: ts, direction: "like" });
        }
        // Detect comment on the like (Hinge nested structure: like[0].like[].comment)
        const innerLikes = likeObj["like"] as Record<string, unknown>[] | undefined;
        hasComment = Array.isArray(innerLikes) && innerLikes.some(l => l["comment"]);
        // Track comment stats
        if (hasComment) commentedLikes++;
        else plainLikes++;
      }

      // ── Block without like/match ≈ pass (incomplete — Hinge only logs removes) ──
      if (e["block"] && !e["like"] && !e["match"]) {
        const blockArr = e["block"] as unknown[];
        if (Array.isArray(blockArr) && blockArr.length > 0) {
          const blockObj = blockArr[0] as Record<string, unknown>;
          const ts = parseDate(blockObj["timestamp"]);
          if (ts) {
            swipes.push({ timestamp: ts, direction: "pass" });
          }
        }
      }

      // ── Match ──
      const matchArr = e["match"];
      if (Array.isArray(matchArr) && matchArr.length > 0) {
        const matchObj = matchArr[0] as Record<string, unknown>;
        const ts = parseDate(matchObj["timestamp"]);
        if (ts) {
          const chats = Array.isArray(e["chats"]) ? (e["chats"] as Record<string, unknown>[]) : [];
          const msgCount = chats.length;

          // Collect message timestamps for hourly activity analysis
          for (const msg of chats) {
            const msgTs = parseDate(msg["timestamp"]);
            if (msgTs) messageTimestamps.push(msgTs);
          }

          // Find first and last message dates
          let firstMessageDate: Date | undefined;
          let lastMessageDate: Date | undefined;
          if (chats.length > 0) {
            const msgDates = chats
              .map((c) => parseDate(c["timestamp"]))
              .filter((d): d is Date => d !== null);
            if (msgDates.length > 0) {
              msgDates.sort((a, b) => a.getTime() - b.getTime());
              firstMessageDate = msgDates[0];
              lastMessageDate = msgDates[msgDates.length - 1];
            }
          }

          // Detect unmatch: block + match in same entry → unmatch (not a pass)
          let unmatchDate: Date | undefined;
          if (e["block"]) {
            const blockArr = e["block"] as unknown[];
            if (Array.isArray(blockArr) && blockArr.length > 0) {
              const blockObj = blockArr[0] as Record<string, unknown>;
              unmatchDate = parseDate(blockObj["timestamp"]) ?? undefined;
            }
          }

          // Track comment→match conversion
          if (hasComment) commentedMatched++;
          else if (likeArr) plainMatched++; // only count if this entry had a like

          matches.push({
            timestamp: ts,
            messagesCount: msgCount,
            userInitiated: false,
            firstMessageDate,
            lastMessageDate,
            hasComment: likeArr ? hasComment : undefined,
            unmatchDate,
          });
        }
      }

      // ── We met ──
      if (e["we_met"]) {
        const weMetArr = e["we_met"] as Record<string, unknown>[];
        if (Array.isArray(weMetArr)) {
          for (const w of weMetArr) {
            const wTs = parseDate(w["timestamp"]);
            if (wTs) {
              weMetData.push({
                didMeet: (w["did_meet_subject"] as string) ?? "Not yet",
                wasMyType: typeof w["was_my_type"] === "boolean" ? w["was_my_type"] : undefined,
                timestamp: wTs,
              });
            }
          }
        }
      }
    }
  } catch {
    /* defensive */
  }

  // Sort
  swipes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  matches.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const allDates = [
    ...swipes.map((s) => s.timestamp),
    ...matches.map((m) => m.timestamp),
  ];
  const period = computePeriod(allDates);

  // ── Subscriptions (from subscriptions.json) ──
  let purchases: ParsedData["purchases"] | undefined;
  let subscriptionPeriods: ParsedData["subscriptionPeriods"] | undefined;
  if (Array.isArray(subscriptionsArray) && subscriptionsArray.length > 0) {
    try {
      let totalSpent = 0;
      let firstSub: { productType: string; createDate: Date; expireDate?: Date } | undefined;
      subscriptionPeriods = [];

      for (const sub of subscriptionsArray) {
        const s = sub as Record<string, unknown>;
        const price = Number(s["price"]);
        if (!isNaN(price)) totalSpent += price;

        const startDate = parseDate(s["start_date"] ?? s["purchase_date"]);
        const endDate = parseDate(s["end_date"]);
        if (startDate && endDate && !isNaN(price)) {
          subscriptionPeriods.push({
            start: startDate,
            end: endDate,
            price,
            currency: String(s["currency"] ?? "EUR"),
          });
        }

        if (!firstSub) {
          const cd = parseDate(s["purchase_date"] ?? s["start_date"]);
          if (cd) {
            firstSub = {
              productType: String(s["subscription_duration"] ?? "hinge_premium"),
              createDate: cd,
              expireDate: parseDate(s["end_date"]) ?? undefined,
            };
          }
        }
      }

      if (totalSpent > 0 || firstSub) {
        purchases = {};
        if (firstSub) purchases.subscription = firstSub;
        purchases._hingeTotalEur = totalSpent;
      }
      if (subscriptionPeriods.length === 0) subscriptionPeriods = undefined;
    } catch { /* defensive */ }
  }

  // ── Profile (from user.json) ──
  let bio: string | undefined;
  let photoCount: number | undefined;
  let createDate: Date | undefined;

  if (userJson) {
    try {
      const profile = userJson["profile"] as Record<string, unknown> | undefined;
      if (profile) {
        // Hinge doesn't have a single bio field — prompts serve as bio
        const firstName = profile["first_name"];
        if (typeof firstName === "string") bio = firstName; // placeholder
      }
      // Account creation: use first subscription or first activity date
      const identity = userJson["identity"] as Record<string, unknown> | undefined;
      if (identity) {
        createDate = parseDate(identity["created"] ?? identity["signup_date"]) ?? undefined;
      }
    } catch { /* defensive */ }
  }

  // Build comment stats if any likes were tracked
  const hasCommentData = commentedLikes > 0 || plainLikes > 0;
  const commentStats: ParsedData["commentStats"] = hasCommentData
    ? { commented: commentedLikes, commentedMatched, plain: plainLikes, plainMatched }
    : undefined;

  return {
    source: "hinge",
    period,
    swipes,
    matches,
    messageTimestamps: messageTimestamps.length > 0 ? messageTimestamps : undefined,
    profile: bio || photoCount ? { bio, photoCount } : undefined,
    purchases,
    createDate,
    weMet: weMetData.length > 0 ? weMetData : undefined,
    subscriptionPeriods,
    commentStats,
  };
}

// ── ZIP parsing ─────────────────────────────────────────────────

async function parseZipFile(file: File): Promise<ParsedData> {
  // Use simplified approach: look for JSON content in the zip binary
  // Tinder exports contain data.json as the main payload
  // For production, a proper zip library (e.g. JSZip) should be used
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

  // Try to find JSON content in the zip
  const jsonStart = text.indexOf('{"');
  if (jsonStart === -1) {
    throw new Error(
      "Impossible de lire le fichier ZIP. Extrais le .json manuellement et uploade-le."
    );
  }

  // Find matching closing brace
  let depth = 0;
  let jsonEnd = jsonStart;
  for (let i = jsonStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }

  try {
    const json = JSON.parse(text.slice(jsonStart, jsonEnd));
    return parseJsonData(json);
  } catch {
    throw new Error(
      "Impossible de parser le JSON dans le ZIP. Extrais le fichier .json et uploade-le directement."
    );
  }
}

// ── Format B helper: expand daily counts to individual swipes ───

export function expandDailyCountsToSwipes(
  dailyCounts: Record<string, number> | undefined,
  direction: "like" | "pass" | "superlike",
  out: RawSwipe[]
): void {
  if (!dailyCounts || typeof dailyCounts !== "object") return;
  for (const [dateStr, count] of Object.entries(dailyCounts)) {
    if (typeof count !== "number" || count <= 0) continue;
    const d = new Date(dateStr + "T12:00:00"); // noon — no fake hourly distribution
    if (isNaN(d.getTime())) continue;
    for (let i = 0; i < count; i++) {
      out.push({ timestamp: d, direction });
    }
  }
}

// ── Utility functions ───────────────────────────────────────────

function extractDateArray(data: unknown): Date[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    const dates: Date[] = [];
    for (const item of data) {
      const d = parseDate(item);
      if (d) dates.push(d);
    }
    return dates;
  }

  // Could be an object with date keys/values
  if (typeof data === "object" && data !== null) {
    const dates: Date[] = [];
    for (const value of Object.values(data as Record<string, unknown>)) {
      const d = parseDate(value);
      if (d) dates.push(d);
    }
    return dates;
  }

  return [];
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "number") {
    // Unix timestamp (seconds or milliseconds)
    const ts = value > 1e12 ? value : value * 1000;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  // Could be an object with a date field
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return parseDate(
      obj["date"] ?? obj["timestamp"] ?? obj["created_date"] ?? obj["created"]
    );
  }

  return null;
}

export function enrichMatchesWithMessages(
  matches: RawMatch[],
  messages: Record<string, unknown>
): void {
  // Try to associate message counts with matches
  // Tinder format varies, so this is best-effort
  try {
    if (Array.isArray(messages)) {
      // Array of conversation objects: { match_id, messages: [{to, from, message, sent_date}] }
      for (const conv of messages) {
        if (typeof conv !== "object" || conv === null) continue;
        const c = conv as Record<string, unknown>;
        const msgs = Array.isArray(c["messages"]) ? c["messages"] : [];
        const count = msgs.length;

        // Try to find conversation date: match_date, created, or first message sent_date
        let convDate = parseDate(c["match_date"] ?? c["created"]);
        if (!convDate && msgs.length > 0) {
          const first = msgs[0] as Record<string, unknown>;
          convDate = parseDate(first?.["sent_date"] ?? first?.["timestamp"]);
        }

        if (convDate && matches.length > 0) {
          const closest = findClosestMatch(matches, convDate);
          if (closest) {
            closest.messagesCount = count;
            // Check if user sent first message
            if (msgs.length > 0) {
              const first = msgs[0] as Record<string, unknown>;
              closest.userInitiated =
                first?.["from"] === "You" ||
                first?.["sender_id"] === "self";
            }
            if (msgs.length > 0) {
              const last = msgs[msgs.length - 1] as Record<string, unknown>;
              const lastDate = parseDate(
                last?.["sent_date"] ?? last?.["timestamp"]
              );
              if (lastDate) closest.lastMessageDate = lastDate;
            }
          }
        }
      }
    }
  } catch {
    /* defensive */
  }
}

export function findClosestMatch(
  matches: RawMatch[],
  targetDate: Date
): RawMatch | null {
  let closest: RawMatch | null = null;
  let minDiff = Infinity;

  for (const m of matches) {
    const diff = Math.abs(m.timestamp.getTime() - targetDate.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = m;
    }
  }

  // Only match if within 24 hours
  return minDiff < 24 * 60 * 60 * 1000 ? closest : null;
}

function computePeriod(dates: Date[]): { start: Date; end: Date } {
  if (dates.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }

  const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
  return { start: sorted[0], end: sorted[sorted.length - 1] };
}
