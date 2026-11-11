'use client';

import { useEffect, useRef } from 'react';
import { HistoricalFigure } from '../../types/HistoricalFigure';
import { formatSharedYears } from '../../utils/GameLogic';
import { type RevealResult } from '../../utils/overlap';

interface PlacementRevealProps {
  figure: HistoricalFigure;
  reveal: RevealResult;
  /** This placement completed the chain; dismissing it opens the end screen. */
  won?: boolean;
  onDismiss: () => void;
}

/** How long a placement's line stays before it clears itself; the card on the table keeps the details. */
const SHOW_MS = 4500;

/**
 * The line under a card that just landed: who it shared the most useful years with, or how far it missed.
 * Its name and years are already on the card, so they are not repeated here.
 */
export function PlacementReveal({ figure, reveal, won = false, onDismiss }: PlacementRevealProps) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (won) return;
    const timer = setTimeout(() => dismissRef.current(), SHOW_MS);
    return () => clearTimeout(timer);
  }, [won]);

  const best = reveal.overlaps[0];
  const badges = [best?.clutch && 'Clutch', reveal.longBridge && 'Long bridge'].filter(Boolean) as string[];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl bg-[var(--card-stock)] text-[var(--card-ink)] shadow-[0_-6px_24px_rgba(0,0,0,0.35)] animate-fadeIn ring-2 ${reveal.miss ? 'ring-red-400' : 'ring-[var(--foil)]'}`}
    >
      <div className="flex min-h-12 items-center gap-2 py-1 pl-4 pr-1">
        <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
          <span className="sr-only">{figure.name}: </span>
          {reveal.miss ? (
            <span className="text-red-700">
              Missed {reveal.miss.nearest.name} by {formatSharedYears(reveal.miss.gapYears)}
            </span>
          ) : won ? (
            'Chain complete'
          ) : best ? (
            <>
              {formatSharedYears(best.sharedYears)} with {best.other.name}
            </>
          ) : null}
        </p>
        {badges.map(badge => (
          <span key={badge} className="type-display shrink-0 rounded bg-[var(--foil)] px-1.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.05em] text-[var(--foil-ink)]">
            {badge}
          </span>
        ))}
        {!won && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--card-muted)] hover:bg-[#efece3] hover:text-[var(--card-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil)]"
          >
            <svg aria-hidden className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        )}
      </div>
      {won && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onDismiss}
            className="type-display h-12 w-full rounded-xl bg-[var(--foil)] px-4 text-lg font-black uppercase tracking-[0.05em] text-[var(--foil-ink)] shadow-[0_3px_0_var(--foil-deep)] transition-transform hover:-translate-y-px"
          >
            See your result
          </button>
        </div>
      )}
    </div>
  );
}
