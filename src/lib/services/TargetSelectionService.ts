import type { RosterPerson } from '../data/roster';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { DIFFICULTY_BANDS, FALLBACK_TARGETS, chainShape, fitsBand, pickTargets } from '../utils/difficulty';
import type { Difficulty } from '../utils/GameLogic';
import { computePar } from '../utils/par';
import { WikipediaService } from './WikipediaService';

const MAX_ATTEMPTS = 3;

export class TargetSelectionService {
  /**
   * Two famous targets whose chain fits the difficulty's band, earlier first. The pair is chosen
   * offline from the roster; only the two chosen people are then looked up, for their
   * descriptions and images. Returns null when Wikimedia is unreachable or no pair resolves.
   */
  static async selectTargets(
    roster: RosterPerson[],
    difficulty: Difficulty,
    random: () => number = Math.random
  ): Promise<[HistoricalFigure, HistoricalFigure] | null> {
    console.log(`🎲 Selecting ${difficulty} targets from the roster`);
    // A playable pair whose live dates moved it out of the band, kept in case no in-band pair resolves.
    let offBand: [HistoricalFigure, HistoricalFigure] | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const pair = pickTargets(roster, difficulty, random) ?? this.fallbackPair(roster, difficulty);
      if (!pair) return null;

      const [resultA, resultB] = await Promise.all(pair.map(p => WikipediaService.lookupPerson(p.name)));

      // The client has already retried with backoff; another pair won't help if Wikimedia is unreachable.
      if ((!resultA.ok && resultA.reason === 'network') || (!resultB.ok && resultB.reason === 'network')) {
        console.warn('⚠️ Wikimedia is unavailable; stopping target selection');
        return null;
      }
      if (!resultA.ok || !resultB.ok) {
        console.warn(`⚠️ ${pair[0].name} or ${pair[1].name} did not resolve, trying another pair...`);
        continue;
      }

      const targets = [resultA.figure, resultB.figure].sort((a, b) => a.birthYear - b.birthYear) as [HistoricalFigure, HistoricalFigure];
      if (!computePar(roster, targets[0], targets[1]).playable) {
        console.warn(`⚠️ ${targets[0].name} and ${targets[1].name} cannot make a round with their current dates, trying another pair...`);
        continue;
      }
      const shape = chainShape(roster, targets[0], targets[1]);
      if (!shape || !fitsBand(shape, DIFFICULTY_BANDS[difficulty])) {
        console.warn(`⚠️ ${targets[0].name} and ${targets[1].name} left the ${difficulty} band with their current dates, trying another pair...`);
        offBand ??= targets;
        continue;
      }

      console.log(`✅ Selected targets: ${targets[0].name} → ${targets[1].name}`);
      return targets;
    }

    if (offBand) {
      console.warn(`⚠️ No ${difficulty} pair stayed in its band; using ${offBand[0].name} → ${offBand[1].name}`);
      return offBand;
    }
    console.error(`❌ Failed to find ${difficulty} targets after ${MAX_ATTEMPTS} attempts`);
    return null;
  }

  private static fallbackPair(roster: RosterPerson[], difficulty: Difficulty): [RosterPerson, RosterPerson] | null {
    const [earlier, later] = FALLBACK_TARGETS[difficulty].map(name => roster.find(p => p.name === name));
    return earlier && later ? [earlier, later] : null;
  }
}
