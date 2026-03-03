import type { ParsedData, RawSwipe, RawMatch, WrappedAppSource } from "./wrappedParser";
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

export interface FunnelData {
  likes: number;
  matches: number;
  conversations: number;
  dates: number;
  likeToMatchPct: number;
  matchToConvoPct: number;
  convoToDatePct: number;
}

export interface CommentImpact {
  commentedLikes: number;
  commentedMatchRate: number;
  plainMatchRate: number;
  boostFactor: number;
  commentRate: number;
}

export interface ResponseTimeData {
  medianHours: number;
  under1h: number;
  under6h: number;
  under24h: number;
  over24h: number;
  fastResponseRate: number;
}

export interface UnmatchData {
  totalUnmatched: number;
  unmatchRate: number;
  avgDurationDays: number;
  survivedMatches: number;
  survivalRate: number;
}

export interface PremiumROI {
  premiumMatchRate: number;
  freeMatchRate: number;
  boostFactor: number;
  costPerPremiumMatch: number;
  totalSpent: number;
  premiumMonths: number;
  freeMonths: number;
  isWorthIt: boolean;
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

  // ── Deep Insights (Hinge-first, optional for Tinder) ──
  funnel?: FunnelData;
  commentImpact?: CommentImpact;
  responseTime?: ResponseTimeData;
  unmatchData?: UnmatchData;
  premiumROI?: PremiumROI;

  // ── SwipeStats Intelligence (Phase 2b) ──
  boostDates?: Date[];
  boostMatchRate?: number;
  superLikesSent?: number;
  superLikeMatchRate?: number;
  messageTypeBreakdown?: Record<string, number>;
  gifRate?: number;
  platform?: string;
  activeTimeFormatted?: string;
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

  // ── Funnel ─────────────────────────────────────────────────
  const dates = data.weMet?.filter(w => w.didMeet === "Yes").length ?? 0;
  const funnel: FunnelData = {
    likes: rightSwipes,
    matches: totalMatches,
    conversations: convos.length,
    dates,
    likeToMatchPct: swipeToMatchRate,
    matchToConvoPct: matchToConvoRate,
    convoToDatePct: convos.length > 0 ? Math.round((dates / convos.length) * 100) : 0,
  };

  // ── Comment Impact (Hinge only) ──────────────────────────
  let commentImpact: CommentImpact | undefined;
  if (data.commentStats && (data.commentStats.commented > 0 || data.commentStats.plain > 0)) {
    const cs = data.commentStats;
    const commentedRate = cs.commented > 0 ? (cs.commentedMatched / cs.commented) * 100 : 0;
    const plainRate = cs.plain > 0 ? (cs.plainMatched / cs.plain) * 100 : 0;
    const totalLikesWithData = cs.commented + cs.plain;
    commentImpact = {
      commentedLikes: cs.commented,
      commentedMatchRate: Math.round(commentedRate * 10) / 10,
      plainMatchRate: Math.round(plainRate * 10) / 10,
      boostFactor: plainRate > 0 ? Math.round((commentedRate / plainRate) * 10) / 10 : 0,
      commentRate: totalLikesWithData > 0 ? Math.round((cs.commented / totalLikesWithData) * 100) : 0,
    };
  }

  // ── Response Time ─────────────────────────────────────────
  let responseTime: ResponseTimeData | undefined;
  const responseTimes = matches
    .filter(m => m.firstMessageDate)
    .map(m => (m.firstMessageDate!.getTime() - m.timestamp.getTime()) / (3600 * 1000))
    .filter(h => h >= 0);
  if (responseTimes.length > 0) {
    responseTimes.sort((a, b) => a - b);
    const median = responseTimes[Math.floor(responseTimes.length / 2)];
    const u1h = responseTimes.filter(h => h < 1).length;
    const u6h = responseTimes.filter(h => h >= 1 && h < 6).length;
    const u24h = responseTimes.filter(h => h >= 6 && h < 24).length;
    const o24h = responseTimes.filter(h => h >= 24).length;
    responseTime = {
      medianHours: Math.round(median * 10) / 10,
      under1h: u1h,
      under6h: u6h,
      under24h: u24h,
      over24h: o24h,
      fastResponseRate: responseTimes.length > 0
        ? Math.round(((u1h + u6h) / responseTimes.length) * 100)
        : 0,
    };
  }

  // ── Unmatch Data (Hinge only) ──────────────────────────────
  let unmatchData: UnmatchData | undefined;
  const unmatched = matches.filter(m => m.unmatchDate);
  if (unmatched.length > 0) {
    const survived = matches.filter(m => !m.unmatchDate);
    const durations = unmatched.map(m =>
      (m.unmatchDate!.getTime() - m.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    ).filter(d => d >= 0);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0;
    unmatchData = {
      totalUnmatched: unmatched.length,
      unmatchRate: totalMatches > 0 ? Math.round((unmatched.length / totalMatches) * 100) : 0,
      avgDurationDays: avgDuration,
      survivedMatches: survived.length,
      survivalRate: totalMatches > 0 ? Math.round((survived.length / totalMatches) * 100) : 0,
    };
  }

  // ── Premium ROI (requires subscriptionPeriods) ─────────────
  let premiumROI: PremiumROI | undefined;
  if (data.subscriptionPeriods && data.subscriptionPeriods.length > 0) {
    const periods = data.subscriptionPeriods;
    const isPremium = (date: Date) =>
      periods.some(p => date >= p.start && date <= p.end);

    // Count likes and matches during premium vs free
    let premiumLikes = 0, premiumMatches = 0, freeLikes = 0, freeMatches = 0;
    for (const s of swipes) {
      if (s.direction === "like" || s.direction === "superlike") {
        if (isPremium(s.timestamp)) premiumLikes++;
        else freeLikes++;
      }
    }
    for (const m of matches) {
      if (isPremium(m.timestamp)) premiumMatches++;
      else freeMatches++;
    }

    const premiumRate = premiumLikes > 0 ? (premiumMatches / premiumLikes) * 100 : 0;
    const freeRate = freeLikes > 0 ? (freeMatches / freeLikes) * 100 : 0;
    const totalSp = periods.reduce((s, p) => s + p.price, 0);
    const premMo = Math.max(1, Math.round(
      periods.reduce((s, p) => s + (p.end.getTime() - p.start.getTime()), 0) / (1000 * 60 * 60 * 24 * 30)
    ));
    const freeMo = Math.max(0, Math.round(totalPeriodDays / 30) - premMo);

    premiumROI = {
      premiumMatchRate: Math.round(premiumRate * 10) / 10,
      freeMatchRate: Math.round(freeRate * 10) / 10,
      boostFactor: freeRate > 0 ? Math.round((premiumRate / freeRate) * 10) / 10 : 0,
      costPerPremiumMatch: premiumMatches > 0 ? Math.round((totalSp / premiumMatches) * 100) / 100 : 0,
      totalSpent: Math.round(totalSp * 100) / 100,
      premiumMonths: premMo,
      freeMonths: freeMo,
      isWorthIt: freeRate > 0 ? (premiumRate / freeRate) > 1.5 : premiumRate > 0,
    };
  }

  // ── SwipeStats Intelligence metrics ──────────────────────────────
  let boostDates: Date[] | undefined;
  let boostMatchRate: number | undefined;
  if (data.boostTracking && data.boostTracking.length > 0) {
    boostDates = data.boostTracking.map(b => b.date);
    // Calculate boost match rate: matches within 1h of a boost
    const boostMatches = matches.filter(m =>
      data.boostTracking!.some(b =>
        Math.abs(m.timestamp.getTime() - b.date.getTime()) < 3600 * 1000
      )
    ).length;
    boostMatchRate = data.boostTracking.length > 0
      ? Math.round((boostMatches / data.boostTracking.length) * 100)
      : undefined;
  }

  let superLikesSent: number | undefined;
  let superLikeMatchRate: number | undefined;
  if (data.superLikeTracking && data.superLikeTracking.length > 0) {
    superLikesSent = data.superLikeTracking.length;
    const superLikeMatches = data.superLikeTracking.filter(s => s.matched).length;
    superLikeMatchRate = Math.round((superLikeMatches / superLikesSent) * 100);
  } else {
    // Fallback: count super likes from swipes
    const superLikesFromSwipes = swipes.filter(s => s.direction === "superlike").length;
    if (superLikesFromSwipes > 0) {
      superLikesSent = superLikesFromSwipes;
    }
  }

  const messageTypeBreakdown = data.messageTypes;
  let gifRate: number | undefined;
  if (messageTypeBreakdown) {
    const totalTypedMsgs = Object.values(messageTypeBreakdown).reduce((s, v) => s + v, 0);
    const gifCount = messageTypeBreakdown["gif"] ?? 0;
    if (totalTypedMsgs > 0) gifRate = Math.round((gifCount / totalTypedMsgs) * 100);
  }

  const platform = data.clientInfo?.platform;

  // Format active time (already parsed, never exposed before)
  let activeTimeFormatted: string | undefined;
  if (data.activeTime !== undefined) {
    if (typeof data.activeTime === "number") {
      // Assume minutes or seconds — Tinder active_time varies
      const hours = data.activeTime > 3600
        ? Math.round(data.activeTime / 3600) // seconds → hours
        : Math.round(data.activeTime / 60);  // minutes → hours
      activeTimeFormatted = `${hours} heures`;
    } else if (typeof data.activeTime === "string") {
      activeTimeFormatted = data.activeTime;
    }
  }

  // ── ADN Dating (6 axes, 0-100) ─────────────────────────────
  const adnDating = computeAdnDating({
    source,
    rightSwipeRate,
    swipeToMatchRate,
    matchToConvoRate,
    ghostRate,
    daysActive,
    totalDays: totalPeriodDays,
    peakSwipeHour,
    avgConvoLength,
    sentReceivedRatio,
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
    // Deep insights
    funnel,
    commentImpact,
    responseTime,
    unmatchData,
    premiumROI,
    // SwipeStats Intelligence
    boostDates,
    boostMatchRate,
    superLikesSent,
    superLikeMatchRate,
    messageTypeBreakdown,
    gifRate,
    platform,
    activeTimeFormatted,
  };
}

// ── Verdict logic (moved from WrappedReport.tsx) ─────────────────

export function getVerdict(m: WrappedMetrics): Verdict {
  // Premium not worth it
  if (m.premiumROI && m.premiumROI.isWorthIt === false && m.premiumROI.totalSpent > 30) {
    return {
      icon: "\u{1F4B8}",
      title: "Le premium ne vaut pas le coup pour toi",
      message:
        `x${m.premiumROI.boostFactor} boost seulement pour ${m.premiumROI.totalSpent}\u20AC depenses. ` +
        "L'Audit DatePulse peut t'aider a optimiser sans payer plus.",
      ctaLabel: "Auditer mon profil",
      ctaHref: "/audit",
    };
  }

  // Slow response time
  if (m.responseTime && m.responseTime.medianHours > 24) {
    return {
      icon: "\u{23F3}",
      title: "Tu reponds trop lentement",
      message:
        `Temps de reponse median : ${m.responseTime.medianHours}h. ` +
        "Les matchs qui repondent dans l'heure ont 3x plus de chances de mener a un date.",
      ctaLabel: "Ameliorer mes messages",
      ctaHref: "/coach",
    };
  }

  // Comment boost verdict
  if (m.commentImpact && m.commentImpact.boostFactor > 1.3) {
    return {
      icon: "\u{1F4DD}",
      title: "Tes commentaires boostent tes matchs !",
      message:
        `x${m.commentImpact.boostFactor} match rate quand tu commentes. ` +
        "Le Coach DatePulse peut t'aider a ecrire le premier message parfait.",
      ctaLabel: "Ameliorer mes messages",
      ctaHref: "/coach",
    };
  }

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
  source: WrappedAppSource;
  rightSwipeRate: number;
  swipeToMatchRate: number;
  matchToConvoRate: number;
  ghostRate: number;
  daysActive: number;
  totalDays: number;
  peakSwipeHour: number;
  avgConvoLength: number;
  sentReceivedRatio: number;
}): AdnAxis[] {
  const { source, rightSwipeRate, swipeToMatchRate, matchToConvoRate, ghostRate, daysActive, totalDays, peakSwipeHour, avgConvoLength, sentReceivedRatio } = params;

  // Axis 1: Hinge doesn't log passes → rightSwipeRate is meaningless (~100%)
  // For Hinge, use "Perseverance" (inverse ghost rate) instead of "Selectivite"
  const isHinge = source === "hinge";
  const axis1 = isHinge
    ? { axis: "Perseverance", value: Math.min(100, Math.max(0, 100 - ghostRate)), fullMark: 100 as const }
    : { axis: "Selectivite", value: Math.min(100, Math.max(0, 100 - rightSwipeRate)), fullMark: 100 as const };

  // Conversion: sqrt scale so it works for both low (men ~2-5%) and high (women ~30-50%) rates
  // sqrt(1)=1→15, sqrt(4)=2→30, sqrt(10)=3.2→47, sqrt(25)=5→75, sqrt(50)=7→100
  const conversion = Math.min(100, Math.max(0, Math.round(Math.sqrt(swipeToMatchRate) * 15)));

  // Engagement: matchToConvoRate (already 0-100)
  const engagement = Math.min(100, Math.max(0, matchToConvoRate));

  // Echanges: conversation quality heuristic — convo depth, ratio balance, anti-ghost
  const convoScore = Math.min(100, Math.max(0, avgConvoLength * 5)); // 20 msgs = 100
  const ratioScore = Math.min(100, Math.max(0, 100 - Math.abs(sentReceivedRatio - 1.0) * 100)); // 1.0 = perfect
  const antiGhostScore = Math.min(100, Math.max(0, 100 - ghostRate));
  const echanges = Math.round(convoScore * 0.4 + ratioScore * 0.3 + antiGhostScore * 0.3);

  // Regularite: daysActive / totalDays * 100
  const regularite = totalDays > 0
    ? Math.min(100, Math.max(0, Math.round((daysActive / totalDays) * 100)))
    : 0;

  // Timing: proximity to optimal 20h window (18-22h = high score)
  const optimalHour = 20;
  const hourDiff = Math.abs(peakSwipeHour - optimalHour);
  const timing = Math.min(100, Math.max(0, Math.round(100 - hourDiff * 15)));

  return [
    axis1,
    { axis: "Conversion", value: conversion, fullMark: 100 },
    { axis: "Engagement", value: engagement, fullMark: 100 },
    { axis: "Echanges", value: echanges, fullMark: 100 },
    { axis: "Regularite", value: regularite, fullMark: 100 },
    { axis: "Timing", value: timing, fullMark: 100 },
  ];
}
