export type MeetupStatus = "live" | "starting-soon" | "upcoming";

const PACIFIC_TIMEZONE = "America/Los_Angeles";
const THURSDAY_INDEX = 4; // Sunday=0
const STARTING_SOON_MINUTES = 11 * 60;
const LIVE_START_MINUTES = 12 * 60;
const LIVE_END_MINUTES = 15 * 60;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface PacificDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const getPacificDateParts = (date: Date = new Date()): PacificDateParts => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  const rawHour = parseInt(value("hour"), 10);

  return {
    year: parseInt(value("year"), 10),
    month: parseInt(value("month"), 10),
    day: parseInt(value("day"), 10),
    hour: rawHour % 24,
    minute: parseInt(value("minute"), 10),
    weekday: WEEKDAY_INDEX[value("weekday")] ?? 0,
  };
};

const getTimezoneOffsetMs = (date: Date, timezone: string): number => {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName")?.value;

  const match = part?.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return -8 * 60 * 60 * 1000;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3] ?? "0", 10);
  return sign * (hours * 60 + minutes) * 60 * 1000;
};

const pacificDateTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date => {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMs = getTimezoneOffsetMs(utcGuess, PACIFIC_TIMEZONE);
  return new Date(utcGuess.getTime() - offsetMs);
};

export const getMeetupStatus = (date: Date = new Date()): MeetupStatus => {
  const pt = getPacificDateParts(date);
  const totalMinutes = pt.hour * 60 + pt.minute;

  if (pt.weekday !== THURSDAY_INDEX) return "upcoming";
  if (totalMinutes >= LIVE_START_MINUTES && totalMinutes < LIVE_END_MINUTES) return "live";
  if (totalMinutes >= STARTING_SOON_MINUTES && totalMinutes < LIVE_START_MINUTES) return "starting-soon";

  return "upcoming";
};

export const isMeetupActive = (date: Date = new Date()): boolean => {
  return getMeetupStatus(date) !== "upcoming";
};

export const getNextMeetupDate = (date: Date = new Date()): Date => {
  const pt = getPacificDateParts(date);
  let daysUntil = (THURSDAY_INDEX - pt.weekday + 7) % 7;
  const totalMinutes = pt.hour * 60 + pt.minute;

  // On Thursday at/after 12 PM PT, target next week.
  if (daysUntil === 0 && totalMinutes >= LIVE_START_MINUTES) {
    daysUntil = 7;
  }

  const targetCalendarDate = new Date(Date.UTC(pt.year, pt.month - 1, pt.day));
  targetCalendarDate.setUTCDate(targetCalendarDate.getUTCDate() + daysUntil);

  return pacificDateTimeToUtc(
    targetCalendarDate.getUTCFullYear(),
    targetCalendarDate.getUTCMonth() + 1,
    targetCalendarDate.getUTCDate(),
    12,
    0,
  );
};
