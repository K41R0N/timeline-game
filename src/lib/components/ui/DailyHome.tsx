'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import type { Difficulty } from '../../utils/GameLogic';
import { useDailyProgress } from '../../hooks/useDailyProgress';
import { savedFreePlayBand } from '../../hooks/useGameState';
import { puzzleStatus } from '../../utils/dailyProgress';
import { describeResult } from '../../utils/GameLogic';
import { Countdown } from './Countdown';
import { DifficultyChoice } from './DifficultyChoice';
import { HowToPlay } from './HowToPlay';

export interface TodayCard {
  number: number;
  weekday: string;
  band: Difficulty;
  /** Today's two targets, earlier-born first. */
  targets: [string, string];
}

interface DailyHomeProps {
  /** Today's puzzle, or null when there is none (before launch, or the schedule ran out). */
  today: TodayCard | null;
  nextSwitchAt: number;
}

/** The band word on card stock, in a darker shade of the free-play choice's colour so it reads on white. */
const BAND_ON_STOCK: Record<Difficulty, string> = {
  easy: 'text-[#15803d]',
  medium: 'text-[#a16207]',
  hard: 'text-[#b91c1c]',
};

const noSubscribe = () => () => {};

const primaryButton =
  'type-display flex h-14 w-full items-center justify-center rounded-xl bg-[var(--foil)] text-2xl font-black uppercase tracking-[0.06em] text-[var(--foil-ink)] shadow-[0_4px_0_var(--foil-deep)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]';

/** The game menu: today's puzzle on a gold-edged card, free play by difficulty below it. */
export function DailyHome({ today, nextSwitchAt }: DailyHomeProps) {
  const progress = useDailyProgress();
  const savedBand = useSyncExternalStore(noSubscribe, savedFreePlayBand, () => '' as const);
  const status = today && progress ? puzzleStatus(progress, today.number, today.number) : null;
  const finished = status?.status === 'result' ? status.result : null;
  const result = finished && finished.par !== null ? describeResult(finished.strokes, finished.par) : null;
  const action = finished ? 'See result' : status?.status === 'resume' ? 'Continue' : 'Play';

  return (
    <main className="flex min-h-dvh w-full justify-center bg-[radial-gradient(120%_70%_at_50%_0%,var(--table-light)_0%,var(--table)_50%,var(--table-deep)_100%)] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-[var(--table-ink)]">
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="text-center">
          <h1 className="type-display text-[64px] font-black uppercase leading-[0.82] tracking-[0.01em] text-[var(--table-ink)] [text-shadow:none]">
            History <span className="text-[var(--foil)]">Links</span>
          </h1>
          <p className="mt-3 text-[15px] text-[var(--table-muted)]">Link famous lives that overlapped.</p>
        </header>

        {today ? (
          <section aria-label={`Daily puzzle number ${today.number}`} className="rounded-2xl bg-[var(--card-stock)] p-5 text-[var(--card-ink)] shadow-[0_6px_0_rgba(0,0,0,0.3),0_18px_36px_rgba(0,0,0,0.3)] ring-[3px] ring-[var(--foil)]">
            <div className="type-display flex items-baseline justify-between text-lg font-bold uppercase tracking-[0.05em]">
              <span>
                Daily #{today.number} <span className="text-[var(--card-muted)]">· {today.weekday}</span>
              </span>
              <span className={BAND_ON_STOCK[today.band]}>{today.band}</span>
            </div>
            <p className="type-display mt-3 text-[30px] font-black uppercase leading-[0.95]">
              {today.targets[0]}
              <span className="text-[22px] font-bold text-[var(--card-muted)]"> to </span>
              {today.targets[1]}
            </p>
            {finished && (
              <p className="type-display mt-3 text-xl font-bold uppercase text-[var(--card-muted)]">
                {finished.strokes} {finished.strokes === 1 ? 'stroke' : 'strokes'}
                {result && <span className={result.tone === 'under' ? 'text-[var(--under-par)]' : ''}> · {result.label}</span>}
              </p>
            )}
            <Link href={`/daily/${today.number}`} className={`${primaryButton} mt-5`}>
              {action}
            </Link>
            <p className="mt-3 text-center text-sm text-[var(--card-muted)]">
              <Countdown until={nextSwitchAt} />
            </p>
          </section>
        ) : (
          <section className="rounded-2xl bg-[var(--card-stock)] p-5 text-center text-[var(--card-ink)]">
            <p className="type-display text-2xl font-black uppercase">No daily puzzle today</p>
            <p className="mt-2 text-sm text-[var(--card-muted)]">
              <Countdown until={nextSwitchAt} />
            </p>
          </section>
        )}

        <section aria-labelledby="free-play" className="flex flex-col gap-3">
          <h2 id="free-play" className="type-display text-center text-lg font-bold uppercase tracking-[0.12em] text-[var(--chalk-text)] [text-shadow:none]">
            Free play
          </h2>
          {savedBand && (
            <Link
              href="/play"
              className="type-display flex h-12 items-center justify-center rounded-xl border-2 border-[var(--foil)] text-lg font-black uppercase tracking-[0.06em] text-[var(--chalk-text)] transition-colors hover:bg-[rgba(232,185,49,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]"
            >
              Continue {savedBand}
            </Link>
          )}
          <DifficultyChoice hrefFor={difficulty => `/play?d=${difficulty}`} />
        </section>

        <nav className="flex items-center justify-center gap-2">
          <Link
            href="/archive"
            className="type-display inline-flex h-11 items-center px-3 text-base font-bold uppercase tracking-[0.08em] text-[var(--table-muted)] transition-colors hover:text-[var(--chalk-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil)]"
          >
            Past puzzles
          </Link>
          <span aria-hidden className="text-[var(--table-line)]">|</span>
          <HowToPlay />
        </nav>
      </div>
    </main>
  );
}
