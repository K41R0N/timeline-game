import type { RosterPerson } from '../data/roster';
import { HistoricalFigure } from '../types/HistoricalFigure';
import type { StyleResult } from './dailyProgress';
import { chainShape } from './difficulty';
import type { Difficulty } from './GameLogic';
import type { StyleBadge } from './style';

/** Which kind of round an event comes from: the style, free play or a daily puzzle, scored or practice. */
export interface RoundContext {
  mode: 'free' | 'daily';
  /** The daily puzzle's number; null in free play. */
  puzzle: number | null;
  /** Whether a daily round is the scored attempt; null in free play. */
  scored: boolean | null;
  /** Easy, Medium or Hard: how the round is played. */
  style: Difficulty;
  /** Hard only: how far apart the pair is, the band that chose it; null for Easy and Medium. */
  band: Difficulty | null;
}

export function freePlay(style: Difficulty, band: Difficulty | null = null): RoundContext {
  return { mode: 'free', puzzle: null, scored: null, style, band };
}

type Target = Pick<HistoricalFigure, 'name' | 'birthYear' | 'deathYear'>;

/** Properties for a Hard round's `game_started`: what kind of round this is, for tuning the bands. */
export function roundStartedProps(roster: RosterPerson[], targetA: HistoricalFigure, targetB: HistoricalFigure, context: RoundContext) {
  const [earlier, later] = [targetA, targetB].sort((a, b) => a.birthYear - b.birthYear);
  const shape = chainShape(roster, earlier, later);
  const gapMidpoint = (earlier.deathYear + later.birthYear) / 2;
  return {
    par: shape?.par ?? null,
    narrowest_step: shape ? Math.min(...shape.optionsPerStep) : null,
    years_apart: later.birthYear - earlier.deathYear,
    gap_century: Math.floor(gapMidpoint / 100) * 100,
    target_a: earlier.name,
    target_b: later.name,
    ...context,
  };
}

export interface RoundSummary {
  strokes: number;
  par: number | null;
  hintsUsed: number;
  badgeKinds: Array<StyleBadge['kind']>;
  startedAt: number;
  now: number;
  context: RoundContext;
}

/** Properties for a Hard round's `game_completed` and `game_abandoned`. */
export function roundCompletedProps({ strokes, par, hintsUsed, badgeKinds, startedAt, now, context }: RoundSummary) {
  return {
    strokes,
    par,
    result: par === null ? null : strokes - par,
    hints: hintsUsed,
    clutch_badges: badgeKinds.filter(kind => kind === 'clutch').length,
    long_bridge_badges: badgeKinds.filter(kind => kind === 'longBridge').length,
    duration_seconds: Math.floor((now - startedAt) / 1000),
    ...context,
  };
}

/** Properties for an Easy or Medium round's `game_started`. */
export function chainRoundStartedProps(targetA: Target, targetB: Target, people: number, context: RoundContext) {
  const [earlier, later] = [targetA, targetB].sort((a, b) => a.birthYear - b.birthYear);
  return { target_a: earlier.name, target_b: later.name, people, ...context };
}

export interface ChainRoundSummary {
  result: StyleResult;
  /** Medium: people shown by the wild card, which count as misses in the score. */
  reveals: number;
  startedAt: number;
  now: number;
  context: RoundContext;
}

/** Properties for an Easy or Medium round's `game_completed`: Checks for Easy, wrong guesses and reveals for Medium. */
export function chainRoundCompletedProps({ result, reveals, startedAt, now, context }: ChainRoundSummary) {
  const score = context.style === 'easy' ? { checks: result.score } : { misses: result.score - reveals, reveals };
  return { ...score, people: result.squares.length, duration_seconds: Math.floor((now - startedAt) / 1000), ...context };
}
