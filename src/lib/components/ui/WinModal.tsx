'use client';

import { HistoricalFigure } from '../../types/HistoricalFigure';
import { describeResult, formatLifespan, golfName, signedDifference } from '../../utils/GameLogic';
import { describeShared } from '../../utils/overlap';
import type { StyleBadge } from '../../utils/style';

type ChainPerson = Pick<HistoricalFigure, 'id' | 'name' | 'birthYear' | 'deathYear' | 'birthApproximate' | 'deathApproximate' | 'isLiving'>;

interface WinModalProps {
  strokes: number;
  par: number | null;
  /** The player's final chain, target to target. */
  chain: HistoricalFigure[];
  badges: StyleBadge[];
  /** The game's par chain, target to target, or null when par is unknown. */
  parChain: ChainPerson[] | null;
  /** Hints taken, or null when this difficulty does not record them. */
  hintsUsed: number | null;
  onPlayAgain: () => void;
}

function ChainList({ title, people, badges }: { title: string; people: ChainPerson[]; badges: StyleBadge[] }) {
  const clutch = (a: ChainPerson, b: ChainPerson) =>
    badges.some(badge => badge.kind === 'clutch' && badge.from.id === a.id && badge.to.id === b.id);
  const longBridge = (p: ChainPerson) => badges.some(badge => badge.kind === 'longBridge' && badge.person.id === p.id);

  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted mb-2">{title}</h3>
      <ol className="space-y-1">
        {people.map((person, i) => (
          <li key={person.id}>
            {i > 0 && (
              <div className="flex items-center gap-2 pl-3 py-0.5 text-xs text-foreground-subtle">
                <span>↓ shared {describeShared(people[i - 1], person)}</span>
                {clutch(people[i - 1], person) && (
                  <span className="font-bold uppercase rounded px-1.5 bg-amber-100 text-amber-800">Clutch overlap</span>
                )}
              </div>
            )}
            <div className={`rounded-lg p-2 ${i === 0 || i === people.length - 1 ? 'bg-primary-glow' : 'bg-background-alt'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{person.name}</span>
                {longBridge(person) && (
                  <span className="text-[10px] font-bold uppercase rounded px-1.5 bg-amber-100 text-amber-800">Long bridge</span>
                )}
              </div>
              <div className="text-xs text-foreground-muted">{formatLifespan(person)}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function WinModal({ strokes, par, chain, badges, parChain, hintsUsed, onPlayAgain }: WinModalProps) {
  const result = par !== null ? describeResult(strokes, par) : null;
  const underPar = result?.tone === 'under';
  const sameAsPar = parChain !== null && parChain.map(p => p.id).join('|') === chain.map(p => p.id).join('|');

  const headline = underPar ? `${golfName(result.difference) ?? 'Under par'}!` : result?.tone === 'par' ? 'Par' : 'Connected';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className={`timeline-card p-6 sm:p-8 max-w-3xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto ${underPar ? 'border-4 border-amber-400' : ''}`}>
        <div className="text-center mb-6">
          {underPar && <div className="text-5xl mb-2 animate-bounce">🏆</div>}
          <h2 className={`font-bold mb-1 capitalize ${underPar ? 'text-5xl text-amber-600' : 'text-4xl text-primary'}`}>{headline}</h2>
          {underPar && <p className="text-foreground-muted">You beat the game&apos;s best chain.</p>}
        </div>

        <div className="bg-background-alt rounded-lg p-4 mb-6 flex flex-wrap justify-center gap-6 text-center">
          <div>
            <div className="text-4xl font-bold text-foreground">{strokes}</div>
            <div className="text-xs uppercase text-foreground-muted">Strokes</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary">{par ?? '…'}</div>
            <div className="text-xs uppercase text-foreground-muted">Par</div>
          </div>
          {result && (
            <div>
              <div className={`text-4xl font-bold ${underPar ? 'text-amber-600' : result.tone === 'par' ? 'text-green-600' : 'text-foreground-muted'}`}>
                {result.tone === 'par' ? 'Par' : signedDifference(result.difference)}
              </div>
              <div className="text-xs uppercase text-foreground-muted">Result</div>
            </div>
          )}
          {hintsUsed !== null && (
            <div>
              <div className="text-4xl font-bold text-foreground">{hintsUsed}</div>
              <div className="text-xs uppercase text-foreground-muted">{hintsUsed === 1 ? 'Hint' : 'Hints'}</div>
            </div>
          )}
        </div>

        {sameAsPar || parChain === null ? (
          <ChainList title={sameAsPar ? 'Your chain matched par' : 'Your chain'} people={chain} badges={badges} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <ChainList title="Your chain" people={chain} badges={badges} />
            <ChainList title={`Par chain (${parChain.length - 2})`} people={parChain} badges={[]} />
          </div>
        )}

        <div className="flex justify-center mt-6">
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 bg-primary hover:bg-primary-bright text-white font-semibold rounded-lg transition-all hover:shadow-glow"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
