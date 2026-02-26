// DatePulse V3 — Static lookup tables (Feminine scoring model)
// Sources: Adjust Benchmarks 2024, Sensor Tower FR Q1-Q4 2024/Q1 2025,
//          data.ai Jan 2024, Tinder Year in Swipe, Hinge Blog, Bumble PR, Nielsen, Ogury,
//          SwipeStats (gender split), Reincubate (F 25-34), BMC Psychology 2024,
//          Sumter 2017, Hily Survey, OKCupid Weather Data, Hinge Storm Data

import { getParisHour } from "./franceTime";

/** Apps supported. */
export const APPS = ["tinder", "bumble", "hinge", "happn"] as const;
export type AppName = (typeof APPS)[number];

// ── Shared base indexes (used as Tinder baseline) ───────────────

/** Hourly activity index (0-23h). Peak at 20h = 100 (feminine model).
 *  - 12-13h boost: ENNUI lunch break (BMC Psychology 2024)
 *  - 18-20h peak: VALIDATION post-work (Sumter 2017) + Bumble PR
 *  - 22-23h rapid decline: shorter F sessions (SwipeStats)
 *  - 0-5h reduced: F open less at night (SwipeStats: 3779 vs 5646 opens) */
export const HOURLY_INDEX: Record<number, number> = {
  0: 6, 1: 4, 2: 3, 3: 3, 4: 3, 5: 4, 6: 8, 7: 12,
  8: 20, 9: 22, 10: 25, 11: 32, 12: 45, 13: 48, 14: 40,
  15: 22, 16: 22, 17: 30, 18: 62, 19: 85, 20: 100, 21: 92,
  22: 65, 23: 35,
};

/** Weekly activity index (0=Sunday). Peak on Saturday = 100 (feminine model).
 *  - Saturday 100: Reincubate (F 25-34 = Saturday peak 20h-00h)
 *  - Sunday 90: drops from 100 (global peak driven by 76% male)
 *  - Friday 65: up from 55 (FOMO SOLITUDE Friday night, Hily survey)
 *  - Monday 82: VALIDATION fresh start (Sumter 2017) */
export const WEEKLY_INDEX: Record<number, number> = {
  0: 90,  // Dimanche
  1: 82,  // Lundi
  2: 68,  // Mardi
  3: 65,  // Mercredi
  4: 78,  // Jeudi
  5: 65,  // Vendredi (was 55, up for FOMO)
  6: 100, // Samedi — PIC FEMININ
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
  // Tinder: baseline — peak 20h (feminine model)
  tinder: HOURLY_INDEX,

  // Bumble: women-first → peak advanced to 19h (Bumble PR "pic 19-20h")
  bumble: {
    0: 6, 1: 4, 2: 3, 3: 3, 4: 3, 5: 4, 6: 8, 7: 12,
    8: 18, 9: 20, 10: 24, 11: 30, 12: 42, 13: 44, 14: 36,
    15: 24, 16: 22, 17: 32, 18: 65, 19: 100, 20: 92, 21: 80,
    22: 55, 23: 30,
  },

  // Hinge: wide evening window 18-21h (Hinge Blog: 19h-22h), peak 20h
  hinge: {
    0: 5, 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 6, 7: 10,
    8: 18, 9: 20, 10: 22, 11: 28, 12: 40, 13: 42, 14: 35,
    15: 22, 16: 20, 17: 28, 18: 58, 19: 82, 20: 100, 21: 95,
    22: 75, 23: 42,
  },

  // Happn: commute spikes maintained, evening advanced
  happn: {
    0: 4, 1: 2, 2: 2, 3: 2, 4: 2, 5: 4, 6: 10, 7: 20,
    8: 35, 9: 32, 10: 25, 11: 28, 12: 42, 13: 44, 14: 35,
    15: 25, 16: 25, 17: 36, 18: 68, 19: 85, 20: 100, 21: 90,
    22: 60, 23: 30,
  },
};

/** Per-app weekly indexes. */
export const APP_WEEKLY: Record<AppName, Record<number, number>> = {
  // Tinder: baseline — Saturday peak (feminine model)
  tinder: WEEKLY_INDEX,

  // Bumble: Monday stays dominant (women-first, validated), Saturday up
  bumble: {
    0: 85,  // Dimanche
    1: 100, // Lundi — pic Bumble (validated PR)
    2: 80,  // Mardi
    3: 70,  // Mercredi
    4: 75,  // Jeudi
    5: 58,  // Vendredi
    6: 90,  // Samedi (was 65, up FOMO + soirees)
  },

  // Hinge: Saturday dominates, Sunday close. Fri not lowest (date planning).
  hinge: {
    0: 90,  // Dimanche
    1: 80,  // Lundi
    2: 68,  // Mardi
    3: 65,  // Mercredi
    4: 82,  // Jeudi (pre-weekend planning)
    5: 62,  // Vendredi (was 52, raised: date planning for weekend)
    6: 100, // Samedi — PIC FEMININ
  },

  // Happn: weekday urban + Saturday night
  happn: {
    0: 72,  // Dimanche
    1: 90,  // Lundi
    2: 88,  // Mardi
    3: 85,  // Mercredi
    4: 95,  // Jeudi (pic Happn, Ogury)
    5: 62,  // Vendredi
    6: 100, // Samedi
  },
};

/** Per-app monthly indexes.
 *  Calibrated from Sensor Tower France quarterly reports 2024-2025. */
export const APP_MONTHLY: Record<AppName, Record<number, number>> = {
  // Tinder: baseline (Adjust global benchmarks, aligned with Sensor Tower FR)
  tinder: MONTHLY_INDEX,

  // Bumble: Jan peak like all apps. Feb NOT inflated (Valentine handled by SPECIAL_EVENTS).
  // Summer stable (Sensor Tower FR: Bumble maintains engagement through women-first model).
  bumble: {
    0: 100, 1: 78, 2: 72, 3: 68, 4: 80, 5: 70,
    6: 82, 7: 75, 8: 78, 9: 82, 10: 80, 11: 62,
  },

  // Hinge: Jan peak. Feb NOT inflated (Valentine handled by SPECIAL_EVENTS).
  // Growth trend through 2025 (Sensor Tower FR), Aug moderate not peak.
  hinge: {
    0: 100, 1: 76, 2: 70, 3: 66, 4: 72, 5: 68,
    6: 82, 7: 78, 8: 76, 9: 85, 10: 82, 11: 68,
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
  // ── Adjusted boosters ──
  {
    name: "Nouvel An",
    check: (d) => d.getMonth() === 0 && d.getDate() >= 1 && d.getDate() <= 5,
    multiplier: 1.35, // SOLITUDE "New Year alone" — narrowed to 1-5 Jan
  },
  {
    name: "Dating Sunday",
    check: (d) => d.getMonth() === 0 && d.getDay() === 0 && d.getDate() >= 5 && d.getDate() <= 14,
    multiplier: 1.25, // First or second Sunday of Jan (after Nouvel An fades)
  },
  {
    name: "Pre-Saint-Valentin",
    check: (d) => d.getMonth() === 1 && d.getDate() >= 1 && d.getDate() <= 13,
    multiplier: 1.30, // up from 1.20 (social pressure F)
  },
  {
    name: "Saint-Valentin",
    check: (d) => d.getMonth() === 1 && d.getDate() === 14,
    multiplier: 1.35, // peak SOLITUDE for singles
  },
  {
    name: "Rentree",
    check: (d) => d.getMonth() === 8 && d.getDate() >= 1 && d.getDate() <= 15,
    multiplier: 1.15, // up from 1.10 (F come back strong)
  },
  {
    name: "Cuffing Season",
    check: (d) =>
      (d.getMonth() === 9 && d.getDate() >= 15) ||
      d.getMonth() === 10,
    multiplier: 1.06, // down from 1.10 (F more selective, Hily: 17% vs 39%)
  },

  // ── New psychological events ──
  {
    name: "Sunday Blues",
    check: (d) => {
      const h = getParisHour(d);
      return d.getDay() === 0 && h >= 18 && h <= 22;
    },
    multiplier: 1.08,
  },
  {
    name: "Vendredi FOMO",
    check: (d) => {
      const h = getParisHour(d);
      return d.getDay() === 5 && h >= 20 && h <= 23;
    },
    multiplier: 1.12,
  },
  {
    name: "Dimanche Ennui",
    check: (d) => {
      const h = getParisHour(d);
      return d.getDay() === 0 && h >= 14 && h <= 17;
    },
    multiplier: 1.08,
  },
  {
    name: "Winter Darkness",
    check: (d) => {
      const h = getParisHour(d);
      return [0, 1, 10, 11].includes(d.getMonth()) && h >= 17 && h <= 22;
    },
    multiplier: 1.05,
  },
  {
    name: "Post-Noel",
    check: (d) => d.getMonth() === 11 && d.getDate() >= 27 && d.getDate() <= 30,
    multiplier: 1.15,
  },
  {
    name: "8 Mars",
    check: (d) => d.getMonth() === 2 && d.getDate() === 8,
    multiplier: 1.08,
  },

  // ── Reducers ──
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
    multiplier: 1.08,
  },
];

// ── Weather modifiers ───────────────────────────────────────────

export const WEATHER_MODIFIERS: Record<string, number> = {
  "clear": 0.95,      // beau temps = dehors, moins d'app
  "clouds": 1.00,     // neutre
  "rain": 1.10,       // ENNUI indoor (OKCupid data)
  "drizzle": 1.05,    // leger
  "snow": 1.27,       // ENNUI + SOLITUDE (Hinge data: +27% tempete)
  "thunderstorm": 1.15,
  "mist": 1.03,
  "fog": 1.03,
};

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
