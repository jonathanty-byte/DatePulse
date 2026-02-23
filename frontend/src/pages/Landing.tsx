/**
 * Landing / marketing page for DatePulse.
 *
 * Sections: Hero with live score, How It Works, Features, CTA.
 */

import { useEffect, useState } from "react";
import ScoreGauge from "../components/ScoreGauge";
import { fetchLiveScore, fetchApps } from "../services/api";
import type { ScoreResponse } from "../types";

const FEATURES = [
  {
    title: "Score en temps reel",
    desc: "Un score 0-100 calcule en continu a partir de 6 sources de donnees publiques.",
    icon: "~",
  },
  {
    title: "Previsions 7 jours",
    desc: "Heatmap heure par heure pour planifier tes sessions au meilleur moment.",
    icon: "#",
  },
  {
    title: "Alertes Telegram",
    desc: "Recois une notification quand l'activite depasse le top 15% historique.",
    icon: "!",
  },
  {
    title: "4 apps couvertes",
    desc: "Tinder, Bumble, Hinge et Happn analyses en parallele pour la France.",
    icon: "+",
  },
];

const STEPS = [
  { num: "1", title: "On collecte", desc: "Google Trends, Wikipedia, Bluesky, App Store, meteo, calendrier" },
  { num: "2", title: "On calcule", desc: "Algorithme composite 7 facteurs, normalise sur l'historique" },
  { num: "3", title: "Tu agis", desc: "Score live + alertes au bon moment = plus de matches" },
];

export default function Landing() {
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    fetchLiveScore("tinder", "paris")
      .then(setScore)
      .catch(() => {});
    fetchApps().catch(() => {});
  }, []);

  // Cycle through apps for demo
  const [demoApp, setDemoApp] = useState("tinder");
  useEffect(() => {
    const apps = ["tinder", "bumble", "hinge", "happn"];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % apps.length;
      setDemoApp(apps[idx]);
      fetchLiveScore(apps[idx], "paris")
        .then(setScore)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:pt-24">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Sais quand ouvrir ton app
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              pour maximiser tes matches
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            DatePulse analyse 6 sources de donnees en temps reel pour te dire
            le meilleur moment pour swiper sur Tinder, Bumble, Hinge et Happn.
          </p>

          {/* Live score demo */}
          <div className="mt-10 flex flex-col items-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-gray-500">
              Score live &mdash; {demoApp.charAt(0).toUpperCase() + demoApp.slice(1)} Paris
            </p>
            <ScoreGauge
              score={score?.score ?? null}
              percentile={score?.percentile ?? null}
              size={180}
            />
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/dashboard"
              className="rounded-xl bg-brand-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-brand-500"
            >
              Voir le dashboard
            </a>
            <a
              href="https://t.me/DatePulseBot"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-gray-700 bg-gray-900 px-8 py-3 text-lg font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-800"
            >
              Rejoindre le bot Telegram
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Comment ca marche
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
                  {step.num}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Fonctionnalites
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/20 text-lg font-bold text-brand-400">
                  {f.icon}
                </div>
                <h3 className="mb-1 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-brand-900/30 p-10 text-center">
          <h2 className="text-2xl font-bold">
            Pret a matcher au bon moment ?
          </h2>
          <p className="mt-3 text-gray-400">
            Gratuit. Pas de compte requis. Donnees mises a jour toutes les heures.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/dashboard"
              className="rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-brand-500"
            >
              Acceder au dashboard
            </a>
            <a
              href="https://t.me/DatePulseBot"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-gray-700 bg-gray-900 px-6 py-3 font-semibold text-gray-200 transition hover:border-gray-500"
            >
              Bot Telegram
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-4 py-8">
        <div className="mx-auto max-w-4xl text-center text-sm text-gray-500">
          <p>
            DatePulse &mdash; Donnees publiques agreges de Google Trends,
            Wikipedia, Bluesky, App Store, Open-Meteo.
          </p>
          <p className="mt-2">
            Aucune donnee personnelle collectee. Aucune affiliation avec les apps de dating.
          </p>
        </div>
      </footer>
    </div>
  );
}
