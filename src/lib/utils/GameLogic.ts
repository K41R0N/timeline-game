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

/**
 * Get a color class based on score (golf scoring - lower is better)
 */
export function getScoreColor(score: number): string {
  if (score <= 3) return 'text-green-600';
  if (score <= 6) return 'text-yellow-600';
  if (score <= 10) return 'text-orange-600';
  return 'text-red-600';
}
