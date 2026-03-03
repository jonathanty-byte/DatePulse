import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@vercel/analytics";
import { parseUploadedFiles } from "../lib/wrappedParser";
import type { ConversationRecord } from "../lib/wrappedParser";
import { computeWrappedMetrics } from "../lib/wrappedMetrics";
import type { WrappedMetrics } from "../lib/wrappedMetrics";

// ── Types ───────────────────────────────────────────────────────

type UploadState = "idle" | "loading" | "error";

interface WrappedUploadProps {
  onDataParsed: (metrics: WrappedMetrics, conversations?: ConversationRecord[]) => void;
}

const MAX_SIZE_MB = 50;
const ACCEPTED_EXTENSIONS = [".json", ".zip"];
const ACCEPTED_MIME = ["application/json", "application/zip", "application/x-zip-compressed"];

const LOADING_MESSAGES = [
  "Lecture du fichier...",
  "Extraction des swipes...",
  "Calcul des metriques...",
  "Analyse des tendances...",
];

// ── Component ───────────────────────────────────────────────────

export default function WrappedUpload({ onDataParsed }: WrappedUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading messages
  useEffect(() => {
    if (state !== "loading") return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 2000);
    return () => clearInterval(interval);
  }, [state]);

  const processFiles = useCallback(
    async (files: File[]) => {
      // Validate extensions
      for (const file of files) {
        const name = file.name.toLowerCase();
        const validExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
        if (!validExt) {
          setErrorMsg("Format non supporte. Uploade des fichiers .json ou .zip.");
          setState("error");
          return;
        }
      }

      // Validate total size
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_SIZE_MB * 1024 * 1024) {
        setErrorMsg(`Fichiers trop volumineux (max ${MAX_SIZE_MB}MB au total).`);
        setState("error");
        return;
      }

      setState("loading");
      setLoadingMsg(LOADING_MESSAGES[0]);

      try {
        const parsed = await parseUploadedFiles(files);
        const metrics = computeWrappedMetrics(parsed);
        track("wrapped_uploaded", { source: parsed.source, swipes: metrics.totalSwipes });
        onDataParsed(metrics, parsed.conversations);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Erreur lors de l'analyse du fichier. Verifie le format et reessaie."
        );
        setState("error");
      }
    },
    [onDataParsed]
  );

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      processFiles(Array.from(files));
    },
    [processFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRetry = () => {
    setErrorMsg("");
    setState("idle");
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-6"
          >
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition ${
                isDragging
                  ? "border-brand-500 bg-brand-600/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={[...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME].join(",")}
                className="hidden"
                onChange={(e) => {
                  handleFileSelect(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="text-4xl mb-3">
                <span role="img" aria-label="upload">&#x1F4E4;</span>
              </div>
              <p className="text-sm sm:text-base text-gray-300 font-medium">
                Glisse ton fichier RGPD ici
              </p>
              <p className="mt-1.5 text-xs text-gray-500">
                ou clique pour selectionner — .json ou .zip — max {MAX_SIZE_MB}MB
              </p>
              <p className="mt-1 text-[11px] text-gray-600">
                Hinge : selectionne matches.json + subscriptions.json + user.json ensemble
              </p>
            </div>

            {/* Instructions */}
            <motion.div
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span>&#x2753;</span>
                Comment obtenir tes donnees RGPD ?
              </h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                    1
                  </span>
                  <p className="text-sm text-gray-300">
                    Va dans{" "}
                    <span className="text-white font-medium">
                      Parametres &gt; Confidentialite &gt; Telecharger mes donnees
                    </span>{" "}
                    sur Tinder, Bumble ou Hinge
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                    2
                  </span>
                  <p className="text-sm text-gray-300">
                    Attend l'email avec le lien de telechargement{" "}
                    <span className="text-gray-500">(1-3 jours)</span>
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                    3
                  </span>
                  <div className="text-sm text-gray-300">
                    <p>Upload le fichier .json ou .zip ici</p>
                    <p className="mt-1 text-xs text-gray-500">
                      <span className="text-violet-400 font-medium">Hinge</span> : selectionne les 3 fichiers ensemble (matches.json, subscriptions.json, user.json)
                    </p>
                  </div>
                </li>
              </ol>
            </motion.div>

            {/* Privacy notice */}
            <motion.div
              className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 sm:p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">&#x1F512;</span>
                <div>
                  <p className="text-sm font-medium text-emerald-300">
                    100% prive — zero upload
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Tes donnees ne quittent jamais ton appareil. Tout est traite
                    localement dans ton navigateur. Rien n'est envoye a un serveur.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {state === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12 sm:py-16"
          >
            {/* Shimmer skeleton */}
            <div className="w-full max-w-md space-y-4">
              <div className="mx-auto h-[140px] w-[140px] sm:h-[180px] sm:w-[180px] rounded-full bg-white/5 animate-pulse" />
              <div className="h-6 w-3/4 mx-auto rounded-lg bg-white/5 animate-pulse" />
              <div className="h-4 w-1/2 mx-auto rounded-lg bg-white/5 animate-pulse" />
              <div className="space-y-3 mt-8">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-white/5 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Rotating message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingMsg}
                className="mt-8 text-sm text-gray-400"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                {loadingMsg}
              </motion.p>
            </AnimatePresence>

            {/* Indeterminate progress bar */}
            <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full w-1/3 rounded-full bg-brand-500"
                animate={{ x: ["-100%", "300%"] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12 text-center"
          >
            <span className="text-5xl mb-4">&#x26A0;&#xFE0F;</span>
            <h3 className="text-lg font-bold text-white mb-2">
              L'analyse a echoue
            </h3>
            <p className="text-sm text-gray-400 max-w-md mb-6">{errorMsg}</p>
            <motion.button
              onClick={handleRetry}
              className="flex items-center gap-2 rounded-xl bg-brand-600/20 border border-brand-500/30 px-6 py-3 text-sm font-semibold text-brand-400 transition hover:bg-brand-600/30 active:scale-95"
              whileTap={{ scale: 0.95 }}
            >
              Reessayer
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
