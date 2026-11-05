import { describe, expect, it } from 'vitest';
import { formatYear, formatYearRange } from './GameLogic';

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
