import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Scene data ──────────────────────────────────────────────────

const SCENES = [
  {
    id: "num1",
    duration: 2800,
    render: () => (
      <div className="text-center">
        <motion.div
          className="text-[100px] sm:text-[120px] font-black leading-none tracking-tighter text-slate-800"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 80 }}
        >
          12,847
        </motion.div>
        <motion.div
          className="mt-4 text-xl sm:text-2xl font-medium text-slate-500"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          swipes analyses
        </motion.div>
      </div>
    ),
  },
  {
    id: "num2",
    duration: 2800,
    render: () => (
      <div className="text-center">
        <motion.div
          className="text-[100px] sm:text-[120px] font-black leading-none tracking-tighter text-amber-500"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 80 }}
        >
          67%
        </motion.div>
        <motion.div
          className="mt-4 text-xl sm:text-2xl font-medium text-slate-500"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          de conversations fantomes
        </motion.div>
      </div>
    ),
  },
  {
    id: "funnel",
    duration: 3200,
    render: () => {
      const bars = [
        { label: "Swipes", value: "12,847", pct: 100, color: "#6366f1", delay: 0.2 },
        { label: "Matchs", value: "847", pct: 38, color: "#8b5cf6", delay: 0.5 },
        { label: "Conversations", value: "312", pct: 16, color: "#a78bfa", delay: 0.8 },
      ];
      return (
        <div className="w-full max-w-lg px-6">
          <motion.div
            className="text-center mb-8 text-sm font-bold text-slate-600 uppercase tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            Funnel complet
          </motion.div>
          {bars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-4 mb-4">
              <span className="w-28 text-right text-sm font-medium text-slate-500">
                {bar.label}
              </span>
              <div className="flex-1 h-9 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full flex items-center justify-end px-3"
                  style={{ backgroundColor: bar.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${bar.pct}%` }}
                  transition={{ delay: bar.delay, duration: 0.8, ease: "easeOut" }}
                >
                  <span className="text-xs font-bold text-white">{bar.value}</span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: "heatmap",
    duration: 3200,
    render: () => {
      const data = [
        [0.05, 0.1, 0.3, 0.7, 0.9, 0.4],
        [0.05, 0.15, 0.4, 0.8, 0.95, 0.5],
        [0.05, 0.2, 0.5, 0.75, 0.85, 0.4],
        [0.1, 0.25, 0.5, 0.85, 1.0, 0.6],
        [0.2, 0.4, 0.7, 0.95, 1.0, 0.7],
        [0.2, 0.35, 0.6, 0.9, 0.95, 0.6],
      ];
      const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      const hours = ["6h", "10h", "14h", "18h", "21h", "0h"];
      return (
        <div>
          <motion.div
            className="text-center mb-6 text-sm font-bold text-slate-600 uppercase tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Timing optimal
          </motion.div>
          <div className="flex gap-1 ml-12 mb-1.5">
            {hours.map((h) => (
              <div key={h} className="w-12 text-center text-[11px] text-slate-400">
                {h}
              </div>
            ))}
          </div>
          {data.map((row, d) => (
            <div key={d} className="flex items-center gap-1 mb-1">
              <div className="w-10 text-right text-xs font-medium text-slate-500">
                {days[d]}
              </div>
              {row.map((v, h) => (
                <motion.div
                  key={h}
                  className="w-12 h-8 rounded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, backgroundColor: `rgba(59, 130, 246, ${v})` }}
                  transition={{ delay: d * 0.08 + h * 0.05, duration: 0.4 }}
                />
              ))}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: "radar",
    duration: 3000,
    render: () => {
      const axes = 5;
      const values = [0.8, 0.5, 0.7, 0.6, 0.9];
      const labels = ["Selectivite", "Reactivite", "Engagement", "Regularite", "Timing"];
      const size = 260;
      const cx = size / 2;
      const cy = size / 2;
      const r = 100;
      const getPoint = (i: number, v: number) => {
        const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
        return { x: cx + Math.cos(angle) * r * v, y: cy + Math.sin(angle) * r * v };
      };
      const rings = [0.33, 0.66, 1.0];
      const dataPoints = values.map((v, i) => getPoint(i, v));
      const dataPath =
        dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
      return (
        <div className="text-center">
          <motion.div
            className="mb-6 text-sm font-bold text-slate-600 uppercase tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            ADN Dating
          </motion.div>
          <motion.svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 40 }}
          >
            {rings.map((ring) => {
              const pts = Array.from({ length: axes }, (_, i) => getPoint(i, ring));
              const path =
                pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
              return (
                <path key={ring} d={path} fill="none" stroke="#e2e8f0" strokeWidth={1} />
              );
            })}
            {Array.from({ length: axes }, (_, i) => {
              const p = getPoint(i, 1);
              return (
                <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={0.5} />
              );
            })}
            <motion.path
              d={dataPath}
              fill="rgba(139, 92, 246, 0.2)"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
            {dataPoints.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={4}
                fill="#8b5cf6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              />
            ))}
            {labels.map((label, i) => {
              const pt = getPoint(i, 1.3);
              return (
                <text
                  key={label}
                  x={pt.x}
                  y={pt.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="#64748b"
                  fontFamily="system-ui, sans-serif"
                >
                  {label}
                </text>
              );
            })}
          </motion.svg>
        </div>
      );
    },
  },
  {
    id: "tagline",
    duration: 3000,
    render: () => (
      <div className="text-center px-6">
        <motion.div
          className="text-4xl sm:text-5xl font-black leading-tight bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 60 }}
        >
          Tes donnees racontent une histoire
        </motion.div>
        <motion.div
          className="mt-5 text-lg text-slate-400 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Decouvre-la en 2 minutes
        </motion.div>
      </div>
    ),
  },
];

// ── TrailerPlayer ───────────────────────────────────────────────

interface TrailerPlayerProps {
  onEnd: () => void;
}

export default function TrailerPlayer({ onEnd }: TrailerPlayerProps) {
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    if (sceneIndex >= SCENES.length) {
      onEnd();
      return;
    }
    const timer = setTimeout(() => {
      setSceneIndex((i) => i + 1);
    }, SCENES[sceneIndex].duration);
    return () => clearTimeout(timer);
  }, [sceneIndex, onEnd]);

  if (sceneIndex >= SCENES.length) return null;

  const scene = SCENES[sceneIndex];

  return (
    <div
      className="h-full w-full flex items-center justify-center cursor-pointer relative"
      onClick={onEnd}
      title="Cliquer pour passer"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          className="flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {scene.render()}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {SCENES.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === sceneIndex
                ? "w-6 bg-indigo-500"
                : i < sceneIndex
                  ? "w-1.5 bg-indigo-300"
                  : "w-1.5 bg-slate-300"
            }`}
          />
        ))}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onEnd();
        }}
        className="absolute bottom-8 right-8 text-sm text-slate-400 hover:text-slate-600 transition font-medium"
      >
        Passer &rarr;
      </button>
    </div>
  );
}
