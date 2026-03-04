import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import MessageCoach from "../components/MessageCoach";
import ProfileAudit from "../components/ProfileAudit";
import { motion } from "framer-motion";

type CoachTab = "messages" | "photos";

export default function Coach() {
  // Check URL for tab hint (e.g. /coach?tab=photo or redirect from /audit)
  const [tab, setTab] = useState<CoachTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromRedLight = params.get("from") === "redlight";
    const tabParam = params.get("tab");
    if (fromRedLight || tabParam === "photo" || tabParam === "photos") return "photos";
    if (window.location.pathname.startsWith("/audit")) return "photos";
    return "messages";
  });

  const fromRedLight = new URLSearchParams(window.location.search).get("from") === "redlight";

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />
      <section className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                AI Coach
              </span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              {tab === "messages"
                ? "Colle ta conversation et recois 3 suggestions calibrees"
                : "Ton profil est-il au niveau ? L'IA te donne un score et des recommandations."}
            </p>
          </motion.div>

          {/* Tab switcher */}
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setTab("messages")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                tab === "messages"
                  ? "bg-brand-50 border border-brand-500/40 text-brand-500"
                  : "bg-white border border-gray-200 text-slate-500 hover:bg-gray-100 hover:text-slate-900"
              }`}
            >
              <span>💬</span> Messages
            </button>
            <button
              onClick={() => setTab("photos")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                tab === "photos"
                  ? "bg-brand-50 border border-brand-500/40 text-brand-500"
                  : "bg-white border border-gray-200 text-slate-500 hover:bg-gray-100 hover:text-slate-900"
              }`}
            >
              <span>📷</span> Photos
            </button>
          </div>

          {/* Red Light context message */}
          {fromRedLight && tab === "photos" && (
            <motion.div
              className="mb-6 bg-red-50 border border-red-200 px-5 py-3 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-sm text-red-500">
                🔴 Profite de ce moment calme pour ameliorer ton profil.
              </p>
            </motion.div>
          )}

          {/* Tab content */}
          {tab === "messages" ? <MessageCoach /> : <ProfileAudit />}
        </div>
      </section>
      <footer className="border-t border-gray-200 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-slate-400 space-y-2">
          <p className="font-medium text-slate-400">DatePulse — Swipe when it matters.</p>
          <p>
            <a href="/" className="hover:text-slate-900 transition">Accueil</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/wrapped" className="hover:text-slate-900 transition">Wrapped</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/tracker" className="hover:text-slate-900 transition">Tracker</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/insights" className="hover:text-slate-900 transition">Insights</a>
          </p>
          <p className="text-slate-300">
            L'analyse est effectuee par IA. Les resultats sont indicatifs.
          </p>
        </div>
      </footer>
    </div>
  );
}
