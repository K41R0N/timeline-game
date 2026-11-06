import { HistoricalFigure } from '../types/HistoricalFigure';
import { livesConnectedTo } from './ChainAnalyzer';
import { calculateYearGap, formatSharedYears, formatYear, formatYearRange } from './GameLogic';

type Life = Pick<HistoricalFigure, 'birthYear' | 'deathYear' | 'birthApproximate' | 'deathApproximate' | 'isLiving'>;

/** A chain link whose two lives share this many years or fewer earns the clutch overlap badge. */
export const CLUTCH_MAX_SHARED_YEARS = 5;
/** A placed person on the chain who lived this many years or more earns the long bridge badge. */
export const LONG_BRIDGE_MIN_YEARS = 90;

/** Years two lives share (0 = part of one calendar year), or null when they never met. */
export function sharedYears(a: Life, b: Life): number | null {
  const shared = Math.min(a.deathYear, b.deathYear) - Math.max(a.birthYear, b.birthYear);
  return shared >= 0 ? shared : null;
}

/** How long and when two lives overlapped, as the reveal and end screen say it, or null when they never met. */
export function describeShared(a: Life, b: Life): string | null {
  const years = sharedYears(a, b);
  if (years === null) return null;
  const from = Math.max(a.birthYear, b.birthYear);
  const to = Math.min(a.deathYear, b.deathYear);
  return `${formatSharedYears(years)} (${years === 0 ? formatYear(from) : formatYearRange(from, to)})`;
}

function hasExactYears(life: Life): boolean {
  return !life.birthApproximate && !life.deathApproximate && !life.isLiving;
}

export function isClutchLink(a: Life, b: Life): boolean {
  const shared = sharedYears(a, b);
  return shared !== null && shared <= CLUTCH_MAX_SHARED_YEARS && hasExactYears(a) && hasExactYears(b);
}

export function isLongLife(life: Life): boolean {
  return hasExactYears(life) && life.deathYear - life.birthYear >= LONG_BRIDGE_MIN_YEARS;
}

export interface RevealedOverlap {
  other: HistoricalFigure;
  sharedYears: number;
  /** The other person is already connected to a target, so this link extends or completes the chain. */
  extendsChain: boolean;
  clutch: boolean;
}

export interface RevealResult {
  overlaps: RevealedOverlap[];
  miss: { nearest: HistoricalFigure; gapYears: number } | null;
  /** Provisional: the badge is only earned if this person ends up on the final chain. */
  longBridge: boolean;
}

/** What placing `figure` reveals against the board as it was just before the placement. */
export function revealPlacement(
  figure: HistoricalFigure,
  board: HistoricalFigure[],
  targetA: HistoricalFigure,
  targetB: HistoricalFigure
): RevealResult {
  const others = board.filter(other => other.id !== figure.id);
  const connected = livesConnectedTo(others, [targetA, targetB]);

  const overlaps = others
    .map(other => ({ other, shared: sharedYears(figure, other) }))
    .filter((entry): entry is { other: HistoricalFigure; shared: number } => entry.shared !== null)
    .map(({ other, shared }) => ({
      other,
      sharedYears: shared,
      extendsChain: connected.has(other.id),
      clutch: isClutchLink(figure, other),
    }))
    .sort((a, b) => Number(b.extendsChain) - Number(a.extendsChain));

  let miss: RevealResult['miss'] = null;
  if (overlaps.length === 0 && others.length > 0) {
    const nearest = others.reduce((best, other) => (calculateYearGap(figure, other) < calculateYearGap(figure, best) ? other : best));
    miss = { nearest, gapYears: calculateYearGap(figure, nearest) };
  }

  return { overlaps, miss, longBridge: isLongLife(figure) };
}
