import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "../components/NavBar";
import WrappedUpload from "../components/WrappedUpload";
import WrappedReport from "../components/WrappedReport";
import WrappedShare from "../components/WrappedShare";
import type { WrappedMetrics } from "../lib/wrappedMetrics";
import type { ConversationInsights } from "../lib/conversationIntelligence";

export default function Wrapped() {
  const [metrics, setMetrics] = useState<WrappedMetrics | null>(null);
  const [conversationInsights, setConversationInsights] = useState<ConversationInsights | undefined>(undefined);
  const [showShare, setShowShare] = useState(false);

  const handleDataParsed = async (m: WrappedMetrics, parsedConversations?: import("../lib/wrappedParser").ConversationRecord[]) => {
    setMetrics(m);
    // Compute conversation insights if message content is available
    if (parsedConversations && parsedConversations.length > 0) {
      const { computeConversationInsights } = await import("../lib/conversationIntelligence");
      const { isConversationPulseEnabled, trackConversationUpload } = await import("../lib/featureFlags");
      if (isConversationPulseEnabled()) {
        const totalMatches = m.totalSwipes > 0
          ? Math.round((m.swipeToMatchRate / 100) * m.rightSwipes)
          : 0;
        const insights = computeConversationInsights(
          parsedConversations,
          m.source as import("../lib/wrappedParser").WrappedAppSource,
          totalMatches
        );
        setConversationInsights(insights);
        trackConversationUpload(m.source, parsedConversations.length);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-gray-100">
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
            <WrappedReport
              metrics={metrics}
              conversationInsights={conversationInsights}
              onShareClick={() => setShowShare(true)}
            />
          ) : (
            <WrappedUpload onDataParsed={handleDataParsed} />
          )}
        </div>
      </section>
      <footer className="border-t border-white/5 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-500">DatePulse — Swipe when it matters.</p>
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
