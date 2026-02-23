/**
 * 12-month calendar heatmap (GitHub contribution graph style).
 *
 * Renders a grid of columns (weeks) x 7 rows (days-of-week).
 * Color intensity maps to activity score (0-100).
 * No external dependencies — uses CSS Grid.
 */

import { useMemo, useState } from "react";
import type { CalendarDayItem } from "../types";

interface CalendarHeatmapProps {
  calendar: CalendarDayItem[];
}

const MONTHS_FR = [
  "Jan", "Fev", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Aout", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["", "Lun", "", "Mer", "", "Ven", ""];

function scoreToColor(score: number): string {
  if (score >= 75) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 45) return "bg-yellow-500";
  if (score >= 30) return "bg-blue-400";
  return "bg-blue-900";
}

function buildWeekGrid(
  calendar: CalendarDayItem[]
): (CalendarDayItem | null)[][] {
  if (calendar.length === 0) return [];

  const sorted = [...calendar].sort((a, b) => a.date.localeCompare(b.date));
  const weeks: (CalendarDayItem | null)[][] = [];
  let currentWeek: (CalendarDayItem | null)[] = Array(7).fill(null);

  for (const day of sorted) {
    const d = new Date(day.date + "T00:00:00");
    const dayOfWeek = (d.getDay() + 6) % 7; // 0=Monday

    if (dayOfWeek === 0 && currentWeek.some((d) => d !== null)) {
      weeks.push(currentWeek);
      currentWeek = Array(7).fill(null);
    }

    currentWeek[dayOfWeek] = day;
  }

  if (currentWeek.some((d) => d !== null)) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function getMonthLabels(
  weeks: (CalendarDayItem | null)[][]
): { label: string; weekIndex: number }[] {
  const labels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w].find((d) => d !== null);
    if (!firstDay) continue;

    const d = new Date(firstDay.date + "T00:00:00");
    const month = d.getMonth();

    if (month !== lastMonth) {
      labels.push({ label: MONTHS_FR[month], weekIndex: w });
      lastMonth = month;
    }
  }

  return labels;
}

const CELL_SIZE = 14;
const CELL_GAP = 2;
const LABEL_WIDTH = 32;

export default function CalendarHeatmap({ calendar }: CalendarHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<CalendarDayItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const weeks = useMemo(() => buildWeekGrid(calendar), [calendar]);
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  const handleMouseEnter = (
    day: CalendarDayItem,
    e: React.MouseEvent
  ) => {
    setHoveredDay(day);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="flex text-xs text-gray-500" style={{ paddingLeft: LABEL_WIDTH }}>
        {monthLabels.map((m, i) => (
          <div
            key={`${m.label}-${m.weekIndex}`}
            className="absolute text-xs text-gray-500"
            style={{
              left: LABEL_WIDTH + m.weekIndex * (CELL_SIZE + CELL_GAP),
            }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-5 flex">
        {/* Day-of-week labels */}
        <div className="flex shrink-0 flex-col" style={{ width: LABEL_WIDTH }}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-xs text-gray-500"
              style={{
                height: CELL_SIZE + CELL_GAP,
                lineHeight: `${CELL_SIZE + CELL_GAP}px`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="overflow-x-auto pb-2">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${weeks.length}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
              gap: `${CELL_GAP}px`,
            }}
          >
            {weeks.map((week, wIdx) =>
              week.map((day, dIdx) => (
                <div
                  key={`${wIdx}-${dIdx}`}
                  className={`rounded-sm transition-opacity ${
                    day
                      ? `${scoreToColor(day.score)} cursor-pointer hover:opacity-80 ${
                          day.event ? "ring-1 ring-white/50" : ""
                        }`
                      : "bg-gray-800/30"
                  }`}
                  style={{
                    gridColumn: wIdx + 1,
                    gridRow: dIdx + 1,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                  onMouseEnter={(e) => day && handleMouseEnter(day, e)}
                  onMouseLeave={() => setHoveredDay(null)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-900" />
          Calme
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-500" />
          Moyen
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
          Intense
        </span>
      </div>

      {/* Tooltip */}
      {hoveredDay && <Tooltip day={hoveredDay} position={tooltipPos} />}
    </div>
  );
}

function Tooltip({
  day,
  position,
}: {
  day: CalendarDayItem;
  position: { x: number; y: number };
}) {
  const d = new Date(day.date + "T00:00:00");
  const dateStr = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      <p className="font-medium capitalize text-white">{dateStr}</p>
      {day.event && (
        <p className="text-brand-400">{day.event}</p>
      )}
      <p className="mt-1">
        Score : <span className="font-bold text-white">{day.score}/100</span>
      </p>
      {day.components.google_trends !== undefined && (
        <p className="text-gray-400">Trends : {day.components.google_trends}</p>
      )}
      {day.components.wikipedia !== undefined && (
        <p className="text-gray-400">Wikipedia : {day.components.wikipedia}</p>
      )}
      <p className="text-gray-400">Saisonnier : {day.components.seasonal}</p>
    </div>
  );
}
