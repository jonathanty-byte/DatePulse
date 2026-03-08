import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "../components/NavBar";
import WrappedReport from "../components/WrappedReport";
import WrappedShare from "../components/WrappedShare";
import WrappedReveal from "../components/WrappedReveal";
import EmailCaptureModal from "../components/EmailCaptureModal";
import DatePulseLogo from "../components/DatePulseLogo";
import type { WrappedMetrics } from "../lib/wrappedMetrics";
import type { ConversationInsights } from "../lib/conversationIntelligence";
import type { AdvancedSwipeInsights } from "../lib/swipeAdvanced";
import type { InsightsDataSet } from "../lib/insightsEngine";
import { usePaywall } from "../lib/usePaywall";
import { DEMO_PARSED_DATA } from "../lib/demoData";
import { computeWrappedMetrics } from "../lib/wrappedMetrics";

// ── Computing overlay (shared with Wrapped.tsx) ──

const COMPUTING_MESSAGES = [
  "Analyse des conversations...",
  "Detection des patterns...",
  "Calcul des hypotheses...",
  "Generation du rapport...",
];

function ComputingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0);

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

// ── Demo page: auto-loads anonymized report with paywall ──

export default function Demo() {
  const [metrics, setMetrics] = useState<WrappedMetrics | null>(null);
  const [conversationInsights, setConversationInsights] = useState<ConversationInsights | undefined>(undefined);
  const [advancedSwipeInsights, setAdvancedSwipeInsights] = useState<AdvancedSwipeInsights | undefined>(undefined);
  const [premiumInsights, setPremiumInsights] = useState<InsightsDataSet | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const paywall = usePaywall();

  // Auto-load demo data on mount
  useEffect(() => {
    loadDemo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDemo = async () => {
    setIsComputing(true);
    await new Promise(r => setTimeout(r, 50));
    const overlayStart = Date.now();

    const demoMetrics = computeWrappedMetrics(DEMO_PARSED_DATA);

    let convInsights: ConversationInsights | undefined;
    let swipeIns: AdvancedSwipeInsights | undefined;
    let premIns: InsightsDataSet | null = null;

    try {
      // Compute conversation insights
      if (DEMO_PARSED_DATA.conversations && DEMO_PARSED_DATA.conversations.length > 0) {
        try {
          const { computeConversationInsights } = await import("../lib/conversationIntelligence");
          const { isConversationPulseEnabled } = await import("../lib/featureFlags");
          if (isConversationPulseEnabled()) {
            const totalMatches = demoMetrics.totalSwipes > 0
              ? Math.round((demoMetrics.swipeToMatchRate / 100) * demoMetrics.rightSwipes)
              : 0;
            convInsights = computeConversationInsights(
              DEMO_PARSED_DATA.conversations,
              demoMetrics.source as import("../lib/wrappedParser").WrappedAppSource,
              totalMatches
            );
          }
        } catch {
          // Graceful degradation
        }
      }

      await new Promise(r => setTimeout(r, 0));

      // Compute advanced swipe insights
      if (DEMO_PARSED_DATA.swipes && DEMO_PARSED_DATA.swipes.length >= 50) {
        try {
          const { computeAdvancedSwipeInsights } = await import("../lib/swipeAdvanced");
          swipeIns = computeAdvancedSwipeInsights(DEMO_PARSED_DATA, demoMetrics);
        } catch {
          // Graceful degradation
        }
      }

      await new Promise(r => setTimeout(r, 0));

      // Generate premium insights
      try {
        const persistedData = {
          version: 1 as const,
          persistedAt: new Date().toISOString(),
          source: demoMetrics.source,
          metrics: demoMetrics,
          conversationInsights: convInsights,
          advancedSwipeInsights: swipeIns,
        };
        const { generateUserInsights } = await import("../lib/insightsEngine");
        premIns = generateUserInsights(persistedData);
        // Note: we do NOT persist demo data to localStorage (no saveUserInsights call)
      } catch {
        // Graceful degradation
      }

      // Ensure overlay stays visible at least 2s for UX
      const elapsed = Date.now() - overlayStart;
      const MIN_OVERLAY_MS = 2000;
      if (elapsed < MIN_OVERLAY_MS) {
        await new Promise(r => setTimeout(r, MIN_OVERLAY_MS - elapsed));
      }

      setConversationInsights(convInsights);
      setAdvancedSwipeInsights(swipeIns);
      setPremiumInsights(premIns);
      setMetrics(demoMetrics);
    } catch {
      setMetrics(demoMetrics);
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
          <ComputingOverlay />
        ) : showReveal && metrics ? (
          <WrappedReveal metrics={metrics} onComplete={() => setShowReveal(false)} />
        ) : metrics ? (
          <div className="mx-auto max-w-4xl">
            {/* Demo banner */}
            <motion.div
              className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-indigo-600">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <p className="text-sm font-medium text-indigo-700">
                    Rapport de demonstration — donnees reelles anonymisees
                  </p>
                </div>
                <a
                  href="/wrapped"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition whitespace-nowrap"
                >
                  Analyser mes donnees
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </motion.div>

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
        ) : null}
      </section>

      <footer className="border-t border-gray-200 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm text-slate-400 space-y-2">
          <p className="font-medium text-slate-400">DatePulse — Swipe au bon moment.</p>
          <p>
            <a href="/" className="hover:text-slate-900 transition">Accueil</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/wrapped" className="hover:text-slate-900 transition">Wrapped</a>
            <span className="mx-2 text-slate-300">|</span>
            <a href="/demo" className="hover:text-slate-900 transition font-semibold text-slate-500">Demo</a>
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
