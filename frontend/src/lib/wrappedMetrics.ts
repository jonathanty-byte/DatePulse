import type { ParsedData, RawSwipe, RawMatch } from "./wrappedParser";
import { computeScore } from "./scoring";
import type { AppName } from "./data";

// ── Types ───────────────────────────────────────────────────────

export interface MonthlyData {
  month: string; // "2025-01"
  swipes: number;
  matches: number;
  rightSwipeRate: number;
}

export interface DayOfWeekData {
  day: string;       // "Lun", "Mar", etc.
  dayFull: string;   // "Lundi", "Mardi", etc.
  swipes: number;
  matches: number;
}

export interface AdnAxis {
  axis: string;
  value: number;
  fullMark: 100;
}

export interface Verdict {
  icon: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface WrappedMetrics {
  // Volume
  totalSwipes: number;
  rightSwipes: number;
  rightSwipeRate: number;
  daysActive: number;
  avgSwipesPerDay: number;

  // Conversion
  swipeToMatchRate: number;
  matchToConvoRate: number;
  ghostRate: number;

  // Conversations
  avgConvoLength: number;
  userInitiatedRate: number;
  longestConvo: number;

  // Timing
  peakSwipeHour: number;
  peakMatchHour: number;
  swipesByHour: Record<number, number>;
  matchesByMonth: Record<string, number>;

  // DatePulse correlation
  matchesInGreenLightPct: number;
  estimatedTimeSavedHours: number;

  // Time spent
  estimatedTotalHours: number;
  hoursPerMatch: number;

  // Trends
  bestMonth: string;
  worstMonth: string;
  monthlyData: MonthlyData[];

  // Period
  periodStart: Date;
  periodEnd: Date;
  totalDays: number;

  // App source
  source: string;

  // Data resolution: true when export only has daily totals (no hourly breakdown)
  dailyOnly: boolean;
  /** true when hourly chart is based on message timestamps (proxy), not swipe timestamps */
  hourlyFromMessages: boolean;

  // ── New V2 fields ──

  // Day of week
  swipesByDayOfWeek: DayOfWeekData[];
  bestDay: string;
  worstDay: string;

  // Purchases
  purchasesTotal?: number;
  subscriptionType?: string;
  boostCount?: number;
  costPerMatch?: number;

  // Messages sent/received
  totalMessagesSent: number;
  totalMessagesReceived: number;
  sentReceivedRatio: number;

  // Account
  createDate?: Date;
  tenureMonths?: number;

  // ADN Dating axes (0-100 each)
  adnDating: AdnAxis[];
}

// ── Price estimates for purchase calculations ───────────────────

const SUBSCRIPTION_PRICES: Record<string, number> = {
  "tinder_plus": 10,
  "tinder_gold": 25,
  "tinder_platinum": 40,
  // Fallback per-month estimate
  "unknown": 20,
};

const CONSUMABLE_PRICE = 5; // EUR per boost/superlike pack

// ── Day-of-week labels ──────────────────────────────────────────

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAY_LABELS_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
// Reorder to start from Monday (index 1-6, 0)
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

// ── Main function ───────────────────────────────────────────────

export function computeWrappedMetrics(data: ParsedData): WrappedMetrics {
  const { swipes, matches, source, period, appOpens, dailyOnly, messageTimestamps } = data;

  // Map source to AppName for scoring (WrappedAppSource is a subset of AppName)
  const appName: AppName = source as AppName;

  // ── Volume metrics ─────────────────────────────────────────
  const totalSwipes = swipes.length;
  const rightSwipes = swipes.filter(
    (s) => s.direction === "like" || s.direction === "superlike"
  ).length;
  const rightSwipeRate =
    totalSwipes > 0 ? Math.round((rightSwipes / totalSwipes) * 100) : 0;

  const activeDays = new Set(swipes.map((s) => dateKey(s.timestamp)));
  const daysActive = activeDays.size || 1;
  const avgSwipesPerDay = Math.round(totalSwipes / daysActive);

  // ── Conversion metrics ─────────────────────────────────────
  const totalMatches = matches.length;
  const swipeToMatchRate =
    rightSwipes > 0 ? Math.round((totalMatches / rightSwipes) * 100) : 0;

  const convos = matches.filter((m) => m.messagesCount > 0);
  const matchToConvoRate =
    totalMatches > 0 ? Math.round((convos.length / totalMatches) * 100) : 0;

  // Ghost rate: matched but no messages exchanged
  const ghosted = matches.filter((m) => m.messagesCount === 0);
  const ghostRate =
    totalMatches > 0 ? Math.round((ghosted.length / totalMatches) * 100) : 0;

  // ── Conversation metrics ───────────────────────────────────
  const convoLengths = matches.map((m) => m.messagesCount);
  const avgConvoLength =
    convos.length > 0
      ? Math.round(convoLengths.reduce((a, b) => a + b, 0) / convos.length)
      : 0;

  const userInitiated = matches.filter((m) => m.userInitiated);
  const userInitiatedRate =
    convos.length > 0
      ? Math.round((userInitiated.length / convos.length) * 100)
      : 0;

  const longestConvo = convoLengths.length > 0 ? Math.max(...convoLengths) : 0;

  // ── Timing metrics ─────────────────────────────────────────
  // When daily-only, use message timestamps as hourly activity proxy
  const hourlyFromMessages = !!dailyOnly && !!messageTimestamps && messageTimestamps.length > 0;
  const hourlySource = hourlyFromMessages
    ? messageTimestamps!
    : swipes.map((s) => s.timestamp);
  const swipesByHour = computeHourDistribution(hourlySource);
  const matchesByHour = hourlyFromMessages
    ? swipesByHour // same source, no separate match hours available
    : computeHourDistribution(matches.map((m) => m.timestamp));

  const peakSwipeHour = findPeakHour(swipesByHour);
  const peakMatchHour = findPeakHour(matchesByHour);

  const matchesByMonth = computeMonthDistribution(
    matches.map((m) => m.timestamp)
  );

  // ── DatePulse correlation ──────────────────────────────────
  let greenLightMatches = 0;
  for (const match of matches) {
    const result = computeScore(match.timestamp, appName);
    if (result.score >= 35) greenLightMatches++;
  }
  const matchesInGreenLightPct =
    totalMatches > 0
      ? Math.round((greenLightMatches / totalMatches) * 100)
      : 0;

  // Estimated time spent on the app
  const totalPeriodDays = Math.max(
    1,
    Math.ceil(
      (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const swipeHours = (totalSwipes * 2) / 3600; // 2s per swipe
  const totalMsgsSent = matches.reduce((sum, m) => sum + m.messagesCount, 0);
  const msgHours = (totalMsgsSent * 30) / 3600; // 30s per message (read + type)
  const browseOverhead = appOpens ? (appOpens * 20) / 3600 : swipeHours * 0.5;
  const estimatedTotalHours = Math.round(swipeHours + msgHours + browseOverhead);

  const wastedTimePct = 1 - matchesInGreenLightPct / 100;
  const estimatedTimeSavedHours = Math.round(
    estimatedTotalHours * wastedTimePct * 0.5
  );

  const hoursPerMatch =
    totalMatches > 0
      ? Math.round((estimatedTotalHours / totalMatches) * 10) / 10
      : 0;

  // ── Monthly trends ─────────────────────────────────────────
  const monthlyData = computeMonthlyData(swipes, matches);
  const bestMonth = findBestMonth(monthlyData);
  const worstMonth = findWorstMonth(monthlyData);

  // ── Day-of-week ────────────────────────────────────────────
  const swipesByDayOfWeek = computeDayOfWeekData(swipes, matches);
  const bestDay = swipesByDayOfWeek.reduce(
    (best, curr) => (curr.matches > best.matches ? curr : best),
    swipesByDayOfWeek[0]
  )?.day ?? "";
  const worstDay = swipesByDayOfWeek.reduce(
    (worst, curr) => (curr.matches < worst.matches ? curr : worst),
    swipesByDayOfWeek[0]
  )?.day ?? "";

  // ── Purchases ──────────────────────────────────────────────
  let purchasesTotal: number | undefined;
  let subscriptionType: string | undefined;
  let boostCount: number | undefined;
  let costPerMatch: number | undefined;

  if (data.purchases) {
    purchasesTotal = 0;

    // Hinge: exact EUR total from subscriptions.json
    if (data.purchases._hingeTotalEur && data.purchases._hingeTotalEur > 0) {
      purchasesTotal = Math.round(data.purchases._hingeTotalEur * 100) / 100;
      if (data.purchases.subscription) {
        subscriptionType = data.purchases.subscription.productType;
      }
    } else {
      // Tinder: estimate from subscription type + duration
      if (data.purchases.subscription) {
        subscriptionType = data.purchases.subscription.productType;
        const subCreate = data.purchases.subscription.createDate;
        const subExpire = data.purchases.subscription.expireDate;
        if (subExpire) {
          const subMonths = Math.max(1, Math.ceil(
            (subExpire.getTime() - subCreate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          ));
          const pricePerMonth = SUBSCRIPTION_PRICES[subscriptionType.toLowerCase()] ?? SUBSCRIPTION_PRICES["unknown"];
          purchasesTotal += subMonths * pricePerMonth;
        } else {
          const periodMonths = Math.max(1, Math.ceil(totalPeriodDays / 30));
          const pricePerMonth = SUBSCRIPTION_PRICES[subscriptionType.toLowerCase()] ?? SUBSCRIPTION_PRICES["unknown"];
          purchasesTotal += periodMonths * pricePerMonth;
        }
      }
      if (data.purchases.consumables) {
        boostCount = data.purchases.consumables.count;
        purchasesTotal += boostCount * CONSUMABLE_PRICE;
      }
    }

    if (totalMatches > 0 && purchasesTotal > 0) {
      costPerMatch = Math.round((purchasesTotal / totalMatches) * 10) / 10;
    }
  }

  // ── Messages sent/received ─────────────────────────────────
  const totalMessagesSent = totalMsgsSent;
  let totalMessagesReceived = 0;
  if (data.messagesReceived) {
    totalMessagesReceived = Object.values(data.messagesReceived).reduce(
      (sum, v) => sum + (typeof v === "number" ? v : 0), 0
    );
  } else {
    // Estimate: ~0.8 messages received per message sent
    totalMessagesReceived = Math.round(totalMessagesSent * 0.8);
  }
  const sentReceivedRatio = totalMessagesReceived > 0
    ? Math.round((totalMessagesSent / totalMessagesReceived) * 10) / 10
    : 0;

  // ── Account tenure ─────────────────────────────────────────
  const createDate = data.createDate;
  let tenureMonths: number | undefined;
  if (createDate) {
    tenureMonths = Math.max(1, Math.round(
      (period.end.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
  }

  // ── ADN Dating (5 axes, 0-100) ─────────────────────────────
  const adnDating = computeAdnDating({
    rightSwipeRate,
    swipeToMatchRate,
    matchToConvoRate,
    daysActive,
    totalDays: totalPeriodDays,
    peakSwipeHour,
  });

  return {
    totalSwipes,
    rightSwipes,
    rightSwipeRate,
    daysActive,
    avgSwipesPerDay,
    swipeToMatchRate,
    matchToConvoRate,
    ghostRate,
    avgConvoLength,
    userInitiatedRate,
    longestConvo,
    peakSwipeHour,
    peakMatchHour,
    swipesByHour,
    matchesByMonth,
    matchesInGreenLightPct,
    estimatedTimeSavedHours,
    estimatedTotalHours,
    hoursPerMatch,
    bestMonth,
    worstMonth,
    monthlyData,
    periodStart: period.start,
    periodEnd: period.end,
    totalDays: totalPeriodDays,
    source,
    dailyOnly: !!dailyOnly,
    hourlyFromMessages,
    // V2 fields
    swipesByDayOfWeek,
    bestDay,
    worstDay,
    purchasesTotal,
    subscriptionType,
    boostCount,
    costPerMatch,
    totalMessagesSent,
    totalMessagesReceived,
    sentReceivedRatio,
    createDate,
    tenureMonths,
    adnDating,
  };
}

// ── Verdict logic (moved from WrappedReport.tsx) ─────────────────

export function getVerdict(m: WrappedMetrics): Verdict {
  // Purchases: spending too much per match
  if (m.purchasesTotal && m.purchasesTotal > 100 && m.costPerMatch && m.costPerMatch > 10) {
    return {
      icon: "\u{1F4B8}",
      title: "Tu depenses trop pour trop peu",
      message:
        `${m.purchasesTotal}\u20AC depenses pour ${m.costPerMatch}\u20AC par match. ` +
        "L'Audit DatePulse peut t'aider a optimiser sans payer plus.",
      ctaLabel: "Auditer mon profil",
      ctaHref: "/audit",
    };
  }

  // Talking to the void
  if (m.sentReceivedRatio > 2) {
    return {
      icon: "\u{1F4AC}",
      title: "Tu parles dans le vide",
      message:
        `Tu envoies ${m.sentReceivedRatio}x plus de messages que tu n'en recois. ` +
        "Le Coach DatePulse peut t'aider a ecrire des messages qui obtiennent des reponses.",
      ctaLabel: "Ameliorer mes messages",
      ctaHref: "/coach",
    };
  }

  if (m.ghostRate > 50) {
    return {
      icon: "\u{1F47B}",
      title: "Tu te fais ghoster trop souvent",
      message:
        "Plus de la moitie de tes matches ne menent a rien. Travaille tes premiers messages pour convertir plus de matches en conversations.",
      ctaLabel: "Ameliorer mes messages",
      ctaHref: "/coach",
    };
  }

  // Hinge doesn't log passes, so rightSwipeRate is always ~100% — skip this verdict
  if (m.rightSwipeRate > 70 && m.source !== "hinge") {
    return {
      icon: "\u{1F6A8}",
      title: "Tu likes tout le monde",
      message:
        "Un taux de like a " +
        m.rightSwipeRate +
        "% penalise ton algorithme. Sois plus selectif pour que l'app te montre de meilleurs profils.",
      ctaLabel: "Optimiser ma strategie",
      ctaHref: "/audit",
    };
  }

  if (m.matchesInGreenLightPct > 60) {
    return {
      icon: "\u{2705}",
      title: "Tu swipes deja aux bons moments !",
      message:
        "DatePulse valide — " +
        m.matchesInGreenLightPct +
        "% de tes matches arrivent pendant les fenetres optimales. Continue comme ca.",
      ctaLabel: "Voir mes fenetres",
      ctaHref: "/",
    };
  }

  return {
    icon: "\u{1F4CA}",
    title: "Optimise tes sessions",
    message:
      "Utilise DatePulse pour swiper au bon moment et maximiser tes matches. Swipe when it matters.",
    ctaLabel: "Voir les fenetres momentum",
    ctaHref: "/",
  };
}

// ── Helper functions ────────────────────────────────────────────

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeHourDistribution(dates: Date[]): Record<number, number> {
  const dist: Record<number, number> = {};
  for (let h = 0; h < 24; h++) dist[h] = 0;
  for (const d of dates) {
    dist[d.getHours()] = (dist[d.getHours()] || 0) + 1;
  }
  return dist;
}

function computeMonthDistribution(dates: Date[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const d of dates) {
    const key = monthKey(d);
    dist[key] = (dist[key] || 0) + 1;
  }
  return dist;
}

function findPeakHour(hourDist: Record<number, number>): number {
  let maxCount = 0;
  let peakHour = 20; // default
  for (const [hour, count] of Object.entries(hourDist)) {
    if (count > maxCount) {
      maxCount = count;
      peakHour = Number(hour);
    }
  }
  return peakHour;
}

function computeMonthlyData(
  swipes: RawSwipe[],
  matches: RawMatch[]
): MonthlyData[] {
  const months = new Map<
    string,
    { swipes: number; likes: number; matches: number }
  >();

  for (const s of swipes) {
    const key = monthKey(s.timestamp);
    const existing = months.get(key) ?? { swipes: 0, likes: 0, matches: 0 };
    existing.swipes++;
    if (s.direction === "like" || s.direction === "superlike")
      existing.likes++;
    months.set(key, existing);
  }

  for (const m of matches) {
    const key = monthKey(m.timestamp);
    const existing = months.get(key) ?? { swipes: 0, likes: 0, matches: 0 };
    existing.matches++;
    months.set(key, existing);
  }

  return Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      swipes: data.swipes,
      matches: data.matches,
      rightSwipeRate:
        data.swipes > 0
          ? Math.round((data.likes / data.swipes) * 100)
          : 0,
    }));
}

function matchRate(d: MonthlyData): number {
  const likes = Math.round(d.swipes * d.rightSwipeRate / 100);
  return likes > 0 ? d.matches / likes : 0;
}

function findBestMonth(data: MonthlyData[]): string {
  if (data.length === 0) return "";
  const active = data.filter((d) => d.swipes > 0 && matchRate(d) > 0);
  if (active.length === 0) return "";
  return active.reduce((best, curr) =>
    matchRate(curr) > matchRate(best) ? curr : best
  ).month;
}

function findWorstMonth(data: MonthlyData[]): string {
  if (data.length === 0) return "";
  const active = data.filter((d) => d.swipes > 0 && matchRate(d) > 0);
  if (active.length === 0) return "";
  return active.reduce((worst, curr) =>
    matchRate(curr) < matchRate(worst) ? curr : worst
  ).month;
}

// ── Day-of-week computation ─────────────────────────────────────

function computeDayOfWeekData(
  swipes: RawSwipe[],
  matches: RawMatch[]
): DayOfWeekData[] {
  const byDow: Record<number, { swipes: number; matches: number }> = {};
  for (let i = 0; i < 7; i++) byDow[i] = { swipes: 0, matches: 0 };

  for (const s of swipes) {
    byDow[s.timestamp.getDay()].swipes++;
  }
  for (const m of matches) {
    byDow[m.timestamp.getDay()].matches++;
  }

  return DOW_ORDER.map((dow) => ({
    day: DAY_LABELS[dow],
    dayFull: DAY_LABELS_FULL[dow],
    swipes: byDow[dow].swipes,
    matches: byDow[dow].matches,
  }));
}

// ── ADN Dating computation ──────────────────────────────────────

function computeAdnDating(params: {
  rightSwipeRate: number;
  swipeToMatchRate: number;
  matchToConvoRate: number;
  daysActive: number;
  totalDays: number;
  peakSwipeHour: number;
}): AdnAxis[] {
  const { rightSwipeRate, swipeToMatchRate, matchToConvoRate, daysActive, totalDays, peakSwipeHour } = params;

  // Selectivite: more selective = higher score (100 - rightSwipeRate)
  const selectivite = Math.min(100, Math.max(0, 100 - rightSwipeRate));

  // Conversion: swipeToMatchRate * 10 (since typical rate is <10%)
  const conversion = Math.min(100, Math.max(0, swipeToMatchRate * 10));

  // Engagement: matchToConvoRate (already 0-100)
  const engagement = Math.min(100, Math.max(0, matchToConvoRate));

  // Regularite: daysActive / totalDays * 100
  const regularite = totalDays > 0
    ? Math.min(100, Math.max(0, Math.round((daysActive / totalDays) * 100)))
    : 0;

  // Timing: proximity to optimal 20h window (18-22h = high score)
  const optimalHour = 20;
  const hourDiff = Math.abs(peakSwipeHour - optimalHour);
  const timing = Math.min(100, Math.max(0, Math.round(100 - hourDiff * 15)));

  return [
    { axis: "Selectivite", value: selectivite, fullMark: 100 },
    { axis: "Conversion", value: conversion, fullMark: 100 },
    { axis: "Engagement", value: engagement, fullMark: 100 },
    { axis: "Regularite", value: regularite, fullMark: 100 },
    { axis: "Timing", value: timing, fullMark: 100 },
  ];
}
