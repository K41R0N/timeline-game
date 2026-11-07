import { describe, expect, it } from 'vitest';
import committed from './daily-schedule.json';
import rosterFile from './roster.json';
import { RosterFile } from './roster';
import {
  ScheduleFile,
  parsePuzzleParam,
  parseSchedule,
  publishedPuzzle,
  publishedPuzzles,
  scheduleProblems,
  todaysNumber,
} from './dailySchedule';
import { addDays, utcDateKey } from '../utils/daily';

const file = committed as unknown as ScheduleFile;
const schedule = parseSchedule(file);

describe('committed daily schedule', () => {
  it('is healthy and reaches at least 30 days past today', () => {
    expect(scheduleProblems(file, utcDateKey(Date.now()))).toEqual([]);
  });

  it('stays healthy for a puzzle whose people later leave the roster, because only its snapshot is checked', () => {
    const roster = new Set((rosterFile as unknown as RosterFile).people.map(row => row[0]));
    const edited: ScheduleFile = {
      ...file,
      entries: file.entries.map((entry, i) => (i === 0 ? { ...entry, a: ['Q-not-in-roster', ...entry.a.slice(1)] as typeof entry.a } : entry)),
    };
    expect(roster.has('Q-not-in-roster')).toBe(false);
    expect(scheduleProblems(edited, file.firstDate)).toEqual([]);
  });
});

describe('scheduleProblems', () => {
  // A short, healthy schedule to break one way at a time.
  const short = (): ScheduleFile => ({ ...file, entries: file.entries.slice(0, 40).map(entry => ({ ...entry })) });
  const firstDay = file.firstDate;

  it('accepts a healthy schedule with 39 days to come', () => {
    expect(scheduleProblems(short(), firstDay)).toEqual([]);
  });

  it('reports a missing day', () => {
    const broken = short();
    broken.entries.splice(3, 1);
    expect(scheduleProblems(broken, firstDay).join('\n')).toMatch(/expected number 4/);
  });

  it('reports a band that does not match the weekday', () => {
    const broken = short();
    broken.entries[2].band = broken.entries[2].band === 'easy' ? 'hard' : 'easy';
    expect(scheduleProblems(broken, firstDay).join('\n')).toMatch(/does not match its weekday/);
  });

  it('reports a par chain with a missing link', () => {
    const broken = short();
    broken.entries[0].chain = broken.entries[0].chain.slice(1);
    expect(scheduleProblems(broken, firstDay).join('\n')).toMatch(/never overlap/);
  });

  it('reports a repeated pair and a target back within 14 days', () => {
    const broken = short();
    broken.entries[10] = { ...broken.entries[3], n: 11, date: broken.entries[10].date, band: broken.entries[10].band };
    const problems = scheduleProblems(broken, firstDay).join('\n');
    expect(problems).toMatch(/was already used/);
    expect(problems).toMatch(/was a target 7 days earlier/);
  });

  it('reports when fewer than 30 puzzles remain, naming how to extend', () => {
    expect(scheduleProblems(short(), addDays(firstDay, 15)).join('\n')).toMatch(/Only 24 daily puzzles remain .*CAPTURE_DAILY=1/);
  });
});

describe('published puzzles', () => {
  const today = addDays(file.firstDate, 12); // puzzle #13

  it('numbers today from the first date', () => {
    expect(todaysNumber(schedule, today)).toBe(13);
    expect(todaysNumber(schedule, addDays(file.firstDate, -1))).toBeNull();
  });

  it('serves today and past puzzles, never future ones', () => {
    expect(publishedPuzzle(schedule, 13, today)?.date).toBe(today);
    expect(publishedPuzzle(schedule, 12, today)?.number).toBe(12);
    expect(publishedPuzzle(schedule, 14, today)).toBeNull();
    expect(publishedPuzzle(schedule, 0, today)).toBeNull();
  });

  it('lists published puzzles newest first', () => {
    expect(publishedPuzzles(schedule, today).map(p => p.number)).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(publishedPuzzles(schedule, addDays(file.firstDate, -1))).toEqual([]);
  });

  it('reads a puzzle number only from a plain positive number', () => {
    expect(parsePuzzleParam('12')).toBe(12);
    expect(parsePuzzleParam('0')).toBeNull();
    expect(parsePuzzleParam('-3')).toBeNull();
    expect(parsePuzzleParam('abc')).toBeNull();
    expect(parsePuzzleParam('12.5')).toBeNull();
  });
});
