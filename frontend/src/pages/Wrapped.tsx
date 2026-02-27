import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "../components/NavBar";
import WrappedUpload from "../components/WrappedUpload";
import WrappedReport from "../components/WrappedReport";
import WrappedShare from "../components/WrappedShare";
import type { WrappedMetrics } from "../lib/wrappedMetrics";

export default function Wrapped() {
  const [metrics, setMetrics] = useState<WrappedMetrics | null>(null);
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
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
                Dating Wrapped
              </span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-400">
              Decouvre tes stats de dating en 2 minutes
            </p>
          </motion.div>

          {metrics ? (
            <WrappedReport metrics={metrics} onShareClick={() => setShowShare(true)} />
          ) : (
            <WrappedUpload onDataParsed={setMetrics} />
          )}
        </div>
      </section>
      <footer className="border-t border-white/5 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-500">DateDetox — Swipe less. Match more.</p>
          <p>
            <a href="/" className="hover:text-gray-400 transition">Accueil</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/coach" className="hover:text-gray-400 transition">Coach</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/audit" className="hover:text-gray-400 transition">Audit</a>
            <span className="mx-2 text-gray-700">|</span>
            <a href="/methodology" className="hover:text-gray-400 transition">Methodologie</a>
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showShare && metrics && (
          <WrappedShare metrics={metrics} onClose={() => setShowShare(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
