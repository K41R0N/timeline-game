'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DifficultyChoice,
  GameRound,
  TargetSelectionService,
  useGameStatePersistence,
  loadRoster,
  analytics,
  roundStartedProps,
  FREE_PLAY,
} from '@/lib';
import type { Difficulty, HistoricalFigure, RoundSave } from '@/lib';

console.log('🚀 Initializing Timeline Game...');


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
  const router = useRouter();
  const { loadSavedState, saveState, clearState } = useGameStatePersistence();
  const [round, setRound] = useState<FreeRound | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


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

  // On mount: start the difficulty the menu asked for (/play?d=hard), or resume the saved round.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('d');
    if (asked === 'easy' || asked === 'medium' || asked === 'hard') {
      router.replace('/play');
      setRestoring(false);
      loadGame(asked);
      return;
    }
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
      <div className="flex h-dvh w-full items-center justify-center bg-[var(--table-deep)]">
        <div className="type-display animate-pulse text-2xl font-extrabold uppercase tracking-[0.08em] text-[var(--chalk-text)]">Dealing the cards</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-[var(--table-deep)] px-6 text-center text-[var(--table-ink)]">
        <p className="text-lg">{error}</p>
        <Link href="/" className="type-display text-lg font-bold uppercase tracking-[0.08em] text-[var(--chalk-text)] underline">
          Home
        </Link>
      </div>
    );
  }

  if (!round) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-[radial-gradient(120%_70%_at_50%_0%,var(--table-light)_0%,var(--table)_50%,var(--table-deep)_100%)] px-4 py-10 text-[var(--table-ink)]">
        <div className="flex w-full max-w-md flex-col gap-6">
          <h1 className="type-display text-center text-5xl font-black uppercase leading-none text-[var(--table-ink)] [text-shadow:none]">
            Free <span className="text-[var(--foil)]">play</span>
          </h1>
          <DifficultyChoice onPick={loadGame} />
          <Link
            href="/"
            className="type-display mx-auto inline-flex h-11 items-center px-3 text-base font-bold uppercase tracking-[0.08em] text-[var(--table-muted)] hover:text-[var(--chalk-text)]"
          >
            Home
          </Link>
        </div>
      </main>
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
      onHome={() => router.push('/')}
      onRestart={newGame}
      restartConfirm="Start a new game? Your current progress will be lost."
      endActionLabel="Play Again"
      analyticsContext={FREE_PLAY}
    />
  );
}
