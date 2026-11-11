import { describe, expect, it } from 'vitest';
import rosterFile from '../data/roster.json';
import { fromRosterRow, type RosterFile, type RosterPerson } from '../data/roster';
import {
  EASY_CHAIN_POOL,
  buildEasyPuzzle,
  buildMediumPuzzle,
  countArrangements,
  letterPattern,
  linksWithMargin,
  patternIsUnique,
  sampleChain,
  shortestMiddle,
  MAX_MIDDLE,
  MIN_MIDDLE,
} from './chainPuzzle';
import { famousPeople } from './difficulty';
import { seededRandom, seedFor } from './random';

function person(id: string, birthYear: number, deathYear: number, sitelinks = 100, approximate = false, name = id): RosterPerson {
  return { id, name, birthYear, deathYear, birthApproximate: approximate, deathApproximate: approximate, sitelinks };
}

describe('linksWithMargin', () => {
  it('links two exactly dated people who share 2 years', () => {
    expect(linksWithMargin(person('a', 1300, 1350), person('b', 1348, 1400))).toBe(true);
  });

  it('does not link Chaucer (c. 1343 – c. 1400) with someone born in 1398', () => {
    const chaucer = person('chaucer', 1343, 1400, 100, true, 'Geoffrey Chaucer');
    const later = person('later', 1398, 1460);
    expect(linksWithMargin(chaucer, later)).toBe(false);
    expect(linksWithMargin(later, chaucer)).toBe(false);
  });

  it('links the same lives when Chaucer\'s years are exact', () => {
    expect(linksWithMargin(person('chaucer', 1343, 1400), person('later', 1398, 1460))).toBe(true);
  });

  it('links an approximate life that shares at least 5 years', () => {
    expect(linksWithMargin(person('a', 1343, 1400, 100, true), person('b', 1395, 1460))).toBe(true);
  });

  it('does not link lives that never overlap', () => {
    expect(linksWithMargin(person('a', 1300, 1350), person('b', 1351, 1400))).toBe(false);
  });
});

describe('sampleChain', () => {
  const a = person('A', 1000, 1050);
  const b = person('B', 1200, 1250);
  const m1 = person('M1', 1040, 1110, 100);
  const n1 = person('N1', 1040, 1110, 300);
  const m2 = person('M2', 1100, 1210, 200);
  const pool = [a, m1, n1, m2, b];

  it('draws a shortest chain whose neighbours all link', () => {
    for (let seed = 0; seed < 20; seed++) {
      const chain = sampleChain(pool, a, b, seededRandom(seed))!;
      expect(chain).toHaveLength(2);
      const line = [a, ...chain, b];
      for (let i = 1; i < line.length; i++) expect(linksWithMargin(line[i - 1], line[i])).toBe(true);
    }
  });

  it('draws better-known people more often, in proportion to their language editions', () => {
    let famousFirst = 0;
    for (let seed = 0; seed < 400; seed++) if (sampleChain(pool, a, b, seededRandom(seed))![0].id === 'N1') famousFirst++;
    expect(famousFirst / 400).toBeGreaterThan(0.65);
    expect(famousFirst / 400).toBeLessThan(0.85);
  });

  it('returns no chain when one person bridges the targets', () => {
    expect(sampleChain([a, person('M', 1040, 1210), b], a, b, seededRandom(1))).toBeNull();
    expect(shortestMiddle([a, person('M', 1040, 1210), b], a, b)).toBeNull();
  });

  it(`returns no chain when the targets need more than ${MAX_MIDDLE} people between them`, () => {
    const far = person('far', 1290, 1340);
    const steps = [person('P1', 1040, 1100), person('P2', 1090, 1150), person('P3', 1140, 1200), person('P4', 1190, 1250), person('P5', 1240, 1300)];
    expect(sampleChain([a, ...steps, far], a, far, seededRandom(1))).toBeNull();
    expect(shortestMiddle([a, ...steps.slice(0, 4), b], a, b)).toBe(3);
  });

  it('never uses a person it is told to leave out', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(sampleChain(pool, a, b, seededRandom(seed), new Set(['N1']))?.map(p => p.id)).toEqual(['M1', 'M2']);
    }
  });
});

describe('countArrangements', () => {
  it('counts two arrangements when two middle people can swap places', () => {
    const a = person('A', 1000, 1100);
    const b = person('B', 1150, 1250);
    expect(countArrangements([person('M1', 1050, 1200), person('M2', 1060, 1200)], a, b, 2)).toBe(2);
  });

  it('counts one arrangement when only one order links', () => {
    const a = person('A', 1000, 1050);
    const b = person('B', 1200, 1250);
    expect(countArrangements([person('M2', 1100, 1210), person('M1', 1040, 1110)], a, b, 2)).toBe(1);
  });
});

describe('letterPattern', () => {
  it('counts the letters of each word', () => {
    expect(letterPattern('Isaac Newton')).toEqual([5, 6]);
  });

  it('drops bracketed disambiguation', () => {
    expect(letterPattern('Charles I (king)')).toEqual([7, 1]);
  });

  it('ignores punctuation inside a word', () => {
    expect(letterPattern("Jeanne d'Arc")).toEqual([6, 4]);
  });
});

describe('patternIsUnique', () => {
  const before = person('before', 1600, 1660);
  const after = person('after', 1680, 1740);
  const newton = person('newton', 1643, 1727, 100, false, 'Isaac Newton');

  it('rejects a blank when another fitting person has the same letter pattern', () => {
    const barrow = person('barrow', 1630, 1700, 100, false, 'Isaac Barrow');
    expect(patternIsUnique([before, newton, barrow, after], before, newton, after, new Set(['before', 'newton', 'after']))).toBe(false);
  });

  it('accepts a blank when the other fitting people have different patterns', () => {
    const leibniz = person('leibniz', 1646, 1716, 100, false, 'Gottfried Wilhelm Leibniz');
    const sameShapeTooEarly = person('early', 1500, 1560, 100, false, 'Isaac Barrow');
    expect(patternIsUnique([before, newton, leibniz, sameShapeTooEarly, after], before, newton, after, new Set(['before', 'newton', 'after']))).toBe(true);
  });
});

describe('puzzle builders', () => {
  const roster = (rosterFile as unknown as RosterFile).people.map(fromRosterRow);
  const famousIds = new Set(famousPeople(roster).map(p => p.id));

  it('builds the same Easy puzzle from the same seed', () => {
    const first = buildEasyPuzzle(roster, seededRandom(seedFor('easy2026-11-07')));
    const second = buildEasyPuzzle(roster, seededRandom(seedFor('easy2026-11-07')));
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
  });

  it(`builds an Easy puzzle of famous targets and decoys, a chain from the ${EASY_CHAIN_POOL} best-known, and one arrangement`, () => {
    const puzzle = buildEasyPuzzle(roster, seededRandom(seedFor('easy2026-11-08')))!;
    const poolIds = new Set(famousPeople(roster, EASY_CHAIN_POOL).map(p => p.id));
    expect([puzzle.a, ...puzzle.decoys, puzzle.b].every(p => famousIds.has(p.id))).toBe(true);
    expect(puzzle.chain.every(p => poolIds.has(p.id))).toBe(true);
    expect(puzzle.chain.length).toBeGreaterThanOrEqual(MIN_MIDDLE);
    expect(puzzle.chain.length).toBeLessThanOrEqual(MAX_MIDDLE);
    expect(puzzle.decoys).toHaveLength(2);
    for (const decoy of puzzle.decoys) {
      expect(decoy.birthYear).toBeGreaterThan(puzzle.a.birthYear);
      expect(decoy.birthYear).toBeLessThan(puzzle.b.deathYear);
    }
    expect(countArrangements([...puzzle.chain, ...puzzle.decoys], puzzle.a, puzzle.b, puzzle.chain.length)).toBe(1);
  });

  it('builds the same Medium puzzle from the same seed, with famous targets and unique blanks', () => {
    const first = buildMediumPuzzle(roster, seededRandom(seedFor('medium2026-11-07')))!;
    expect(buildMediumPuzzle(roster, seededRandom(seedFor('medium2026-11-07')))).toEqual(first);
    expect(famousIds.has(first.a.id) && famousIds.has(first.b.id)).toBe(true);
    expect(first.decoys).toEqual([]);
    const line = [first.a, ...first.chain, first.b];
    const ids = new Set(line.map(p => p.id));
    for (let i = 1; i < line.length - 1; i++) {
      expect(linksWithMargin(line[i - 1], line[i])).toBe(true);
      expect(patternIsUnique(roster, line[i - 1], line[i], line[i + 1], ids)).toBe(true);
    }
  });

  it('leaves out the people it is told to', () => {
    const first = buildMediumPuzzle(roster, seededRandom(seedFor('medium2026-11-07')))!;
    const leaveOut = new Set([first.a.id, ...first.chain.map(p => p.id)]);
    const other = buildMediumPuzzle(roster, seededRandom(seedFor('medium2026-11-07')), { leaveOut })!;
    expect([other.a, ...other.chain, other.b].some(p => leaveOut.has(p.id))).toBe(false);
  });
});
