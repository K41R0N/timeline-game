'use client';

import { HistoricalFigure } from '../../types/HistoricalFigure';
import { formatLifespan } from '../../utils/GameLogic';
import { LONG_BRIDGE_MIN_YEARS, type RevealResult } from '../../utils/overlap';

interface PlacementRevealProps {
  figure: HistoricalFigure;
  reveal: RevealResult;
  onDismiss: () => void;
}

/** How many overlaps to list before summarising the rest. */
const MAX_LISTED_OVERLAPS = 3;

const shared = (years: number) => (years === 0 ? 'less than a year' : years === 1 ? '1 year' : `${years} years`);

/** The moment a placement lands: when they lived, and who they overlapped or how far they missed. */
export function PlacementReveal({ figure, reveal, onDismiss }: PlacementRevealProps) {
  const listed = reveal.overlaps.slice(0, MAX_LISTED_OVERLAPS);
  const hidden = reveal.overlaps.length - listed.length;
  const anyBadge = reveal.longBridge || reveal.overlaps.some(o => o.clutch);

  return (
    <div className="fixed top-28 lg:top-4 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className={`timeline-card w-full max-w-md p-4 border-2 pointer-events-auto animate-fadeIn ${reveal.miss ? 'border-red-400' : 'border-green-400'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-foreground leading-tight">{figure.name}</div>
            <div className="text-base font-semibold text-[var(--interactive)]">{formatLifespan(figure)}</div>
          </div>
          <button onClick={onDismiss} aria-label="Dismiss" className="text-foreground-subtle hover:text-foreground text-xl leading-none px-1">
            ×
          </button>
        </div>

        {reveal.miss ? (
          <div className="mt-3 text-base font-semibold text-red-700">
            Missed {reveal.miss.nearest.name} by {reveal.miss.gapYears} {reveal.miss.gapYears === 1 ? 'year' : 'years'}
          </div>
        ) : (
          <ul className="mt-3 space-y-1">
            {listed.map(overlap => (
              <li key={overlap.other.id} className="flex flex-wrap items-center gap-2 text-base">
                <span className={overlap.extendsChain ? 'font-semibold text-green-700' : 'text-foreground-muted'}>
                  Shared {shared(overlap.sharedYears)} with {overlap.other.name}
                </span>
                {overlap.clutch && (
                  <span className="text-xs font-bold uppercase tracking-wide rounded px-2 py-0.5 bg-amber-100 text-amber-800">Clutch overlap</span>
                )}
              </li>
            ))}
            {hidden > 0 && <li className="text-sm text-foreground-subtle">and {hidden} more</li>}
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
          <div className="mt-2 text-xs text-foreground-subtle">
            Badges count if they stay on your final chain (clutch: 5 shared years or fewer; long bridge: {LONG_BRIDGE_MIN_YEARS}+ years).
          </div>
        )}
      </div>
    </div>
  );
}
