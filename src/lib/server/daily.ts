import 'server-only';
import scheduleFile from '../data/daily-schedule.json';
import {
  parsePuzzleParam,
  parseSchedule,
  publishedPuzzle,
  publishedPuzzles,
  todaysNumber,
  type DailyPuzzle,
  type ScheduleFile,
} from '../data/dailySchedule';
import { nextSwitch, puzzleDate, utcDateKey, type DateKey } from '../utils/daily';

const schedule = parseSchedule(scheduleFile as unknown as ScheduleFile);

export interface DailyToday {
  /** Today's puzzle number by the calendar, or null before the first puzzle. */
  number: number | null;
  /** Today's puzzle, or null before the first puzzle or after the schedule runs out. */
  puzzle: DailyPuzzle | null;
  /** When the next puzzle goes live, in epoch milliseconds. */
  nextSwitchAt: number;
}

export function dailyToday(now: number): DailyToday {
  const today = utcDateKey(now);
  const n = todaysNumber(schedule, today);
  return { number: n, puzzle: n === null ? null : publishedPuzzle(schedule, n, today), nextSwitchAt: nextSwitch(now) };
}

/** Puzzle n if it is live at `now`, else null (future, unknown or not a puzzle number). */
export function dailyPuzzle(n: number, now: number): DailyPuzzle | null {
  return publishedPuzzle(schedule, n, utcDateKey(now));
}

/** Every live puzzle, newest first. */
export function dailyArchive(now: number): DailyPuzzle[] {
  return publishedPuzzles(schedule, utcDateKey(now));
}

/** The UTC date puzzle n goes live; only the date, nothing of the puzzle. */
export function dailyDate(n: number): DateKey {
  return puzzleDate(n, schedule.firstDate);
}

export { parsePuzzleParam };
