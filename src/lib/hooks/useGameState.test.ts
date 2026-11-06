import { describe, expect, it } from 'vitest';
import { normalizeSavedState } from './useGameState';

const figure = { id: 'Q1', name: 'A', birthYear: 1, deathYear: 50, shortDescription: '', imageUrl: '', contemporaries: [] };

describe('normalizeSavedState', () => {
  it('restores a round saved before hints existed with zero hints', () => {
    const saved = { figures: [figure], targetA: figure, targetB: figure, difficulty: 'hard', score: 3 };
    expect(normalizeSavedState(saved)).toEqual({ figures: [figure], targetA: figure, targetB: figure, difficulty: 'hard', hintsUsed: 0, hint: null });
  });

  it('keeps a saved hint count and the hinted name, so a reload never charges for the same hint twice', () => {
    const saved = { figures: [figure], targetA: figure, targetB: figure, difficulty: 'hard', hintsUsed: 2, hint: { id: 'Q5', name: 'Archimedes' } };
    expect(normalizeSavedState(saved)).toMatchObject({ hintsUsed: 2, hint: { id: 'Q5', name: 'Archimedes' } });
  });

  it('discards a save without figures', () => {
    expect(normalizeSavedState({ difficulty: 'easy' })).toBeNull();
    expect(normalizeSavedState(null)).toBeNull();
  });
});
