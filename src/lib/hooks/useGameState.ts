import { useState, useEffect } from 'react';
import { HistoricalFigure } from '../types/HistoricalFigure';

interface GameState {
  figures: HistoricalFigure[];
  targetA: HistoricalFigure | null;
  targetB: HistoricalFigure | null;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
}

const STORAGE_KEY = 'timeline-game-state';
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

      const parsed = JSON.parse(saved);
      console.log('📂 Loaded saved game state:', {
        figuresCount: parsed.figures?.length || 0,
        difficulty: parsed.difficulty,
        score: parsed.score
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
  score: number
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
        score
      });
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [figures, targetA, targetB, difficulty, score, saveState]);
}
