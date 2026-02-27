import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@vercel/analytics";
import type { CoachContext, CoachResult, CoachSuggestion } from "../lib/messageCoach";
import { analyzeConversation } from "../lib/messageCoach";

// ── Types ───────────────────────────────────────────────────────

type CoachState = "input" | "loading" | "result" | "error";
type InputMode = "text" | "screenshots";

interface ImageEntry {
  id: string;
  file: File;
  preview: string;
}

const MAX_IMAGES = 4;
const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const CONTEXT_OPTIONS: { value: CoachContext; label: string }[] = [
  { value: "stale", label: "Ca stagne" },
  { value: "date_propose", label: "Proposer un date" },
  { value: "relaunch", label: "Relancer" },
];

const LOADING_MESSAGES = [
  "Analyse de la conversation...",
  "Evaluation du ton...",
  "Generation des suggestions...",
  "Calibrage du niveau d'audace...",
];

const STRATEGY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  Conservateur: { bg: "bg-green-950/30", border: "border-green-500/30", text: "text-green-400" },
  Equilibre: { bg: "bg-amber-950/30", border: "border-amber-500/30", text: "text-amber-400" },
  Audacieux: { bg: "bg-red-950/30", border: "border-red-500/30", text: "text-red-400" },
};

// ── Component ───────────────────────────────────────────────────

export default function MessageCoach() {
  const [state, setState] = useState<CoachState>("input");
  const [context, setContext] = useState<CoachContext>("stale");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading messages
  useEffect(() => {
    if (state !== "loading") return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [state]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset copied state after feedback
  useEffect(() => {
    if (copiedIdx === null) return;
    const timer = setTimeout(() => setCopiedIdx(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedIdx]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newEntries: ImageEntry[] = [];
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (images.length + newEntries.length >= MAX_IMAGES) break;
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) continue;

        newEntries.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
        });
      }

      setImages((prev) => [...prev, ...newEntries].slice(0, MAX_IMAGES));
    },
    [images.length]
  );

  const removeImage = (id: string) => {
    setImages((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  };

  const hasInput = inputMode === "text"
    ? textInput.trim().length > 0
    : images.length > 0;

  const handleAnalyze = async () => {
    if (!hasInput) return;
    setState("loading");

    try {
      const coachResult = await analyzeConversation(
        {
          text: inputMode === "text" ? textInput : undefined,
          images: inputMode === "screenshots" ? images.map((e) => e.file) : undefined,
        },
        context
      );
      setResult(coachResult);
      setState("result");
      track("coach_analyzed", { context, inputMode });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erreur inconnue. Reessaie."
      );
      setState("error");
    }
  };

  const handleRetry = () => {
    setErrorMsg("");
    setState("input");
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setTextInput("");
    setResult(null);
    setErrorMsg("");
    setCopiedIdx(null);
    setState("input");
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIdx(idx);
    }
  };

  // ── Drag & drop handlers ──────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
      <AnimatePresence mode="wait">
        {state === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {/* Context selector */}
            <div className="mb-6">
              <span className="block text-sm text-gray-400 mb-3">Situation :</span>
              <div className="flex flex-wrap gap-2">
                {CONTEXT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setContext(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
                      context === opt.value
                        ? "bg-brand-600/20 border border-brand-500/30 text-brand-400"
                        : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input mode tabs */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setInputMode("text")}
                className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition ${
                  inputMode === "text"
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                Texte
              </button>
              <button
                onClick={() => setInputMode("screenshots")}
                className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition ${
                  inputMode === "screenshots"
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                Screenshots
              </button>
            </div>

            {/* Text input */}
            {inputMode === "text" && (
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={"Colle ta conversation ici...\n\nExemple :\nMoi : Salut, ton profil m'a fait sourire\nElle : Merci haha\nMoi : Tu fais quoi dans la vie ?\nElle : Infirmiere et toi ?"}
                className="w-full h-48 sm:h-56 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-brand-500/40 focus:bg-white/[0.04] transition"
              />
            )}

            {/* Screenshot input */}
            {inputMode === "screenshots" && (
              <>
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
                    accept={ACCEPTED_TYPES.join(",")}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <div className="text-3xl mb-3">&#x1F4F1;</div>
                  <p className="text-sm sm:text-base text-gray-300">
                    Glisse tes screenshots ici
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    ou clique pour selectionner — JPG, PNG, WebP — max {MAX_IMAGES} images, {MAX_SIZE_MB}MB chacune
                  </p>
                </div>

                {/* Image previews */}
                {images.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {images.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.preview}
                          alt="Preview"
                          className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover border border-white/10"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >
                          &#x2715;
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-xl border border-dashed border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-400 transition text-2xl"
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Privacy note */}
            <p className="mt-4 text-xs text-gray-600 flex items-center gap-1.5">
              <span>&#x1F512;</span>
              Tes messages ne sont pas stockes. Ils sont envoyes a l'IA pour analyse puis supprimes.
            </p>

            {/* Analyze button */}
            <motion.button
              onClick={handleAnalyze}
              disabled={!hasInput}
              className="mt-6 w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-brand-500/25 disabled:hover:brightness-100"
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-lg">&#x1F4AC;</span>
              Analyser
            </motion.button>
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
              <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
              <div className="space-y-3 mt-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-xl bg-white/5 animate-pulse"
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

        {state === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Diagnostic card */}
            <motion.div
              className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <span>&#x1F9E0;</span> Diagnostic
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {result.diagnostic}
              </p>
            </motion.div>

            {/* Suggestion cards */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <span>&#x1F4AC;</span> Suggestions
              </h3>
              {result.suggestions.map((suggestion, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={suggestion}
                  index={i}
                  isCopied={copiedIdx === i}
                  onCopy={() => handleCopy(suggestion.text, i)}
                />
              ))}
            </div>

            {/* Reset button */}
            <motion.button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
              whileTap={{ scale: 0.98 }}
            >
              Nouvelle analyse
            </motion.button>
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

// ── Sub-components ──────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  index,
  isCopied,
  onCopy,
}: {
  suggestion: CoachSuggestion;
  index: number;
  isCopied: boolean;
  onCopy: () => void;
}) {
  const style = STRATEGY_STYLES[suggestion.strategy] ?? STRATEGY_STYLES.Equilibre;

  return (
    <motion.div
      className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 * (index + 1) }}
    >
      {/* Strategy badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border ${style.bg} ${style.border} ${style.text}`}
        >
          {suggestion.strategy}
        </span>
        <button
          onClick={onCopy}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            isCopied
              ? "bg-green-600/20 border border-green-500/30 text-green-400"
              : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300"
          }`}
        >
          {isCopied ? (
            <>
              <span>&#x2713;</span> Copie !
            </>
          ) : (
            <>
              <span>&#x1F4CB;</span> Copier
            </>
          )}
        </button>
      </div>

      {/* Message text */}
      <p className="text-sm text-gray-200 leading-relaxed bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/5">
        {suggestion.text}
      </p>

      {/* Explanation */}
      <p className="mt-2 text-xs text-gray-500 italic">
        {suggestion.explanation}
      </p>
    </motion.div>
  );
}
