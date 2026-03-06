import { useState, useCallback } from "react";
import { track } from "@vercel/analytics";

// ── localStorage keys ────────────────────────────────────────────
const LS_PAID = "dp_paywall_paid";
const LS_EMAIL = "dp_early_access_email";

// ── Early access flag — flip to false + redeploy to enable real paywall ──
const IS_EARLY_ACCESS = true;

// ── Types ────────────────────────────────────────────────────────

export interface PaywallState {
  /** User has paid (or bypassed via early access) */
  isPaid: boolean;
  /** Early access mode — paywall visible but content free after email */
  isEarlyAccess: boolean;
  /** User's captured email (if any) */
  email: string | null;
  /** Whether premium content should be unlocked */
  isUnlocked: boolean;
  /** Mark as paid (real payment flow) */
  unlock: () => void;
  /** Submit early access email → unlock */
  submitEarlyAccess: (email: string) => void;
  /** Show the email capture modal */
  showEmailModal: boolean;
  /** Open email capture modal */
  openEmailModal: () => void;
  /** Close email capture modal */
  closeEmailModal: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────

export function usePaywall(): PaywallState {
  const [isPaid, setIsPaid] = useState(() => {
    try {
      return localStorage.getItem(LS_PAID) === "true";
    } catch {
      return false;
    }
  });

  const [email, setEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_EMAIL);
    } catch {
      return null;
    }
  });

  const [showEmailModal, setShowEmailModal] = useState(false);

  const isEarlyAccess = IS_EARLY_ACCESS;

  // Unlocked = paid OR (early access + email captured)
  const isUnlocked = isPaid || (isEarlyAccess && email !== null);

  const unlock = useCallback(() => {
    setIsPaid(true);
    track("premium_unlocked", { mode: "paid" });
    try {
      localStorage.setItem(LS_PAID, "true");
    } catch {
      // localStorage full — still unlock for this session
    }
  }, []);

  const submitEarlyAccess = useCallback((newEmail: string) => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    setEmail(trimmed);
    setShowEmailModal(false);
    track("premium_unlocked", { mode: "early_access" });
    try {
      localStorage.setItem(LS_EMAIL, trimmed);
    } catch {
      // localStorage full — still set for this session
    }
  }, []);

  const openEmailModal = useCallback(() => setShowEmailModal(true), []);
  const closeEmailModal = useCallback(() => setShowEmailModal(false), []);

  return {
    isPaid,
    isEarlyAccess,
    email,
    isUnlocked,
    unlock,
    submitEarlyAccess,
    showEmailModal,
    openEmailModal,
    closeEmailModal,
  };
}
