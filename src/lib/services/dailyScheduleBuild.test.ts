import { describe, expect, it } from 'vitest';
import rosterFile from '../data/roster.json';
import { RosterFile, fromRosterRow } from '../data/roster';
import { PERSON_GAP_DAYS, fromPuzzleRow, scheduleProblems } from '../data/dailySchedule';
import { areContemporaries } from '../utils/ChainAnalyzer';
import { DIFFICULTY_BANDS, chainShape, famousPeople } from '../utils/difficulty';
import { generateSchedule } from './dailyScheduleBuild';

const roster = (rosterFile as unknown as RosterFile).people.map(fromRosterRow);
const famousIds = new Set(famousPeople(roster).map(p => p.id));
// 2026-11-09 is a Monday.
const FROM = '2026-11-09';

describe('generateSchedule', () => {
  const schedule = generateSchedule(roster, null, { from: FROM, days: 28 });

  it('produces the same puzzles from the same roster and start date', () => {
    expect(generateSchedule(roster, null, { from: FROM, days: 28 })).toEqual(schedule);
  });

  it('numbers consecutive days from the first date and follows the weekday bands', () => {
    expect(schedule.firstDate).toBe(FROM);
    expect(schedule.entries.map(e => e.n)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    expect(schedule.entries[0].band).toBe('easy'); // Monday
    expect(schedule.entries[5].band).toBe('hard'); // Saturday
  });

  it('picks famous targets whose chain fits the day\'s band', () => {
    for (const entry of schedule.entries) {
      const [a, b] = [fromPuzzleRow(entry.a), fromPuzzleRow(entry.b)];
      expect(famousIds.has(a.id) && famousIds.has(b.id)).toBe(true);
      const shape = chainShape(roster, a, b)!;
      const band = DIFFICULTY_BANDS[entry.band];
      expect(shape.par).toBe(entry.chain.length);
      expect(entry.chain.length).toBeGreaterThanOrEqual(band.minPar);
      expect(entry.chain.length).toBeLessThanOrEqual(band.maxPar);
      expect(Math.min(...shape.optionsPerStep)).toBe(entry.narrowest);
    }
  });

  it('stores a par chain whose links all overlap, from one target to the other', () => {
    for (const entry of schedule.entries) {
      const people = [entry.a, ...entry.chain, entry.b].map(fromPuzzleRow);
      for (let i = 1; i < people.length; i++) expect(areContemporaries(people[i - 1], people[i])).toBe(true);
    }
  });

  it('never repeats a pair and keeps each target away for 14 days', () => {
    const pairs = schedule.entries.map(e => [e.a[0], e.b[0]].sort().join('|'));
    expect(new Set(pairs).size).toBe(pairs.length);
    schedule.entries.forEach((entry, i) => {
      const recent = schedule.entries.slice(Math.max(0, i - PERSON_GAP_DAYS), i).flatMap(e => [e.a[0], e.b[0]]);
      expect(recent).not.toContain(entry.a[0]);
      expect(recent).not.toContain(entry.b[0]);
    });
  });

  it('appends after the last day and leaves earlier puzzles exactly as they were', () => {
    const first = generateSchedule(roster, null, { from: FROM, days: 5 });
    const extended = generateSchedule(roster, first, { from: FROM, days: 10 });
    expect(extended.entries).toHaveLength(15);
    expect(extended.entries.slice(0, 5)).toEqual(first.entries);
    expect(extended.entries[5].date).toBe('2026-11-14');
  });

  it('passes the schedule health check apart from how far ahead it reaches', () => {
    const problems = scheduleProblems(schedule, FROM);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^Only 27 daily puzzles remain after 2026-11-09/);
  });
});
