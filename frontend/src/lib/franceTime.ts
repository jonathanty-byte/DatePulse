const PARIS_TIME_ZONE = "Europe/Paris";

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const PARIS_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PARIS_TIME_ZONE,
  weekday: "short",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export interface ParisDateParts {
  day: number; // 0=Sunday (JS getDay convention)
  month: number; // 0=January (JS getMonth convention)
  hour: number;
  minute: number;
}

export function getParisDateParts(date: Date): ParisDateParts {
  const parts = PARIS_PARTS_FORMATTER.formatToParts(date);

  let weekday = "";
  let month = "";
  let hour = "";
  let minute = "";

  for (const part of parts) {
    if (part.type === "weekday") weekday = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "hour") hour = part.value;
    if (part.type === "minute") minute = part.value;
  }

  const dayIndex = WEEKDAY_TO_INDEX[weekday];
  const monthIndex = Number(month) - 1;
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);

  if (
    dayIndex === undefined ||
    Number.isNaN(monthIndex) ||
    Number.isNaN(hourNumber) ||
    Number.isNaN(minuteNumber)
  ) {
    throw new Error("Cannot parse Europe/Paris date parts");
  }

  return {
    day: dayIndex,
    month: monthIndex,
    hour: hourNumber,
    minute: minuteNumber,
  };
}

export function formatParisDay(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatParisTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Get the current hour (0-23) in Europe/Paris timezone. */
export function getParisHour(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      hour12: false,
      timeZone: PARIS_TIME_ZONE,
    }).format(date)
  );
}
