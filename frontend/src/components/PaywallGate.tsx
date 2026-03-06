import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { track } from "@vercel/analytics";

// ── Types ────────────────────────────────────────────────────────

interface PaywallGateProps {
  /** Is the content unlocked? */
  isUnlocked: boolean;
  /** Is early access mode active? */
  isEarlyAccess: boolean;
  /** Callback when user clicks the CTA */
  onCtaClick: () => void;
  /** The premium content to wrap */
  children: React.ReactNode;
  /** Section identifier for analytics (e.g. "conversation-pulse", "swipe-pulse", "premium-insights") */
  sectionId?: string;
}

// ── Component ────────────────────────────────────────────────────

export default function PaywallGate({
  isUnlocked,
  isEarlyAccess,
  onCtaClick,
  children,
  sectionId,
}: PaywallGateProps) {
  // Track paywall impression (once per mount)
  const tracked = useRef(false);
  useEffect(() => {
    if (!isUnlocked && !tracked.current) {
      tracked.current = true;
      track("paywall_shown", { mode: isEarlyAccess ? "early_access" : "paid", section: sectionId ?? "default" });
    }
  }, [isUnlocked, isEarlyAccess, sectionId]);

  // Unlocked → render children normally
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Locked → blur + overlay + CTA (capped height so CTA stays visible)
  return (
    <div className="relative" style={{ maxHeight: 520, overflow: "hidden" }}>
      {/* Blurred content — visible but not interactive */}
      <div
        className="select-none pointer-events-none"
        style={{ filter: "blur(8px)" }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Gradient overlay: transparent top → white bottom */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(248,249,252,0) 0%, rgba(248,249,252,0.4) 25%, rgba(248,249,252,0.85) 50%, rgba(248,249,252,1) 75%)",
        }}
      />

      {/* CTA overlay */}
      <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
        <motion.div
          className="max-w-md w-full text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Lock icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              {isEarlyAccess
                ? "Accede a ton analyse complete"
                : "Debloquer mon analyse complete"}
            </h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              {isEarlyAccess
                ? "Entre ton email pour acceder gratuitement a toutes tes analyses personnalisees — offre early access limitee."
                : "Analyse conversationnelle avancee, psychologie du swipe, 29+ hypotheses testees et commandements personnalises."}
            </p>
          </div>

          <motion.button
            onClick={() => { track("paywall_cta_clicked", { mode: isEarlyAccess ? "early_access" : "paid", section: sectionId ?? "default" }); onCtaClick(); }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-8 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-[0.98]"
            whileTap={{ scale: 0.97 }}
          >
            {isEarlyAccess ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Acceder gratuitement
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                Debloquer — 4.99€
              </>
            )}
          </motion.button>

          {!isEarlyAccess && (
            <p className="text-xs text-slate-400">
              Paiement unique · Acces immediat · Pas d'abonnement
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
