import { describe, expect, it } from 'vitest';
import type { HistoricalFigure } from '../types/HistoricalFigure';
import { countStrokes, describeResult, formatYear, formatYearRange, hintPolicy } from './GameLogic';

describe('formatYear', () => {
  it('formats negative years as BCE', () => {
    expect(formatYear(-356)).toBe('356 BCE');
    expect(formatYear(-1)).toBe('1 BCE');
  });

  it('formats positive years as CE', () => {
    expect(formatYear(1452)).toBe('1452 CE');
    expect(formatYear(1)).toBe('1 CE');
  });
});

describe('formatYearRange', () => {
  it('joins birth and death across the BCE/CE boundary', () => {
    expect(formatYearRange(-63, 14)).toBe('63 BCE – 14 CE');
  });
});

const people = (count: number): HistoricalFigure[] =>
  Array.from({ length: count }, (_, i) => ({ id: `Q${i}`, name: `P${i}`, birthYear: 1000 + i, deathYear: 1050 + i, shortDescription: '', imageUrl: '', contemporaries: [] }));

describe('countStrokes', () => {
  it('counts every placed person and adds hints only on Hard', () => {
    const board = people(2 + 4);
    expect(countStrokes(board, 1, 'hard')).toBe(5);
    expect(countStrokes(board, 1, 'medium')).toBe(4);
    expect(countStrokes(board, 1, 'easy')).toBe(4);
  });

  it('counts only the board, so a rejected entry that never joins it costs nothing', () => {
    expect(countStrokes(people(2), 0, 'hard')).toBe(0);
  });
});

describe('hintPolicy', () => {
  it('records hints on Medium and Hard, and charges a stroke only on Hard', () => {
    expect(hintPolicy('easy')).toMatchObject({ recorded: false, costsStroke: false });
    expect(hintPolicy('medium')).toMatchObject({ recorded: true, costsStroke: false });
    expect(hintPolicy('hard')).toMatchObject({ recorded: true, costsStroke: true });
  });
});

describe('describeResult', () => {
  it.each([
    [2, 3, '−1, birdie', 'under'],
    [1, 3, '−2, eagle', 'under'],
    [0, 3, '−3', 'under'],
    [3, 3, 'Par', 'par'],
    [4, 3, '+1, bogey', 'over'],
    [6, 3, '+3', 'over'],
  ])('reads %i strokes against par %i as "%s"', (strokes, par, label, tone) => {
    expect(describeResult(strokes, par)).toEqual({ difference: strokes - par, label, tone });
  });
});
