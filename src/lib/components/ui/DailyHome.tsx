'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import type { Difficulty } from '../../utils/GameLogic';
import { useDailyProgress } from '../../hooks/useDailyProgress';
import { hasFreePlayRound } from '../../hooks/useGameState';
import { Countdown } from './Countdown';
import { DifficultyChoice } from './DifficultyChoice';
import { HowToPlay } from './HowToPlay';
import { dailyStatusLine } from './dailyStatus';
import { STYLE_HOW, STYLE_ON_STOCK } from './styles';

export interface TodayCard {
  number: number;
  weekday: string;
}

interface DailyHomeProps {
  /** Today's puzzles, or null when there are none (before launch, or the schedule ran out). */
  today: TodayCard | null;
  nextSwitchAt: number;
}

const STYLES: { style: Difficulty; path: string }[] = [
  { style: 'easy', path: '/easy' },
  { style: 'medium', path: '/medium' },
  { style: 'hard', path: '' },
];

const noSubscribe = () => () => {};

/** The game menu: today's three daily puzzles on a gold-edged card, free play by style below it. */
export function DailyHome({ today, nextSwitchAt }: DailyHomeProps) {
  const progress = useDailyProgress();
  const canContinue = useSyncExternalStore(noSubscribe, hasFreePlayRound, () => false);
  const lines = today && progress ? STYLES.map(({ style }) => dailyStatusLine(progress, style, today.number, today.number)) : null;
  const next = lines ? lines.findIndex(line => line.status !== 'result') : 0;

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
            <h2 className="type-display text-lg font-bold uppercase tracking-[0.05em] [text-shadow:none]">
              Daily #{today.number} <span className="text-[var(--card-muted)]">· {today.weekday}</span>
            </h2>
            <ul className="mt-3 divide-y divide-[rgba(15,30,34,0.12)]">
              {STYLES.map(({ style, path }, i) => {
                const line = lines?.[i];
                const done = line?.status === 'result';
                return (
                  <li key={style}>
                    <Link
                      href={`/daily/${today.number}${path}`}
                      className="flex min-h-16 items-center gap-3 py-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`type-display block text-2xl font-black uppercase leading-none ${STYLE_ON_STOCK[style]}`}>{style}</span>
                        <span className="mt-1 block text-sm text-[var(--card-muted)]">{STYLE_HOW[style]}</span>
                      </span>
                      {done ? (
                        <span className="type-display text-xl font-bold uppercase text-[var(--card-ink)]">{line.text}</span>
                      ) : (
                        <span
                          className={`type-display inline-flex h-11 min-w-[7rem] items-center justify-center rounded-xl px-4 text-lg font-black uppercase tracking-[0.06em] ${
                            i === next ? 'bg-[var(--foil)] text-[var(--foil-ink)] shadow-[0_3px_0_var(--foil-deep)]' : 'border-2 border-[var(--card-ink)] text-[var(--card-ink)]'
                          }`}
                        >
                          {line?.text ?? 'Play'}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
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
          {canContinue && (
            <Link
              href="/play"
              className="type-display flex h-12 items-center justify-center rounded-xl border-2 border-[var(--foil)] text-lg font-black uppercase tracking-[0.06em] text-[var(--chalk-text)] transition-colors hover:bg-[rgba(232,185,49,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]"
            >
              Continue Hard
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
