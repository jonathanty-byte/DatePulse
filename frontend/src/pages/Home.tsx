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

const WEATHER_ICON: Record<string, string> = {
  clear: "sun", clouds: "cloud", rain: "cloud-rain",
  drizzle: "cloud-drizzle", snow: "snowflake", thunderstorm: "cloud-lightning",
  mist: "cloud-fog", fog: "cloud-fog",
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
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />

      {/* ── Above fold: Hero + App selector + Context badges ──── */}
      <section className="px-4 pb-4 pt-12 sm:pb-8 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            className="text-4xl sm:text-6xl font-extrabold tracking-[-0.04em] text-slate-900"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Swipe when it matters.
          </motion.h1>
          <motion.p
            className="mt-4 text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            Scores en temps réel basés sur l'activité féminine. Optimise chaque swipe.
          </motion.p>

          <motion.div
            className="mt-8 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <AppSelector selected={app} onChange={setApp} />
          </motion.div>

          {/* Context badges: time, weather, trends */}
          <div className="mt-4 sm:mt-6 flex flex-col items-center gap-2">
            <motion.p
              className="text-xs sm:text-sm font-medium uppercase tracking-[0.08em] text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {capitalize(app)} — {formatParisDay(now)} — {formatParisTime(now)}
            </motion.p>
            {weatherData && (
              <motion.div
                className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-1.5 text-xs sm:text-sm shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.23 }}
              >
                <span className="text-slate-400">
                  Paris {weatherData.temp}&deg;C &middot; {WEATHER_LABEL_FR[weatherData.condition] ?? weatherData.condition}
                </span>
                <span className="text-gray-300">|</span>
                <span className={weatherPct > 0 ? "text-green-600" : weatherPct < 0 ? "text-amber-600" : "text-slate-400"}>
                  {weatherPct === 0 ? "Impact neutre" : `${weatherPct > 0 ? "+" : ""}${weatherPct}% sur le score`}
                </span>
              </motion.div>
            )}
            {trendsData && trendsData.trend_pct !== 0 && trendsData.confidence !== "none" && (
              <motion.div
                className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-1.5 text-xs sm:text-sm shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.26 }}
                style={{
                  opacity: trendsData.confidence === "high" ? 1
                    : trendsData.confidence === "medium" ? 0.75
                    : 0.5,
                }}
              >
                <span className="text-slate-400">Tendance Google</span>
                <span className="text-gray-300">|</span>
                <span className={trendsData.trend_pct > 0 ? "text-green-600" : "text-amber-600"}>
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
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <motion.div
                className="border border-gray-200 bg-white p-5 sm:p-7 shadow-[0_6px_32px_-8px_rgba(15,23,42,0.06)]"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Activité de la semaine — {capitalize(app)}
                </h2>
                <HeatmapWeek now={now} app={app} />
              </motion.div>
            </div>

            <div className="flex flex-col gap-5 sm:gap-6">
              <motion.div
                className="border border-gray-200 bg-white p-5 sm:p-7 shadow-[0_6px_32px_-8px_rgba(15,23,42,0.06)]"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Tes 3 fenêtres de la semaine
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
            className="mx-auto flex items-center gap-2 border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-slate-500 transition hover:bg-gray-50 hover:text-slate-900 shadow-sm"
            whileTap={{ scale: 0.97 }}
          >
            {showMore ? "Masquer les détails" : "Voir les détails"}
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
                <h2 className="mb-8 sm:mb-10 text-center text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  Comment ça marche
                </h2>
                <div className="grid gap-5 sm:gap-6 sm:grid-cols-3">
                  {[
                    {
                      num: "1",
                      title: "On analyse",
                      desc: "Données officielles Tinder, Bumble, Hinge, Happn + études indépendantes.",
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
                      className="border border-gray-200 bg-white p-5 sm:p-7 text-center shadow-[0_4px_24px_-6px_rgba(15,23,42,0.06)]"
                    >
                      <div className="mx-auto mb-3 sm:mb-4 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center bg-brand-500 text-sm font-bold text-white">
                        {step.num}
                      </div>
                      <h3 className="mb-1.5 sm:mb-2 font-bold text-sm sm:text-base text-slate-900">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Feature CTAs */}
            <section className="px-4 py-8 sm:py-12">
              <div className="mx-auto max-w-4xl grid gap-5 sm:gap-6 sm:grid-cols-2">
                <a
                  href="/wrapped"
                  className="group border border-gray-200 bg-white p-6 sm:p-8 transition hover:shadow-lg hover:border-brand-200 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.06)]"
                >
                  <div className="text-[10px] font-bold tracking-[0.15em] text-pink-500 uppercase">Wrapped</div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">Dating Wrapped</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    Upload ton export RGPD et découvre tes vrais stats : swipes, matches, ghost rate...
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 group-hover:text-brand-600 transition">
                    Analyser mes données →
                  </span>
                </a>

                <a
                  href="/coach"
                  className="group border border-gray-200 bg-white p-6 sm:p-8 transition hover:shadow-lg hover:border-brand-200 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.06)]"
                >
                  <div className="text-[10px] font-bold tracking-[0.15em] text-amber-600 uppercase">Coach</div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">Message Coach</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    Colle ta conversation et reçois 3 suggestions calibrées — du safe à l'audacieux.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 group-hover:text-brand-600 transition">
                    Lancer le coach →
                  </span>
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
      <footer className="border-t border-gray-200 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-slate-400 space-y-2">
          <p className="font-medium text-slate-500">
            DatePulse — Swipe when it matters.
          </p>
          <p>
            <a href="/coach" className="hover:text-slate-700 transition">Coach</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/wrapped" className="hover:text-slate-700 transition">Wrapped</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/tracker" className="hover:text-slate-700 transition">Tracker</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/insights" className="hover:text-slate-700 transition">Insights</a>
            <span className="mx-2 text-slate-300">|</span>
            <span>@EvolvedMonkey</span>
          </p>
          <p className="text-slate-300">
            Aucune donnée personnelle stockée sur nos serveurs.
          </p>
        </div>
      </footer>
    </div>
  );
}
