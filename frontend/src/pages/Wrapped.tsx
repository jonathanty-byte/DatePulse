import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "../components/NavBar";
import WrappedUpload from "../components/WrappedUpload";
import WrappedReport from "../components/WrappedReport";
import WrappedShare from "../components/WrappedShare";
import type { WrappedMetrics } from "../lib/wrappedMetrics";
import type { ConversationInsights } from "../lib/conversationIntelligence";
import type { AdvancedSwipeInsights } from "../lib/swipeAdvanced";

export default function Wrapped() {
  const [metrics, setMetrics] = useState<WrappedMetrics | null>(null);
  const [conversationInsights, setConversationInsights] = useState<ConversationInsights | undefined>(undefined);
  const [advancedSwipeInsights, setAdvancedSwipeInsights] = useState<AdvancedSwipeInsights | undefined>(undefined);
  const [showShare, setShowShare] = useState(false);

  const handleDataParsed = async (
    m: WrappedMetrics,
    parsedConversations?: import("../lib/wrappedParser").ConversationRecord[],
    parsedData?: import("../lib/wrappedParser").ParsedData
  ) => {
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

    // Compute advanced swipe insights if swipe data is available
    if (parsedData && parsedData.swipes && parsedData.swipes.length >= 50) {
      try {
        const { computeAdvancedSwipeInsights } = await import("../lib/swipeAdvanced");
        const swipeInsights = computeAdvancedSwipeInsights(parsedData, m);
        setAdvancedSwipeInsights(swipeInsights);
      } catch {
        // Graceful degradation: advanced swipe insights are optional
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />
      <section className="px-4 py-8 sm:py-12">
        {metrics ? (
          /* Report mode: wider container matching Insights layout */
          <div className="mx-auto max-w-4xl">
            <WrappedReport
              metrics={metrics}
              conversationInsights={conversationInsights}
              advancedSwipeInsights={advancedSwipeInsights}
              onShareClick={() => setShowShare(true)}
            />
          </div>
        ) : (
          /* Upload mode: narrow centered container */
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
              <p className="mt-2 text-sm sm:text-base text-slate-500">
                Decouvre tes stats de dating en 2 minutes
              </p>
            </motion.div>
            <WrappedUpload onDataParsed={handleDataParsed} />
          </div>
        )}
      </section>
      <footer className="border-t border-gray-200 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-slate-400 space-y-2">
          <p className="font-medium text-slate-400">DatePulse — Swipe when it matters.</p>
          <p>
            <a href="/" className="hover:text-slate-900 transition">Accueil</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/coach" className="hover:text-slate-900 transition">Coach</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/tracker" className="hover:text-slate-900 transition">Tracker</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/insights" className="hover:text-slate-900 transition">Insights</a>
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
