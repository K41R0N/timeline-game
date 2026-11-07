import { describe, expect, it } from 'vitest';
import { addDays, bandForDate, nextSwitch, puzzleDate, puzzleNumber, utcDateKey, weekdayName } from './daily';

const FIRST = '2026-11-09';

describe('utcDateKey', () => {
  it('names the UTC calendar date, whatever the local time zone', () => {
    expect(utcDateKey(Date.parse('2026-12-31T23:59:59Z'))).toBe('2026-12-31');
    expect(utcDateKey(Date.parse('2027-01-01T00:00:00Z'))).toBe('2027-01-01');
    expect(utcDateKey(Date.parse('2026-11-09T23:30:00-05:00'))).toBe('2026-11-10');
  });
});

describe('puzzle numbers', () => {
  it('counts whole UTC days from the first puzzle', () => {
    expect(puzzleNumber(FIRST, FIRST)).toBe(1);
    expect(puzzleNumber('2026-11-10', FIRST)).toBe(2);
    expect(puzzleNumber(addDays(FIRST, 365), FIRST)).toBe(366);
  });

  it('gives the last second of a year and the first second of the next consecutive numbers', () => {
    const before = puzzleNumber(utcDateKey(Date.parse('2026-12-31T23:59:59Z')), FIRST)!;
    expect(puzzleNumber(utcDateKey(Date.parse('2027-01-01T00:00:00Z')), FIRST)).toBe(before + 1);
  });

  it('gives a leap day its own number', () => {
    const leap = puzzleNumber('2028-02-29', FIRST)!;
    expect(puzzleNumber('2028-02-28', FIRST)).toBe(leap - 1);
    expect(puzzleNumber('2028-03-01', FIRST)).toBe(leap + 1);
  });

  it('has no number before the first puzzle', () => {
    expect(puzzleNumber('2026-11-08', FIRST)).toBeNull();
  });

  it('turns a number back into its date', () => {
    expect(puzzleDate(1, FIRST)).toBe(FIRST);
    expect(puzzleDate(53, FIRST)).toBe('2026-12-31');
    expect(puzzleNumber(puzzleDate(400, FIRST), FIRST)).toBe(400);
  });
});

describe('bandForDate', () => {
  it('ramps from Easy early in the week to Hard at the weekend', () => {
    // 2026-11-09 is a Monday.
    const week = Array.from({ length: 7 }, (_, i) => addDays('2026-11-09', i));
    expect(week.map(weekdayName)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(week.map(bandForDate)).toEqual(['easy', 'easy', 'medium', 'medium', 'hard', 'hard', 'hard']);
  });
});

describe('nextSwitch', () => {
  it('is the next 00:00 UTC', () => {
    expect(nextSwitch(Date.parse('2026-11-09T23:59:59Z'))).toBe(Date.parse('2026-11-10T00:00:00Z'));
    expect(nextSwitch(Date.parse('2026-11-10T00:00:00Z'))).toBe(Date.parse('2026-11-11T00:00:00Z'));
    expect(nextSwitch(Date.parse('2026-11-10T13:45:00Z'))).toBe(Date.parse('2026-11-11T00:00:00Z'));
  });
});
