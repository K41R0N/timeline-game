import { describe, expect, it } from 'vitest';
import type { HistoricalFigure } from '../types/HistoricalFigure';
import { finalChain } from './style';

const person = (name: string, birthYear: number, deathYear: number, extra: Partial<HistoricalFigure> = {}): HistoricalFigure => ({
  id: name, name, birthYear, deathYear, shortDescription: '', imageUrl: '', contemporaries: [], ...extra,
});

const names = (chain: HistoricalFigure[]) => chain.map(f => f.name);

describe('finalChain', () => {
  it('is null while the targets are not connected', () => {
    const a = person('A', 1600, 1650);
    const b = person('B', 1800, 1850);
    expect(finalChain(a, b, [a, person('X', 1640, 1700), b])).toBeNull();
  });

  it('awards long bridge to a centenarian on the final chain (Fontenelle)', () => {
    const a = person('A', 1640, 1670);
    const b = person('B', 1740, 1800);
    const fontenelle = person('Fontenelle', 1657, 1757);
    const result = finalChain(a, b, [a, fontenelle, b])!;
    expect(names(result.chain)).toEqual(['A', 'Fontenelle', 'B']);
    expect(result.badges).toEqual([{ kind: 'longBridge', person: fontenelle, years: 100 }]);
  });

  it('awards nothing to a centenarian the final chain routes around', () => {
    const a = person('A', 1600, 1650);
    const b = person('B', 1700, 1720);
    const bridge = person('Bridge', 1640, 1710);
    const fontenelle = person('Fontenelle', 1657, 1757);
    const result = finalChain(a, b, [a, bridge, fontenelle, b])!;
    expect(names(result.chain)).toEqual(['A', 'Bridge', 'B']);
    expect(result.badges).toEqual([]);
  });

  it('awards clutch overlap to a chain link of 5 shared years or fewer, including a link to a target', () => {
    const austen = person('Jane Austen', 1775, 1817);
    const dickens = person('Charles Dickens', 1812, 1870);
    const result = finalChain(austen, person('B', 1860, 1900), [austen, dickens, person('B', 1860, 1900)])!;
    expect(result.badges).toEqual([{ kind: 'clutch', from: austen, to: dickens, sharedYears: 5 }]);
  });

  it('gives no long bridge to a target or to a living person', () => {
    const oldTarget = person('Old target', 1600, 1700);
    const living = person('Living', 1930, 2026, { isLiving: true });
    const b = person('B', 1990, 2026, { isLiving: true });
    const mid = person('Mid', 1690, 1760);
    const late = person('Late', 1750, 1940);
    const result = finalChain(oldTarget, b, [oldTarget, mid, late, living, b])!;
    expect(result.badges.filter(badge => badge.kind === 'longBridge').map(badge => badge.person.name)).toEqual(['Late']);
  });

  it('gives no clutch badge when a year involved is approximate (Gutenberg)', () => {
    const gutenberg = person('Johannes Gutenberg', 1400, 1468, { birthApproximate: true });
    const next = person('Next', 1465, 1500);
    const result = finalChain(gutenberg, next, [gutenberg, next])!;
    expect(result.badges).toEqual([]);
  });

  it('picks the shortest chain that earns the most style', () => {
    const a = person('A', 1700, 1760);
    const b = person('B', 1800, 1850);
    const plain = person('Plain', 1740, 1820);
    const clutchy = person('Clutchy', 1755, 1803);
    const result = finalChain(a, b, [a, plain, clutchy, b])!;
    expect(names(result.chain)).toEqual(['A', 'Clutchy', 'B']);
    expect(result.badges.map(badge => badge.kind)).toEqual(['clutch', 'clutch']);
  });
});
