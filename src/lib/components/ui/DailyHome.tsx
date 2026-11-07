'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import type { Difficulty } from '../../utils/GameLogic';
import { useDailyProgress } from '../../hooks/useDailyProgress';
import { hasSavedFreePlay } from '../../hooks/useGameState';
import { puzzleStatus } from '../../utils/dailyProgress';
import { describeResult } from '../../utils/GameLogic';
import { BandBadge } from './BandBadge';
import { Countdown } from './Countdown';

export interface TodayCard {
  number: number;
  weekday: string;
  band: Difficulty;
}

interface DailyHomeProps {
  /** Today's puzzle, or null when there is none (before launch, or the schedule ran out). */
  today: TodayCard | null;
  nextSwitchAt: number;
}

const noSubscribe = () => () => {};

/** The front door: today's puzzle first, free play second. */
export function DailyHome({ today, nextSwitchAt }: DailyHomeProps) {
  const progress = useDailyProgress();
  const freePlaySaved = useSyncExternalStore(noSubscribe, hasSavedFreePlay, () => false);
  const status = today && progress ? puzzleStatus(progress, today.number, today.number) : null;

  const action =
    status?.status === 'result' ? 'See your result' : status?.status === 'resume' ? 'Resume today\'s puzzle' : 'Play today\'s puzzle';
  const result = status?.status === 'result' && status.result.par !== null ? describeResult(status.result.strokes, status.result.par) : null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4 py-10 animate-fadeIn">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl sm:text-7xl font-bold text-primary mb-3 tracking-tight">History Links</h1>
        <p className="text-lg sm:text-2xl text-foreground-muted mb-8">Connect historical figures through time</p>

        {today ? (
          <div className="timeline-card p-6 mb-6 space-y-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Today&apos;s puzzle</div>
              <div className="text-3xl font-bold text-foreground">
                #{today.number} · {today.weekday}
              </div>
              <div className="mt-2">
                <BandBadge band={today.band} />
              </div>
            </div>

            {status?.status === 'result' && (
              <div className="text-sm text-foreground-muted">
                You: {status.result.strokes} {status.result.strokes === 1 ? 'stroke' : 'strokes'}
                {status.result.par !== null && ` · par ${status.result.par}`}
                {result && ` · ${result.label}`}
              </div>
            )}

            <Link
              href={`/daily/${today.number}`}
              className="block w-full px-6 py-3 rounded-lg text-lg font-bold bg-primary hover:bg-primary-bright text-white shadow-lg hover:shadow-glow transition-all"
            >
              {action}
            </Link>

            <div className="text-sm text-foreground-muted">
              <Countdown until={nextSwitchAt} />
            </div>
          </div>
        ) : (
          <div className="timeline-card p-6 mb-6 space-y-2">
            <div className="text-lg font-semibold text-foreground">No daily puzzle today</div>
            <div className="text-sm text-foreground-muted">
              <Countdown until={nextSwitchAt} />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/play" className="px-5 py-2.5 rounded-lg border-2 border-primary text-primary font-semibold hover:bg-primary-glow transition-colors">
            {freePlaySaved ? 'Resume free play' : 'Free play'}
          </Link>
          <Link href="/archive" className="px-5 py-2.5 rounded-lg border-2 border-primary-bright-20 text-foreground-muted font-semibold hover:text-foreground transition-colors">
            Past puzzles
          </Link>
        </div>
      </div>
    </div>
  );
}
