import { HistoricalFigure } from '../types/HistoricalFigure';
import { areContemporaries } from './ChainAnalyzer';

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

/** Years between two lives that never met. */
export function gapYears(a: Life, b: Life): number {
  return Math.max(a.birthYear, b.birthYear) - Math.min(a.deathYear, b.deathYear);
}

/** Both years known exactly; a living person's death year is a placeholder, so it never counts. */
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

/** Everyone on the board connected to either target through overlapping lives. */
function connectedToTargets(board: HistoricalFigure[], targets: HistoricalFigure[]): Set<string> {
  const reached = new Set(targets.map(t => t.id));
  const queue = [...targets];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const other of board) {
      if (!reached.has(other.id) && areContemporaries(current, other)) {
        reached.add(other.id);
        queue.push(other);
      }
    }
  }
  return reached;
}

/** What placing `figure` reveals against the board as it was just before the placement. */
export function revealPlacement(
  figure: HistoricalFigure,
  board: HistoricalFigure[],
  targetA: HistoricalFigure,
  targetB: HistoricalFigure
): RevealResult {
  const others = board.filter(other => other.id !== figure.id);
  const connected = connectedToTargets(others, [targetA, targetB]);

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
    const nearest = others.reduce((best, other) => (gapYears(figure, other) < gapYears(figure, best) ? other : best));
    miss = { nearest, gapYears: gapYears(figure, nearest) };
  }

  return { overlaps, miss, longBridge: isLongLife(figure) };
}
