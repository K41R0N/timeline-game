import { describe, expect, it } from 'vitest';
import rosterFile from '../data/roster.json';
import { RosterFile, RosterPerson, fromRosterRow } from '../data/roster';
import type { HistoricalFigure } from '../types/HistoricalFigure';
import { computePar, nextHint } from './par';

const rosterPerson = (name: string, birthYear: number, deathYear: number): RosterPerson => ({
  id: name, name, birthYear, deathYear, birthApproximate: false, deathApproximate: false,
});
const figure = (name: string, birthYear: number, deathYear: number): HistoricalFigure => ({
  id: name, name, birthYear, deathYear, shortDescription: '', imageUrl: '', contemporaries: [],
});
const names = (people: Array<{ name: string }>) => people.map(p => p.name);

const a = figure('A', 1600, 1650);
const b = figure('B', 1800, 1850);

describe('computePar', () => {
  it('is not playable when the targets already overlap', () => {
    expect(computePar([], a, figure('B', 1640, 1700))).toEqual({ playable: false, reason: 'overlap' });
  });

  it('is not playable when no roster chain crosses the gap', () => {
    expect(computePar([rosterPerson('Short', 1640, 1700)], a, b)).toEqual({ playable: false, reason: 'gap' });
  });

  it('is 1 when one roster person spans the gap', () => {
    const result = computePar([rosterPerson('Spanner', 1630, 1820)], a, b);
    expect(result).toMatchObject({ playable: true, par: 1 });
    expect(result.playable && names(result.chain)).toEqual(['Spanner']);
  });

  it('takes the long life that saves a step', () => {
    const roster = [
      rosterPerson('Step 1', 1640, 1700),
      rosterPerson('Step 2', 1690, 1760),
      rosterPerson('Step 3', 1740, 1810),
      rosterPerson('Long life', 1645, 1745),
    ];
    const result = computePar(roster, a, b);
    expect(result.playable && result.par).toBe(2);
    expect(result.playable && names(result.chain)).toEqual(['Long life', 'Step 3']);
  });

  it('never uses a target as a step, even when the roster lists it', () => {
    const roster = [rosterPerson('A', 1600, 1650), rosterPerson('B', 1800, 1850), rosterPerson('Spanner', 1630, 1820)];
    const result = computePar(roster, a, b);
    expect(result.playable && names(result.chain)).toEqual(['Spanner']);
  });

  it('gives the same par whichever target comes first', () => {
    const roster = [rosterPerson('Step 1', 1640, 1730), rosterPerson('Step 2', 1720, 1810)];
    expect(computePar(roster, b, a)).toEqual(computePar(roster, a, b));
  });

  it('counts a birth in the year the previous life ended as overlapping', () => {
    const result = computePar([rosterPerson('Edge 1', 1650, 1730), rosterPerson('Edge 2', 1730, 1800)], a, b);
    expect(result.playable && result.par).toBe(2);
  });

  it('connects Alexander the Great and Julius Caesar on the committed roster', () => {
    const roster = (rosterFile as unknown as RosterFile).people.map(fromRosterRow);
    const result = computePar(roster, figure('Alexander the Great', -356, -323), figure('Julius Caesar', -100, -44));
    expect(result.playable && result.par).toBeGreaterThanOrEqual(1);
  });
});

describe('nextHint', () => {
  const roster = [
    rosterPerson('Step 1', 1640, 1700),
    rosterPerson('Step 2', 1690, 1760),
    rosterPerson('Step 3', 1740, 1810),
    rosterPerson('Long life', 1645, 1745),
  ];

  it('names the first par step when nothing is placed', () => {
    expect(nextHint(roster, a, b, [a, b])?.name).toBe('Long life');
  });

  it('skips people already placed', () => {
    expect(nextHint(roster, a, b, [a, figure('Long life', 1645, 1745), b])?.name).toBe('Step 3');
  });

  it('steps on from the reach of placements connected to the earlier target', () => {
    const placed = figure('Placed', 1690, 1760);
    expect(nextHint(roster, a, b, [a, figure('Bridge', 1645, 1695), placed, b])?.name).toBe('Step 3');
  });

  it('returns the same person when asked twice without a placement', () => {
    const board = [a, b];
    expect(nextHint(roster, a, b, board)).toEqual(nextHint(roster, a, b, board));
  });

  it('has nothing to suggest once the targets are connected', () => {
    expect(nextHint(roster, a, b, [a, figure('Spanner', 1630, 1820), b])).toBeNull();
  });
});
