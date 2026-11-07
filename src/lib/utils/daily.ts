import type { Difficulty } from './GameLogic';

/**
 * Calendar rules for the daily puzzle. Everything runs on UTC calendar dates written as
 * YYYY-MM-DD, so every player in the world is on the same puzzle at the same moment.
 */
export type DateKey = string;

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Easy early in the week, Medium mid-week, Hard from Friday to Sunday; indexed by UTC weekday (Sunday = 0). */
const WEEKDAY_BANDS: Difficulty[] = ['hard', 'easy', 'easy', 'medium', 'medium', 'hard', 'hard'];

function dayIndex(key: DateKey): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

function keyFromDayIndex(index: number): DateKey {
  return new Date(index * DAY_MS).toISOString().slice(0, 10);
}

/** The UTC calendar date of an instant. */
export function utcDateKey(instant: number): DateKey {
  return new Date(instant).toISOString().slice(0, 10);
}

export function addDays(key: DateKey, days: number): DateKey {
  return keyFromDayIndex(dayIndex(key) + days);
}

/** The puzzle number for a date, counting the first puzzle's date as #1, or null before it. */
export function puzzleNumber(key: DateKey, firstKey: DateKey): number | null {
  const n = dayIndex(key) - dayIndex(firstKey) + 1;
  return n >= 1 ? n : null;
}

export function puzzleDate(n: number, firstKey: DateKey): DateKey {
  return addDays(firstKey, n - 1);
}

export function weekdayName(key: DateKey): string {
  return WEEKDAYS[new Date(dayIndex(key) * DAY_MS).getUTCDay()];
}

export function bandForDate(key: DateKey): Difficulty {
  return WEEKDAY_BANDS[new Date(dayIndex(key) * DAY_MS).getUTCDay()];
}

/** The next 00:00 UTC strictly after an instant, when the next puzzle goes live. */
export function nextSwitch(instant: number): number {
  return (Math.floor(instant / DAY_MS) + 1) * DAY_MS;
}
