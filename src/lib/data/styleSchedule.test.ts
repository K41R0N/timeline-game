import { describe, expect, it } from 'vitest';
import hardJson from './daily-schedule.json';
import easyJson from './daily-easy.json';
import mediumJson from './daily-medium.json';
import rosterFile from './roster.json';
import type { ScheduleFile } from './dailySchedule';
import { RosterFile, fromRosterRow, type RosterRow } from './roster';
import {
  parseStyleSchedule,
  publishedStylePuzzle,
  rosterRevision,
  styleScheduleProblems,
  type ScheduleSet,
  type StyleScheduleFile,
} from './styleSchedule';
import { addDays, utcDateKey } from '../utils/daily';

const rosterRows = (rosterFile as unknown as RosterFile).people;
const roster = { people: rosterRows.map(fromRosterRow), revision: rosterRevision(rosterRows) };
const committed: ScheduleSet = {
  hard: hardJson as unknown as ScheduleFile,
  easy: easyJson as unknown as StyleScheduleFile,
  medium: mediumJson as unknown as StyleScheduleFile,
};

/** The first 40 days of each schedule, copied so a test can break one thing. */
function short(): ScheduleSet {
  const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  return {
    hard: { ...committed.hard, entries: copy(committed.hard.entries.slice(0, 40)) },
    easy: { ...committed.easy, entries: copy(committed.easy.entries.slice(0, 40)) },
    medium: { ...committed.medium, entries: copy(committed.medium.entries.slice(0, 40)) },
  };
}
const firstDay = committed.hard.firstDate;

describe('committed Easy and Medium schedules', () => {
  it('are healthy, against the current roster too, and reach at least 30 days past today', () => {
    expect(styleScheduleProblems(committed, utcDateKey(Date.now()), roster)).toEqual([]);
  }, 120_000);
});

describe('styleScheduleProblems', () => {
  it('accepts healthy schedules with 39 days to come', () => {
    expect(styleScheduleProblems(short(), firstDay, roster)).toEqual([]);
  });

  it('reports neighbours whose shared years fall short of the margin', () => {
    const broken = short();
    const first = broken.easy.entries[0];
    const a = first.a;
    first.chain[0] = [first.chain[0][0], first.chain[0][1], a[3] - 2, a[3] + 60, 1, first.chain[0][5]] as RosterRow;
    expect(styleScheduleProblems(broken, firstDay).join('\n')).toMatch(/do not share enough years/);
  });

  it('reports an Easy hand with a second valid arrangement', () => {
    const broken = short();
    const entry = broken.easy.entries[0];
    const twin = entry.chain[0];
    entry.decoys[0] = ['Q-twin', 'Twin', twin[2], twin[3], twin[4], twin[5]] as RosterRow;
    expect(styleScheduleProblems(broken, firstDay).join('\n')).toMatch(/more than one valid arrangement/);
  });

  it('reports a repeated pair', () => {
    const broken = short();
    broken.medium.entries[30] = { ...broken.medium.entries[3], n: 31, date: broken.medium.entries[30].date };
    expect(styleScheduleProblems(broken, firstDay).join('\n')).toMatch(/was already used/);
  });

  it('reports a person who also appears in another style that day', () => {
    const broken = short();
    broken.medium.entries[0].decoys = [];
    broken.medium.entries[0].a = broken.easy.entries[0].a;
    expect(styleScheduleProblems(broken, firstDay).join('\n')).toMatch(/also in another style's puzzle for this date/);
  });

  it('skips the roster checks for a puzzle generated from an older roster', () => {
    const broken = short();
    broken.easy.entries[0].a = ['Q-not-in-roster', ...broken.easy.entries[0].a.slice(1)] as RosterRow;
    expect(styleScheduleProblems(broken, firstDay, roster).join('\n')).toMatch(/not among the 400 best-known people/);
    broken.easy.entries[0].rev = 'older';
    expect(styleScheduleProblems(broken, firstDay, roster)).toEqual([]);
  });

  it('reports when fewer than 30 puzzles remain', () => {
    expect(styleScheduleProblems(short(), addDays(firstDay, 15)).join('\n')).toMatch(/Only 24 easy daily puzzles remain .*CAPTURE_DAILY=1/);
  });
});

describe('published style puzzles', () => {
  const easy = parseStyleSchedule(committed.easy);
  const today = addDays(firstDay, 12); // puzzle #13

  it('serves today and past puzzles, never future ones', () => {
    expect(publishedStylePuzzle(easy, 13, today)?.date).toBe(today);
    expect(publishedStylePuzzle(easy, 1, today)?.style).toBe('easy');
    expect(publishedStylePuzzle(easy, 14, today)).toBeNull();
    expect(publishedStylePuzzle(easy, 0, today)).toBeNull();
  });

  it('keeps years and approximate flags but not fame', () => {
    const puzzle = publishedStylePuzzle(easy, 1, today)!;
    expect(puzzle.chain.length).toBeGreaterThanOrEqual(2);
    expect(puzzle.decoys).toHaveLength(2);
    expect(puzzle.targetA).not.toHaveProperty('sitelinks');
    expect(typeof puzzle.targetA.birthApproximate).toBe('boolean');
  });
});
