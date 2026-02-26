import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { APP_MONTHLY, APPS } from "../lib/data";
import type { AppName } from "../lib/data";
import { getParisDateParts } from "../lib/franceTime";

/** French abbreviated month names (index 0 = January). */
const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Aout", "Sep", "Oct", "Nov", "Dec",
];

/** Brand colors per app. */
const APP_COLORS: Record<AppName, string> = {
  tinder: "#ec4899",  // brand-500 / pink
  bumble: "#f59e0b",  // amber-500
  hinge: "#8b5cf6",   // violet-500
  happn: "#f97316",   // orange-500
};

const APP_LABELS: Record<AppName, string> = {
  tinder: "Tinder",
  bumble: "Bumble",
  hinge: "Hinge",
  happn: "Happn",
};

interface YearlyChartProps {
  app: AppName;
  now?: Date;
}

/** Custom tooltip styled for dark theme — only shows selected apps. */
function ChartTooltip({
  active,
  payload,
  label,
  selectedApps,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  selectedApps: Set<AppName>;
}) {
  if (!active || !payload?.length) return null;

  const visible = payload.filter((e) => selectedApps.has(e.dataKey as AppName));
  if (!visible.length) return null;

  // Sort by value desc
  const sorted = [...visible].sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <p className="mb-1.5 text-xs font-semibold text-gray-300">{label}</p>
      {sorted.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center gap-2 text-xs font-medium"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: entry.color }}>
            {APP_LABELS[entry.dataKey as AppName]}
          </span>
          <span className="ml-auto tabular-nums text-white">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Pulsing dot on current month for each selected app. */
function CurrentMonthDot({
  cx,
  cy,
  index,
  currentMonth,
  appName,
  isSelected,
}: {
  cx?: number;
  cy?: number;
  index?: number;
  currentMonth: number;
  appName: AppName;
  isSelected: boolean;
}) {
  if (
    !isSelected ||
    index !== currentMonth ||
    cx === undefined ||
    cy === undefined
  )
    return null;

  const color = APP_COLORS[appName];
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.15}>
        <animate
          attributeName="r"
          values="6;12;6"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.3;0.08;0.3"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={color}
        stroke="#0a0a0a"
        strokeWidth={2}
      />
    </g>
  );
}

export default function YearlyChart({ app, now }: YearlyChartProps) {
  // Multi-select state: initialized with only the current app from the main selector
  const [selectedApps, setSelectedApps] = useState<Set<AppName>>(
    () => new Set([app])
  );

  // When the main app selector changes, ensure it's always in the selection
  // (add it if not present, but don't remove others)
  useMemo(() => {
    setSelectedApps((prev) => {
      if (prev.has(app)) return prev;
      const next = new Set(prev);
      next.add(app);
      return next;
    });
  }, [app]);

  const toggleApp = useCallback((a: AppName) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(a)) {
        // Don't allow deselecting the last one
        if (next.size <= 1) return prev;
        next.delete(a);
      } else {
        next.add(a);
      }
      return next;
    });
  }, []);

  const currentMonth = useMemo(() => {
    const paris = getParisDateParts(now ?? new Date());
    return paris.month;
  }, [now]);

  // Transform APP_MONTHLY into recharts data format
  const chartData = useMemo(() => {
    return MONTH_LABELS.map((label, i) => {
      const point: Record<string, string | number> = { month: label };
      for (const a of APPS) {
        point[a] = APP_MONTHLY[a][i];
      }
      return point;
    });
  }, []);

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.35, duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-white sm:text-lg">
          Activite sur l'annee
        </h2>

        {/* Interactive legend — toggle chips */}
        <div className="flex flex-wrap gap-2">
          {APPS.map((a) => {
            const isActive = selectedApps.has(a);
            return (
              <button
                key={a}
                onClick={() => toggleApp(a)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "border-white/20 bg-white/[0.08] text-white"
                    : "border-white/5 bg-transparent text-gray-500 hover:border-white/10 hover:text-gray-400"
                }`}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full transition-opacity duration-200 ${
                    isActive ? "opacity-100" : "opacity-30"
                  }`}
                  style={{ backgroundColor: APP_COLORS[a] }}
                />
                {APP_LABELS[a]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
          >
            {/* Gradient definitions — dynamic opacity based on selection */}
            <defs>
              {APPS.map((a) => (
                <linearGradient
                  key={a}
                  id={`gradient-${a}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={APP_COLORS[a]}
                    stopOpacity={selectedApps.has(a) ? 0.2 : 0.02}
                  />
                  <stop
                    offset="100%"
                    stopColor={APP_COLORS[a]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              dy={8}
            />

            <YAxis
              domain={[40, 105]}
              axisLine={false}
              tickLine={false}
              tick={false}
            />

            {/* Current month reference line */}
            <ReferenceLine
              x={MONTH_LABELS[currentMonth]}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 4"
            />

            <Tooltip
              content={<ChartTooltip selectedApps={selectedApps} />}
              cursor={{
                stroke: "rgba(255,255,255,0.06)",
                strokeWidth: 1,
              }}
            />

            {/* Render all 4 curves — style depends on selection state */}
            {APPS.map((a) => {
              const isActive = selectedApps.has(a);
              return (
                <Area
                  key={a}
                  type="monotone"
                  dataKey={a}
                  stroke={APP_COLORS[a]}
                  strokeWidth={isActive ? 2.5 : 1}
                  strokeOpacity={isActive ? 1 : 0.1}
                  fill={`url(#gradient-${a})`}
                  fillOpacity={1}
                  dot={
                    isActive
                      ? (props: Record<string, unknown>) => (
                          <CurrentMonthDot
                            key={`dot-${a}-${props.index}`}
                            cx={props.cx as number}
                            cy={props.cy as number}
                            index={props.index as number}
                            currentMonth={currentMonth}
                            appName={a}
                            isSelected={isActive}
                          />
                        )
                      : false
                  }
                  activeDot={
                    isActive
                      ? {
                          r: 4,
                          stroke: APP_COLORS[a],
                          strokeWidth: 2,
                          fill: "#0a0a0a",
                        }
                      : false
                  }
                  animationDuration={800}
                  animationBegin={100}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Subtitle */}
      <p className="mt-3 text-center text-[11px] text-gray-500 sm:text-xs">
        Indice d'activite mensuel (0-100) — Sources : Adjust, Sensor Tower FR
      </p>
    </motion.div>
  );
}
