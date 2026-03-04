import { motion } from "framer-motion";
import ProfileAudit from "../components/ProfileAudit";
import NavBar from "../components/NavBar";

export default function Audit() {
  // Check if user came from Red Light CTA
  const fromRedLight = new URLSearchParams(window.location.search).get("from") === "redlight";

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />

      {/* Header */}
      <section className="relative overflow-hidden px-4 pb-6 pt-8 sm:pb-8 sm:pt-12">
        <div className="absolute inset-0" />
        <div className="relative mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              <span className="text-xl sm:text-2xl mr-2">&#x1F50D;</span>
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                AI Profile Audit
              </span>
            </h1>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-500">
              Ton profil est-il au niveau ? L'IA te donne un score et des recommandations.
            </p>
          </motion.div>

          {/* Red Light context message */}
          {fromRedLight && (
            <motion.div
              className="mt-4 bg-red-50 border border-red-200 px-5 py-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-sm text-red-500">
                &#x1F534; Profite de ce moment calme pour ameliorer ton profil.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Audit component */}
      <section className="px-4 pb-12 sm:pb-16">
        <ProfileAudit />
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-6">
        <div className="mx-auto max-w-2xl text-center text-xs text-slate-400">
          <p>L'analyse est effectuee par IA. Les resultats sont indicatifs.</p>
        </div>
      </footer>
    </div>
  );
}
