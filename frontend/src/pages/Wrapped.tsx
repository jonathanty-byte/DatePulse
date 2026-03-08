import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "../components/NavBar";
import WrappedUpload from "../components/WrappedUpload";
import WrappedReport from "../components/WrappedReport";
import WrappedShare from "../components/WrappedShare";
import WrappedReveal from "../components/WrappedReveal";
import EmailCaptureModal from "../components/EmailCaptureModal";
import DatePulseLogo from "../components/DatePulseLogo";
import type { WrappedMetrics } from "../lib/wrappedMetrics";
import type { ConversationInsights } from "../lib/conversationIntelligence";
import type { AdvancedSwipeInsights } from "../lib/swipeAdvanced";
import type { InsightsDataSet } from "../lib/insightsEngine";
import { saveUserInsights } from "../lib/insightsPersistence";
import { usePaywall } from "../lib/usePaywall";
import { DEMO_PARSED_DATA } from "../lib/demoData";
import { computeWrappedMetrics } from "../lib/wrappedMetrics";

// ── Computing overlay (shown while async insights are computed) ──

const COMPUTING_MESSAGES = [
  "Analyse des conversations...",
  "Détection des patterns...",
  "Calcul des hypothèses...",
  "Génération du rapport...",
];

function ComputingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0);

  // Rotate messages every 1.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % COMPUTING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        className="flex flex-col items-center py-12 sm:py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Branded logo */}
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            className="mx-auto flex h-[100px] w-[100px] items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <DatePulseLogo iconOnly className="h-12 w-12" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">DatePulse</h2>
            <p className="text-xs text-slate-400 mt-1">Analyse en cours...</p>
          </div>
        </div>

        {/* Rotating message */}
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            className="mt-8 text-sm text-slate-500 font-medium"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {COMPUTING_MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>

        {/* Indeterminate progress bar */}
        <div className="relative mt-4 h-1 w-48 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="absolute top-0 h-full w-16 rounded-full bg-brand-500"
            animate={{ left: ["-4rem", "12rem"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

export default function Wrapped() {
  const [metrics, setMetrics] = useState<WrappedMetrics | null>(null);
  const [conversationInsights, setConversationInsights] = useState<ConversationInsights | undefined>(undefined);
  const [advancedSwipeInsights, setAdvancedSwipeInsights] = useState<AdvancedSwipeInsights | undefined>(undefined);
  const [premiumInsights, setPremiumInsights] = useState<InsightsDataSet | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const paywall = usePaywall();

  // Auto-load demo mode if ?demo=true in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true" && !metrics) {
      loadDemo();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDemo = async () => {
    setIsDemo(true);
    const demoMetrics = computeWrappedMetrics(DEMO_PARSED_DATA);
    await handleDataParsed(demoMetrics, DEMO_PARSED_DATA.conversations, DEMO_PARSED_DATA);
  };

  const handleDataParsed = async (
    m: WrappedMetrics,
    parsedConversations?: import("../lib/wrappedParser").ConversationRecord[],
    parsedData?: import("../lib/wrappedParser").ParsedData
  ) => {
    // Show computing overlay while all insights are generated
    setIsComputing(true);
    // Yield to React to render the overlay before starting heavy computation
    await new Promise(r => setTimeout(r, 50));
    const overlayStart = Date.now();

    let convInsights: ConversationInsights | undefined;
    let swipeIns: AdvancedSwipeInsights | undefined;
    let premIns: InsightsDataSet | null = null;

    try {
      // Compute conversation insights if message content is available
      if (parsedConversations && parsedConversations.length > 0) {
        try {
          const { computeConversationInsights } = await import("../lib/conversationIntelligence");
          const { isConversationPulseEnabled, trackConversationUpload } = await import("../lib/featureFlags");
          if (isConversationPulseEnabled()) {
            const totalMatches = m.totalSwipes > 0
              ? Math.round((m.swipeToMatchRate / 100) * m.rightSwipes)
              : 0;
            convInsights = computeConversationInsights(
              parsedConversations,
              m.source as import("../lib/wrappedParser").WrappedAppSource,
              totalMatches
            );
            trackConversationUpload(m.source, parsedConversations.length);
          }
        } catch {
          // Conversation insights computation failed — graceful degradation
        }
      }

      // Yield between heavy computations so overlay stays animated
      await new Promise(r => setTimeout(r, 0));

      // Compute advanced swipe insights if swipe data is available
      if (parsedData && parsedData.swipes && parsedData.swipes.length >= 50) {
        try {
          const { computeAdvancedSwipeInsights } = await import("../lib/swipeAdvanced");
          swipeIns = computeAdvancedSwipeInsights(parsedData, m);
        } catch {
          // Advanced swipe insights failed — graceful degradation
        }
      }

      // Yield between heavy computations
      await new Promise(r => setTimeout(r, 0));

      // Persist for Insights page personalization
      try {
        const persistedData = {
          version: 1 as const,
          persistedAt: new Date().toISOString(),
          source: m.source,
          metrics: m,
          conversationInsights: convInsights,
          advancedSwipeInsights: swipeIns,
        };
        saveUserInsights(persistedData);

        // Generate premium insights from the engine
        const { generateUserInsights } = await import("../lib/insightsEngine");
        premIns = generateUserInsights(persistedData);
      } catch {
        // Premium insights generation failed — graceful degradation
      }

      // Ensure overlay stays visible at least 2s for UX polish
      const elapsed = Date.now() - overlayStart;
      const MIN_OVERLAY_MS = 2000;
      if (elapsed < MIN_OVERLAY_MS) {
        await new Promise(r => setTimeout(r, MIN_OVERLAY_MS - elapsed));
      }

      // Set all state atomically — metrics LAST (triggers report render)
      setConversationInsights(convInsights);
      setAdvancedSwipeInsights(swipeIns);
      setPremiumInsights(premIns);
      setMetrics(m);
    } catch {
      // Still show the report with basic metrics (graceful degradation)
      setMetrics(m);
    } finally {
      setIsComputing(false);
      setShowReveal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <NavBar />
      <section className="px-4 py-8 sm:py-12">
        {isComputing ? (
          /* Computing overlay: shown while async insights are generated */
          <ComputingOverlay />
        ) : showReveal && metrics ? (
          /* Story reveal: animated slides before the full report */
          <WrappedReveal metrics={metrics} onComplete={() => setShowReveal(false)} />
        ) : metrics ? (
          /* Report mode: wider container matching Insights layout */
          <div className="mx-auto max-w-4xl">
            {isDemo && (
              <motion.div
                className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm font-medium text-amber-700">
                  Données de démonstration — <a href="/wrapped" className="underline font-bold" onClick={(e) => { e.preventDefault(); setMetrics(null); setIsDemo(false); window.history.replaceState(null, "", "/wrapped"); }}>upload tes données</a> pour voir tes vrais stats
                </p>
              </motion.div>
            )}
            <WrappedReport
              metrics={metrics}
              conversationInsights={conversationInsights}
              advancedSwipeInsights={advancedSwipeInsights}
              premiumInsights={premiumInsights}
              isPremiumUnlocked={paywall.isUnlocked}
              isEarlyAccess={paywall.isEarlyAccess}
              onPaywallCtaClick={paywall.openEmailModal}
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
                Découvre tes stats de dating en 2 minutes
              </p>
            </motion.div>
            <div className="text-center mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-gray-600 mb-2">
                Pas encore tes données ? Ça prend 1-3 jours.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
                <a
                  href="/demo"
                  className="text-indigo-600 font-semibold hover:underline text-sm"
                >
                  Voir un rapport démo →
                </a>
              </div>
            </div>
            <WrappedUpload onDataParsed={handleDataParsed} />
          </div>
        )}
      </section>
      <footer className="border-t border-gray-200 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-slate-400 space-y-2">
          <p className="font-medium text-slate-400">DatePulse — Swipe au bon moment.</p>
          <p>
            <a href="/" className="hover:text-slate-900 transition">Accueil</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/wrapped" className="hover:text-slate-900 transition">Wrapped</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/score" className="hover:text-slate-900 transition">Score</a>
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showShare && metrics && (
          <WrappedShare metrics={metrics} onClose={() => setShowShare(false)} />
        )}
      </AnimatePresence>

      <EmailCaptureModal
        isOpen={paywall.showEmailModal}
        onClose={paywall.closeEmailModal}
        onSubmit={paywall.submitEarlyAccess}
      />
    </div>
  );
}
