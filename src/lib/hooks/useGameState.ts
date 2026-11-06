import { useEffect } from 'react';
import { HistoricalFigure } from '../types/HistoricalFigure';

interface GameState {
  figures: HistoricalFigure[];
  targetA: HistoricalFigure | null;
  targetB: HistoricalFigure | null;
  difficulty: 'easy' | 'medium' | 'hard';
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
const AUTO_SAVE_DELAY = 2000; // 2 seconds debounce

/**
 * Custom hook for persisting game state to localStorage
 * Auto-saves with debouncing to prevent excessive writes
 */
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

/**
 * Debounced auto-save hook
 * Automatically saves game state after a delay when it changes
 */
export function useAutoSave(
  figures: HistoricalFigure[],
  targetA: HistoricalFigure | null,
  targetB: HistoricalFigure | null,
  difficulty: 'easy' | 'medium' | 'hard',
  hintsUsed: number,
  hint: SavedHint | null
) {
  const { saveState } = useGameStatePersistence();

  useEffect(() => {
    // Don't save if game hasn't started
    if (!targetA || !targetB || figures.length === 0) return;

    const timer = setTimeout(() => {
      saveState({
        figures,
        targetA,
        targetB,
        difficulty,
        hintsUsed,
        hint: hint ? { id: hint.id, name: hint.name } : null
      });
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figures, targetA, targetB, difficulty, hintsUsed, hint]);
  // Note: saveState is intentionally excluded - it's a stable function
}
