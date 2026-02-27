import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@vercel/analytics";
import type { WrappedMetrics } from "../lib/wrappedMetrics";
import { generateShareImage, shareImage } from "../lib/shareImage";
import type { ShareTemplate } from "../lib/shareImage";

interface WrappedShareProps {
  metrics: WrappedMetrics;
  onClose: () => void;
}

export default function WrappedShare({ metrics, onClose }: WrappedShareProps) {
  const [template, setTemplate] = useState<ShareTemplate>("story");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  // Check if Web Share API is available
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";

  // Generate preview when template changes
  const generatePreview = useCallback(async () => {
    setLoading(true);
    try {
      const generatedBlob = await generateShareImage(metrics, template);
      setBlob(generatedBlob);
      // Revoke previous URL to avoid memory leak
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(generatedBlob);
      setPreviewUrl(url);
    } catch {
      // Silent fail — user will see loading state
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, template]);

  useEffect(() => {
    generatePreview();
    return () => {
      // Cleanup on unmount
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatePreview]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Handle download
  async function handleDownload() {
    if (!blob) return;
    setSharing(true);
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dating-wrapped-${template}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setSharing(false);
    }
  }

  // Handle share (Web Share API)
  async function handleShare() {
    if (!blob) return;
    setSharing(true);
    try {
      await shareImage(blob, "Mon Dating Wrapped");
      track("share_clicked", { template });
    } finally {
      setSharing(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="rounded-2xl border border-white/10 bg-gray-900 p-5 sm:p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Partager</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Template selector */}
        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setTemplate("story")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              template === "story"
                ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            Story (9:16)
          </button>
          <button
            onClick={() => setTemplate("square")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              template === "square"
                ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            Carre (1:1)
          </button>
        </div>

        {/* Image preview */}
        <div className="mb-5 flex items-center justify-center rounded-lg border border-white/10 bg-black/30 p-3 min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-xs text-gray-500">Generation de l'image...</p>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Apercu Dating Wrapped"
              className="rounded-lg border border-white/10 max-h-80 object-contain"
            />
          ) : (
            <p className="text-sm text-gray-500">
              Erreur lors de la generation
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={!blob || sharing}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2v9M4 8l4 4 4-4M2 13h12" />
            </svg>
            Telecharger
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              disabled={!blob || sharing}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="4" r="2" />
                <circle cx="4" cy="8" r="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 9l4 2M6 7l4-2" />
              </svg>
              Partager
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
