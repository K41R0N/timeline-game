'use client';

import type { ReactNode } from 'react';
import { HistoricalFigure } from '../../types/HistoricalFigure';
import { describeResult, golfName, signedDifference } from '../../utils/GameLogic';
import { sharedYears } from '../../utils/overlap';
import type { StyleBadge } from '../../utils/style';
import { Portrait } from './Portrait';
import { ScorePlates } from './ScorePlates';

type ChainPerson = Pick<HistoricalFigure, 'id' | 'name' | 'birthYear' | 'deathYear' | 'birthApproximate' | 'deathApproximate' | 'isLiving'> & {
  imageUrl?: string;
};

interface WinModalProps {
  strokes: number;
  par: number | null;
  /** The player's final chain, target to target; empty when only the result was kept. */
  chain: HistoricalFigure[];
  badges: StyleBadge[];
  /** The game's par chain, target to target, or null when par is unknown. */
  parChain: ChainPerson[] | null;
  /** Hints taken, or null when this difficulty does not record them. */
  hintsUsed: number | null;
  onPlayAgain: () => void;
  /** The button's label: starting another round, or going home after a daily puzzle. */
  playAgainLabel?: string;
  /** A line above the result, such as the daily puzzle's number. */
  heading?: string;
  /** Shown above the button, such as the countdown to the next daily puzzle. */
  extra?: ReactNode;
}

/** A chain as a row of small cards, with the years each neighbouring pair shared between them. */
export function ChainHand({ label, people, badges = [] }: { label: string; people: ChainPerson[]; badges?: StyleBadge[] }) {
  const clutch = (a: ChainPerson, b: ChainPerson) => badges.some(badge => badge.kind === 'clutch' && badge.from.id === a.id && badge.to.id === b.id);
  const last = people.length - 1;
  return (
    <ol aria-label={label} className="-mx-5 flex items-center overflow-x-auto px-5 pb-2">
      {people.map((person, i) => {
        const shared = i > 0 ? sharedYears(people[i - 1], person) : null;
        return (
          <li key={person.id} className="flex shrink-0 items-center">
            {i > 0 && (
              <span className="flex w-11 flex-col items-center" aria-label={`shared ${shared ?? 0} years`}>
                <span className="type-display text-sm font-extrabold text-[var(--chalk-text)]">{shared === 0 ? '<1' : shared}y</span>
                <span aria-hidden className={`h-0.5 w-full ${clutch(people[i - 1], person) ? 'bg-[var(--foil)]' : 'bg-[var(--table-line)]'}`} />
                {clutch(people[i - 1], person) && <span className="type-display mt-0.5 text-[10px] font-extrabold uppercase text-[var(--foil)]">Clutch</span>}
              </span>
            )}
            <span
              className={`flex w-[88px] flex-col items-center gap-1.5 rounded-lg bg-[var(--card-stock)] px-1.5 pb-2 pt-2 text-center text-[var(--card-ink)] shadow-[0_3px_0_rgba(0,0,0,0.3)] ${
                i === 0 || i === last ? 'ring-2 ring-[var(--foil)]' : ''
              }`}
            >
              <Portrait figure={person} size="md" />
              <span className="type-display line-clamp-2 text-[13px] font-extrabold uppercase leading-[0.95]">{person.name}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The end of a round: the result in golf terms, your chain as a hand of cards, and par's hand one tap away. */
export function WinModal({ strokes, par, chain, badges, parChain, hintsUsed, onPlayAgain, playAgainLabel = 'Play Again', heading, extra }: WinModalProps) {
  const result = par !== null ? describeResult(strokes, par) : null;
  const underPar = result?.tone === 'under';
  const sameAsPar = parChain !== null && parChain.map(p => p.id).join('|') === chain.map(p => p.id).join('|');
  const named = result ? golfName(result.difference) : null;
  const headline = !result ? 'Linked' : result.tone === 'par' ? 'Par' : underPar ? `${named ?? 'Under par'}!` : (named ?? signedDifference(result.difference));
  const longBridges = badges.filter(badge => badge.kind === 'longBridge').length;
  const tone = underPar ? 'under' : result?.tone === 'over' ? 'over' : 'even';

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(4,20,24,0.72)] animate-fadeIn sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className={`max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--table)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-center text-[var(--table-ink)] shadow-[0_-12px_40px_rgba(0,0,0,0.5)] sm:rounded-3xl ${
          underPar ? 'ring-[3px] ring-[var(--foil)]' : ''
        }`}
      >
        {heading && <p className="type-display text-base font-bold uppercase tracking-[0.12em] text-[var(--chalk-text)]">{heading}</p>}
        <h2 id="result-title" className={`type-display mt-1 text-[68px] font-black uppercase leading-[0.9] [text-shadow:none] ${underPar ? 'text-[var(--foil)]' : 'text-[var(--table-ink)]'}`}>
          {headline}
        </h2>
        <ScorePlates strokes={strokes} par={par ?? '–'} tone={tone} large className="mx-auto mt-4 inline-flex" />
        {hintsUsed !== null && hintsUsed > 0 && (
          <p className="mt-2 text-sm text-[var(--table-muted)]">
            {hintsUsed} {hintsUsed === 1 ? 'wild card' : 'wild cards'}
          </p>
        )}

        <div className="mt-6 text-left">
          {chain.length > 0 ? (
            <>
              <h3 className="type-display mb-2 text-sm font-bold uppercase tracking-[0.1em] text-[var(--table-muted)]">
                {sameAsPar ? 'Your chain, same as par' : 'Your chain'}
              </h3>
              <ChainHand label="Your chain" people={chain} badges={badges} />
              {longBridges > 0 && (
                <p className="type-display mt-1 text-sm font-bold uppercase text-[var(--foil)]">
                  Long bridge{longBridges > 1 ? ` ×${longBridges}` : ''}
                </p>
              )}
              {parChain && !sameAsPar && (
                <details className="group mt-4">
                  <summary className="type-display inline-flex h-11 cursor-pointer list-none items-center text-sm font-bold uppercase tracking-[0.1em] text-[var(--chalk-text)] [&::-webkit-details-marker]:hidden">
                    Par&apos;s chain <span className="ml-1.5 transition-transform group-open:rotate-90">›</span>
                  </summary>
                  <ChainHand label="Par's chain" people={parChain} badges={[]} />
                </details>
              )}
            </>
          ) : (
            parChain && (
              <>
                <h3 className="type-display mb-2 text-sm font-bold uppercase tracking-[0.1em] text-[var(--table-muted)]">Par&apos;s chain</h3>
                <ChainHand label="Par's chain" people={parChain} badges={[]} />
              </>
            )
          )}
        </div>

        {extra && <div className="mt-5">{extra}</div>}

        <button
          type="button"
          onClick={onPlayAgain}
          className="type-display mt-5 h-14 w-full rounded-xl bg-[var(--foil)] text-2xl font-black uppercase tracking-[0.06em] text-[var(--foil-ink)] shadow-[0_4px_0_var(--foil-deep)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]"
        >
          {playAgainLabel}
        </button>
      </div>
    </div>
  );
}
