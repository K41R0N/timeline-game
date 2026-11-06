import type { RosterPerson } from '../data/roster';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { areContemporaries, livesConnectedTo } from './ChainAnalyzer';

type Life = Pick<HistoricalFigure, 'id' | 'birthYear' | 'deathYear'>;

export type ParResult =
  | { playable: true; par: number; chain: RosterPerson[] }
  | { playable: false; reason: 'overlap' | 'gap' };

const byBirth = <T extends Life>(x: T, y: T) => x.birthYear - y.birthYear;

function furthestStep(roster: RosterPerson[], reach: number, excluded: Set<string>): RosterPerson | null {
  let best: RosterPerson | null = null;
  for (const person of roster) {
    if (person.birthYear > reach) continue;
    if (person.deathYear > reach && !excluded.has(person.id) && (!best || person.deathYear > best.deathYear)) best = person;
  }
  return best;
}

/** Par: the fewest roster people that connect the two targets, with that chain. */
export function computePar(roster: RosterPerson[], targetA: Life, targetB: Life): ParResult {
  const [earlier, later] = [targetA, targetB].sort(byBirth);
  if (areContemporaries(earlier, later)) return { playable: false, reason: 'overlap' };

  const excluded = new Set([targetA.id, targetB.id]);
  const chain: RosterPerson[] = [];
  let reach = earlier.deathYear;
  while (reach < later.birthYear) {
    const step = furthestStep(roster, reach, excluded);
    if (!step) return { playable: false, reason: 'gap' };
    chain.push(step);
    reach = step.deathYear;
  }
  return { playable: true, par: chain.length, chain };
}

/**
 * A hint: the roster person who would carry the player's chain furthest from the earlier
 * target, or null once the targets are connected. The same board always gives the same name.
 */
export function nextHint(roster: RosterPerson[], targetA: Life, targetB: Life, board: Life[]): RosterPerson | null {
  const [earlier, later] = [targetA, targetB].sort(byBirth);

  const connected = livesConnectedTo(board, [earlier]);
  if (connected.has(later.id)) return null;
  const reach = Math.max(...[...connected.values()].map(life => life.deathYear));

  return furthestStep(roster, reach, new Set([...board.map(f => f.id), targetA.id, targetB.id]));
}
