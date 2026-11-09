/**
 * The Easy and Medium daily schedules: one one-answer puzzle per style per UTC date, numbered like
 * the Hard schedule, generated ahead of time (src/lib/services/styleScheduleBuild.ts) and committed
 * as daily-easy.json and daily-medium.json.
 *
 * Only src/lib/server/daily.ts reads the JSON, so future puzzles never reach the browser.
 * This module holds the pure rules over parsed schedules and must not import the JSON.
 */
import { areContemporaries } from '../utils/ChainAnalyzer';
import {
  DECOY_COUNT,
  MAX_MIDDLE,
  MIN_MIDDLE,
  bestChain,
  countArrangements,
  linksWithMargin,
  patternIsUnique,
} from '../utils/chainPuzzle';
import { puzzleDate, puzzleNumber, type DateKey } from '../utils/daily';
import { famousPeople, FAMOUS_COUNT } from '../utils/difficulty';
import { seedFor } from '../utils/random';
import { MIN_DAYS_AHEAD, PERSON_GAP_DAYS, pairKey, type PuzzlePerson, type ScheduleEntryRow, type ScheduleFile } from './dailySchedule';
import { fromRosterRow, type RosterPerson, type RosterRow } from './roster';

/** The styles with one fixed answer. Hard keeps the original schedule. */
export type ChainStyle = 'easy' | 'medium';

export interface StyleEntryRow {
  n: number;
  date: DateKey;
  /** The roster revision the puzzle was generated from (see rosterRevision). */
  rev: string;
  /** People as roster rows, with the language editions recorded when the puzzle was generated. */
  a: RosterRow;
  b: RosterRow;
  chain: RosterRow[];
  /** Easy only; empty for Medium. */
  decoys: RosterRow[];
}

export interface StyleScheduleFile {
  style: ChainStyle;
  firstDate: DateKey;
  entries: StyleEntryRow[];
}

export interface StylePuzzleData {
  style: ChainStyle;
  number: number;
  date: DateKey;
  targetA: PuzzlePerson;
  targetB: PuzzlePerson;
  chain: PuzzlePerson[];
  decoys: PuzzlePerson[];
}

export interface StyleSchedule {
  style: ChainStyle;
  firstDate: DateKey;
  puzzles: StylePuzzleData[];
}

export interface ScheduleSet {
  hard: ScheduleFile;
  easy: StyleScheduleFile;
  medium: StyleScheduleFile;
}

/** Identifies the roster's contents, so it changes whenever any row changes (the list revision alone does not). */
export function rosterRevision(rows: RosterRow[]): string {
  return seedFor(JSON.stringify(rows)).toString(16).padStart(8, '0');
}

function withoutFame(row: RosterRow): PuzzlePerson {
  const { id, name, birthYear, deathYear, birthApproximate, deathApproximate } = fromRosterRow(row);
  return { id, name, birthYear, deathYear, birthApproximate, deathApproximate };
}

export function parseStyleSchedule(file: StyleScheduleFile): StyleSchedule {
  return {
    style: file.style,
    firstDate: file.firstDate,
    puzzles: file.entries.map(entry => ({
      style: file.style,
      number: entry.n,
      date: entry.date,
      targetA: withoutFame(entry.a),
      targetB: withoutFame(entry.b),
      chain: entry.chain.map(withoutFame),
      decoys: entry.decoys.map(withoutFame),
    })),
  };
}

/** Puzzle n of a style if it has gone live by `today`; future and unknown numbers give null. */
export function publishedStylePuzzle(schedule: StyleSchedule, n: number, today: DateKey): StylePuzzleData | null {
  const latest = puzzleNumber(today, schedule.firstDate);
  if (latest === null || n < 1 || n > latest) return null;
  return schedule.puzzles[n - 1] ?? null;
}

/** Everyone a Hard daily shows: its targets and its par chain. */
export function hardPeople(entry: ScheduleEntryRow): string[] {
  return [entry.a[0], entry.b[0], ...entry.chain.map(row => row[0])];
}

/** Everyone an Easy or Medium daily shows, decoys included. */
export function stylePeople(entry: StyleEntryRow): string[] {
  return [entry.a[0], entry.b[0], ...entry.chain.map(row => row[0]), ...entry.decoys.map(row => row[0])];
}

/** People an Easy or Medium puzzle on that date must leave out, so finishing one style never gives away another. */
export function leftOutFor(style: ChainStyle, hard: ScheduleEntryRow | undefined, easy: StyleEntryRow | undefined): Set<string> {
  const ids = hard ? hardPeople(hard) : [];
  if (style === 'medium' && easy) ids.push(...stylePeople(easy));
  return new Set(ids);
}

function snapshotProblems(style: ChainStyle, entry: StyleEntryRow, where: string): string[] {
  const problems: string[] = [];
  const [a, b] = [fromRosterRow(entry.a), fromRosterRow(entry.b)];
  const chain = entry.chain.map(fromRosterRow);
  const decoys = entry.decoys.map(fromRosterRow);

  if (areContemporaries(a, b)) problems.push(`${where}: the targets' lives overlap`);
  if (chain.length < MIN_MIDDLE || chain.length > MAX_MIDDLE) {
    problems.push(`${where}: ${chain.length} people between the targets, outside ${MIN_MIDDLE} to ${MAX_MIDDLE}`);
  }
  const line = [a, ...chain, b];
  for (let i = 1; i < line.length; i++) {
    if (!linksWithMargin(line[i - 1], line[i])) problems.push(`${where}: ${line[i - 1].name} and ${line[i].name} do not share enough years`);
  }

  if (style === 'easy') {
    if (decoys.length !== DECOY_COUNT) problems.push(`${where}: expected ${DECOY_COUNT} decoys, found ${decoys.length}`);
    for (const decoy of decoys) {
      if (decoy.birthYear <= a.birthYear || decoy.birthYear >= b.deathYear) problems.push(`${where}: decoy ${decoy.name} was born outside the puzzle's span`);
    }
    const arrangements = countArrangements([...chain, ...decoys], a, b, chain.length);
    if (arrangements !== 1) problems.push(`${where}: the hand has ${arrangements === 0 ? 'no' : 'more than one'} valid arrangement`);
  } else if (decoys.length > 0) {
    problems.push(`${where}: a Medium puzzle has no decoys`);
  }
  return problems;
}

/** Checks against today's roster, for puzzles generated from this roster revision. */
function rosterProblems(style: ChainStyle, entry: StyleEntryRow, where: string, roster: RosterPerson[], famous: RosterPerson[], leaveOut: Set<string>): string[] {
  const problems: string[] = [];
  const famousIds = new Set(famous.map(p => p.id));
  const [a, b] = [fromRosterRow(entry.a), fromRosterRow(entry.b)];
  const chain = entry.chain.map(fromRosterRow);
  const mustBeFamous = style === 'easy' ? [a, b, ...chain, ...entry.decoys.map(fromRosterRow)] : [a, b];
  for (const person of mustBeFamous) {
    if (!famousIds.has(person.id)) problems.push(`${where}: ${person.name} is not among the ${FAMOUS_COUNT} best-known people`);
  }
  if (problems.length > 0) return problems;

  const best = bestChain(style === 'easy' ? famous : roster, a, b, leaveOut);
  const weakest = (people: RosterPerson[]) => Math.min(...people.map(p => p.sitelinks));
  if (!best || best.length !== chain.length || weakest(best) !== weakest(chain)) {
    problems.push(`${where}: the chain is not the best-known shortest chain between ${a.name} and ${b.name}`);
  }

  if (style === 'medium') {
    const line = [a, ...chain, b];
    const ids = new Set(line.map(p => p.id));
    chain.forEach((answer, i) => {
      if (!patternIsUnique(roster, line[i], answer, line[i + 2], ids)) problems.push(`${where}: another roster person who fits ${answer.name}'s blank has the same letters`);
    });
  }
  return problems;
}

/**
 * Everything wrong with the Easy and Medium schedules. Every entry is checked on what it stores;
 * the checks that need the whole roster run only for entries generated from the roster passed in,
 * so a roster rebuild never fails a published puzzle. Empty when healthy.
 */
export function styleScheduleProblems(files: ScheduleSet, today: DateKey, roster?: { people: RosterPerson[]; revision: string }): string[] {
  const problems: string[] = [];
  const famous = roster ? famousPeople(roster.people) : [];

  for (const style of ['easy', 'medium'] as const) {
    const file = files[style];
    const seenPairs = new Set<string>();
    if (file.style !== style) problems.push(`The ${style} schedule says it is ${file.style}`);
    if (file.firstDate !== files.hard.firstDate) problems.push(`The ${style} schedule starts on ${file.firstDate}, not ${files.hard.firstDate}`);
    if (file.entries.length !== files.hard.entries.length) {
      problems.push(`The ${style} schedule has ${file.entries.length} puzzles but Hard has ${files.hard.entries.length}`);
    }

    file.entries.forEach((entry, i) => {
      const where = `${style} #${entry.n} (${entry.date})`;
      if (entry.n !== i + 1) problems.push(`${where}: expected number ${i + 1}`);
      if (entry.date !== puzzleDate(i + 1, file.firstDate)) problems.push(`${where}: expected date ${puzzleDate(i + 1, file.firstDate)}`);
      problems.push(...snapshotProblems(style, entry, where));

      const key = pairKey(entry.a[0], entry.b[0]);
      if (seenPairs.has(key)) problems.push(`${where}: the pair ${entry.a[1]} and ${entry.b[1]} was already used`);
      seenPairs.add(key);
      const recent = file.entries.slice(Math.max(0, i - PERSON_GAP_DAYS), i);
      for (const target of [entry.a, entry.b]) {
        const earlier = recent.find(r => r.a[0] === target[0] || r.b[0] === target[0]);
        if (earlier) problems.push(`${where}: ${target[1]} was a target ${i + 1 - earlier.n} days earlier (#${earlier.n})`);
      }

      const leaveOut = leftOutFor(style, files.hard.entries[i], style === 'medium' ? files.easy.entries[i] : undefined);
      for (const row of [entry.a, ...entry.chain, ...entry.decoys, entry.b]) {
        if (leaveOut.has(row[0])) problems.push(`${where}: ${row[1]} is also in another style's puzzle for this date`);
      }

      if (roster && entry.rev === roster.revision) problems.push(...rosterProblems(style, entry, where, roster.people, famous, leaveOut));
    });

    const ahead = file.entries.filter(entry => entry.date > today).length;
    if (ahead < MIN_DAYS_AHEAD) {
      problems.push(
        `Only ${ahead} ${style} daily puzzles remain after ${today}; extend the schedules with ` +
          'CAPTURE_DAILY=1 npx vitest run src/lib/services/daily.capture.test.ts'
      );
    }
  }
  return problems;
}
