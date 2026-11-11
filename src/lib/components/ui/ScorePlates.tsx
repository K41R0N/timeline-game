'use client';

export type ScoreTone = 'under' | 'over' | 'even';

/** Strokes on white card stock beside par on gold foil; an under-par finish shows red, the golf convention. */
export function ScorePlates({ strokes, par, tone, large = false, className = '' }: { strokes: number; par: string | number; tone: ScoreTone; large?: boolean; className?: string }) {
  const number = `type-display font-black leading-none ${large ? 'text-[44px]' : 'text-[26px]'}`;
  const label = `font-bold uppercase tracking-[0.1em] ${large ? 'text-[11px]' : 'text-[9px]'}`;
  const plate = `flex flex-col-reverse items-center ${large ? 'min-w-[5.5rem] px-4 py-2' : 'min-w-[3.25rem] px-2.5 py-1'}`;
  return (
    <dl className={`flex shrink-0 overflow-hidden rounded-lg text-center shadow-[0_3px_0_rgba(0,0,0,0.35)] ${className}`}>
      <div className={`${plate} bg-[var(--card-stock)] text-[var(--card-ink)]`}>
        <dt className={label}>Strokes</dt>
        <dd className={`${number} ${tone === 'under' ? 'text-[var(--under-par)]' : tone === 'over' ? 'text-amber-700' : ''}`}>{strokes}</dd>
      </div>
      <div className={`${plate} bg-[var(--foil)] text-[var(--foil-ink)]`}>
        <dt className={label}>Par</dt>
        <dd className={number}>{par}</dd>
      </div>
    </dl>
  );
}
