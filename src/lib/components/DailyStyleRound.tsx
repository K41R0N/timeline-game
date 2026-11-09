'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StylePuzzleData } from '../data/styleSchedule';
import { useDailyProgress, updateDailyProgress } from '../hooks/useDailyProgress';
import { usePortraits } from '../hooks/usePortraits';
import { currentTime } from '../services/analytics';
import { weekdayName } from '../utils/daily';
import {
  finishStyleScored,
  openStylePractice,
  openStylePuzzle,
  saveStyleRound,
  type AttemptKind,
  type DailyProgress,
  type StyleOpening,
  type StyleResult as Result,
  type StyleRoundSave,
} from '../utils/dailyProgress';
import { normalizeEasyRound, normalizeMediumRound } from '../utils/styleRound';
import { EasyRound } from './EasyRound';
import { MediumRound } from './MediumRound';
import { Countdown } from './ui/Countdown';
import { StyleResult } from './ui/StyleResult';

interface DailyStyleRoundProps {
  puzzle: StylePuzzleData;
  /** Today's puzzle number on the server's UTC date. */
  todayNumber: number;
  /** When the next puzzle goes live, in epoch milliseconds. */
  nextSwitchAt: number;
}

const STYLE_NAME = { easy: 'Easy', medium: 'Medium' } as const;

/** An Easy or Medium daily puzzle: today's scored attempt, a resumed one, its result, or practice on a past puzzle. */
export function DailyStyleRound(props: DailyStyleRoundProps) {
  const progress = useDailyProgress();
  if (!progress) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[var(--table-deep)]">
        <div className="type-display animate-pulse text-2xl font-extrabold uppercase tracking-[0.08em] text-[var(--chalk-text)]">Dealing today&apos;s puzzle</div>
      </div>
    );
  }
  return <LoadedStyleRound {...props} progress={progress} />;
}

function ResultView({ puzzle, attempt, title, onPractice, countdown, onHome }: { puzzle: StylePuzzleData; attempt: { result: Result | null }; title: string; onPractice: (() => void) | null; countdown: React.ReactNode; onHome: () => void }) {
  const line = [puzzle.targetA, ...puzzle.chain, puzzle.targetB];
  const images = usePortraits(line.map(p => p.name));
  return (
    <div className="min-h-dvh bg-[var(--table-deep)]">
      <StyleResult
        style={puzzle.style}
        result={attempt.result!}
        chain={line.map(p => ({ ...p, imageUrl: images[p.name] }))}
        heading={title}
        actionLabel="Back to home"
        onAction={onHome}
        extra={
          <div className="space-y-3">
            {onPractice && (
              <div className="flex justify-center">
                <button
                  onClick={onPractice}
                  className="type-display h-12 rounded-xl border-2 border-[var(--foil)] px-5 text-lg font-black uppercase tracking-[0.05em] text-[var(--chalk-text)] hover:bg-[rgba(232,185,49,0.12)]"
                >
                  Replay as practice
                </button>
              </div>
            )}
            {countdown}
          </div>
        }
      />
    </div>
  );
}

function LoadedStyleRound({ puzzle: incoming, todayNumber, nextSwitchAt, progress }: DailyStyleRoundProps & { progress: DailyProgress }) {
  const router = useRouter();
  // A refresh (the countdown's, at midnight) sends an equal puzzle as a new object; keep the first.
  const [puzzle] = useState(incoming);
  const { style, number: n } = puzzle;
  // Decided once when the page opens; saving progress must not switch what is on screen.
  const [view, setView] = useState<StyleOpening>(() => openStylePuzzle(progress, style, n, todayNumber));
  const kind: AttemptKind | null = view.kind === 'result' ? null : view.kind;

  const save = useCallback(
    (round: StyleRoundSave) => {
      if (kind) updateDailyProgress(p => saveStyleRound(p, style, n, kind, round, currentTime()));
    },
    [kind, style, n]
  );
  const finish = useCallback(
    (round: StyleRoundSave, result: Result) => {
      if (kind === 'scored') updateDailyProgress(p => finishStyleScored(p, style, n, round, result, currentTime()));
    },
    [kind, style, n]
  );

  const cardIds = useMemo(() => [...puzzle.chain, ...puzzle.decoys].map(p => p.id), [puzzle]);
  const practice = kind === 'practice';
  const title = `Daily #${n} · ${STYLE_NAME[style]}${practice ? ' · Practice' : ''}`;
  const goHome = () => router.push('/');
  const countdown = (
    <div className="text-center text-sm text-[var(--table-muted)]">
      <Countdown until={nextSwitchAt} />
      <span className="mx-2">·</span>
      <Link href="/archive" className="underline hover:text-[var(--chalk-text)]">
        Past puzzles
      </Link>
    </div>
  );

  if (view.kind === 'result') {
    const { attempt, canPractice } = view;
    return (
      <ResultView
        puzzle={puzzle}
        attempt={attempt}
        title={title}
        onHome={goHome}
        countdown={countdown}
        onPractice={canPractice ? () => setView(openStylePractice(progress, style, n)) : null}
      />
    );
  }

  const isToday = n === todayNumber;
  const label = <span>#{n} · {practice ? 'Practice' : isToday ? 'Today' : weekdayName(puzzle.date)}</span>;
  const shared = { puzzle, label, onSave: save, onFinish: finish, onHome: goHome, endHeading: title, endActionLabel: 'Back to home', onEndAction: goHome, endExtra: countdown };

  return style === 'easy' ? (
    <EasyRound {...shared} initial={normalizeEasyRound(view.save, puzzle.chain.length, cardIds)} />
  ) : (
    <MediumRound {...shared} initial={normalizeMediumRound(view.save, puzzle.chain.length)} />
  );
}
