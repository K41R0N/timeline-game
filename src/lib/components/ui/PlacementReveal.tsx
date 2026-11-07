'use client';

import { useState } from 'react';
import { HistoricalFigure } from '../../types/HistoricalFigure';
import { formatLifespan } from '../../utils/GameLogic';
import { LONG_BRIDGE_MIN_YEARS, describeShared, type RevealResult } from '../../utils/overlap';

interface PlacementRevealProps {
  figure: HistoricalFigure;
  reveal: RevealResult;
  /** This placement completed the chain; dismissing the card opens the end screen. */
  won?: boolean;
  onDismiss: () => void;
}

const MAX_LISTED_OVERLAPS = 3;

/** The moment a placement lands: when they lived, and who they overlapped or how far they missed. */
export function PlacementReveal({ figure, reveal, won = false, onDismiss }: PlacementRevealProps) {
  const [showAll, setShowAll] = useState(false);
  const listed = showAll ? reveal.overlaps : reveal.overlaps.slice(0, MAX_LISTED_OVERLAPS);
  const hidden = reveal.overlaps.length - listed.length;
  const anyBadge = reveal.longBridge || reveal.overlaps.some(o => o.clutch);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`max-h-[40dvh] overflow-y-auto rounded-xl border-l-0 bg-[var(--card-stock)] p-3.5 text-[var(--card-ink)] shadow-[0_-6px_24px_rgba(0,0,0,0.35)] animate-fadeIn ring-2 ${reveal.miss ? 'ring-red-400' : 'ring-[var(--foil)]'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="type-display text-[17px] font-extrabold uppercase leading-none tracking-[0.02em]">
            {figure.name} <span className="font-semibold text-[var(--card-muted)]">{formatLifespan(figure)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-2 -mt-2.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--card-muted)] hover:bg-[#efece3] hover:text-[var(--card-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil)]"
        >
          <svg aria-hidden className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M5 5l10 10M15 5 5 15" />
          </svg>
        </button>
      </div>

      {reveal.miss ? (
        <div className="mt-1.5 text-base font-semibold text-red-700">
          Missed {reveal.miss.nearest.name} by {reveal.miss.gapYears} {reveal.miss.gapYears === 1 ? 'year' : 'years'}
        </div>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {listed.map(overlap => (
            <li key={overlap.other.id} className="flex flex-wrap items-center gap-2 text-base">
              <span className={overlap.extendsChain ? 'font-semibold text-[var(--card-ink)]' : 'text-[var(--card-muted)]'}>
                Shared {describeShared(figure, overlap.other)} with {overlap.other.name}
              </span>
              {overlap.clutch && (
                <span className="text-xs font-bold uppercase tracking-wide rounded px-2 py-0.5 bg-amber-100 text-amber-800">Clutch overlap</span>
              )}
            </li>
          ))}
          {hidden > 0 && (
            <li>
              <button onClick={() => setShowAll(true)} className="text-sm text-[var(--card-muted)] underline hover:text-[var(--card-ink)]">
                and {hidden} more
              </button>
            </li>
          )}
        </ul>
      )}

      {reveal.longBridge && (
        <div className="mt-2">
          <span className="text-xs font-bold uppercase tracking-wide rounded px-2 py-0.5 bg-amber-100 text-amber-800">
            Long bridge: lived {figure.deathYear - figure.birthYear} years
          </span>
        </div>
      )}

      {anyBadge && (
        <div className="mt-2 text-xs text-[var(--card-muted)]">
          Badges count if they stay on your final chain (clutch: 5 shared years or fewer; long bridge: {LONG_BRIDGE_MIN_YEARS}+ years).
        </div>
      )}

      {won && (
        <button
          onClick={onDismiss}
          className="type-display mt-3 h-12 w-full rounded-xl bg-[var(--foil)] px-4 text-lg font-black uppercase tracking-[0.05em] text-[var(--foil-ink)] shadow-[0_3px_0_var(--foil-deep)] transition-transform hover:-translate-y-px"
        >
          Chain complete: see your result
        </button>
      )}
    </div>
  );
}
