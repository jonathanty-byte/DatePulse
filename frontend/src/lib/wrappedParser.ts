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
}

export interface ParsedData {
  source: WrappedAppSource;
  period: { start: Date; end: Date };
  swipes: RawSwipe[];
  matches: RawMatch[];
  appOpens?: number;
  profile?: {
    bio?: string;
    photoCount?: number;
  };
}

// ── Main entry ──────────────────────────────────────────────────

/** Parse an uploaded RGPD data file. Supports .json and .zip (Tinder export format). */
export async function parseUploadedFile(file: File): Promise<ParsedData> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".zip")) {
    return parseZipFile(file);
  }

  if (name.endsWith(".json")) {
    const text = await file.text();
    const json = JSON.parse(text);
    return parseJsonData(json);
  }

  throw new Error(
    "Format non supporte. Utilise le fichier .json ou .zip de ton export RGPD."
  );
}

// ── JSON parsing ────────────────────────────────────────────────

function parseJsonData(json: Record<string, unknown>): ParsedData {
  const source = detectSource(json);

  switch (source) {
    case "tinder":
      return parseTinderJson(json);
    case "bumble":
      return parseBumbleJson(json);
    case "hinge":
      return parseHingeJson(json);
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

  try {
    // Tinder RGPD format varies between exports:
    // Format A (older): "Usage - Swipes likes" = array of date strings
    // Format B (2024+): "Usage" = { "swipes_likes": {"2025-04-15": 201, ...}, ... }
    //   where keys are dates and values are counts per day
    const usage = (json["Usage"] as Record<string, unknown>) ?? json;

    // Detect format: if usage has snake_case keys with dict values, it's Format B
    const isFormatB =
      typeof usage === "object" &&
      usage !== null &&
      ("swipes_likes" in usage || "swipes_passes" in usage || "app_opens" in usage);

    if (isFormatB) {
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
    profile: bio || photoCount ? { bio, photoCount } : undefined,
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

// ── Hinge parser (stub) ─────────────────────────────────────────

function parseHingeJson(json: Record<string, unknown>): ParsedData {
  // Basic stub - Hinge RGPD format not yet validated
  const swipes: RawSwipe[] = [];
  const matches: RawMatch[] = [];

  try {
    const matchList = json["matches"];
    if (Array.isArray(matchList)) {
      for (const m of matchList) {
        try {
          const item = m as Record<string, unknown>;
          const ts = parseDate(item["timestamp"] ?? item["created_date"]);
          if (ts) {
            const msgs = Array.isArray(item["messages"])
              ? item["messages"].length
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
    source: "hinge",
    period: computePeriod(allDates),
    swipes,
    matches,
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

function expandDailyCountsToSwipes(
  dailyCounts: Record<string, number> | undefined,
  direction: "like" | "pass" | "superlike",
  out: RawSwipe[]
): void {
  if (!dailyCounts || typeof dailyCounts !== "object") return;
  for (const [dateStr, count] of Object.entries(dailyCounts)) {
    if (typeof count !== "number" || count <= 0) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    // Create one swipe entry per count, spread across the day for better distribution
    for (let i = 0; i < count; i++) {
      const offset = Math.floor((24 * 60 * 60 * 1000 * i) / Math.max(count, 1));
      out.push({ timestamp: new Date(d.getTime() + offset), direction });
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

function enrichMatchesWithMessages(
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

function findClosestMatch(
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
