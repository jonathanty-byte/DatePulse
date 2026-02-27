import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@vercel/analytics";
import { computeScore } from "../lib/scoring";
import type { ScoreResult } from "../lib/scoring";
import { WEATHER_MODIFIERS } from "../lib/data";
import type { AppName } from "../lib/data";
import { formatParisDay, formatParisTime } from "../lib/franceTime";
import AppSelector from "../components/AppSelector";
import HeatmapWeek from "../components/HeatmapWeek";
import BestTimes from "../components/BestTimes";
import PoolFreshness from "../components/PoolFreshness";
import YearlyChart from "../components/YearlyChart";
import BoostOptimizer from "../components/BoostOptimizer";
import RedLightScreen from "../components/RedLightScreen";
import GreenLightScreen from "../components/GreenLightScreen";
import SessionTimer from "../components/SessionTimer";
import SessionSummary from "../components/SessionSummary";
import EmailSignup from "../components/EmailSignup";
import NavBar from "../components/NavBar";
import type { PulseSession, ActiveSessionState } from "../lib/sessionTracker";
import { startSession, getActiveSessionState } from "../lib/sessionTracker";
import { addMatch } from "../lib/matchTracker";

type SessionPhase = "idle" | "session_active" | "session_complete";

const WEATHER_EMOJI: Record<string, string> = {
  clear: "\u2600\uFE0F", clouds: "\u2601\uFE0F", rain: "\uD83C\uDF27\uFE0F",
  drizzle: "\uD83C\uDF26\uFE0F", snow: "\u2744\uFE0F", thunderstorm: "\u26C8\uFE0F",
  mist: "\uD83C\uDF2B\uFE0F", fog: "\uD83C\uDF2B\uFE0F",
};

const WEATHER_LABEL_FR: Record<string, string> = {
  clear: "Ensoleille", clouds: "Couvert", rain: "Pluie",
  drizzle: "Bruine", snow: "Neige", thunderstorm: "Orage",
  mist: "Brume", fog: "Brouillard",
};

/** Map wttr.in weatherCode to our condition keys. */
function mapWeatherCode(code: number): string {
  if (code === 113) return "clear";
  if ([116, 119, 122].includes(code)) return "clouds";
  if ([176, 263, 266, 281, 284].includes(code)) return "drizzle";
  if ([293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359].includes(code)) return "rain";
  if ([200, 386, 389, 392, 395].includes(code)) return "thunderstorm";
  if ([179, 182, 185, 227, 230, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) return "snow";
  if ([143, 248, 260].includes(code)) return "mist";
  return "clouds";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Home() {
  const [app, setApp] = useState<AppName>("tinder");
  const [now, setNow] = useState(new Date());
  const [result, setResult] = useState<ScoreResult>(() => computeScore(new Date(), "tinder"));

  // Session Timer state machine
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>(() => {
    // Resume active session from localStorage on load
    const active = getActiveSessionState();
    return active ? "session_active" : "idle";
  });
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(
    () => getActiveSessionState()
  );
  const [completedSession, setCompletedSession] = useState<PulseSession | null>(null);

  const handleStartSession = useCallback(
    (duration: number) => {
      const session = startSession(app, duration, result.score);
      setActiveSession(session);
      setSessionPhase("session_active");
      track("session_started", { app, duration, score: result.score });
    },
    [app, result.score]
  );

  const handleSessionEnd = useCallback(
    (session: PulseSession) => {
      // Also add matches to the existing Match Tracker for compatibility
      for (let i = 0; i < session.matches; i++) {
        addMatch(session.app, new Date(), "Session DatePulse");
      }
      setCompletedSession(session);
      setActiveSession(null);
      setSessionPhase("session_complete");
      track("session_completed", { app: session.app, matches: session.matches, duration: session.duration_actual });
    },
    []
  );

  const handleSessionClose = useCallback(() => {
    setCompletedSession(null);
    setSessionPhase("idle");
  }, []);

  const handleNewSession = useCallback(
    () => {
      setCompletedSession(null);
      setSessionPhase("idle");
    },
    []
  );

  const [weatherData, setWeatherData] = useState<{ condition: string; temp: number } | null>(() => {
    try {
      const cached = localStorage.getItem("dp_weather");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 30 * 60_000) return parsed.data;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [trendsData, setTrendsData] = useState<{
    trend_modifier: number;
    trend_pct: number;
    direction: string;
    confidence: string;
  } | null>(() => {
    try {
      const cached = localStorage.getItem("dp_trends");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 2 * 60 * 60_000) return parsed.data; // 2h TTL
      }
    } catch { /* ignore */ }
    return null;
  });

  // Fetch weather: instant from cache, refresh from wttr.in in background
  useEffect(() => {
    let cancelled = false;
    async function refreshWeather() {
      try {
        const res = await fetch("https://wttr.in/Paris?format=j1", { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error("wttr.in error");
        const json = await res.json();
        const current = json?.current_condition?.[0];
        if (current && !cancelled) {
          const data = { condition: mapWeatherCode(Number(current.weatherCode)), temp: Number(current.temp_C) };
          setWeatherData(data);
          localStorage.setItem("dp_weather", JSON.stringify({ data, ts: Date.now() }));
        }
      } catch {
        // If no cache, try static fallback
        if (!weatherData) {
          try {
            const res = await fetch("/weather.json");
            const json = await res.json();
            if (json?.condition && !cancelled) {
              setWeatherData({ condition: json.condition, temp: json.temp ?? 0 });
            }
          } catch { /* no weather */ }
        }
      }
    }
    refreshWeather();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Google Trends modifier (same pattern as weather, 2h TTL)
  useEffect(() => {
    let cancelled = false;
    async function refreshTrends() {
      try {
        const res = await fetch("/trends.json", { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error("trends.json fetch error");
        const json = await res.json();
        if (json?.trend_modifier && !cancelled) {
          const data = {
            trend_modifier: json.trend_modifier as number,
            trend_pct: (json.trend_pct ?? Math.round((json.trend_modifier - 1) * 100)) as number,
            direction: (json.direction ?? "neutral") as string,
            confidence: (json.confidence ?? "none") as string,
          };
          // Only update if we have real data (not the initial fallback)
          if (json.source !== "fallback") {
            setTrendsData(data);
            localStorage.setItem("dp_trends", JSON.stringify({ data, ts: Date.now() }));
          }
        }
      } catch {
        // trends.json absent or unreachable — silent fail, no modifier applied
      }
    }
    refreshTrends();
    return () => { cancelled = true; };
  }, []);

  // Recompute when app, time, weather, or trends change
  useEffect(() => {
    setResult(computeScore(now, app, weatherData?.condition, trendsData?.trend_modifier));
  }, [app, now, weatherData, trendsData]);

  // Weather display values
  const weatherMod = weatherData ? (WEATHER_MODIFIERS[weatherData.condition] ?? 1) : 1;
  const weatherPct = Math.round((weatherMod - 1) * 100);

  // Refresh every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNow(d);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const [showMore, setShowMore] = useState(false);

  return (
    <div className="min-h-screen bg-[#080b14] text-gray-100">
      <NavBar />

      {/* ── Above fold: App selector + Context badges ──── */}
      <section className="relative overflow-hidden px-4 pb-4 pt-6 sm:pb-6 sm:pt-10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 to-transparent" />
        <div className="relative mx-auto max-w-4xl">
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <AppSelector selected={app} onChange={setApp} />
          </motion.div>

          {/* Context badges: time, weather, trends */}
          <div className="mt-3 sm:mt-4 flex flex-col items-center gap-2">
            <motion.p
              className="text-xs sm:text-sm font-medium uppercase tracking-wider text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {capitalize(app)} — {formatParisDay(now)} — {formatParisTime(now)} (heure de Paris)
            </motion.p>
            {weatherData && (
              <motion.div
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs sm:text-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.13 }}
              >
                <span>{WEATHER_EMOJI[weatherData.condition] ?? "\u2601\uFE0F"}</span>
                <span className="text-gray-400">
                  Paris {weatherData.temp}&deg;C &middot; {WEATHER_LABEL_FR[weatherData.condition] ?? weatherData.condition}
                </span>
                <span className="text-gray-600">|</span>
                <span className={weatherPct > 0 ? "text-green-400" : weatherPct < 0 ? "text-amber-400" : "text-gray-500"}>
                  {weatherPct === 0 ? "Impact neutre" : `${weatherPct > 0 ? "+" : ""}${weatherPct}% sur le score`}
                </span>
              </motion.div>
            )}
            {trendsData && trendsData.trend_pct !== 0 && trendsData.confidence !== "none" && (
              <motion.div
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs sm:text-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.16 }}
                style={{
                  opacity: trendsData.confidence === "high" ? 1
                    : trendsData.confidence === "medium" ? 0.75
                    : 0.5,
                }}
              >
                <span>{trendsData.direction === "up" ? "\uD83D\uDCC8" : "\uD83D\uDCC9"}</span>
                <span className="text-gray-400">Tendance Google</span>
                <span className="text-gray-600">|</span>
                <span className={trendsData.trend_pct > 0 ? "text-green-400" : "text-amber-400"}>
                  {trendsData.trend_pct > 0 ? "+" : ""}{trendsData.trend_pct}% ce mois
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── Session state machine: idle / active / complete ── */}
      <AnimatePresence mode="wait">
        {sessionPhase === "session_active" && activeSession ? (
          <SessionTimer
            key="timer"
            app={app}
            activeSession={activeSession}
            weatherCondition={weatherData?.condition}
            trendModifier={trendsData?.trend_modifier}
            onSessionEnd={handleSessionEnd}
          />
        ) : sessionPhase === "session_complete" && completedSession ? (
          <SessionSummary
            key="summary"
            session={completedSession}
            app={app}
            onClose={handleSessionClose}
            onNewSession={handleNewSession}
            isGreenLight={result.score >= 35}
          />
        ) : result.score < 35 ? (
          <RedLightScreen
            key="red"
            score={result.score}
            event={result.event}
            app={app}
            now={now}
          />
        ) : (
          <GreenLightScreen
            key="green"
            score={result.score}
            event={result.event}
            app={app}
            now={now}
            onStartSession={handleStartSession}
          />
        )}
      </AnimatePresence>

      {/* ── Heatmap + Best Times + Pool Freshness (visible after scroll) ── */}
      <section className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <motion.div
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-white">
                  Activite de la semaine — {capitalize(app)}
                </h2>
                <HeatmapWeek now={now} app={app} />
              </motion.div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-6">
              <motion.div
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-white">
                  Tes 3 fenetres de la semaine
                </h2>
                <BestTimes now={now} app={app} />
              </motion.div>

              <PoolFreshness now={now} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Progressive disclosure toggle ──────────────── */}
      <div className="px-4 pb-4">
        <div className="mx-auto max-w-6xl">
          <motion.button
            onClick={() => setShowMore(!showMore)}
            className="mx-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-gray-400 transition hover:bg-white/[0.06] hover:text-gray-200"
            whileTap={{ scale: 0.97 }}
          >
            {showMore ? "Masquer les details" : "Voir les details"}
            <motion.span
              animate={{ rotate: showMore ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs"
            >
              &#x25BC;
            </motion.span>
          </motion.button>
        </div>
      </div>

      {/* ── Collapsed sections (progressive disclosure) ── */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Boost Optimizer */}
            <section className="px-4 py-2 sm:py-4">
              <div className="mx-auto max-w-6xl">
                <BoostOptimizer app={app} now={now} />
              </div>
            </section>

            {/* Yearly activity chart */}
            <section className="px-4 py-2 sm:py-4">
              <div className="mx-auto max-w-6xl">
                <YearlyChart app={app} now={now} />
              </div>
            </section>

            {/* How it works */}
            <section className="px-4 py-10 sm:py-16">
              <div className="mx-auto max-w-4xl">
                <h2 className="mb-8 sm:mb-10 text-center text-xl sm:text-2xl font-bold">
                  Comment ca marche
                </h2>
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
                  {[
                    {
                      num: "1",
                      title: "On analyse",
                      desc: "Donnees officielles Tinder, Bumble, Hinge, Happn + etudes independantes. On sait quand les apps sont actives.",
                    },
                    {
                      num: "2",
                      title: "On te dit quand",
                      desc: "Hors pic = attends. Momentum = fonce. 15 min max, pas plus.",
                    },
                    {
                      num: "3",
                      title: "Tu optimises",
                      desc: "Moins de temps perdu, plus de matches. Swipe au bon moment.",
                    },
                  ].map((step) => (
                    <div
                      key={step.num}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 text-center"
                    >
                      <div className="mx-auto mb-3 sm:mb-4 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/30">
                        {step.num}
                      </div>
                      <h3 className="mb-1.5 sm:mb-2 font-semibold text-sm sm:text-base">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Feature CTAs */}
            <section className="px-4 py-8 sm:py-12">
              <div className="mx-auto max-w-4xl grid gap-4 sm:gap-6 sm:grid-cols-2">
                <a
                  href="/wrapped"
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-brand-900/30 to-purple-900/20 p-6 sm:p-8 text-center transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <span className="text-3xl">&#x1F4CA;</span>
                  <h3 className="mt-3 text-lg font-bold text-white">Dating Wrapped</h3>
                  <p className="mt-2 text-xs sm:text-sm text-gray-400 leading-relaxed">
                    Upload ton export RGPD et decouvre tes vrais stats : swipes, matches, ghost rate, temps perdu...
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 group-hover:text-brand-300 transition">
                    Analyser mes donnees
                  </span>
                </a>

                <a
                  href="/coach"
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-brand-900/20 to-gray-900 p-6 sm:p-8 text-center transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <span className="text-3xl">&#x1F4AC;</span>
                  <h3 className="mt-3 text-lg font-bold text-white">Message Coach</h3>
                  <p className="mt-2 text-xs sm:text-sm text-gray-400 leading-relaxed">
                    Colle ta conversation et recois 3 suggestions calibrees — du safe a l'audacieux.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 group-hover:text-brand-300 transition">
                    Lancer le coach
                  </span>
                </a>
              </div>
            </section>

            {/* Methodology teaser */}
            <section className="px-4 py-8 sm:py-12">
              <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-brand-900/20 p-6 sm:p-8 text-center">
                <h2 className="text-lg sm:text-xl font-bold">Donnees 100% transparentes</h2>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-400 leading-relaxed">
                  DatePulse n'invente rien. Chaque app a ses propres patterns d'activite,
                  calibres sur les publications officielles (Tinder Year in Swipe,
                  Hinge Blog, Bumble PR) et les etudes tierces (Nielsen, Ogury).
                </p>
                <a
                  href="/methodology"
                  className="mt-4 sm:mt-5 inline-block rounded-lg bg-white/5 px-5 sm:px-6 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10 hover:text-white"
                >
                  Voir la methodologie
                </a>
              </div>
            </section>

            {/* Email Signup */}
            <section className="px-4 py-8 sm:py-12">
              <div className="mx-auto max-w-2xl">
                <EmailSignup />
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-white/5 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-500">
            DatePulse — Swipe when it matters.
          </p>
          <p>
            <a href="/methodology" className="hover:text-gray-400 transition">Methodologie</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/audit" className="hover:text-gray-400 transition">Audit</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/coach" className="hover:text-gray-400 transition">Coach</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/wrapped" className="hover:text-gray-400 transition">Wrapped</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/tracker" className="hover:text-gray-400 transition">Tracker</a>
            <span className="mx-2 text-gray-700">|</span>
            <span>@EvolvedMonkey</span>
          </p>
          <p className="text-gray-700">
            Aucune donnee personnelle stockee sur nos serveurs.
          </p>
        </div>
      </footer>
    </div>
  );
}
