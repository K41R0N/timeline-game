'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GameRound } from './GameRound';
import { WinModal } from './ui/WinModal';
import { Countdown } from './ui/Countdown';
import type { HistoricalFigure } from '../types/HistoricalFigure';
import type { DailyPuzzle, PuzzlePerson } from '../data/dailySchedule';
import { WikipediaService } from '../services/WikipediaService';
import { useDailyProgress, updateDailyProgress } from '../hooks/useDailyProgress';
import { finalChain } from '../utils/style';
import { hintPolicy } from '../utils/GameLogic';
import { analytics, currentTime } from '../services/analytics';
import { loadRoster } from '../data/roster';
import { roundStartedProps, type RoundContext } from '../utils/roundEvents';
import { weekdayName } from '../utils/daily';
import {
  finishScored,
  openPractice,
  openPuzzle,
  saveRound,
  type AttemptKind,
  type DailyAttempt,
  type DailyProgress,
  type DailyResult,
  type RoundSave,
} from '../utils/dailyProgress';

interface DailyRoundProps {
  puzzle: DailyPuzzle;
  /** Today's puzzle number on the server's UTC date. */
  todayNumber: number;
  /** When the next puzzle goes live, in epoch milliseconds. */
  nextSwitchAt: number;
}

function figureFrom(person: PuzzlePerson): HistoricalFigure {
  return { ...person, shortDescription: '', imageUrl: '', contemporaries: [] };
}

/**
 * The daily targets keep the puzzle's own identity and years; only their description and image
 * come from Wikimedia. A failed lookup leaves those blank and the round still starts.
 */
async function lookUpTargets(puzzle: DailyPuzzle): Promise<[HistoricalFigure, HistoricalFigure]> {
  const people: [PuzzlePerson, PuzzlePerson] = [puzzle.targetA, puzzle.targetB];
  const results = await Promise.all(people.map(p => WikipediaService.lookupPerson(p.name).catch(() => null)));
  return people.map((person, i) => {
    const result = results[i];
    const display = result?.ok && result.figure.id === person.id ? result.figure : null;
    return {
      ...figureFrom(person),
      shortDescription: display?.shortDescription ?? '',
      imageUrl: display?.imageUrl ?? '',
      summary: display?.summary,
      wikidataId: display?.wikidataId,
    };
  }) as [HistoricalFigure, HistoricalFigure];
}

/** A daily puzzle: today's scored attempt, a resumed one, its result, or practice on a past puzzle. */
export function DailyRound(props: DailyRoundProps) {
  const progress = useDailyProgress();
  if (!progress) return <DailyLoading />;
  return <LoadedDailyRound {...props} progress={progress} />;
}

function DailyLoading() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-primary text-xl">Loading today&apos;s puzzle...</div>
    </div>
  );
}

type View = { kind: 'result'; attempt: DailyAttempt; canPractice: boolean } | { kind: AttemptKind; save: RoundSave | null };

function LoadedDailyRound({ puzzle: incoming, todayNumber, nextSwitchAt, progress }: DailyRoundProps & { progress: DailyProgress }) {
  const router = useRouter();
  // A refresh (the countdown's, at midnight) sends an equal puzzle as a new object; keep the first so the
  // targets are not looked up again and the round's start is not reported twice.
  const [puzzle] = useState(incoming);
  const n = puzzle.number;
  // Decided once when the page opens; saving progress must not switch what is on screen.
  const [view, setView] = useState<View>(() => openPuzzle(progress, n, todayNumber));
  const [targets, setTargets] = useState<[HistoricalFigure, HistoricalFigure] | null>(null);

  useEffect(() => {
    let cancelled = false;
    lookUpTargets(puzzle).then(found => {
      if (!cancelled) setTargets(found);
    });
    return () => {
      cancelled = true;
    };
  }, [puzzle]);

  const kind = view.kind === 'result' ? null : view.kind;
  const context = useMemo<RoundContext>(() => ({ mode: 'daily', puzzle: n, scored: kind === 'scored' }), [n, kind]);

  // A new attempt (scored or practice) starts a round; resuming one does not.
  useEffect(() => {
    if (!targets || view.kind === 'result' || view.save !== null) return;
    let cancelled = false;
    loadRoster()
      .then(roster => {
        if (!cancelled) analytics.track('game_started', roundStartedProps(roster, puzzle.band, targets[0], targets[1], context));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [targets, view, puzzle.band, context]);
  const save = useCallback(
    (round: RoundSave) => {
      if (kind) updateDailyProgress(p => saveRound(p, n, kind, round, currentTime()));
    },
    [kind, n]
  );
  const win = useCallback(
    (round: RoundSave, result: DailyResult) => {
      if (kind === 'scored') updateDailyProgress(p => finishScored(p, n, round, result, currentTime()));
    },
    [kind, n]
  );

  const title = `Daily #${n} · ${weekdayName(puzzle.date)}`;
  const isToday = n === todayNumber;
  const goHome = () => router.push('/');
  const countdown = (
    <div className="text-center text-sm text-foreground-muted">
      <Countdown until={nextSwitchAt} />
      <span className="mx-2">·</span>
      <Link href="/archive" className="underline hover:text-foreground">
        Past puzzles
      </Link>
    </div>
  );

  if (view.kind === 'result') {
    const { attempt, canPractice } = view;
    // The stored result needs only names and years, so it does not wait for Wikimedia.
    const [a, b] = targets ?? [figureFrom(puzzle.targetA), figureFrom(puzzle.targetB)];
    const final = attempt.figures.length > 0 ? finalChain(a, b, attempt.figures) : null;
    const result = attempt.result!;
    return (
      <WinModal
        heading={title}
        strokes={result.strokes}
        par={result.par}
        chain={final?.chain ?? []}
        badges={final?.badges ?? []}
        parChain={[a, ...puzzle.parChain, b]}
        hintsUsed={hintPolicy(puzzle.band).recorded ? result.hintsUsed : null}
        onPlayAgain={goHome}
        playAgainLabel="Back to home"
        extra={
          <div className="space-y-3">
            {canPractice && (
              <div className="flex justify-center">
                <button
                  onClick={() => setView(openPractice(progress, n))}
                  className="px-4 py-2 rounded-lg border-2 border-primary text-primary font-semibold hover:bg-primary-glow"
                >
                  Play #{n} again as practice
                </button>
              </div>
            )}
            {countdown}
          </div>
        }
      />
    );
  }

  if (!targets) return <DailyLoading />;

  const practice = view.kind === 'practice';
  return (
    <GameRound
      targetA={targets[0]}
      targetB={targets[1]}
      difficulty={puzzle.band}
      initial={view.save}
      fixedParChain={puzzle.parChain}
      onSave={save}
      onWin={win}
      onHome={goHome}
      endActionLabel="Back to home"
      roundLabel={
        <span>
          #{n} · {practice ? 'Practice' : isToday ? 'Today' : weekdayName(puzzle.date)}
          {!practice && isToday && (
            <>
              {' · '}
              <Countdown until={nextSwitchAt} label="next in" />
            </>
          )}
        </span>
      }
      endHeading={practice ? `${title} · Practice` : title}
      endExtra={countdown}
      analyticsContext={context}
    />
  );
}
