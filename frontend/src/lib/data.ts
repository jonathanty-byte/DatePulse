// DatePulse V3 — Static lookup tables
// Sources: Adjust Benchmarks 2024, Sensor Tower FR Q1-Q4 2024/Q1 2025,
//          data.ai Jan 2024, Tinder Year in Swipe, Hinge Blog, Bumble PR, Nielsen, Ogury

/** Apps supported. */
export const APPS = ["tinder", "bumble", "hinge", "happn"] as const;
export type AppName = (typeof APPS)[number];

// ── Shared base indexes (used as Tinder baseline) ───────────────

/** Hourly activity index (0-23h). Peak at 21h = 100. */
export const HOURLY_INDEX: Record<number, number> = {
  0: 8, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 10, 7: 15,
  8: 25, 9: 28, 10: 30, 11: 35, 12: 42, 13: 45, 14: 40,
  15: 28, 16: 25, 17: 30, 18: 55, 19: 70, 20: 85, 21: 100,
  22: 75, 23: 45,
};

/** Weekly activity index (0=Sunday). Peak on Sunday = 100. */
export const WEEKLY_INDEX: Record<number, number> = {
  0: 100, // Dimanche — pic
  1: 90,  // Lundi
  2: 75,  // Mardi
  3: 75,  // Mercredi
  4: 85,  // Jeudi
  5: 55,  // Vendredi
  6: 60,  // Samedi
};

/** Monthly activity index (0=January). Peak in January = 100.
 *  Recalibrated from Adjust global benchmarks 2023-2024 (% vs yearly average):
 *  Jan +28%, Feb -5%, May +10%, Jul +14%, Aug +5%, Oct +6% */
export const MONTHLY_INDEX: Record<number, number> = {
  0: 100,  // Janvier — record installs (Adjust +28%, data.ai 128M)
  1: 74,   // Fevrier — post-rush decline (Adjust -5%)
  2: 68,   // Mars — continued decline (Sensor Tower FR: -31% vs Jan)
  3: 65,   // Avril — spring trough
  4: 86,   // Mai — surprise spike (Adjust +10%)
  5: 72,   // Juin — transition
  6: 89,   // Juillet — summer peak (Adjust +14%)
  7: 82,   // Aout — summer strong (Adjust +5%)
  8: 75,   // Septembre — back to average
  9: 83,   // Octobre — Halloween / cuffing (Adjust +6%)
  10: 78,  // Novembre — cuffing season
  11: 60,  // Decembre — holiday trough
};

// ── Per-app lookup tables ───────────────────────────────────────
// Variations based on official publications per app.
// Tinder = baseline (shared indexes above).

/** Per-app hourly indexes. */
export const APP_HOURLY: Record<AppName, Record<number, number>> = {
  // Tinder: baseline — peak 21h (Nielsen, Tinder Year in Swipe)
  tinder: HOURLY_INDEX,

  // Bumble: women initiate → earlier evening peak (Bumble PR: pic 19-20h)
  bumble: {
    0: 8, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 10, 7: 15,
    8: 22, 9: 25, 10: 28, 11: 32, 12: 40, 13: 42, 14: 38,
    15: 28, 16: 25, 17: 32, 18: 60, 19: 85, 20: 100, 21: 90,
    22: 65, 23: 38,
  },

  // Hinge: relationship-seekers → wider evening window (Hinge Blog: 19h-22h)
  hinge: {
    0: 6, 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 8, 7: 12,
    8: 20, 9: 22, 10: 25, 11: 30, 12: 38, 13: 40, 14: 35,
    15: 25, 16: 22, 17: 28, 18: 55, 19: 78, 20: 92, 21: 100,
    22: 82, 23: 50,
  },

  // Happn: proximity-based → commute spikes (usage geolocalise, urbain)
  happn: {
    0: 5, 1: 3, 2: 3, 3: 3, 4: 3, 5: 5, 6: 12, 7: 22,
    8: 38, 9: 35, 10: 28, 11: 30, 12: 40, 13: 42, 14: 35,
    15: 28, 16: 28, 17: 38, 18: 65, 19: 80, 20: 90, 21: 100,
    22: 68, 23: 35,
  },
};

/** Per-app weekly indexes. */
export const APP_WEEKLY: Record<AppName, Record<number, number>> = {
  // Tinder: baseline — Sunday peak (Tinder Year in Swipe)
  tinder: WEEKLY_INDEX,

  // Bumble: Monday peak (Bumble PR: "Monday is busiest day"), women initiate fresh week
  bumble: {
    0: 90,  // Dimanche
    1: 100, // Lundi — pic Bumble
    2: 85,  // Mardi
    3: 75,  // Mercredi
    4: 80,  // Jeudi
    5: 55,  // Vendredi
    6: 65,  // Samedi
  },

  // Hinge: Sunday dominant (relationship-seekers, "designed to be deleted")
  hinge: {
    0: 100, // Dimanche — pic fort
    1: 85,  // Lundi
    2: 72,  // Mardi
    3: 70,  // Mercredi
    4: 88,  // Jeudi — pre-weekend planning
    5: 50,  // Vendredi
    6: 55,  // Samedi
  },

  // Happn: weekday-heavy (proximity = commutes, urban movement)
  happn: {
    0: 75,  // Dimanche — moins de deplacement
    1: 95,  // Lundi
    2: 90,  // Mardi
    3: 88,  // Mercredi
    4: 100, // Jeudi — pic Happn (Ogury: spike jeudi)
    5: 65,  // Vendredi
    6: 60,  // Samedi
  },
};

/** Per-app monthly indexes.
 *  Calibrated from Sensor Tower France quarterly reports 2024-2025. */
export const APP_MONTHLY: Record<AppName, Record<number, number>> = {
  // Tinder: baseline (Adjust global benchmarks, aligned with Sensor Tower FR)
  tinder: MONTHLY_INDEX,

  // Bumble: Feb Valentine spike, March secondary peak (Sensor Tower FR: 37K mid-March)
  bumble: {
    0: 90, 1: 100, 2: 88, 3: 72, 4: 68, 5: 62,
    6: 60, 7: 55, 8: 75, 9: 80, 10: 82, 11: 65,
  },

  // Hinge: strong growth, Feb + Aug peaks (Sensor Tower FR: rising through 2025)
  hinge: {
    0: 88, 1: 100, 2: 82, 3: 70, 4: 68, 5: 65,
    6: 78, 7: 90, 8: 80, 9: 85, 10: 82, 11: 72,
  },

  // Happn: less seasonal (proximity year-round), Jan peak + summer stable (Sensor Tower FR: 615-643K MAU stable)
  happn: {
    0: 100, 1: 85, 2: 78, 3: 75, 4: 72, 5: 70,
    6: 80, 7: 82, 8: 78, 9: 75, 10: 72, 11: 68,
  },
};

// ── Special events ──────────────────────────────────────────────

export interface SpecialEvent {
  name: string;
  check: (date: Date) => boolean;
  multiplier: number;
}

/** Special events that boost or reduce activity. */
export const SPECIAL_EVENTS: SpecialEvent[] = [
  // Boosters
  {
    name: "Dating Sunday",
    check: (d) => d.getMonth() === 0 && d.getDay() === 0 && d.getDate() <= 7,
    multiplier: 1.35,
  },
  {
    name: "Nouvel An",
    check: (d) => d.getMonth() === 0 && d.getDate() >= 1 && d.getDate() <= 7,
    multiplier: 1.25,
  },
  {
    name: "Pre-Saint-Valentin",
    check: (d) => d.getMonth() === 1 && d.getDate() >= 1 && d.getDate() <= 13,
    multiplier: 1.20,
  },
  {
    name: "Rentree",
    check: (d) => d.getMonth() === 8 && d.getDate() >= 1 && d.getDate() <= 15,
    multiplier: 1.10,
  },
  {
    name: "Cuffing Season",
    check: (d) =>
      (d.getMonth() === 9 && d.getDate() >= 15) ||
      d.getMonth() === 10,
    multiplier: 1.10,
  },
  // Reducers
  {
    name: "Noel",
    check: (d) => d.getMonth() === 11 && d.getDate() >= 24 && d.getDate() <= 26,
    multiplier: 0.60,
  },
  {
    name: "Reveillon",
    check: (d) => d.getMonth() === 11 && d.getDate() === 31,
    multiplier: 0.50,
  },
  {
    name: "15 Aout",
    check: (d) => d.getMonth() === 7 && d.getDate() === 15,
    multiplier: 0.70,
  },
  {
    name: "Pic Ete",
    check: (d) =>
      (d.getMonth() === 6 && d.getDate() >= 1) ||
      (d.getMonth() === 7 && d.getDate() <= 20),
    multiplier: 1.08, // Summer is a real peak (Adjust +14% Jul, +5% Aug)
  },
];

// ── Pool Freshness Data ─────────────────────────────────────────
// Sources: Adjust benchmarks 2023-2024 (installs % vs average),
//          Sensor Tower churn data (20-30% MoM for dating apps),
//          Sensor Tower France MAU quarterly reports 2024-2025.

export interface PoolFreshnessData {
  /** New installs relative to yearly average (0-100, 100 = peak month) */
  installs: number;
  /** Churn intensity (0-100, 100 = highest churn month) */
  churn: number;
  /** Net pool growth: installs - churn, normalized 0-100 */
  netGrowth: number;
  label: "tres-frais" | "frais" | "stable" | "stagnant" | "en-vidange";
  labelFr: string;
  message: string;
}

/** Monthly install index (0=Jan). From Adjust global benchmarks 2023-2024. */
export const MONTHLY_INSTALLS: Record<number, number> = {
  0: 100,  // Jan: +28% vs average — record (data.ai: 128M global)
  1: 74,   // Feb: -5% vs average
  2: 62,   // Mar: continued decline
  3: 58,   // Apr: spring trough
  4: 86,   // May: +10% vs average
  5: 68,   // Jun: transition
  6: 89,   // Jul: +14% vs average — biggest summer spike
  7: 82,   // Aug: +5% vs average
  8: 72,   // Sep: back to average
  9: 83,   // Oct: +6% vs average
  10: 75,  // Nov: cuffing season
  11: 55,  // Dec: holiday trough
};

/** Monthly churn intensity (0=Jan). From Sensor Tower: 20-30% MoM base churn.
 *  Higher = more users leaving. Estimated from MAU trends and resurrected user data. */
export const MONTHLY_CHURN: Record<number, number> = {
  0: 30,   // Jan: low churn — people just installed
  1: 55,   // Feb: rising — some Jan users leaving
  2: 85,   // Mar: high — New Year resolution abandoners
  3: 90,   // Apr: very high — spring exodus
  4: 60,   // May: moderating
  5: 50,   // Jun: moderate
  6: 35,   // Jul: low — summer engaged users
  7: 40,   // Aug: low-moderate
  8: 65,   // Sep: rising — end of summer
  9: 55,   // Oct: moderate
  10: 70,  // Nov: rising — pre-holiday dropoff
  11: 100, // Dec: highest churn — holidays, couples
};

// ── Constants ───────────────────────────────────────────────────

/** Day names in French (index 0 = Sunday to match JS getDay). */
export const DAY_NAMES = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;
export const DAY_NAMES_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
