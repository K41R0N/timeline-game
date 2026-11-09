'use client';

import type { ReactNode } from 'react';
import type { PuzzlePerson } from '../../data/dailySchedule';
import type { SlotOutcome, StyleResult as Result } from '../../utils/dailyProgress';
import { CountPlate } from './ChainTable';
import { ChainHand } from './WinModal';

const SQUARE: Record<SlotOutcome, { className: string; text: string }> = {
  first: { className: 'bg-[var(--card-stock)]', text: 'right first time' },
  later: { className: 'border-2 border-[var(--chalk-text)] bg-[rgba(243,207,134,0.25)]', text: 'right after a miss' },
  revealed: { className: 'border-2 border-dashed border-[var(--table-muted)]', text: 'revealed' },
};

/** One square per slot, showing how it was solved. */
export function ResultSquares({ squares, className = '' }: { squares: SlotOutcome[]; className?: string }) {
  return (
    <ol aria-label="How each person was placed" className={`flex justify-center gap-1.5 ${className}`}>
      {squares.map((square, i) => (
        <li key={i} aria-label={`Person ${i + 1}: ${SQUARE[square].text}`} className={`h-7 w-7 rounded-md ${SQUARE[square].className}`} />
      ))}
    </ol>
  );
}

interface StyleResultProps {
  style: 'easy' | 'medium';
  result: Result;
  /** The chain, target to target, with portraits where known. */
  chain: (PuzzlePerson & { imageUrl?: string })[];
  heading: string;
  actionLabel: string;
  onAction: () => void;
  extra?: ReactNode;
}

/** The end of an Easy or Medium round: one word, the count, one square per slot, and the chain. */
export function StyleResult({ style, result, chain, heading, actionLabel, onAction, extra }: StyleResultProps) {
  const perfect = style === 'easy' ? result.score === 1 : result.score === 0;
  const label = style === 'easy' ? (result.score === 1 ? 'Check' : 'Checks') : result.score === 1 ? 'Miss' : 'Misses';

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(4,20,24,0.72)] animate-fadeIn sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className={`max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--table)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-center text-[var(--table-ink)] shadow-[0_-12px_40px_rgba(0,0,0,0.5)] sm:rounded-3xl ${
          perfect ? 'ring-[3px] ring-[var(--foil)]' : ''
        }`}
      >
        <p className="type-display text-base font-bold uppercase tracking-[0.12em] text-[var(--chalk-text)]">{heading}</p>
        <h2 id="result-title" className={`type-display mt-1 text-[68px] font-black uppercase leading-[0.9] [text-shadow:none] ${perfect ? 'text-[var(--foil)]' : ''}`}>
          {perfect ? 'Perfect' : 'Solved'}
        </h2>
        <CountPlate label={label} value={result.score} large className="mx-auto mt-4 inline-flex" />
        <ResultSquares squares={result.squares} className="mt-4" />

        {chain.length > 0 && (
          <div className="mt-6 text-left">
            <h3 className="type-display mb-2 text-sm font-bold uppercase tracking-[0.1em] text-[var(--table-muted)]">The chain</h3>
            <ChainHand label="The chain" people={chain} />
          </div>
        )}

        {extra && <div className="mt-5">{extra}</div>}

        <button
          type="button"
          onClick={onAction}
          className="type-display mt-5 h-14 w-full rounded-xl bg-[var(--foil)] text-2xl font-black uppercase tracking-[0.06em] text-[var(--foil-ink)] shadow-[0_4px_0_var(--foil-deep)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
