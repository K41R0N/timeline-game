'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DifficultyChoice,
  EasyRound,
  GameRound,
  MediumRound,
  TargetSelectionService,
  useGameStatePersistence,
  loadRoster,
  analytics,
  roundStartedProps,
  chainRoundStartedProps,
  buildEasyPuzzle,
  buildMediumPuzzle,
  drawHardBand,
  freePlay,
} from '@/lib';
import type { Difficulty, HistoricalFigure, RoundSave, StylePuzzle } from '@/lib';

type FreeRound =
  | {
      kind: 'hard';
      /** Remounts the round for each new game. */
      id: number;
      targetA: HistoricalFigure;
      targetB: HistoricalFigure;
      /** The pair's band; the round plays on Hard rules whatever it is. */
      band: Difficulty;
      initial: RoundSave | null;
    }
  | { kind: 'easy' | 'medium'; id: number; puzzle: StylePuzzle };

const BUILDERS = { easy: buildEasyPuzzle, medium: buildMediumPuzzle };

/** Free play: pick a style and play rounds back to back. Easy and Medium puzzles are built here from the roster. */
export default function FreePlay() {
  const router = useRouter();
  const { loadSavedState, saveState, clearState } = useGameStatePersistence();
  const [round, setRound] = useState<FreeRound | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startHard = async () => {
    const band = drawHardBand();
    const rosterPeople = await loadRoster();
    const targets = await TargetSelectionService.selectTargets(rosterPeople, band);
    if (!targets) throw new Error('Failed to load historical figures');
    const [targetA, targetB] = targets;
    console.log(`✅ Hard targets (${band} pair): ${targetA.name} → ${targetB.name}`);
    setRound(previous => ({ kind: 'hard', id: (previous?.id ?? 0) + 1, targetA, targetB, band, initial: null }));
    analytics.track('game_started', roundStartedProps(rosterPeople, targetA, targetB, freePlay('hard', band)));
  };

  const startChain = async (style: 'easy' | 'medium') => {
    const rosterPeople = await loadRoster();
    const puzzle = BUILDERS[style](rosterPeople, Math.random);
    if (!puzzle) throw new Error(`No ${style} puzzle could be built`);
    console.log(`✅ ${style} puzzle: ${puzzle.a.name} → ${puzzle.b.name}`);
    setRound(previous => ({ kind: style, id: (previous?.id ?? 0) + 1, puzzle }));
    analytics.track('game_started', chainRoundStartedProps(puzzle.a, puzzle.b, puzzle.chain.length, freePlay(style)));
  };

  const start = async (style: Difficulty) => {
    try {
      setIsLoading(true);
      setError(null);
      await (style === 'hard' ? startHard() : startChain(style));
    } catch (err) {
      console.error('❌ Error starting a round:', err);
      setError('Could not deal a puzzle. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // On mount: start the style the menu asked for (/play?d=easy), or resume the saved Hard round.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('d');
    if (asked === 'easy' || asked === 'medium' || asked === 'hard') {
      router.replace('/play');
      setRestoring(false);
      start(asked);
      return;
    }
    const saved = loadSavedState();
    if (saved && saved.figures.length > 0 && saved.targetA && saved.targetB) {
      console.log('🔄 Restoring saved game...');
      setRound({
        kind: 'hard',
        id: 0,
        targetA: saved.targetA,
        targetB: saved.targetB,
        band: saved.difficulty,
        initial: { figures: saved.figures, hintsUsed: saved.hintsUsed, hint: saved.hint },
      });
    }
    setRestoring(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    (progress: RoundSave) => {
      if (round?.kind !== 'hard') return;
      saveState({ ...progress, targetA: round.targetA, targetB: round.targetB, difficulty: round.band });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round]
  );

  /** Another round of the same style; an unfinished Hard round is given up. */
  const newGame = () => {
    if (!round) return;
    if (round.kind === 'hard') clearState();
    start(round.kind);
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
          <DifficultyChoice onPick={start} />
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

  if (round.kind !== 'hard') {
    const { puzzle } = round;
    const shared = {
      key: round.id,
      puzzle: { targetA: puzzle.a, targetB: puzzle.b, chain: puzzle.chain, decoys: puzzle.decoys },
      initial: null,
      label: 'Free play',
      onSave: () => {},
      onFinish: () => {},
      onHome: () => router.push('/'),
      onRestart: newGame,
      endHeading: `Free play · ${round.kind === 'easy' ? 'Easy' : 'Medium'}`,
      endActionLabel: 'Play again',
      onEndAction: newGame,
      analyticsContext: freePlay(round.kind),
    };
    return round.kind === 'easy' ? <EasyRound {...shared} /> : <MediumRound {...shared} />;
  }

  return (
    <GameRound
      key={round.id}
      targetA={round.targetA}
      targetB={round.targetB}
      difficulty="hard"
      initial={round.initial}
      onSave={save}
      onHome={() => router.push('/')}
      onRestart={newGame}
      restartConfirm="Start a new game? Your current progress will be lost."
      endActionLabel="Play Again"
      analyticsContext={freePlay('hard', round.band)}
    />
  );
}
