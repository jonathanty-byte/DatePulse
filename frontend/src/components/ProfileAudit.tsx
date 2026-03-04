import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@vercel/analytics";
import type { AppName } from "../lib/data";
import type { AuditResult, AuditItem } from "../lib/profileAudit";
import {
  analyzeProfile,
  resizeImage,
  isRateLimited,
  getNextAuditDate,
} from "../lib/profileAudit";
import ScoreGauge from "./ScoreGauge";
import type { GaugeMode } from "./ScoreGauge";

// ── Types ───────────────────────────────────────────────────────

type AuditState = "upload" | "loading" | "result" | "error" | "rate_limited";

interface ImageEntry {
  id: string;
  file: File;
  preview: string; // object URL for thumbnail
}

const MAX_IMAGES = 6;
const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const LOADING_MESSAGES = [
  "Analyse des photos en cours...",
  "Evaluation de la composition...",
  "Examen de la bio...",
  "Comparaison avec les meilleures pratiques...",
  "Generation des recommandations...",
];

// ── Component ───────────────────────────────────────────────────

interface ProfileAuditProps {
  initialApp?: AppName;
}

export default function ProfileAudit({ initialApp = "tinder" }: ProfileAuditProps) {
  const [state, setState] = useState<AuditState>(() =>
    isRateLimited() ? "rate_limited" : "upload"
  );
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppName>(initialApp);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setState("loading");

    try {
      // Resize all images in parallel
      const base64Images = await Promise.all(
        images.map((entry) => resizeImage(entry.file))
      );

      track("audit_started", { app: selectedApp, images: base64Images.length });
      const auditResult = await analyzeProfile(base64Images, selectedApp);
      setResult(auditResult);
      setState("result");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erreur inconnue. Reessaie."
      );
      setState("error");
    }
  };

  const handleRetry = () => {
    setErrorMsg("");
    setState("upload");
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setResult(null);
    setErrorMsg("");
    setState(isRateLimited() ? "rate_limited" : "upload");
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

  // ── Render by state ───────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
      <AnimatePresence mode="wait">
        {state === "rate_limited" && (
          <RateLimitedView key="rate_limited" />
        )}

        {state === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {/* App selector */}
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-slate-500">Profil :</span>
              <div className="flex gap-2">
                {(["tinder", "bumble", "hinge", "happn"] as AppName[]).map(
                  (a) => (
                    <button
                      key={a}
                      onClick={() => setSelectedApp(a)}
                      className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
                        selectedApp === a
                          ? "bg-brand-50 border border-brand-500/30 text-brand-500"
                          : "bg-gray-50 border border-gray-200 text-slate-500 hover:bg-gray-100"
                      }`}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>

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
                accept={ACCEPTED_TYPES.join(",")}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = ""; // allow re-select same file
                }}
              />
              <div className="text-3xl mb-3">&#x1F4F7;</div>
              <p className="text-sm sm:text-base text-slate-800">
                Glisse tes screenshots ici
              </p>
              <p className="mt-1 text-xs text-slate-400">
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
                      className="h-20 w-20 sm:h-24 sm:w-24  object-cover border border-gray-200"
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
                    className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center  border border-dashed border-gray-200 text-slate-400 hover:border-gray-300 hover:text-slate-500 transition text-2xl"
                  >
                    +
                  </button>
                )}
              </div>
            )}

            {/* Privacy note */}
            <p className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
              <span>&#x1F512;</span>
              Tes photos ne sont pas stockees. Elles sont envoyees a l'IA pour analyse puis supprimees.
            </p>

            {/* Analyze button */}
            <motion.button
              onClick={handleAnalyze}
              disabled={images.length === 0}
              className="mt-6 w-full flex items-center justify-center gap-2.5  bg-gradient-to-r from-brand-600 to-emerald-500 px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-sm transition hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-brand-500/25 disabled:hover:brightness-100"
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-lg">&#x1F50D;</span>
              Analyser mon profil
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
              <div className="mx-auto h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] rounded-full bg-gray-50 animate-pulse" />
              <div className="h-6 w-3/4 mx-auto rounded-lg bg-gray-50 animate-pulse" />
              <div className="h-4 w-1/2 mx-auto rounded-lg bg-gray-50 animate-pulse" />
              <div className="space-y-3 mt-8">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20  bg-gray-50 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
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

        {state === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Score gauge */}
            <div className="flex flex-col items-center">
              <ScoreGauge
                score={result.score}
                mode={getScoreMode(result.score)}
              />
              <p className="mt-3 text-sm text-slate-500">
                Score profil — {selectedApp.charAt(0).toUpperCase() + selectedApp.slice(1)}
              </p>
            </div>

            {/* Critical issues */}
            {result.critical.length > 0 && (
              <AuditSection
                title="Problemes critiques"
                icon="&#x1F534;"
                items={result.critical}
                cardClass="border-red-200 bg-red-50"
                showRecommendation
              />
            )}

            {/* Improvements */}
            {result.improvements.length > 0 && (
              <AuditSection
                title="Ameliorations"
                icon="&#x1F7E1;"
                items={result.improvements}
                cardClass="border-amber-200 bg-amber-50"
                showRecommendation
              />
            )}

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <AuditSection
                title="Points forts"
                icon="&#x2705;"
                items={result.strengths}
                cardClass="border-green-200 bg-green-50"
              />
            )}

            {/* Potential score */}
            <motion.div
              className=" bg-brand-50 border border-brand-200 px-5 py-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-sm text-brand-500">
                &#x1F4A1; Apres corrections : ~{result.potential_score}/100
              </p>
            </motion.div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2  bg-gradient-to-r from-brand-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
                whileTap={{ scale: 0.98 }}
              >
                Refaire un audit
              </motion.button>
              <motion.button
                onClick={() => {}}
                className="flex-1 flex items-center justify-center gap-2  bg-gray-50 border border-gray-200 px-6 py-3 text-sm font-semibold text-slate-500 transition hover:bg-gray-100 cursor-not-allowed opacity-50"
                disabled
              >
                Partager mon score
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">bientot</span>
              </motion.button>
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

// ── Sub-components ──────────────────────────────────────────────

function RateLimitedView() {
  const nextDate = getNextAuditDate();
  const formatted = nextDate
    ? nextDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center py-12 text-center"
    >
      <span className="text-5xl mb-4">&#x1F512;</span>
      <h3 className="text-lg font-bold text-slate-900 mb-2">
        Tu as utilise ton audit gratuit ce mois-ci
      </h3>
      {formatted && (
        <p className="text-sm text-slate-500 mb-6">
          Prochain audit gratuit : {formatted}
        </p>
      )}
      <motion.button
        className="flex items-center gap-2  bg-gradient-to-r from-brand-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 cursor-not-allowed opacity-60"
        disabled
      >
        Passe a Pulse Pro pour des audits illimites &#x2192;
      </motion.button>
      <p className="mt-2 text-xs text-slate-400">Bientot disponible</p>
    </motion.div>
  );
}

function AuditSection({
  title,
  icon,
  items,
  cardClass,
  showRecommendation = false,
}: {
  title: string;
  icon: string;
  items: AuditItem[];
  cardClass: string;
  showRecommendation?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-900">
        <span dangerouslySetInnerHTML={{ __html: icon }} />
        {title} ({items.length})
      </h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            className={` border p-4 ${cardClass}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
          >
            <p className="font-medium text-sm text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
            {showRecommendation && item.recommendation && (
              <p className="mt-2 text-xs text-brand-500 flex items-start gap-1.5">
                <span className="shrink-0">&#x2192;</span>
                {item.recommendation}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function getScoreMode(score: number): GaugeMode {
  if (score >= 80) return "peak";
  if (score >= 60) return "green";
  if (score >= 40) return "amber";
  return "red";
}
