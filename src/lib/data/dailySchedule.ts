/**
 * The daily puzzle schedule: one self-contained puzzle per UTC date, generated ahead of time
 * (src/lib/services/dailyScheduleBuild.ts) and committed as daily-schedule.json.
 *
 * Only src/lib/server/daily.ts reads the JSON, so future puzzles never reach the browser.
 * This module holds the pure rules over a parsed schedule and must not import the JSON.
 */
import { DIFFICULTY_BANDS } from '../utils/difficulty';
import { areContemporaries } from '../utils/ChainAnalyzer';
import { bandForDate, puzzleDate, puzzleNumber, type DateKey } from '../utils/daily';
import type { Difficulty } from '../utils/GameLogic';
import { APPROXIMATE_BIRTH, APPROXIMATE_DEATH, type RosterPerson } from './roster';

/** A person as a puzzle stores them: identity and years, fixed when the puzzle was generated. */
export type PuzzlePerson = Omit<RosterPerson, 'sitelinks'>;

/** QID, title, birth, death, flags (1 = approximate birth, 2 = approximate death). */
export type PuzzleRow = [string, string, number, number, number];

export interface ScheduleEntryRow {
  n: number;
  date: DateKey;
  band: Difficulty;
  a: PuzzleRow;
  b: PuzzleRow;
  /** The par chain, earlier target's side first; par is its length. */
  chain: PuzzleRow[];
  /** Roster people who could fill the chain's narrowest step when the puzzle was generated. */
  narrowest: number;
}

export interface ScheduleFile {
  firstDate: DateKey;
  rosterRevision: number;
  entries: ScheduleEntryRow[];
}

export interface DailyPuzzle {
  number: number;
  date: DateKey;
  band: Difficulty;
  targetA: PuzzlePerson;
  targetB: PuzzlePerson;
  parChain: PuzzlePerson[];
}

export interface DailySchedule {
  firstDate: DateKey;
  puzzles: DailyPuzzle[];
}

/** A target or a par-chain person may not come back within this many days. */
export const PERSON_GAP_DAYS = 14;
/** The health check fails when fewer published-to-be puzzles than this remain. */
export const MIN_DAYS_AHEAD = 30;

export function toPuzzleRow(p: PuzzlePerson): PuzzleRow {
  const flags = (p.birthApproximate ? APPROXIMATE_BIRTH : 0) | (p.deathApproximate ? APPROXIMATE_DEATH : 0);
  return [p.id, p.name, p.birthYear, p.deathYear, flags];
}

export function fromPuzzleRow([id, name, birthYear, deathYear, flags]: PuzzleRow): PuzzlePerson {
  return {
    id,
    name,
    birthYear,
    deathYear,
    birthApproximate: (flags & APPROXIMATE_BIRTH) !== 0,
    deathApproximate: (flags & APPROXIMATE_DEATH) !== 0,
  };
}

export function parseSchedule(file: ScheduleFile): DailySchedule {
  return {
    firstDate: file.firstDate,
    puzzles: file.entries.map(entry => ({
      number: entry.n,
      date: entry.date,
      band: entry.band,
      targetA: fromPuzzleRow(entry.a),
      targetB: fromPuzzleRow(entry.b),
      parChain: entry.chain.map(fromPuzzleRow),
    })),
  };
}

/** A puzzle number from a URL segment: digits only, 1 or more; anything else is not a puzzle. */
export function parsePuzzleParam(raw: string): number | null {
  if (!/^\d{1,6}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}

/** Today's puzzle number, or null before the first puzzle. */
export function todaysNumber(schedule: DailySchedule, today: DateKey): number | null {
  return puzzleNumber(today, schedule.firstDate);
}

/** Puzzle n if it has gone live by `today`; future and unknown numbers give null. */
export function publishedPuzzle(schedule: DailySchedule, n: number, today: DateKey): DailyPuzzle | null {
  const latest = todaysNumber(schedule, today);
  if (latest === null || n < 1 || n > latest) return null;
  return schedule.puzzles[n - 1] ?? null;
}

/** Every puzzle that has gone live by `today`, newest first. */
export function publishedPuzzles(schedule: DailySchedule, today: DateKey): DailyPuzzle[] {
  const latest = todaysNumber(schedule, today) ?? 0;
  return schedule.puzzles.slice(0, latest).reverse();
}

/** The same key for a pair in either order. */
export const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/**
 * Everything wrong with a schedule file, checked against the puzzles' own snapshots (never the
 * current roster, so a roster rebuild cannot invalidate a published puzzle). Empty when healthy.
 */
export function scheduleProblems(file: ScheduleFile, today: DateKey): string[] {
  const problems: string[] = [];
  const seenPairs = new Set<string>();

  file.entries.forEach((entry, i) => {
    const where = `#${entry.n} (${entry.date})`;
    if (entry.n !== i + 1) problems.push(`${where}: expected number ${i + 1}`);
    if (entry.date !== puzzleDate(i + 1, file.firstDate)) problems.push(`${where}: expected date ${puzzleDate(i + 1, file.firstDate)}`);
    if (entry.band !== bandForDate(entry.date)) problems.push(`${where}: band ${entry.band} does not match its weekday (${bandForDate(entry.date)})`);

    const people = [entry.a, ...entry.chain, entry.b].map(fromPuzzleRow);
    if (areContemporaries(people[0], people[people.length - 1])) problems.push(`${where}: the targets' lives overlap`);
    for (let j = 1; j < people.length; j++) {
      if (!areContemporaries(people[j - 1], people[j])) problems.push(`${where}: ${people[j - 1].name} and ${people[j].name} never overlap`);
    }

    const band = DIFFICULTY_BANDS[entry.band];
    const par = entry.chain.length;
    if (par < band.minPar || par > band.maxPar) problems.push(`${where}: par ${par} is outside the ${entry.band} band`);
    if (entry.narrowest < band.minNarrowest || entry.narrowest > band.maxNarrowest) {
      problems.push(`${where}: ${entry.narrowest} options at the narrowest step is outside the ${entry.band} band`);
    }

    const key = pairKey(entry.a[0], entry.b[0]);
    if (seenPairs.has(key)) problems.push(`${where}: the pair ${entry.a[1]} and ${entry.b[1]} was already used`);
    seenPairs.add(key);

    const recent = file.entries.slice(Math.max(0, i - PERSON_GAP_DAYS), i);
    for (const target of [entry.a, entry.b]) {
      const earlier = recent.find(r => r.a[0] === target[0] || r.b[0] === target[0]);
      if (earlier) problems.push(`${where}: ${target[1]} was a target ${i + 1 - earlier.n} days earlier (#${earlier.n})`);
    }
  });

  const ahead = file.entries.filter(entry => entry.date > today).length;
  if (ahead < MIN_DAYS_AHEAD) {
    problems.push(
      `Only ${ahead} daily puzzles remain after ${today}; extend the schedule with ` +
        'CAPTURE_DAILY=1 npx vitest run src/lib/services/daily.capture.test.ts'
    );
  }
  return problems;
}
