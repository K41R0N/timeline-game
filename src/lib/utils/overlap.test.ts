import { describe, expect, it } from 'vitest';
import type { HistoricalFigure } from '../types/HistoricalFigure';
import { revealPlacement, sharedYears } from './overlap';

const person = (name: string, birthYear: number, deathYear: number, extra: Partial<HistoricalFigure> = {}): HistoricalFigure => ({
  id: name, name, birthYear, deathYear, shortDescription: '', imageUrl: '', contemporaries: [], ...extra,
});

const austen = person('Jane Austen', 1775, 1817);
const dickens = person('Charles Dickens', 1812, 1870);
const michelangelo = person('Michelangelo', 1475, 1564);
const galileo = person('Galileo Galilei', 1564, 1642);
const mozart = person('Mozart', 1756, 1791);
const lincoln = person('Abraham Lincoln', 1809, 1865);
const darwin = person('Charles Darwin', 1809, 1882);

describe('sharedYears', () => {
  it('counts the years two lives share', () => {
    expect(sharedYears(austen, dickens)).toBe(5);
    expect(sharedYears(lincoln, darwin)).toBe(56);
  });

  it('is 0 when the lives share only part of one year, and null when they never meet', () => {
    expect(sharedYears(michelangelo, galileo)).toBe(0);
    expect(sharedYears(mozart, lincoln)).toBeNull();
  });
});

describe('revealPlacement', () => {
  const targetA = person('Target A', 1700, 1760);
  const targetB = person('Target B', 1900, 1980);

  it('reveals shared years and a provisional clutch badge (Austen and Dickens)', () => {
    const reveal = revealPlacement(dickens, [targetA, austen, targetB], targetA, targetB);
    expect(reveal.miss).toBeNull();
    expect(reveal.overlaps).toEqual([{ other: austen, sharedYears: 5, extendsChain: false, clutch: true }]);
  });

  it('treats lives sharing part of one year as a clutch overlap (Michelangelo and Galileo)', () => {
    const reveal = revealPlacement(galileo, [person('A', 1400, 1450), michelangelo, person('B', 1700, 1750)], person('A', 1400, 1450), person('B', 1700, 1750));
    expect(reveal.overlaps).toEqual([{ other: michelangelo, sharedYears: 0, extendsChain: false, clutch: true }]);
  });

  it('reveals a miss with the gap to the nearest life (Mozart and Lincoln)', () => {
    const a = person('Early', 1600, 1650);
    const b = person('Late', 1950, 2000);
    const reveal = revealPlacement(lincoln, [a, mozart, b], a, b);
    expect(reveal.overlaps).toEqual([]);
    expect(reveal.miss).toEqual({ nearest: mozart, gapYears: 18 });
  });

  it('shows no badge for a long shared span (Lincoln and Darwin)', () => {
    const reveal = revealPlacement(darwin, [targetA, lincoln, targetB], targetA, targetB);
    expect(reveal.overlaps[0]).toMatchObject({ sharedYears: 56, clutch: false });
  });

  it('lists overlaps with people already connected to a target first', () => {
    const connected = person('Connected', 1750, 1820);
    const loose = person('Loose', 1825, 1840);
    const reveal = revealPlacement(person('New', 1810, 1850), [targetA, connected, loose, targetB], targetA, targetB);
    expect(reveal.overlaps.map(o => [o.other.name, o.extendsChain])).toEqual([
      ['Connected', true],
      ['Loose', false],
    ]);
  });

  it('counts an overlap with a living person up to the current year', () => {
    const living = person('Living', 1990, 2026, { isLiving: true });
    const reveal = revealPlacement(person('New', 2000, 2020), [targetA, living, targetB], targetA, targetB);
    expect(reveal.overlaps.find(o => o.other.name === 'Living')?.sharedYears).toBe(20);
  });

  it('gives no clutch badge when a year involved is approximate', () => {
    const gutenberg = person('Johannes Gutenberg', 1400, 1468, { birthApproximate: true });
    const reveal = revealPlacement(person('New', 1465, 1500), [targetA, gutenberg, targetB], targetA, targetB);
    expect(reveal.overlaps[0]).toMatchObject({ sharedYears: 3, clutch: false });
  });

  it('flags a provisional long bridge for a placement who lived 90 years or more', () => {
    const fontenelle = person('Fontenelle', 1657, 1757);
    expect(revealPlacement(fontenelle, [targetA, targetB], targetA, targetB).longBridge).toBe(true);
    expect(revealPlacement(dickens, [targetA, targetB], targetA, targetB).longBridge).toBe(false);
  });
});
