'use client';

import Link from 'next/link';
import { DIFFICULTY_BANDS } from '../../utils/difficulty';
import type { Difficulty } from '../../utils/GameLogic';

const CHOICES: { difficulty: Difficulty; backs: number; accent: string }[] = [
  { difficulty: 'easy', backs: 1, accent: '#7ee0a1' },
  { difficulty: 'medium', backs: 2, accent: '#f5d06b' },
  { difficulty: 'hard', backs: 3, accent: '#ff8f80' },
];

/** A small fan of card backs: one for Easy, two for Medium, three for Hard. */
function Backs({ count, accent }: { count: number; accent: string }) {
  return (
    <span aria-hidden className="relative block h-9 w-12">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute bottom-0 left-1/2 h-8 w-6 rounded-[4px] border-2 border-[var(--card-stock)]"
          style={{ background: accent, transform: `translateX(-50%) rotate(${(i - (count - 1) / 2) * 14}deg)`, transformOrigin: '50% 120%' }}
        />
      ))}
    </span>
  );
}

const choiceClass =
  'group flex flex-1 flex-col items-center gap-2 rounded-xl bg-[var(--card-stock)] px-2 pb-3 pt-4 text-[var(--card-ink)] shadow-[0_4px_0_rgba(0,0,0,0.3)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]';

/** Easy, Medium or Hard, each as a card: as links on the menu, as buttons where the game starts in place. */
export function DifficultyChoice({ hrefFor, onPick }: { hrefFor?: (difficulty: Difficulty) => string; onPick?: (difficulty: Difficulty) => void }) {
  return (
    <div className="flex gap-3">
      {CHOICES.map(({ difficulty, backs, accent }) => {
        const band = DIFFICULTY_BANDS[difficulty];
        const body = (
          <>
            <Backs count={backs} accent={accent} />
            <span className="type-display text-xl font-black uppercase tracking-[0.04em]">{difficulty}</span>
            <span className="type-display text-sm font-semibold uppercase text-[var(--card-muted)]">
              Par {band.minPar}–{band.maxPar}
            </span>
          </>
        );
        return hrefFor ? (
          <Link key={difficulty} href={hrefFor(difficulty)} className={choiceClass}>
            {body}
          </Link>
        ) : (
          <button key={difficulty} type="button" onClick={() => onPick?.(difficulty)} className={choiceClass}>
            {body}
          </button>
        );
      })}
    </div>
  );
}
