'use client';

import { useEffect, useState } from 'react';
import type { Difficulty } from '../../utils/GameLogic';
import { CLUTCH_MAX_SHARED_YEARS, LONG_BRIDGE_MIN_YEARS } from '../../utils/overlap';
import { STYLE_NAME, STYLE_ON_STOCK } from './styles';

/** One short step per style; only Hard is scored against par. */
const STEPS: { style: Difficulty; text: string }[] = [
  { style: 'easy', text: 'Put the name cards in order so each life overlaps the next, then Check. Fewer Checks is better.' },
  { style: 'medium', text: 'Name the hidden people; each box is a letter. A wrong name or a wild card is a miss.' },
  { style: 'hard', text: 'Name anyone alive alongside a card on the table, and link the gold cards in as few as you can. Par is the best chain the game knows.' },
];

/** The rules, one line per style, behind one quiet button. */
export function HowToPlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="type-display inline-flex h-11 items-center px-3 text-base font-bold uppercase tracking-[0.08em] text-[var(--table-muted)] transition-colors hover:text-[var(--chalk-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil)]"
      >
        How to play
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(4,20,24,0.6)] sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
            onClick={event => event.stopPropagation()}
            className="animate-sheetIn w-full max-w-md rounded-t-2xl bg-[var(--card-stock)] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-[var(--card-ink)] sm:rounded-2xl"
          >
            <h2 id="how-to-play-title" className="type-display text-3xl font-black uppercase [text-shadow:none]">
              How to play
            </h2>
            <p className="mt-2 text-[15px] leading-snug">Link the two gold cards through people whose lives overlapped.</p>
            <ul className="mt-4 space-y-3">
              {STEPS.map(step => (
                <li key={step.style} className="text-[15px] leading-snug">
                  <span className={`type-display text-lg font-black uppercase ${STYLE_ON_STOCK[step.style]}`}>{STYLE_NAME[step.style]}</span> {step.text}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-snug text-[var(--card-muted)]">
              Gold marks on a Hard result: Clutch for a link of {CLUTCH_MAX_SHARED_YEARS} shared years or fewer, Long bridge for someone who lived {LONG_BRIDGE_MIN_YEARS} years or more.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="type-display mt-6 h-12 w-full rounded-xl bg-[var(--table)] text-lg font-black uppercase tracking-[0.05em] text-[var(--chalk-text)]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
