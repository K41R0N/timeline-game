import type { RosterPerson } from '../data/roster';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { chainShape } from './difficulty';
import type { Difficulty } from './GameLogic';
import type { StyleBadge } from './style';

/** Which kind of round an event comes from: free play, or a daily puzzle played scored or as practice. */
export interface RoundContext {
  mode: 'free' | 'daily';
  /** The daily puzzle's number; null in free play. */
  puzzle: number | null;
  /** Whether a daily round is the scored attempt; null in free play. */
  scored: boolean | null;
}

export const FREE_PLAY: RoundContext = { mode: 'free', puzzle: null, scored: null };

/** Properties for `game_started`: what kind of round this is, for tuning the difficulty bands. */
export function roundStartedProps(roster: RosterPerson[], difficulty: Difficulty, targetA: HistoricalFigure, targetB: HistoricalFigure, context: RoundContext) {
  const [earlier, later] = [targetA, targetB].sort((a, b) => a.birthYear - b.birthYear);
  const shape = chainShape(roster, earlier, later);
  const gapMidpoint = (earlier.deathYear + later.birthYear) / 2;
  return {
    difficulty,
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
  difficulty: Difficulty;
  strokes: number;
  par: number | null;
  hintsUsed: number;
  badgeKinds: Array<StyleBadge['kind']>;
  startedAt: number;
  now: number;
  context: RoundContext;
}

/** Properties for `game_completed` and `game_abandoned`. */
export function roundCompletedProps({ difficulty, strokes, par, hintsUsed, badgeKinds, startedAt, now, context }: RoundSummary) {
  return {
    difficulty,
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
