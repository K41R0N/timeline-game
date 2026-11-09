import { describe, expect, it } from 'vitest';
import rosterFile from '../data/roster.json';
import { RosterFile, RosterPerson, fromRosterRow } from '../data/roster';
import { computePar } from './par';
import { DIFFICULTY_BANDS, FALLBACK_TARGETS, chainShape, drawHardBand, famousPeople, fitsBand, pickTargets } from './difficulty';

const roster = (rosterFile as unknown as RosterFile).people.map(fromRosterRow);
const byName = new Map(roster.map(p => [p.name, p]));
const named = (name: string) => byName.get(name)!;

/** Deterministic random numbers for repeatable picks. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const life = (name: string, birthYear: number, deathYear: number): RosterPerson => ({
  id: name, name, birthYear, deathYear, birthApproximate: false, deathApproximate: false, sitelinks: 100,
});

describe('chainShape', () => {
  it('finds the single roster bridge between Newton and Lincoln', () => {
    expect(chainShape(roster, named('Isaac Newton'), named('Abraham Lincoln'))).toEqual({ par: 1, optionsPerStep: [1] });
  });

  it('finds many options at every step between Dante and Leonardo', () => {
    const shape = chainShape(roster, named('Dante Alighieri'), named('Leonardo da Vinci'))!;
    expect(shape.par).toBe(3);
    expect(Math.min(...shape.optionsPerStep)).toBeGreaterThanOrEqual(19);
  });

  it('is null when the targets already overlap or nothing bridges them', () => {
    expect(chainShape([], life('A', 1600, 1650), life('B', 1640, 1700))).toBeNull();
    expect(chainShape([life('Short', 1640, 1660)], life('A', 1600, 1650), life('B', 1800, 1850))).toBeNull();
  });

  it('counts each person who can fill each step of a shortest chain', () => {
    const people = [life('One', 1640, 1700), life('Two', 1645, 1705), life('Three', 1695, 1810)];
    expect(chainShape(people, life('A', 1600, 1650), life('B', 1800, 1850))).toEqual({ par: 2, optionsPerStep: [2, 1] });
  });

  it('agrees with par on the committed roster', () => {
    const random = seeded(3);
    for (let i = 0; i < 150; i++) {
      const a = roster[Math.floor(random() * roster.length)];
      const b = roster[Math.floor(random() * roster.length)];
      if (a.id === b.id) continue;
      const shape = chainShape(roster, a, b);
      const par = computePar(roster, a, b);
      expect(shape?.par ?? null).toBe(par.playable ? par.par : null);
    }
  });
});

describe('fitsBand', () => {
  it('places pairs by par and their narrowest step', () => {
    expect(fitsBand({ par: 3, optionsPerStep: [19, 19, 26] }, DIFFICULTY_BANDS.easy)).toBe(true);
    expect(fitsBand({ par: 4, optionsPerStep: [9, 5, 6, 14] }, DIFFICULTY_BANDS.medium)).toBe(true);
    expect(fitsBand({ par: 4, optionsPerStep: [2, 3, 6, 14] }, DIFFICULTY_BANDS.hard)).toBe(true);
    expect(fitsBand({ par: 1, optionsPerStep: [44] }, DIFFICULTY_BANDS.easy)).toBe(false);
    expect(fitsBand({ par: 7, optionsPerStep: [1, 1, 1, 1, 1, 1, 1] }, DIFFICULTY_BANDS.hard)).toBe(false);
  });

  it('never allows par above 6 on a normal difficulty', () => {
    for (const band of Object.values(DIFFICULTY_BANDS)) expect(band.maxPar).toBeLessThanOrEqual(6);
  });
});

describe('famousPeople', () => {
  it('keeps the most widely known people, most known first', () => {
    const famous = famousPeople(roster);
    expect(famous.length).toBeLessThan(roster.length);
    expect(famous.map(p => p.name)).toEqual(expect.arrayContaining(['Julius Caesar', 'Isaac Newton', 'Leonardo da Vinci']));
    expect(famous[0].sitelinks).toBeGreaterThanOrEqual(famous[famous.length - 1].sitelinks);
  });
});

describe('pickTargets', () => {
  const famousIds = new Set(famousPeople(roster).map(p => p.id));

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    it(`picks famous ${difficulty} pairs that fit the band`, () => {
      for (let seed = 1; seed <= 15; seed++) {
        const pair = pickTargets(roster, difficulty, seeded(seed));
        expect(pair).not.toBeNull();
        const [a, b] = pair!;
        expect(a.birthYear).toBeLessThanOrEqual(b.birthYear);
        expect(famousIds.has(a.id) && famousIds.has(b.id)).toBe(true);
        expect(fitsBand(chainShape(roster, a, b)!, DIFFICULTY_BANDS[difficulty])).toBe(true);
      }
    });
  }

  it('has a fallback pair in every band', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const [a, b] = FALLBACK_TARGETS[difficulty].map(named);
      expect(fitsBand(chainShape(roster, a, b)!, DIFFICULTY_BANDS[difficulty])).toBe(true);
    }
  });
});

describe('drawHardBand', () => {
  it('draws free-play Hard pairs in the daily week\'s proportions: easy 2, medium 2, hard 3 in 7', () => {
    const random = seeded(7);
    const counts = { easy: 0, medium: 0, hard: 0 };
    for (let i = 0; i < 7000; i++) counts[drawHardBand(random)]++;
    expect(counts.easy / 7000).toBeCloseTo(2 / 7, 1);
    expect(counts.medium / 7000).toBeCloseTo(2 / 7, 1);
    expect(counts.hard / 7000).toBeCloseTo(3 / 7, 1);
  });
});
