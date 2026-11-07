import type { Difficulty } from '../../utils/GameLogic';

const BAND_STYLES: Record<Difficulty, string> = {
  easy: 'border-green-400 bg-green-50 text-green-700',
  medium: 'border-yellow-400 bg-yellow-50 text-yellow-700',
  hard: 'border-red-400 bg-red-50 text-red-700',
};

/** A difficulty band as a small coloured label, matching the free-play picker. */
export function BandBadge({ band }: { band: Difficulty }) {
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs font-bold uppercase ${BAND_STYLES[band]}`}>{band}</span>;
}
