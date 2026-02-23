/**
 * Trend arrow indicator (rising / falling / stable).
 */

interface TrendIndicatorProps {
  trend: "rising" | "falling" | "stable" | null;
  className?: string;
}

export default function TrendIndicator({
  trend,
  className = "",
}: TrendIndicatorProps) {
  if (!trend) return null;

  const config = {
    rising: {
      arrow: "\u2191",
      label: "En hausse",
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    falling: {
      arrow: "\u2193",
      label: "En baisse",
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
    stable: {
      arrow: "\u2192",
      label: "Stable",
      color: "text-gray-400",
      bg: "bg-gray-400/10",
    },
  };

  const { arrow, label, color, bg } = config[trend];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${color} ${bg} ${className}`}
    >
      <span className="text-base">{arrow}</span>
      {label}
    </span>
  );
}
