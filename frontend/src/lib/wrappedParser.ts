// ── Types ───────────────────────────────────────────────────────

export type WrappedAppSource = "tinder" | "bumble" | "hinge" | "happn";

export interface RawSwipe {
  timestamp: Date;
  direction: "like" | "pass" | "superlike";
}

export interface RawMessage {
  timestamp: Date;
  direction: "sent" | "received";
  body: string;
  type?: string; // "message" | "gif" | "gesture" | "contact_card" | "swipe_note"
}

export interface ConversationRecord {
  matchTimestamp: Date;
  matchId?: string;           // Tinder match_id when available
  messages: RawMessage[];
  firstMessageDate?: Date;
  lastMessageDate?: Date;
}

export interface RawMatch {
  timestamp: Date;
  messagesCount: number;
  userInitiated: boolean;
  lastMessageDate?: Date;
  firstMessageDate?: Date;
  hasComment?: boolean;
  unmatchDate?: Date;
  matchId?: string;           // Tinder match_id for conversation linking
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

  // SwipeStats Intelligence — new fields
  /** Boost usage tracking (Tinder) */
  boostTracking?: { date: Date; matchesDuringBoost?: number }[];
  /** Super Like tracking (Tinder) */
  superLikeTracking?: { date: Date; matched?: boolean }[];
  /** Message type breakdown: { "gif": 5, "gesture": 2, ... } */
  messageTypes?: Record<string, number>;
  /** Notes sent with super likes */
  swipeNotes?: string[];
  /** Client registration info */
  clientInfo?: { platform?: string; appVersion?: string };

  // Conversation Pulse — full message content for conversational analysis
  /** Full conversation records with message bodies, timestamps, and direction */
  conversations?: ConversationRecord[];
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
        "Format non supporte. Utilise le fichier .json ou .zip fourni par ton app."
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
    "Format non supporte. Utilise le fichier .json ou .zip fourni par ton app."
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
    case "happn":
      return parseHappnJson(obj);
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
  // Happn: merged export has __happn flag, or relationships array with status_a_b
  if (json["__happn"] || (Array.isArray(json["relationships"]) &&
    (json["relationships"] as Record<string, unknown>[]).some(r => "status_a_b" in r))) {
    return "happn";
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
  let boostTracking: ParsedData["boostTracking"] | undefined;
  let superLikeTracking: ParsedData["superLikeTracking"] | undefined;
  const messageTypes: Record<string, number> = {};
  const swipeNotes: string[] = [];
  let clientInfo: ParsedData["clientInfo"] | undefined;
  const conversations: ConversationRecord[] = [];

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
      enrichMatchesWithMessages(matches, messages as Record<string, unknown>, conversations);
    }

    // Extract message timestamps for hourly activity proxy (Format B)
    // Also extract message types and swipe notes (both formats)
    if (Array.isArray(messages)) {
      for (const conv of messages) {
        if (typeof conv !== "object" || conv === null) continue;
        const msgs = (conv as Record<string, unknown>)["messages"];
        if (!Array.isArray(msgs)) continue;
        for (const m of msgs) {
          const mObj = m as Record<string, unknown>;
          if (formatB) {
            const ts = parseDate(mObj["sent_date"]);
            if (ts) messageTimestamps.push(ts);
          }
          // Track message types (gif, gesture, contact_card, swipe_note, etc.)
          try {
            const mType = mObj["type"] as string | undefined;
            if (mType && typeof mType === "string") {
              messageTypes[mType] = (messageTypes[mType] || 0) + 1;
              // Extract swipe note text
              if (mType === "swipe_note" && typeof mObj["message"] === "string") {
                swipeNotes.push(mObj["message"] as string);
              }
            }
          } catch { /* defensive */ }
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

    // Boost tracking from Purchases
    try {
      const purchasesRaw2 = json["Purchases"] as Record<string, unknown> | undefined;
      if (purchasesRaw2) {
        // Boosts: look in consumable array for boost entries
        const consRaw2 = purchasesRaw2["consumable"] as Record<string, unknown>[] | undefined;
        if (Array.isArray(consRaw2)) {
          const boosts: { date: Date; matchesDuringBoost?: number }[] = [];
          const superLikes: { date: Date; matched?: boolean }[] = [];
          for (const c of consRaw2) {
            const productType = String(c["product_type"] ?? "").toLowerCase();
            const cd = parseDate(c["create_date"]);
            if (!cd) continue;
            if (productType.includes("boost")) {
              boosts.push({ date: cd });
            } else if (productType.includes("super") || productType.includes("superlike")) {
              superLikes.push({ date: cd });
            }
          }
          if (boosts.length > 0) boostTracking = boosts;
          if (superLikes.length > 0) superLikeTracking = superLikes;
        }
        // Also check for super_likes as a separate key
        const superLikesRaw = purchasesRaw2["super_likes"] as Record<string, unknown>[] | undefined;
        if (Array.isArray(superLikesRaw) && superLikesRaw.length > 0 && !superLikeTracking) {
          superLikeTracking = superLikesRaw
            .map(s => {
              const d = parseDate(s["create_date"]);
              return d ? { date: d } : null;
            })
            .filter((s): s is { date: Date } => s !== null);
          if (superLikeTracking.length === 0) superLikeTracking = undefined;
        }
      }
    } catch { /* defensive */ }

    // Client registration info
    try {
      const clientReg = json["client_registration_info"] as Record<string, unknown> | undefined;
      const userObj2 = json["User"] as Record<string, unknown> | undefined;
      const regSource = clientReg ?? userObj2;
      if (regSource) {
        const platform = regSource["platform"] as string | undefined;
        const appVersion = regSource["app_version"] as string | undefined;
        if (platform || appVersion) {
          clientInfo = { platform, appVersion };
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
    boostTracking,
    superLikeTracking,
    messageTypes: Object.keys(messageTypes).length > 0 ? messageTypes : undefined,
    swipeNotes: swipeNotes.length > 0 ? swipeNotes : undefined,
    clientInfo,
    conversations: conversations.length > 0 ? conversations : undefined,
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
  const conversations: ConversationRecord[] = [];
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

          // Build ConversationRecord from Hinge chats (with body)
          if (chats.length > 0) {
            const rawMessages: RawMessage[] = [];
            // Hinge direction inference: if hasComment, first message is "sent" (user's comment).
            // Then alternate heuristically — or mark unknown direction.
            // More reliable: if entry has a "like" from user → user initiated conversation.
            const userLiked = !!likeArr;
            for (let ci = 0; ci < chats.length; ci++) {
              const chatMsg = chats[ci];
              const chatTs = parseDate(chatMsg["timestamp"]);
              const chatBody = typeof chatMsg["body"] === "string" ? chatMsg["body"] as string : "";
              if (chatTs) {
                // Direction inference for Hinge:
                // If user liked (sent the like), first message is likely "sent"
                // Alternate after that as heuristic
                let direction: "sent" | "received";
                if (ci === 0 && hasComment) {
                  direction = "sent"; // The opener comment was from user
                } else if (ci === 0 && userLiked) {
                  direction = "sent"; // User initiated, first msg likely theirs
                } else if (ci === 0) {
                  direction = "received"; // Match initiated
                } else {
                  // Alternate based on parity — imperfect but best heuristic without explicit sender
                  const prevDirection = rawMessages.length > 0 ? rawMessages[rawMessages.length - 1].direction : "sent";
                  direction = prevDirection === "sent" ? "received" : "sent";
                }
                rawMessages.push({ timestamp: chatTs, direction, body: chatBody, type: "message" });
              }
            }
            if (rawMessages.length > 0) {
              conversations.push({
                matchTimestamp: ts,
                messages: rawMessages,
                firstMessageDate: rawMessages[0].timestamp,
                lastMessageDate: rawMessages[rawMessages.length - 1].timestamp,
              });
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
    conversations: conversations.length > 0 ? conversations : undefined,
  };
}

// ── Happn parser (validated against real RGPD export) ───────────
//
// Happn RGPD export is a directory with separate subfolders (relationships, chats, charms, etc.)
// merged into a single JSON by scripts/merge_happn.js with a "__happn" flag.
//
// relationships: { user_id_a, user_id_b, modification_date, status_a_b }
//   status_a_b: 1 = like, 2 = pass, 3 = match
// chats: { "contactId": [{ date, body, user_id, contact_id }] }
// charms: [{ receiver_id, sender_id, charmed_date, message? }] — super-likes
// orders: { orders: [{ total_amount, currency, creation_date }], subscriptions: [...] }
// boost: { finished_boost: [{ boost_start_date, like_counter, action_counter }] }
// users: { profile: { user_id, about_me, registration_date, ... } }

function parseHappnJson(json: Record<string, unknown>): ParsedData {
  const swipes: RawSwipe[] = [];
  const matches: RawMatch[] = [];
  const conversations: ConversationRecord[] = [];
  const messageTimestamps: Date[] = [];
  let bio: string | undefined;
  let createDate: Date | undefined;
  let purchases: ParsedData["purchases"] | undefined;
  let boostTracking: ParsedData["boostTracking"] | undefined;
  let superLikeTracking: ParsedData["superLikeTracking"] | undefined;

  // Extract user ID from profile for sent/received detection in chats
  let myUserId: string | undefined;

  try {
    // ── Users / Profile ──
    const users = json["users"] as Record<string, unknown> | undefined;
    const profile = users?.["profile"] as Record<string, unknown> | undefined;
    if (profile) {
      myUserId = typeof profile["user_id"] === "string" ? profile["user_id"] as string : undefined;
      bio = typeof profile["about_me"] === "string" ? profile["about_me"] as string : undefined;
      const regDate = parseDate(profile["registration_date"]);
      if (regDate) createDate = regDate;
    }

    // ── Relationships → swipes + matches ──
    const relationships = json["relationships"] as Record<string, unknown>[] | undefined;
    if (Array.isArray(relationships)) {
      // Track matched user IDs for linking conversations
      const matchedUserIds = new Set<string>();

      for (const rel of relationships) {
        const status = rel["status_a_b"] as number;
        const ts = parseDate(rel["modification_date"]);
        if (!ts) continue;

        const otherUserId = (rel["user_id_a"] === myUserId
          ? rel["user_id_b"]
          : rel["user_id_a"]) as string | undefined;

        if (status === 1) {
          // Like (right swipe)
          swipes.push({ timestamp: ts, direction: "like" });
        } else if (status === 2) {
          // Pass (left swipe)
          swipes.push({ timestamp: ts, direction: "pass" });
        } else if (status === 3) {
          // Match
          if (otherUserId) matchedUserIds.add(otherUserId);
          matches.push({
            timestamp: ts,
            messagesCount: 0,
            userInitiated: false,
          });
        }
      }

      // ── Chats → conversations + enrich matches ──
      const chats = json["chats"] as Record<string, unknown[]> | undefined;
      if (chats && typeof chats === "object") {
        for (const [contactId, msgs] of Object.entries(chats)) {
          if (!Array.isArray(msgs) || msgs.length === 0) continue;

          const rawMessages: RawMessage[] = [];
          for (const msg of msgs) {
            const m = msg as Record<string, unknown>;
            const msgTs = parseDate(m["date"]);
            const body = typeof m["body"] === "string" ? m["body"] as string : "";
            if (!msgTs) continue;

            messageTimestamps.push(msgTs);

            // Determine direction using user_id
            const msgUserId = m["user_id"] as string | undefined;
            const direction: "sent" | "received" =
              (myUserId && msgUserId === myUserId) ? "sent" : "received";

            rawMessages.push({ timestamp: msgTs, direction, body, type: "message" });
          }

          if (rawMessages.length > 0) {
            rawMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            // Find the matching RawMatch by contactId presence in matchedUserIds
            const isMatch = matchedUserIds.has(contactId);
            const matchTs = isMatch
              ? matches.find((m2) => m2.messagesCount === 0)?.timestamp
              : rawMessages[0].timestamp;

            conversations.push({
              matchTimestamp: matchTs ?? rawMessages[0].timestamp,
              messages: rawMessages,
              firstMessageDate: rawMessages[0].timestamp,
              lastMessageDate: rawMessages[rawMessages.length - 1].timestamp,
            });
          }

          // Enrich match message counts: find match closest to first message date
          if (rawMessages.length > 0) {
            const closestMatch = findClosestMatch(matches, rawMessages[0].timestamp);
            if (closestMatch) {
              closestMatch.messagesCount = rawMessages.length;
              // Check if user sent first message
              closestMatch.userInitiated = rawMessages[0].direction === "sent";
              closestMatch.firstMessageDate = rawMessages[0].timestamp;
              closestMatch.lastMessageDate = rawMessages[rawMessages.length - 1].timestamp;
            }
          }
        }
      }
    }

    // ── Charms → super-like tracking ──
    const charms = json["charms"] as Record<string, unknown>[] | undefined;
    if (Array.isArray(charms) && charms.length > 0) {
      superLikeTracking = [];
      for (const charm of charms) {
        const ts = parseDate(charm["charmed_date"]);
        if (ts) {
          superLikeTracking.push({ date: ts });
          // Also add as superlike swipe
          swipes.push({ timestamp: ts, direction: "superlike" });
        }
      }
      if (superLikeTracking.length === 0) superLikeTracking = undefined;
    }

    // ── Orders → purchases ──
    const ordersObj = json["orders"] as Record<string, unknown> | undefined;
    if (ordersObj) {
      const orders = ordersObj["orders"] as Record<string, unknown>[] | undefined;
      const subscriptions = ordersObj["subscriptions"] as Record<string, unknown>[] | undefined;

      if ((Array.isArray(orders) && orders.length > 0) ||
          (Array.isArray(subscriptions) && subscriptions.length > 0)) {
        purchases = {};

        if (Array.isArray(orders) && orders.length > 0) {
          const first = orders[0];
          const totalAmount = first["total_amount"] as number | undefined;
          const currency = (first["currency"] as string) ?? "EUR";
          // Use order info for consumable-like tracking
          if (totalAmount) {
            purchases._hingeTotalEur = orders.reduce(
              (sum, o) => sum + (typeof o["total_amount"] === "number" ? o["total_amount"] as number : 0),
              0
            );
          }
          // Extract product type from order_lines
          const orderLines = first["order_lines"] as Record<string, unknown>[] | undefined;
          const productId = orderLines?.[0]?.["store_product_id"] as string | undefined;
          if (productId) {
            const cd = parseDate(first["creation_date"]);
            if (cd) {
              purchases.subscription = {
                productType: productId.includes("sup") ? "Supreme" : productId,
                createDate: cd,
              };
            }
          }
        }

        if (Array.isArray(subscriptions) && subscriptions.length > 0) {
          const sub = subscriptions[0];
          const cd = parseDate(sub["creation_date"]);
          const expDate = parseDate(sub["expiration_date"]);
          const plan = sub["plan"] as Record<string, unknown> | undefined;
          const subLevel = (sub["subscription_level"] as string) ?? "";
          if (cd && !purchases.subscription) {
            purchases.subscription = {
              productType: subLevel.includes("DELUXE") ? "Supreme" : subLevel,
              createDate: cd,
              expireDate: expDate ?? undefined,
            };
          } else if (cd && purchases.subscription && expDate) {
            purchases.subscription.expireDate = expDate;
          }
        }
      }
    }

    // ── Boost tracking ──
    const boostObj = json["boost"] as Record<string, unknown> | undefined;
    if (boostObj) {
      const finishedBoosts = boostObj["finished_boost"] as Record<string, unknown>[] | undefined;
      if (Array.isArray(finishedBoosts) && finishedBoosts.length > 0) {
        boostTracking = [];
        for (const b of finishedBoosts) {
          const ts = parseDate(b["boost_start_date"]);
          const likesGained = typeof b["like_counter"] === "number" ? b["like_counter"] as number : undefined;
          if (ts) {
            boostTracking.push({ date: ts, matchesDuringBoost: likesGained });
          }
        }
        if (boostTracking.length === 0) boostTracking = undefined;
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

  return {
    source: "happn",
    period,
    swipes,
    matches,
    dailyOnly: false,
    messageTimestamps: messageTimestamps.length > 0 ? messageTimestamps : undefined,
    profile: bio ? { bio } : undefined,
    purchases,
    createDate,
    boostTracking,
    superLikeTracking,
    conversations: conversations.length > 0 ? conversations : undefined,
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
  messages: Record<string, unknown>,
  conversationsOut?: ConversationRecord[]
): void {
  // Try to associate message counts with matches
  // Tinder format varies, so this is best-effort
  try {
    if (Array.isArray(messages)) {
      // Build a map of match_id → RawMatch for direct linking (Tinder)
      const matchByMatchId = new Map<string, RawMatch>();

      // Array of conversation objects: { match_id, messages: [{to, from, message, sent_date, type}] }
      for (const conv of messages) {
        if (typeof conv !== "object" || conv === null) continue;
        const c = conv as Record<string, unknown>;
        const msgs = Array.isArray(c["messages"]) ? c["messages"] : [];
        const count = msgs.length;
        const convMatchId = typeof c["match_id"] === "string" ? c["match_id"] as string : undefined;

        // Try to find conversation date: match_date, created, or first message sent_date
        let convDate = parseDate(c["match_date"] ?? c["created"]);
        if (!convDate && msgs.length > 0) {
          const first = msgs[0] as Record<string, unknown>;
          convDate = parseDate(first?.["sent_date"] ?? first?.["timestamp"]);
        }

        // Find the matching RawMatch: prefer match_id, fallback to fuzzy date
        let matched: RawMatch | null = null;
        if (convMatchId) {
          // Try direct match_id linking first
          // On first pass, tag matches with match_id from conversations
          matched = matchByMatchId.get(convMatchId) ?? null;
          if (!matched && convDate && matches.length > 0) {
            const closest = findClosestMatch(matches, convDate);
            if (closest) {
              matched = closest;
              matched.matchId = convMatchId;
              matchByMatchId.set(convMatchId, matched);
            }
          }
        } else if (convDate && matches.length > 0) {
          // Fallback: fuzzy date matching (±24h)
          matched = findClosestMatch(matches, convDate);
        }

        if (matched) {
          matched.messagesCount = count;
          if (convMatchId) matched.matchId = convMatchId;
          // Check if user sent first message
          if (msgs.length > 0) {
            const first = msgs[0] as Record<string, unknown>;
            matched.userInitiated =
              first?.["from"] === "You" ||
              first?.["sender_id"] === "self";
          }
          if (msgs.length > 0) {
            const firstMsg = msgs[0] as Record<string, unknown>;
            const firstDate = parseDate(firstMsg?.["sent_date"] ?? firstMsg?.["timestamp"]);
            if (firstDate) matched.firstMessageDate = firstDate;
            const last = msgs[msgs.length - 1] as Record<string, unknown>;
            const lastDate = parseDate(last?.["sent_date"] ?? last?.["timestamp"]);
            if (lastDate) matched.lastMessageDate = lastDate;
          }
        }

        // Build ConversationRecord with full message bodies
        if (conversationsOut && convDate && msgs.length > 0) {
          const rawMessages: RawMessage[] = [];
          for (const m of msgs) {
            const mObj = m as Record<string, unknown>;
            const ts = parseDate(mObj["sent_date"] ?? mObj["timestamp"]);
            const body = typeof mObj["message"] === "string" ? mObj["message"] as string : "";
            const from = mObj["from"] as string | undefined;
            const direction: "sent" | "received" =
              from === "You" || mObj["sender_id"] === "self" ? "sent" : "received";
            const type = typeof mObj["type"] === "string" ? mObj["type"] as string : "message";
            if (ts) {
              rawMessages.push({ timestamp: ts, direction, body, type });
            }
          }
          if (rawMessages.length > 0) {
            const sortedMsgs = rawMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            conversationsOut.push({
              matchTimestamp: convDate,
              matchId: convMatchId,
              messages: sortedMsgs,
              firstMessageDate: sortedMsgs[0].timestamp,
              lastMessageDate: sortedMsgs[sortedMsgs.length - 1].timestamp,
            });
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
