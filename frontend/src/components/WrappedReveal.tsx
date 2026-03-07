import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@vercel/analytics";
import type { WrappedMetrics } from "../lib/wrappedMetrics";
import { getVerdict } from "../lib/wrappedMetrics";
import { ProgressRing } from "./SharedInsightComponents";

// ── App-source color theming (mirrored from WrappedReport) ───────

const APP_COLORS: Record<string, string> = {
  tinder: "#ec4899",
  bumble: "#f59e0b",
  hinge: "#8b5cf6",
};
const FALLBACK_COLOR = "#f97316"; // happn orange

function appColor(source: string): string {
  return APP_COLORS[source] ?? FALLBACK_COLOR;
}

function appLabel(source: string): string {
  return source.charAt(0).toUpperCase() + source.slice(1);
}

// ── Slide transition variants ────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

// ── RevealCounter — immediate animated counter ───────────────────

function RevealCounter({
  target,
  duration = 1400,
  delay = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  target: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (delay <= 0) {
      setStarted(true);
      return;
    }
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  return (
    <span className={className}>
      {prefix}
      {count.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

// ── Delayed text — fades in after delay ms ───────────────────────

function DelayedText({
  delay,
  children,
  className = "",
}: {
  delay: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Format period ────────────────────────────────────────────────

function formatPeriod(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
  const s = start.toLocaleDateString("fr-FR", opts);
  const e = end.toLocaleDateString("fr-FR", opts);
  return s === e ? s : `${s} - ${e}`;
}

// ── Slide components ─────────────────────────────────────────────

function Slide1({ metrics: m }: { metrics: WrappedMetrics }) {
  const color = appColor(m.source);
  const initial = appLabel(m.source).charAt(0);
  const tenure = m.tenureMonths ?? 0;
  const tenureComment =
    tenure > 24
      ? "Veterane du swipe"
      : tenure > 12
        ? "Ca fait un moment..."
        : "Nouvelle recrue !";

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <motion.div
        className="flex h-24 w-24 items-center justify-center rounded-full text-4xl font-extrabold text-white"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {initial}
      </motion.div>
      <h2 className="text-2xl font-bold text-white/90">
        Ton histoire sur {appLabel(m.source)}
      </h2>
      <p className="text-6xl sm:text-7xl font-extrabold" style={{ color }}>
        <RevealCounter target={m.daysActive} />
      </p>
      <p className="text-lg text-white/50">jours actifs</p>
      <p className="text-sm text-white/40">{formatPeriod(m.periodStart, m.periodEnd)}</p>
      <DelayedText delay={1000} className="text-base text-white/60 italic">
        {tenureComment}
      </DelayedText>
    </div>
  );
}

function Slide2({ metrics: m }: { metrics: WrappedMetrics }) {
  const color = appColor(m.source);
  const hours = m.estimatedTotalHours;
  const metaphor =
    hours >= 200
      ? `${hours} heures. Tu aurais pu apprendre le piano.`
      : hours >= 100
        ? `${hours} heures. C'est un stage non remunere.`
        : hours >= 50
          ? `${hours} heures. Ca merite un diplome.`
          : hours >= 20
            ? `${hours} heures. L'equivalent d'un vol Paris-Sydney.`
            : `${hours} heures seulement. Efficace.`;

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <p
        className="text-7xl sm:text-8xl font-extrabold"
        style={{ color, textShadow: `0 0 40px ${color}40` }}
      >
        <RevealCounter target={m.totalSwipes} duration={2000} />
      </p>
      <p className="text-sm uppercase tracking-widest text-white/60">swipes</p>
      <DelayedText delay={1000} className="text-lg text-white/50">
        soit {m.avgSwipesPerDay} swipes par jour
      </DelayedText>
      <DelayedText delay={1800} className="text-base text-white/40 italic max-w-sm">
        {metaphor}
      </DelayedText>
    </div>
  );
}

function Slide3({ metrics: m }: { metrics: WrappedMetrics }) {
  const color = appColor(m.source);
  const isHinge = m.source === "hinge";
  const rate = m.rightSwipeRate;

  const comment = isHinge
    ? "Hinge ne compte pas les passes. On sait que tu es exigeant(e)."
    : rate > 80
      ? "Tu likes tout ce qui bouge. L'algo te penalise."
      : rate > 60
        ? "Genereux(se). Mais l'algo prefere les selectifs."
        : rate > 40
          ? "Equilibre. Tu sais ce que tu veux (a peu pres)."
          : rate > 20
            ? "Selectif(ve). L'algorithme t'adore."
            : "Chirurgical(e). Que les ames soeurs potentielles.";

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <ProgressRing value={rate} max={100} size={160} label="" color={color} />
      <p className="text-5xl sm:text-6xl font-extrabold" style={{ color }}>
        <RevealCounter target={rate} suffix="%" />
      </p>
      <p className="text-lg text-white/70">de likes</p>
      <DelayedText delay={1200} className="text-base text-white/50 italic max-w-sm">
        {comment}
      </DelayedText>
    </div>
  );
}

function Slide4({ metrics: m }: { metrics: WrappedMetrics }) {
  const color = appColor(m.source);
  const totalMatches =
    m.rightSwipes > 0 ? Math.round((m.swipeToMatchRate / 100) * m.rightSwipes) : 0;
  const likesPerMatch =
    totalMatches > 0 ? Math.round(m.rightSwipes / totalMatches) : 0;

  if (totalMatches === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 text-center">
        <p className="text-7xl sm:text-8xl font-extrabold" style={{ color }}>0</p>
        <p className="text-xl text-white/60">match</p>
        <DelayedText delay={800} className="text-base text-white/40 italic max-w-sm">
          Tout reste a construire.
        </DelayedText>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <p className="text-lg text-white/60">1 match pour</p>
      <p className="text-7xl sm:text-8xl font-extrabold" style={{ color }}>
        <RevealCounter target={likesPerMatch} />
      </p>
      <p className="text-lg text-white/60">likes</p>
      <DelayedText delay={1000} className="text-base text-white/50">
        taux de conversion : {m.swipeToMatchRate}%
      </DelayedText>
    </div>
  );
}

function Slide5({ metrics: m }: { metrics: WrappedMetrics }) {
  const color = appColor(m.source);
  const hour = m.peakSwipeHour;

  const chronoLabel =
    hour < 6
      ? "Noctambule assume(e)"
      : hour < 9
        ? "Matinal(e)"
        : hour < 12
          ? "Swipeur(se) de bureau"
          : hour < 14
            ? "Pause dej'"
            : hour < 18
              ? "L'aprem libre"
              : hour < 21
                ? "Prime time"
                : "Night owl";

  const chronoDesc =
    hour < 6
      ? "Tu swipes quand les autres dorment."
      : hour < 9
        ? "Le petit-dej au lit, version 2026."
        : hour < 12
          ? "Entre deux mails, un petit swipe."
          : hour < 14
            ? "Le dating, ca se fait a la cantine."
            : hour < 18
              ? "L'apres-midi, tranquille."
              : hour < 21
                ? "Tu swipes aux heures de pointe. Malin."
                : "La nuit, tous les profils sont beaux.";

  return (
    <div className="flex flex-col items-center justify-center gap-5 text-center">
      <p className="text-6xl sm:text-7xl font-extrabold" style={{ color }}>
        {hour}h
      </p>
      <p className="text-xl font-bold text-white/80">{chronoLabel}</p>
      <p className="text-base text-white/50 italic max-w-sm">{chronoDesc}</p>
      <DelayedText delay={1000} className="text-sm text-white/40">
        le {m.bestDay} de preference
      </DelayedText>
      {m.hourlyFromMessages && (
        <p className="text-xs text-white/30 mt-2">
          * base sur les heures de messages (pas de timestamps de swipe)
        </p>
      )}
    </div>
  );
}

function Slide6({
  metrics: m,
  onComplete,
}: {
  metrics: WrappedMetrics;
  onComplete: () => void;
}) {
  const verdict = getVerdict(m);

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <motion.span
        className="text-6xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {verdict.icon}
      </motion.span>
      <h2 className="text-2xl font-extrabold text-white">{verdict.title}</h2>
      <p className="text-base text-white/60 max-w-sm">{verdict.message}</p>
      <button
        onClick={onComplete}
        className="mt-4 rounded-full bg-white px-8 py-4 text-base font-bold text-slate-900 transition hover:scale-105 active:scale-95"
      >
        Voir le rapport complet
      </button>
      <a
        href={verdict.ctaHref}
        className="text-sm text-white/40 underline underline-offset-4 hover:text-white/60 transition"
      >
        {verdict.ctaLabel}
      </a>
    </div>
  );
}

// ── Main WrappedReveal component ─────────────────────────────────

interface WrappedRevealProps {
  metrics: WrappedMetrics;
  onComplete: () => void;
}

export default function WrappedReveal({ metrics, onComplete }: WrappedRevealProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(0);

  // Build slide list — skip slide 5 (rhythm) if dailyOnly && !hourlyFromMessages
  const showRhythm = !metrics.dailyOnly || metrics.hourlyFromMessages;
  const slideCount = showRhythm ? 6 : 5;

  const isLastSlide = currentSlide === slideCount - 1;

  const goNext = useCallback(() => {
    if (isLastSlide) return; // last slide uses CTA button
    setDirection(1);
    setCurrentSlide((s) => Math.min(s + 1, slideCount - 1));
  }, [isLastSlide, slideCount]);

  const handleComplete = useCallback(() => {
    track("wrapped_reveal_completed", { slides: slideCount });
    onComplete();
  }, [onComplete, slideCount]);

  const handleSkip = useCallback(() => {
    track("wrapped_reveal_skipped", { at_slide: currentSlide });
    onComplete();
  }, [onComplete, currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Escape") {
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, handleSkip]);

  // Back button during reveal → exit to report
  useEffect(() => {
    const onPop = () => onComplete();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onComplete]);

  // Touch swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) goNext(); // swipe left → next
  };

  // Map slide index to component — account for skipped slide 5
  function renderSlide(idx: number) {
    const slideIdx = !showRhythm && idx >= 4 ? idx + 1 : idx;
    switch (slideIdx) {
      case 0: return <Slide1 metrics={metrics} />;
      case 1: return <Slide2 metrics={metrics} />;
      case 2: return <Slide3 metrics={metrics} />;
      case 3: return <Slide4 metrics={metrics} />;
      case 4: return <Slide5 metrics={metrics} />;
      case 5: return <Slide6 metrics={metrics} onComplete={handleComplete} />;
      default: return null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#080b14]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Tap zone (not on last slide — CTA button handles it) */}
      {!isLastSlide && (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={goNext}
          aria-label="Slide suivant"
        />
      )}

      {/* Skip button */}
      <div className="relative z-20 flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-sm text-white/40 hover:text-white/70 transition"
        >
          Passer l'intro
        </button>
      </div>

      {/* Slide content */}
      <div className="relative z-20 flex flex-1 items-center justify-center overflow-hidden px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
            className="w-full max-w-lg"
          >
            {renderSlide(currentSlide)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      <div className="relative z-20 flex justify-center gap-2 pb-8">
        {Array.from({ length: slideCount }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentSlide
                ? "w-6 bg-white"
                : "w-2 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
