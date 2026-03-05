import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Animation helpers ────────────────────────────────────────

/** Scroll-triggered fade-in animation props */
export const fadeIn = (delay: number = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.5 },
});

/** Immediate animation for hero (above fold) */
export const fadeHero = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6 },
});

// ── Shared UI components ─────────────────────────────────────

/** Glass morphism card — static wrapper (no motion) */
export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-gray-200 bg-white shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

/** Animated number counter — triggers on viewport entry */
export function AnimatedCounter({ target, duration = 1400, prefix = "", suffix = "", className = "" }: {
  target: number; duration?: number; prefix?: string; suffix?: string; className?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
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
  return <span ref={ref} className={className}>{prefix}{count.toLocaleString("fr-FR")}{suffix}</span>;
}

/** Hero spotlight card with gradient background */
export function SpotlightCard({ value, label, sublabel, color, icon }: {
  value: React.ReactNode; label: string; sublabel?: string; color: string; icon?: string;
}) {
  return (
    <motion.div
      className="relative overflow-hidden border border-gray-200 shadow-sm p-6 sm:p-8 text-center"
      style={{ background: `linear-gradient(135deg, ${color}10 0%, transparent 60%)`, borderColor: `${color}30` }}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {icon && <span className="absolute top-3 right-4 text-4xl opacity-[0.07]">{icon}</span>}
      <div className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color }}>{value}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{label}</div>
      {sublabel && <div className="mt-1 text-xs text-slate-400">{sublabel}</div>}
    </motion.div>
  );
}

/** Narrative intro paragraph with scroll-triggered fade */
export function NarrativeIntro({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.p
      className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-3xl"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      {text}
    </motion.p>
  );
}

/** Horizontal bar chart — simple animated bars */
export function MiniBar({ bars, maxOverride }: { bars: { label: string; value: number; color?: string }[]; maxOverride?: number }) {
  const mx = maxOverride ?? Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="space-y-1.5">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-[11px] text-slate-500 truncate">{b.label}</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: b.color || "#6366f1" }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(b.value / mx) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="w-10 text-right text-[11px] font-medium text-slate-800">{Number.isInteger(b.value) ? b.value : parseFloat(b.value.toFixed(2))}</span>
        </div>
      ))}
    </div>
  );
}

/** Collapsible detail section */
export function ExpandToggle({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition">
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▸</span>{title}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Section title with emoji + gradient text */
export function SectionTitle({ emoji, title, subtitle, delay = 0 }: { emoji: string; title: string; subtitle?: string; delay?: number }) {
  return (
    <motion.div {...fadeIn(delay)} className="space-y-1">
      <h2 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
        <span className="text-3xl">{emoji}</span>
        <span className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">{title}</span>
      </h2>
      {subtitle && <p className="text-xs text-slate-400 pl-12">{subtitle}</p>}
    </motion.div>
  );
}

/** Circular progress ring with animated fill */
export function ProgressRing({ value, max = 10, size = 60, label, color = "#6366f1" }: {
  value: number; max?: number; size?: number; label: string; color?: string;
}) {
  const strokeW = 4;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} className="text-gray-200" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: circ * (1 - pct) }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-slate-400 text-center leading-tight max-w-[80px]">{label}</span>
    </div>
  );
}

/** Stat badges row — displayed above charts for instant context */
export function ChartBadges({ items }: {
  items: { label: string; value: string | number; color: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((b) => (
        <span
          key={b.label}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] border"
          style={{
            background: `${b.color}0F`,
            borderColor: `${b.color}26`,
            color: b.color,
          }}
        >
          <span className="text-slate-400">{b.label}</span>
          <span className="font-bold">{typeof b.value === "number" ? b.value.toLocaleString("fr-FR") : b.value}</span>
        </span>
      ))}
    </div>
  );
}

/** Generic section navigation pills — sticky bar */
export function SectionNav({ items, badgeLabel }: {
  items: { id: string; emoji: string; label: string }[];
  badgeLabel?: string;
}) {
  return (
    <div className="sticky top-[52px] z-40 -mx-4 bg-[#f8f9fc]/90 backdrop-blur-md border-b border-gray-200 px-4 py-2">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {badgeLabel && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-600 font-medium">
            {badgeLabel}
          </span>
        )}
        {items.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:bg-gray-100 hover:text-slate-900"
          >
            <span>{n.emoji}</span>
            <span className="hidden sm:inline">{n.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
