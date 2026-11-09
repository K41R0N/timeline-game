'use client';

import type { ReactNode } from 'react';
import type { PuzzlePerson } from '../../data/dailySchedule';
import type { Difficulty } from '../../utils/GameLogic';
import { formatLifespan } from '../../utils/GameLogic';
import { eraOf } from '../../utils/board';
import { ERA_COLOR, Portrait } from './Portrait';

/** The style word in a round's header, coloured like its choice on the menu. */
export const STYLE_TEXT: Record<Difficulty, string> = {
  easy: 'text-[#7ee0a1]',
  medium: 'text-[#f5d06b]',
  hard: 'text-[#ff8f80]',
};

/** One number on card stock: Checks in Easy, misses in Medium. */
export function CountPlate({ label, value, large = false, className = '' }: { label: string; value: number; large?: boolean; className?: string }) {
  return (
    <dl
      className={`flex shrink-0 flex-col-reverse items-center rounded-lg bg-[var(--card-stock)] text-center text-[var(--card-ink)] shadow-[0_3px_0_rgba(0,0,0,0.35)] ${
        large ? 'min-w-[5.5rem] px-4 py-2' : 'min-w-[3.25rem] px-2.5 py-1'
      } ${className}`}
    >
      <dt className={`font-bold uppercase tracking-[0.1em] ${large ? 'text-[11px]' : 'text-[9px]'}`}>{label}</dt>
      <dd className={`type-display font-black leading-none ${large ? 'text-[44px]' : 'text-[26px]'}`}>{value}</dd>
    </dl>
  );
}

export type CardState = 'target' | 'placed' | 'locked' | 'revealed';

interface PersonCardProps {
  person: PuzzlePerson;
  imageUrl?: string;
  state: CardState;
  /** Just locked or revealed: the card turns over to show its years. */
  fresh?: boolean;
  selected?: boolean;
  onClick?: () => void;
  label: string;
  /** Replaces the name, as Medium's letter boxes do on an open blank. */
  children?: ReactNode;
}

/** A card on the line between the targets: portrait, name, and years once the person is known to be right. */
export function PersonCard({ person, imageUrl, state, fresh = false, selected = false, onClick, label, children }: PersonCardProps) {
  const showYears = state !== 'placed';
  const spine = state === 'target' ? 'linear-gradient(180deg, var(--foil-light), var(--foil) 40%, var(--foil-deep))' : state === 'placed' ? 'var(--card-muted)' : ERA_COLOR[eraOf(person.birthYear)];
  const body = (
    <>
      <span aria-hidden className="absolute inset-y-0 left-0 w-[5px]" style={{ background: spine }} />
      <Portrait figure={{ ...person, imageUrl }} size="md" />
      <span className="min-w-0 flex-1">
        <span className="type-display line-clamp-2 block text-[17px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] sm:text-[19px]">{person.name}</span>
        {showYears && <span className="type-display mt-1 block text-[15px] font-semibold leading-none text-[var(--card-muted)]">{formatLifespan(person)}</span>}
        {state === 'revealed' && <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--card-muted)]">Revealed</span>}
      </span>
    </>
  );
  const face = `card-front relative flex min-h-[60px] w-full items-center gap-3 overflow-hidden rounded-[10px] bg-[var(--card-stock)] py-2 pl-4 pr-3 text-left text-[var(--card-ink)] shadow-[0_4px_0_rgba(0,0,0,0.28),0_10px_18px_rgba(0,0,0,0.2)] [backface-visibility:hidden] ${
    state === 'target' ? 'ring-2 ring-[var(--foil)]' : ''
  } ${selected ? 'ring-4 ring-[var(--foil-light)]' : ''}`;

  return (
    <div className={`relative [transform-style:preserve-3d] ${fresh ? 'card-landing' : ''}`} style={{ perspective: 900 }}>
      {onClick ? (
        <button type="button" onClick={onClick} aria-label={label} className={`${face} transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]`}>
          {children ?? body}
        </button>
      ) : (
        <div role="group" aria-label={label} className={face}>
          {children ?? body}
        </div>
      )}
      {fresh && (
        <span aria-hidden className="card-back absolute inset-0 rounded-[10px] bg-[linear-gradient(135deg,var(--foil-light),var(--foil)_45%,var(--foil-deep))] [backface-visibility:hidden]" />
      )}
    </div>
  );
}

/** An open place on the line: a chalk bay that takes the selected card. */
export function EmptySlot({ index, active, onClick, children }: { index: number; active: boolean; onClick?: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={children ? undefined : `Slot ${index + 1}, empty${active ? ', place the selected card here' : ''}`}
      className={`flex min-h-[60px] w-full items-center justify-center rounded-[10px] border-2 border-dashed px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)] ${
        active ? 'border-[var(--chalk-text)] bg-[rgba(243,207,134,0.1)]' : 'border-[var(--chalk)]'
      }`}
    >
      {children ?? <span className="type-display text-lg font-extrabold text-[var(--chalk-text)]">{index + 1}</span>}
    </button>
  );
}

/** The column of cards from one target to the other, with a chalk line joining them. */
export function ChainLine({ children }: { children: ReactNode }) {
  return (
    <ol className="relative mx-auto flex w-full max-w-md flex-col gap-3 before:absolute before:inset-y-6 before:left-1/2 before:w-px before:bg-[var(--table-line)] before:content-['']">
      {children}
    </ol>
  );
}

interface ShellProps {
  label: ReactNode;
  style: Difficulty;
  plate: (large: boolean) => ReactNode;
  targetA: PuzzlePerson;
  targetB: PuzzlePerson;
  rule: string | null;
  onHome: () => void;
  onRestart?: () => void;
  dock: ReactNode;
  table: ReactNode;
  overlay?: ReactNode;
}

/** The Easy and Medium screen: header and hand in a left column on desktop, stacked around the table on phones. */
export function StyleShell({ label, style, plate, targetA, targetB, rule, onHome, onRestart, dock, table, overlay }: ShellProps) {
  return (
    <div className="flex h-dvh flex-col bg-[var(--table-deep)] text-[var(--table-ink)] lg:flex-row">
      <div className="contents lg:order-1 lg:flex lg:w-[400px] lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--table-line)]">
        <header className="order-1 shrink-0 px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6 lg:pt-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onHome}
              aria-label="Home"
              className="-ml-2 inline-flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[var(--table-muted)] transition-colors hover:text-[var(--table-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil)]"
            >
              <svg aria-hidden className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.5 4.5 7 10l5.5 5.5" />
              </svg>
              <span className="hidden lg:inline">Home</span>
            </button>
            <div className="type-display min-w-0 truncate text-[15px] font-bold uppercase tracking-[0.06em]">
              {label} · <span className={STYLE_TEXT[style]}>{style}</span>
            </div>
            {onRestart && (
              <button
                type="button"
                onClick={onRestart}
                className="type-display inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--table-line)] px-3 text-sm font-bold uppercase tracking-[0.06em] text-[var(--table-muted)] transition-colors hover:border-[var(--foil)] hover:text-[var(--chalk-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil)]"
              >
                New game
              </button>
            )}
            <div className="ml-auto lg:hidden">{plate(false)}</div>
          </div>
          <h1 className="type-display mt-2 text-[24px] font-extrabold uppercase leading-[1.02] tracking-[0.01em] [text-shadow:none] lg:mt-5 lg:text-[34px]">
            <span className="text-[var(--foil)]">{targetA.name}</span>
            <span className="font-bold text-[var(--table-muted)]"> to </span>
            <span className="text-[var(--foil)]">{targetB.name}</span>
          </h1>
          {rule && <p className="mt-1.5 text-[13px] leading-snug text-[var(--table-muted)] lg:mt-3 lg:text-sm">{rule}</p>}
          <div className="mt-6 hidden lg:block">{plate(true)}</div>
        </header>

        <div className="relative z-20 order-3 max-h-[45dvh] shrink-0 overflow-y-auto border-t border-[var(--table-line)] bg-[var(--table-deep)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:mt-auto lg:max-h-none lg:border-t-0 lg:pb-6">
          <div className="mx-auto max-w-2xl space-y-2.5 lg:max-w-none">{dock}</div>
        </div>
      </div>

      <main className="order-2 min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(120%_70%_at_50%_0%,var(--table-light)_0%,var(--table)_55%,var(--table-deep)_100%)] px-4 py-5 sm:px-6 lg:order-2 lg:py-10">
        {table}
      </main>
      {overlay}
    </div>
  );
}
