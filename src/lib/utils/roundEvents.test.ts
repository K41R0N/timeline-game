import { describe, expect, it } from 'vitest';
import rosterFile from '../data/roster.json';
import { RosterFile, fromRosterRow } from '../data/roster';
import type { HistoricalFigure } from '../types/HistoricalFigure';
import { chainRoundCompletedProps, chainRoundStartedProps, freePlay, roundCompletedProps, roundStartedProps } from './roundEvents';

const roster = (rosterFile as unknown as RosterFile).people.map(fromRosterRow);
const figure = (name: string): HistoricalFigure => {
  const p = roster.find(r => r.name === name)!;
  return { ...p, shortDescription: '', imageUrl: '', contemporaries: [] };
};

describe('roundStartedProps', () => {
  it('describes a Hard round by its pair band, par, narrowest step and era', () => {
    expect(roundStartedProps(roster, figure('Dante Alighieri'), figure('Leonardo da Vinci'), freePlay('hard', 'easy'))).toMatchObject({
      style: 'hard',
      band: 'easy',
      par: 3,
      years_apart: 131,
      gap_century: 1300,
      target_a: 'Dante Alighieri',
      target_b: 'Leonardo da Vinci',
      mode: 'free',
      puzzle: null,
      scored: null,
    });
    expect(roundStartedProps(roster, figure('Dante Alighieri'), figure('Leonardo da Vinci'), freePlay('hard', 'easy')).narrowest_step).toBeGreaterThanOrEqual(15);
  });

  it('places a BCE gap in its century', () => {
    expect(roundStartedProps(roster, figure('Alexander the Great'), figure('Julius Caesar'), freePlay('hard', 'hard')).gap_century).toBe(-300);
  });
});

describe('roundCompletedProps', () => {
  it('keeps strokes, par and the pair band on a Hard completion', () => {
    expect(
      roundCompletedProps({ strokes: 2, par: 3, hintsUsed: 1, badgeKinds: ['clutch', 'clutch', 'longBridge'], startedAt: 1_000, now: 62_500, context: freePlay('hard', 'medium') })
    ).toEqual({
      style: 'hard',
      band: 'medium',
      strokes: 2,
      par: 3,
      result: -1,
      hints: 1,
      clutch_badges: 2,
      long_bridge_badges: 1,
      duration_seconds: 61,
      mode: 'free',
      puzzle: null,
      scored: null,
    });
  });

  it('leaves the result empty when par is unknown', () => {
    expect(roundCompletedProps({ strokes: 4, par: null, hintsUsed: 0, badgeKinds: [], startedAt: 0, now: 0, context: freePlay('hard', 'easy') }).result).toBeNull();
  });
});

describe('Easy and Medium round events', () => {
  it('names the style and the size of the puzzle when a round starts', () => {
    expect(chainRoundStartedProps(figure('Galileo Galilei'), figure('Richard Feynman'), 4, freePlay('easy'))).toEqual({
      style: 'easy',
      band: null,
      target_a: 'Galileo Galilei',
      target_b: 'Richard Feynman',
      people: 4,
      mode: 'free',
      puzzle: null,
      scored: null,
    });
  });

  it('reports an Easy completion with its style and number of Checks', () => {
    expect(chainRoundCompletedProps({ result: { score: 2, squares: ['first', 'later'] }, reveals: 0, startedAt: 0, now: 30_000, context: freePlay('easy') })).toEqual({
      style: 'easy',
      band: null,
      checks: 2,
      people: 2,
      duration_seconds: 30,
      mode: 'free',
      puzzle: null,
      scored: null,
    });
  });

  it('reports a Medium completion with wrong guesses and reveals counted apart', () => {
    const context = { mode: 'daily' as const, puzzle: 3, scored: true, style: 'medium' as const, band: null };
    expect(chainRoundCompletedProps({ result: { score: 3, squares: ['later', 'revealed', 'first'] }, reveals: 1, startedAt: 0, now: 5_000, context })).toMatchObject({
      style: 'medium',
      misses: 2,
      reveals: 1,
      people: 3,
      mode: 'daily',
      puzzle: 3,
      scored: true,
    });
  });
});

describe('daily round context', () => {
  it('tags a scored daily round with its puzzle number and a practice round as not scored', () => {
    const scored = roundStartedProps(roster, figure('Dante Alighieri'), figure('Leonardo da Vinci'), { mode: 'daily', puzzle: 12, scored: true, style: 'hard', band: 'easy' });
    expect(scored).toMatchObject({ mode: 'daily', puzzle: 12, scored: true, style: 'hard', band: 'easy', par: 3 });
    const practice = roundCompletedProps({ strokes: 5, par: 4, hintsUsed: 0, badgeKinds: [], startedAt: 0, now: 0, context: { mode: 'daily', puzzle: 9, scored: false, style: 'hard', band: 'hard' } });
    expect(practice).toMatchObject({ mode: 'daily', puzzle: 9, scored: false, result: 1 });
  });
});
