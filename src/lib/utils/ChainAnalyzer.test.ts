import { describe, expect, it } from 'vitest';
import { analyzeChain, areContemporaries } from './ChainAnalyzer';
import type { HistoricalFigure } from '../types/HistoricalFigure';

function figure(id: string, birthYear: number, deathYear: number): HistoricalFigure {
  return { id, name: id, birthYear, deathYear, shortDescription: '', imageUrl: '', contemporaries: [] };
}

const alexander = figure('alexander', -356, -323);
const ptolemy = figure('ptolemy', -367, -282);
const archimedes = figure('archimedes', -287, -212);
const hannibal = figure('hannibal', -247, -183);
const polybius = figure('polybius', -200, -118);
const marius = figure('marius', -157, -86);
const caesar = figure('caesar', -100, -44);
const leonardo = figure('leonardo', 1452, 1519);

describe('areContemporaries', () => {
  it('is true when lifespans overlap, including across BCE years', () => {
    expect(areContemporaries(alexander, ptolemy)).toBe(true);
    expect(areContemporaries(marius, caesar)).toBe(true);
  });

  it('is true when one life ends in the year the other begins', () => {
    expect(areContemporaries(figure('a', -300, -250), figure('b', -250, -200))).toBe(true);
  });

  it('is false when lifespans do not touch', () => {
    expect(areContemporaries(alexander, caesar)).toBe(false);
    expect(areContemporaries(caesar, leonardo)).toBe(false);
  });

  it('is symmetric', () => {
    expect(areContemporaries(hannibal, polybius)).toBe(areContemporaries(polybius, hannibal));
  });
});

describe('analyzeChain', () => {
  it('reports no connection when the targets are not linked', () => {
    const result = analyzeChain(alexander, caesar, [alexander, caesar, leonardo]);
    expect(result.isComplete).toBe(false);
    expect(result.shortestPath).toEqual([]);
    expect([...result.unconnectedFigures]).toEqual(['leonardo']);
  });

  it('finds the chain between targets and excludes dead ends', () => {
    const all = [alexander, caesar, ptolemy, archimedes, hannibal, polybius, marius, leonardo];
    const result = analyzeChain(alexander, caesar, all);
    expect(result.isComplete).toBe(true);
    expect(result.shortestPath.map(f => f.id)).toEqual([
      'alexander', 'ptolemy', 'archimedes', 'hannibal', 'polybius', 'marius', 'caesar',
    ]);
    expect(result.chainLength).toBe(5);
    expect(result.unconnectedFigures.has('leonardo')).toBe(true);
  });

  it('prefers the shortest chain when several exist', () => {
    const longLived = figure('long-lived', -330, -90);
    const all = [alexander, caesar, ptolemy, archimedes, hannibal, polybius, marius, longLived];
    const result = analyzeChain(alexander, caesar, all);
    expect(result.shortestPath.map(f => f.id)).toEqual(['alexander', 'long-lived', 'caesar']);
    expect(result.chainLength).toBe(1);
  });
});
