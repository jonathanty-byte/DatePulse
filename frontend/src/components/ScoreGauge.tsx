import { motion } from "framer-motion";
import { getScoreLabel } from "../lib/scoring";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export default function ScoreGauge({ score, size = 220 }: ScoreGaugeProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const progress = score / 100;
  const { color, icon } = getScoreLabel(score);

  // Pulse intensity based on score: high score = stronger pulse
  const pulseOpacity = score >= 70 ? [0.25, 0.55] : score >= 40 ? [0.2, 0.4] : [0.15, 0.25];
  const pulseScale = score >= 70 ? [1, 1.08] : score >= 40 ? [1, 1.04] : [1, 1.02];

  return (
    <div className="relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/5"
        />
        {/* Animated score arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Pulsing glow arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth / 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference * (1 - progress),
            opacity: pulseOpacity,
          }}
          transition={{
            strokeDashoffset: { duration: 1.4, ease: "easeOut" },
            opacity: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
          }}
          filter="url(#glow)"
        />
      </svg>
      {/* Outer pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 30px 2px ${color}` }}
        animate={{
          opacity: pulseOpacity,
          scale: pulseScale,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl sm:text-5xl font-bold"
          style={{ color }}
          key={score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {score}
        </motion.span>
        <span className="text-xs sm:text-sm text-gray-400">/100</span>
        <span className="mt-1 text-base sm:text-lg">{icon}</span>
      </div>
    </div>
  );
}
