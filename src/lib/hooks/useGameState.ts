import { HistoricalFigure } from '../types/HistoricalFigure';
import type { Difficulty } from '../utils/GameLogic';

/** A free-play round as saved in this browser. */
export interface GameState {
  figures: HistoricalFigure[];
  targetA: HistoricalFigure | null;
  targetB: HistoricalFigure | null;
  difficulty: Difficulty;
  hintsUsed: number;
  /** The hinted person not yet placed, so a reload shows the same name without charging again. */
  hint: SavedHint | null;
}

export interface SavedHint {
  id: string;
  name: string;
}

/** A saved round in the current shape; rounds saved before hints existed restore with zero hints. */
export function normalizeSavedState(saved: unknown): GameState | null {
  const state = saved as Partial<GameState> | null;
  if (!state || !Array.isArray(state.figures)) return null;
  return {
    figures: state.figures,
    targetA: state.targetA ?? null,
    targetB: state.targetB ?? null,
    difficulty: state.difficulty ?? 'medium',
    hintsUsed: typeof state.hintsUsed === 'number' ? state.hintsUsed : 0,
    hint: state.hint?.id && state.hint?.name ? { id: state.hint.id, name: state.hint.name } : null,
  };
}

// v2: figures are keyed by Wikidata QID with corrected dates; v1 saves are discarded.
const STORAGE_KEY = 'timeline-game-state-v2';

/** The difficulty of the free-play round saved in this browser, or '' when there is none (for the menu's Continue). */
export function savedFreePlayBand(): Difficulty | '' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const state = saved ? normalizeSavedState(JSON.parse(saved)) : null;
    return state && state.targetA && state.targetB ? state.difficulty : '';
  } catch {
    return '';
  }
}

/** Whether this browser holds an unfinished free-play round (for the home page's "Resume free play"). */
export function hasSavedFreePlay(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Reads, writes and clears the free-play round saved in this browser. */
export function useGameStatePersistence() {
  // Load initial state from localStorage
  const loadSavedState = (): GameState | null => {
    if (typeof window === 'undefined') return null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const parsed = normalizeSavedState(JSON.parse(saved));
      if (!parsed) return null;
      console.log('📂 Loaded saved game state:', {
        figuresCount: parsed.figures?.length || 0,
        difficulty: parsed.difficulty,
        hintsUsed: parsed.hintsUsed
      });

      return parsed;
    } catch (error) {
      console.error('❌ Error loading saved state:', error);
      return null;
    }
  };

  // Save state to localStorage
  const saveState = (state: GameState) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log('💾 Game state saved');
    } catch (error) {
      console.error('❌ Error saving state:', error);
    }
  };

  // Clear saved state
  const clearState = () => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Game state cleared');
    } catch (error) {
      console.error('❌ Error clearing state:', error);
    }
  };

  return {
    loadSavedState,
    saveState,
    clearState
  };
}
