import { describe, expect, it } from 'vitest';
import hardFile from '../data/daily-schedule.json';
import rosterFile from '../data/roster.json';
import type { ScheduleFile } from '../data/dailySchedule';
import { RosterFile, fromRosterRow } from '../data/roster';
import { CHAIN_GAP_DAYS, hardPeople, recentChainPeople, rosterRevision, stylePeople, styleScheduleProblems } from '../data/styleSchedule';
import { generateStyleSchedules } from './styleScheduleBuild';

const file = rosterFile as unknown as RosterFile;
const roster = file.people.map(fromRosterRow);
const revision = rosterRevision(file.people);
const hard = hardFile as unknown as ScheduleFile;
const shortHard = (days: number): ScheduleFile => ({ ...hard, entries: hard.entries.slice(0, days) });

describe('generateStyleSchedules', () => {
  const { easy, medium } = generateStyleSchedules(roster, revision, shortHard(10), { easy: null, medium: null });

  it('gives every Hard date an Easy and a Medium puzzle with the same number', () => {
    expect(easy.entries.map(e => [e.n, e.date])).toEqual(hard.entries.slice(0, 10).map(e => [e.n, e.date]));
    expect(medium.entries.map(e => [e.n, e.date])).toEqual(hard.entries.slice(0, 10).map(e => [e.n, e.date]));
    expect(easy.firstDate).toBe(hard.firstDate);
  });

  it('produces the same puzzles from the same roster and dates', () => {
    expect(generateStyleSchedules(roster, revision, shortHard(10), { easy: null, medium: null })).toEqual({ easy, medium });
  });

  it('appends after the last puzzle and leaves earlier puzzles exactly as they were', () => {
    const first = generateStyleSchedules(roster, revision, shortHard(4), { easy: null, medium: null });
    const extended = generateStyleSchedules(roster, revision, shortHard(10), first);
    expect(extended.easy.entries.slice(0, 4)).toEqual(first.easy.entries);
    expect(extended.medium.entries.slice(0, 4)).toEqual(first.medium.entries);
    expect(extended.easy.entries).toHaveLength(10);
  });

  it('never shows the same person in two styles on one date', () => {
    hard.entries.slice(0, 10).forEach((hardEntry, i) => {
      const [h, e, m] = [hardPeople(hardEntry), stylePeople(easy.entries[i]), stylePeople(medium.entries[i])];
      expect(e.filter(id => h.includes(id))).toEqual([]);
      expect(m.filter(id => h.includes(id) || e.includes(id))).toEqual([]);
    });
  });

  it(`keeps a person out of a style's chains for ${CHAIN_GAP_DAYS} days after they appear`, () => {
    const longer = generateStyleSchedules(roster, revision, shortHard(30), { easy, medium });
    for (const file of [longer.easy, longer.medium]) {
      file.entries.forEach((entry, i) => {
        const recent = recentChainPeople(file.entries, i);
        expect(entry.chain.filter(row => recent.has(row[0]))).toEqual([]);
      });
    }
  });

  it('passes the health check apart from how far ahead it reaches', () => {
    const problems = styleScheduleProblems({ hard: shortHard(10), easy, medium }, hard.firstDate, { people: roster, revision });
    expect(problems).toHaveLength(2);
    expect(problems.every(p => /^Only 9 (easy|medium) daily puzzles remain/.test(p))).toBe(true);
  });
});
