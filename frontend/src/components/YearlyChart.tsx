import { useMemo } from "react";
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

/** Custom tooltip styled for dark theme. */
function ChartTooltip({
  active,
  payload,
  label,
  selectedApp,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  selectedApp: AppName;
}) {
  if (!active || !payload?.length) return null;

  // Sort: selected app first, then by value desc
  const sorted = [...payload].sort((a, b) => {
    if (a.dataKey === selectedApp) return -1;
    if (b.dataKey === selectedApp) return 1;
    return b.value - a.value;
  });

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <p className="mb-1.5 text-xs font-semibold text-gray-300">{label}</p>
      {sorted.map((entry) => (
        <div
          key={entry.dataKey}
          className={`flex items-center gap-2 text-xs ${
            entry.dataKey === selectedApp ? "font-semibold" : "text-gray-500"
          }`}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: entry.dataKey === selectedApp ? entry.color : undefined }}>
            {APP_LABELS[entry.dataKey as AppName]}
          </span>
          <span
            className="ml-auto tabular-nums"
            style={{ color: entry.dataKey === selectedApp ? "#fff" : undefined }}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Custom active dot with pulse animation for current month. */
function ActiveMonthDot({
  cx,
  cy,
  dataKey,
  index,
  currentMonth,
  selectedApp,
}: {
  cx?: number;
  cy?: number;
  dataKey?: string;
  index?: number;
  currentMonth: number;
  selectedApp: AppName;
}) {
  if (
    index !== currentMonth ||
    dataKey !== selectedApp ||
    cx === undefined ||
    cy === undefined
  )
    return null;

  return (
    <g>
      {/* Pulse ring */}
      <circle cx={cx} cy={cy} r={10} fill={APP_COLORS[selectedApp]} opacity={0.15}>
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
      {/* Solid dot */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={APP_COLORS[selectedApp]}
        stroke="#0a0a0a"
        strokeWidth={2}
      />
    </g>
  );
}

export default function YearlyChart({ app, now }: YearlyChartProps) {
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
      <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-white sm:text-lg">
          Activite sur l'annee
        </h2>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {APPS.map((a) => (
            <div
              key={a}
              className={`flex items-center gap-1.5 text-xs transition-opacity duration-300 ${
                a === app ? "opacity-100" : "opacity-40"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: APP_COLORS[a] }}
              />
              <span className="text-gray-300">{APP_LABELS[a]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
          >
            {/* Gradient definitions */}
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
                    stopOpacity={a === app ? 0.25 : 0.05}
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
              content={
                <ChartTooltip selectedApp={app} />
              }
              cursor={{
                stroke: "rgba(255,255,255,0.06)",
                strokeWidth: 1,
              }}
            />

            {/* Ghost curves (non-selected apps) — rendered first (behind) */}
            {APPS.filter((a) => a !== app).map((a) => (
              <Area
                key={a}
                type="monotone"
                dataKey={a}
                stroke={APP_COLORS[a]}
                strokeWidth={1.5}
                strokeOpacity={0.15}
                fill={`url(#gradient-${a})`}
                fillOpacity={1}
                dot={false}
                activeDot={false}
                animationDuration={800}
                animationBegin={200}
              />
            ))}

            {/* Selected app curve — rendered last (on top) */}
            <Area
              type="monotone"
              dataKey={app}
              stroke={APP_COLORS[app]}
              strokeWidth={2.5}
              fill={`url(#gradient-${app})`}
              fillOpacity={1}
              dot={(props: Record<string, unknown>) => (
                <ActiveMonthDot
                  key={`dot-${props.index}`}
                  cx={props.cx as number}
                  cy={props.cy as number}
                  dataKey={app}
                  index={props.index as number}
                  currentMonth={currentMonth}
                  selectedApp={app}
                />
              )}
              activeDot={{
                r: 4,
                stroke: APP_COLORS[app],
                strokeWidth: 2,
                fill: "#0a0a0a",
              }}
              animationDuration={800}
              animationBegin={100}
            />
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
