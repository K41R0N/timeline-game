import type { RosterPerson } from '../data/roster';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { chainShape } from './difficulty';
import type { Difficulty } from './GameLogic';
import type { StyleBadge } from './style';

/** Properties for `game_started`: what kind of round this is, for tuning the difficulty bands. */
export function roundStartedProps(roster: RosterPerson[], difficulty: Difficulty, targetA: HistoricalFigure, targetB: HistoricalFigure) {
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
}

/** Properties for `game_completed` and `game_abandoned`. */
export function roundCompletedProps({ difficulty, strokes, par, hintsUsed, badgeKinds, startedAt, now }: RoundSummary) {
  return {
    difficulty,
    strokes,
    par,
    result: par === null ? null : strokes - par,
    hints: hintsUsed,
    clutch_badges: badgeKinds.filter(kind => kind === 'clutch').length,
    long_bridge_badges: badgeKinds.filter(kind => kind === 'longBridge').length,
    duration_seconds: Math.floor((now - startedAt) / 1000),
  };
}
