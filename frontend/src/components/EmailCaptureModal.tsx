import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@vercel/analytics";

// ── Types ────────────────────────────────────────────────────────

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
}

// ── Component ────────────────────────────────────────────────────

export default function EmailCaptureModal({
  isOpen,
  onClose,
  onSubmit,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Entre une adresse email valide");
      return;
    }

    setError("");
    track("early_access_email_submitted");
    onSubmit(trimmed);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Fermer"
              >
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Icon */}
              <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 15l-2-2m0 0l2-2m-2 2h12M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0z" />
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-slate-900 text-center">
                Early access gratuit
              </h3>
              <p className="mt-2 text-sm text-slate-500 text-center leading-relaxed">
                Entre ton email pour debloquer immediatement toutes tes analyses personnalisees.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="ton@email.com"
                    className={`w-full rounded-xl border ${
                      error
                        ? "border-red-300 focus:ring-red-400"
                        : "border-slate-200 focus:ring-indigo-400"
                    } bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:border-transparent transition`}
                    autoFocus
                    autoComplete="email"
                  />
                  {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
                  whileTap={{ scale: 0.97 }}
                >
                  Acceder gratuitement
                </motion.button>
              </form>

              <p className="mt-4 text-[11px] text-slate-400 text-center leading-relaxed">
                Pas de spam. On t'enverra juste les mises a jour importantes de DatePulse.
              </p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
