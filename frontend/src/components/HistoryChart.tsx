/**
 * Line chart showing score history over time (recharts).
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryItem } from "../types";

interface HistoryChartProps {
  history: HistoryItem[];
  height?: number;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return dateStr.slice(5, 10);
  }
}

export default function HistoryChart({
  history,
  height = 300,
}: HistoryChartProps) {
  if (history.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        Pas de donnees historiques
      </div>
    );
  }

  const data = history.map((h) => ({
    date: formatDate(h.date),
    score: Math.round(h.score),
    fullDate: h.date,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          width={35}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: 13,
          }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#ec4899" }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#ec4899"
          strokeWidth={2}
          fill="url(#scoreGradient)"
          name="Score"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
