import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@vercel/analytics";
import { parseUploadedFiles } from "../lib/wrappedParser";
import type { ConversationRecord, ParsedData } from "../lib/wrappedParser";
import { computeWrappedMetrics } from "../lib/wrappedMetrics";
import type { WrappedMetrics } from "../lib/wrappedMetrics";

// ── Types ───────────────────────────────────────────────────────

type UploadState = "idle" | "loading" | "error";

interface WrappedUploadProps {
  onDataParsed: (metrics: WrappedMetrics, conversations?: ConversationRecord[], parsedData?: ParsedData) => void;
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
        onDataParsed(metrics, parsed.conversations, parsed);
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
              className={`relative cursor-pointer  border-2 border-dashed p-8 sm:p-10 text-center transition ${
                isDragging
                  ? "border-brand-500 bg-brand-600/10"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-white"
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
              <p className="text-sm sm:text-base text-slate-800 font-medium">
                Glisse ton fichier RGPD ici
              </p>
              <p className="mt-1.5 text-xs text-slate-400">
                ou clique pour selectionner — .json ou .zip — max {MAX_SIZE_MB}MB
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Hinge : selectionne matches.json + subscriptions.json + user.json ensemble
              </p>
            </div>

            {/* Instructions per app */}
            <motion.div
              className=" border border-gray-200 bg-white p-5 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span>&#x2753;</span>
                Comment obtenir tes donnees RGPD ?
              </h3>
              <div className="space-y-4">
                {/* Tinder */}
                <div className="border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-pink-500">Tinder</span>
                    <span className="text-[10px] text-slate-400">JSON ou ZIP</span>
                  </div>
                  <ol className="space-y-1.5 text-sm text-slate-600">
                    <li>1. Ouvre Tinder &gt; <span className="font-medium text-slate-800">Profil</span> &gt; <span className="font-medium text-slate-800">Parametres</span></li>
                    <li>2. Descend jusqu'a <span className="font-medium text-slate-800">Telecharger mes donnees</span></li>
                    <li>3. Entre ton email et valide la demande</li>
                    <li>4. Tu recevras un email avec un lien de telechargement <span className="text-slate-400">(1-3 jours)</span></li>
                    <li>5. Upload le fichier <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-pink-600">data.json</code> ici</li>
                  </ol>
                </div>

                {/* Bumble */}
                <div className="border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-amber-500">Bumble</span>
                    <span className="text-[10px] text-slate-400">JSON</span>
                  </div>
                  <ol className="space-y-1.5 text-sm text-slate-600">
                    <li>1. Va sur <a href="https://bumble.com/fr/settings" target="_blank" rel="noopener noreferrer" className="font-medium text-amber-600 underline underline-offset-2">bumble.com/settings</a> (version web)</li>
                    <li>2. Clique sur <span className="font-medium text-slate-800">Telecharger mes donnees personnelles</span></li>
                    <li>3. Valide avec ton numero ou email</li>
                    <li>4. Tu recevras un lien par email <span className="text-slate-400">(quelques heures a 2 jours)</span></li>
                    <li>5. Upload le fichier <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-amber-600">data.json</code> ici</li>
                  </ol>
                </div>

                {/* Hinge */}
                <div className="border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-violet-500">Hinge</span>
                    <span className="text-[10px] text-slate-400">3 fichiers JSON</span>
                  </div>
                  <ol className="space-y-1.5 text-sm text-slate-600">
                    <li>1. Va sur <a href="https://hingeapp.zendesk.com/hc/en-us/requests/new?ticket_form_id=360000837012" target="_blank" rel="noopener noreferrer" className="font-medium text-violet-600 underline underline-offset-2">le formulaire Hinge RGPD</a></li>
                    <li>2. Remplis le formulaire avec ton email Hinge et demande un export complet</li>
                    <li>3. Tu recevras un ZIP par email <span className="text-slate-400">(2-5 jours)</span></li>
                    <li>4. Dezippe et selectionne les 3 fichiers ensemble :
                      <span className="flex flex-wrap gap-1 mt-1">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-violet-600">matches.json</code>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-violet-600">subscriptions.json</code>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-violet-600">user.json</code>
                      </span>
                    </li>
                  </ol>
                </div>

                {/* Happn */}
                <div className="border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-orange-500">Happn</span>
                    <span className="text-[10px] text-slate-400">JSON</span>
                  </div>
                  <ol className="space-y-1.5 text-sm text-slate-600">
                    <li>1. Ouvre Happn &gt; <span className="font-medium text-slate-800">Mon compte</span> &gt; <span className="font-medium text-slate-800">Gerer mes donnees</span></li>
                    <li>2. Clique sur <span className="font-medium text-slate-800">Demander mes donnees</span></li>
                    <li>3. Confirme par email</li>
                    <li>4. Tu recevras un lien de telechargement <span className="text-slate-400">(1-3 jours)</span></li>
                    <li>5. Fusionne les fichiers avec : <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-orange-600">node scripts/merge_happn.js all-data</code></li>
                    <li>6. Upload le fichier <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-orange-600">happn_export.json</code> ici</li>
                  </ol>
                </div>
              </div>
            </motion.div>

            {/* Privacy notice */}
            <motion.div
              className=" border border-emerald-200 bg-emerald-50 p-4 sm:p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">&#x1F512;</span>
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    100% prive — zero upload
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
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
            {/* Gradient shimmer skeleton */}
            <div className="w-full max-w-md space-y-4">
              <div className="mx-auto h-[140px] w-[140px] sm:h-[180px] sm:w-[180px] rounded-full shimmer" />
              <div className="h-6 w-3/4 mx-auto  shimmer" />
              <div className="h-4 w-1/2 mx-auto  shimmer" />
              <div className="space-y-3 mt-8">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-16  shimmer"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Rotating message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingMsg}
                className="mt-8 text-sm text-slate-500"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                {loadingMsg}
              </motion.p>
            </AnimatePresence>

            {/* Indeterminate progress bar */}
            <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-gray-50">
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              L'analyse a echoue
            </h3>
            <p className="text-sm text-slate-500 max-w-md mb-6">{errorMsg}</p>
            <motion.button
              onClick={handleRetry}
              className="flex items-center gap-2  bg-brand-50 border border-brand-500/30 px-6 py-3 text-sm font-semibold text-brand-500 transition hover:bg-brand-600/30 active:scale-95"
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
