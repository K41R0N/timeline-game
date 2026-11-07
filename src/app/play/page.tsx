'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  GameRound,
  TargetSelectionService,
  useGameStatePersistence,
  loadRoster,
  DIFFICULTY_BANDS,
  analytics,
  roundStartedProps,
  FREE_PLAY,
} from '@/lib';
import type { Difficulty, HistoricalFigure, RoundSave } from '@/lib';

console.log('🚀 Initializing Timeline Game...');

const DIFFICULTY_OPTIONS: Array<{ difficulty: Difficulty; label: string; knowledge: string; className: string }> = [
  { difficulty: 'easy', label: 'Easy', knowledge: 'Many famous people fit every step', className: 'border-green-400 bg-green-50 hover:bg-green-100 text-green-700' },
  { difficulty: 'medium', label: 'Medium', knowledge: 'Some steps have only a few famous answers', className: 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-700' },
  { difficulty: 'hard', label: 'Hard', knowledge: 'At least one step has only one or two famous answers', className: 'border-red-400 bg-red-50 hover:bg-red-100 text-red-700' },
];

interface FreeRound {
  /** Remounts the round for each new game. */
  id: number;
  targetA: HistoricalFigure;
  targetB: HistoricalFigure;
  difficulty: Difficulty;
  initial: RoundSave | null;
}

/** Free play: pick a difficulty, get a random pair of targets, and play rounds back to back. */
export default function FreePlay() {
  const { loadSavedState, saveState, clearState } = useGameStatePersistence();
  const [round, setRound] = useState<FreeRound | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume a saved free-play round once, on mount.
  useEffect(() => {
    const saved = loadSavedState();
    if (saved && saved.figures.length > 0 && saved.targetA && saved.targetB) {
      console.log('🔄 Restoring saved game...');
      setRound({
        id: 0,
        targetA: saved.targetA,
        targetB: saved.targetB,
        difficulty: saved.difficulty,
        initial: { figures: saved.figures, hintsUsed: saved.hintsUsed, hint: saved.hint },
      });
    }
    setRestoring(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGame = async (difficulty: Difficulty) => {
    try {
      console.log(`🔄 Loading ${difficulty} difficulty game...`);
      setIsLoading(true);
      setError(null);

      const rosterPeople = await loadRoster();
      const targets = await TargetSelectionService.selectTargets(rosterPeople, difficulty);
      if (!targets) throw new Error('Failed to load historical figures');

      const [targetA, targetB] = targets;
      console.log('✅ Game targets loaded:', {
        difficulty,
        targetA: { name: targetA.name, years: `${targetA.birthYear}-${targetA.deathYear}` },
        targetB: { name: targetB.name, years: `${targetB.birthYear}-${targetB.deathYear}` },
      });
      setRound(previous => ({ id: (previous?.id ?? 0) + 1, targetA, targetB, difficulty, initial: null }));
      analytics.track('game_started', roundStartedProps(rosterPeople, difficulty, targetA, targetB, FREE_PLAY));
    } catch (err) {
      console.error('❌ Error loading initial figures:', err);
      setError('Failed to load initial figures. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const save = useCallback(
    (progress: RoundSave) => {
      if (!round) return;
      saveState({ ...progress, targetA: round.targetA, targetB: round.targetB, difficulty: round.difficulty });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round]
  );

  const newGame = () => {
    console.log('🔄 Returning to the difficulty picker...');
    clearState();
    setRound(null);
  };

  if (restoring) return null;

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-xl">Loading Timeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="timeline-card p-8 max-w-md">
          <h2 className="text-2xl font-bold text-primary mb-4">Select Difficulty</h2>
          <p className="text-foreground-muted mb-6">
            Connect two famous people in as few strokes as you can. Harder rounds need longer chains and people fewer players know.
          </p>

          <div className="space-y-3">
            {DIFFICULTY_OPTIONS.map(option => {
              const band = DIFFICULTY_BANDS[option.difficulty];
              return (
                <button
                  key={option.difficulty}
                  onClick={() => loadGame(option.difficulty)}
                  className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${option.className}`}
                >
                  <div className="font-bold">{option.label}</div>
                  <div className="text-sm">
                    Par {band.minPar}–{band.maxPar} • about {band.yearsApart} years apart
                  </div>
                  <div className="text-xs opacity-80">{option.knowledge}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameRound
      key={round.id}
      targetA={round.targetA}
      targetB={round.targetB}
      difficulty={round.difficulty}
      initial={round.initial}
      onSave={save}
      exitLabel="New Game"
      exitIcon="🎮"
      exitConfirm="Start a new game? Your current progress will be lost."
      onExit={newGame}
      exitAbandons
      endActionLabel="Play Again"
      analyticsContext={FREE_PLAY}
    />
  );
}
