import { HistoricalFigure } from '../types/HistoricalFigure';
import { areContemporaries } from './ChainAnalyzer';

/**
 * Check if a new figure connects to at least one figure in the existing chain
 */
export function isConnectedToChain(
  newFigure: HistoricalFigure,
  chainFigures: HistoricalFigure[]
): boolean {
  return chainFigures.some(figure => areContemporaries(newFigure, figure));
}

/**
 * Calculate the gap (in years) between two figures
 * Positive means fig2 comes after fig1, negative means before
 */
export function calculateYearGap(fig1: HistoricalFigure, fig2: HistoricalFigure): number {
  // Use death year of earlier figure and birth year of later figure
  if (fig1.deathYear < fig2.birthYear) {
    return fig2.birthYear - fig1.deathYear;
  } else if (fig2.deathYear < fig1.birthYear) {
    return fig1.birthYear - fig2.deathYear;
  }
  // Contemporaries (overlap)
  return 0;
}

/**
 * Format a year for display with BCE/CE notation
 */
export function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year} CE`;
}

/**
 * Format a figure's lifespan, marking approximate dates ("c.") and living people.
 */
export function formatLifespan(
  figure: Pick<HistoricalFigure, 'birthYear' | 'deathYear' | 'birthApproximate' | 'deathApproximate' | 'isLiving'>
): string {
  const birth = `${figure.birthApproximate ? 'c. ' : ''}${formatYear(figure.birthYear)}`;
  if (figure.isLiving) return `born ${birth}`;
  const death = `${figure.deathApproximate ? 'c. ' : ''}${formatYear(figure.deathYear)}`;
  return `${birth} – ${death}`;
}

/**
 * Format a year range for display
 */
export function formatYearRange(birthYear: number, deathYear: number): string {
  return `${formatYear(birthYear)} – ${formatYear(deathYear)}`;
}

/**
 * Calculate the difficulty of connecting two figures based on their time gap
 */
export function calculateDifficulty(fig1: HistoricalFigure, fig2: HistoricalFigure): 'easy' | 'medium' | 'hard' {
  const gap = Math.abs(fig2.birthYear - fig1.birthYear);

  if (gap < 500) return 'easy';
  if (gap < 1000) return 'medium';
  return 'hard';
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface HintPolicy {
  /** Whether hints taken appear on the end screen. */
  recorded: boolean;
  /** Whether each hint adds a stroke. */
  costsStroke: boolean;
  /** Short cost label for the hint control. */
  label: string;
}

const HINT_POLICIES: Record<Difficulty, HintPolicy> = {
  easy: { recorded: false, costsStroke: false, label: 'free' },
  medium: { recorded: true, costsStroke: false, label: 'free, counted' },
  hard: { recorded: true, costsStroke: true, label: '+1 stroke' },
};

export function hintPolicy(difficulty: Difficulty): HintPolicy {
  return HINT_POLICIES[difficulty];
}

/** Every person placed on the board is a stroke (the two targets are not); hints add one each on Hard. */
export function countStrokes(figures: HistoricalFigure[], hintsUsed: number, difficulty: Difficulty): number {
  const placed = Math.max(0, figures.length - 2);
  return placed + (hintPolicy(difficulty).costsStroke ? hintsUsed : 0);
}

export interface RoundResult {
  /** Strokes minus par: negative is under par. */
  difference: number;
  label: string;
  tone: 'under' | 'par' | 'over';
}

const GOLF_NAMES: Record<number, string> = { [-2]: 'eagle', [-1]: 'birdie', 1: 'bogey' };

export function golfName(difference: number): string | null {
  return GOLF_NAMES[difference] ?? null;
}

export function signedDifference(difference: number): string {
  return difference < 0 ? `−${-difference}` : `+${difference}`;
}

/** Strokes relative to par, in golf terms. */
export function describeResult(strokes: number, par: number): RoundResult {
  const difference = strokes - par;
  if (difference === 0) return { difference, label: 'Par', tone: 'par' };
  const signed = signedDifference(difference);
  const name = golfName(difference);
  return { difference, label: name ? `${signed}, ${name}` : signed, tone: difference < 0 ? 'under' : 'over' };
}

export function formatSharedYears(years: number): string {
  return years === 0 ? 'less than a year' : years === 1 ? '1 year' : `${years} years`;
}
