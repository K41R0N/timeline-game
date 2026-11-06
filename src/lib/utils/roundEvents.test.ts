import { describe, expect, it } from 'vitest';
import rosterFile from '../data/roster.json';
import { RosterFile, fromRosterRow } from '../data/roster';
import type { HistoricalFigure } from '../types/HistoricalFigure';
import { roundCompletedProps, roundStartedProps } from './roundEvents';

const roster = (rosterFile as unknown as RosterFile).people.map(fromRosterRow);
const figure = (name: string): HistoricalFigure => {
  const p = roster.find(r => r.name === name)!;
  return { ...p, shortDescription: '', imageUrl: '', contemporaries: [] };
};

describe('roundStartedProps', () => {
  it('describes the round by difficulty, par, narrowest step and era', () => {
    expect(roundStartedProps(roster, 'easy', figure('Dante Alighieri'), figure('Leonardo da Vinci'))).toMatchObject({
      difficulty: 'easy',
      par: 3,
      years_apart: 131,
      gap_century: 1300,
      target_a: 'Dante Alighieri',
      target_b: 'Leonardo da Vinci',
    });
    expect(roundStartedProps(roster, 'easy', figure('Dante Alighieri'), figure('Leonardo da Vinci')).narrowest_step).toBeGreaterThanOrEqual(15);
  });

  it('places a BCE gap in its century', () => {
    expect(roundStartedProps(roster, 'hard', figure('Alexander the Great'), figure('Julius Caesar')).gap_century).toBe(-300);
  });
});

describe('roundCompletedProps', () => {
  it('reports strokes against par, hints, badges and duration', () => {
    expect(
      roundCompletedProps({ difficulty: 'medium', strokes: 2, par: 3, hintsUsed: 1, badgeKinds: ['clutch', 'clutch', 'longBridge'], startedAt: 1_000, now: 62_500 })
    ).toEqual({ difficulty: 'medium', strokes: 2, par: 3, result: -1, hints: 1, clutch_badges: 2, long_bridge_badges: 1, duration_seconds: 61 });
  });

  it('leaves the result empty when par is unknown', () => {
    expect(roundCompletedProps({ difficulty: 'easy', strokes: 4, par: null, hintsUsed: 0, badgeKinds: [], startedAt: 0, now: 0 }).result).toBeNull();
  });
});
