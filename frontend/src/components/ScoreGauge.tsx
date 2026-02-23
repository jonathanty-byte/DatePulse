/**
 * Circular gauge displaying the activity score (0-100).
 * SVG-based with animated fill and color gradient.
 */

interface ScoreGaugeProps {
  score: number | null;
  percentile: number | null;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#eab308"; // yellow
  if (score >= 40) return "#f97316"; // orange
  return "#ef4444"; // red
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "En feu";
  if (score >= 60) return "Actif";
  if (score >= 40) return "Moyen";
  return "Calme";
}

export default function ScoreGauge({
  score,
  percentile,
  size = 200,
}: ScoreGaugeProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const displayScore = score ?? 0;
  const progress = displayScore / 100;
  const dashOffset = circumference * (1 - progress);
  const color = getScoreColor(displayScore);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-800"
          />
          {/* Score arc */}
          {score !== null && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="gauge-animated"
              style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
            />
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {score !== null ? (
            <>
              <span className="text-4xl font-bold" style={{ color }}>
                {Math.round(displayScore)}
              </span>
              <span className="text-sm text-gray-400">/ 100</span>
            </>
          ) : (
            <span className="text-lg text-gray-500">--</span>
          )}
        </div>
      </div>
      {/* Label */}
      {score !== null && (
        <div className="text-center">
          <span
            className="inline-block rounded-full px-3 py-1 text-sm font-medium"
            style={{ backgroundColor: color + "22", color }}
          >
            {getScoreLabel(displayScore)}
          </span>
          {percentile !== null && (
            <p className="mt-1 text-xs text-gray-500">
              Meilleur que {Math.round(percentile)}% des creneaux
            </p>
          )}
        </div>
      )}
    </div>
  );
}
