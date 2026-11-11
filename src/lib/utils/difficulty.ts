import type { RosterPerson } from '../data/roster';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { areContemporaries } from './ChainAnalyzer';
import type { Difficulty } from './GameLogic';

type Life = Pick<HistoricalFigure, 'id' | 'birthYear' | 'deathYear'>;

/** A pair's par, and for each step of a par-length chain how many roster people could fill it. */
export interface ChainShape {
  par: number;
  optionsPerStep: number[];
}

export interface DifficultyBand {
  minPar: number;
  maxPar: number;
  /** Options at the chain's narrowest step: fewer means the round needs more specific knowledge. */
  minNarrowest: number;
  maxNarrowest: number;
  /** Typical years between the targets' lives, shown to players as a guide. */
  yearsApart: string;
}

/** Bands from docs/research/2026-11-06-difficulty-balancing.md. */
export const DIFFICULTY_BANDS: Record<Difficulty, DifficultyBand> = {
  easy: { minPar: 2, maxPar: 3, minNarrowest: 8, maxNarrowest: Infinity, yearsApart: '120–250' },
  medium: { minPar: 3, maxPar: 4, minNarrowest: 3, maxNarrowest: 7, yearsApart: '200–300' },
  hard: { minPar: 4, maxPar: 6, minNarrowest: 1, maxNarrowest: 2, yearsApart: '250–450' },
};

/** Targets come from the most widely known roster people, so viewers recognise them. */
export const FAMOUS_COUNT = 400;

/** Known-good pairs, earlier target first, used when no random pick fits a band. */
export const FALLBACK_TARGETS: Record<Difficulty, [string, string]> = {
  easy: ['William Shakespeare', 'George Washington'],
  medium: ['Leonardo da Vinci', 'George Washington'],
  hard: ['Aristotle', 'Augustus'],
};

const MAX_PICK_ATTEMPTS = 400;
const SHORTLIST_MIN_YEARS_PER_STEP = 40;
const SHORTLIST_MAX_YEARS_PER_STEP = 90;

function stepsFrom(roster: RosterPerson[], start: Life, excluded: Set<string>, until: (lo: number, hi: number) => boolean) {
  const steps = new Map<string, number>();
  let lo = start.birthYear;
  let hi = start.deathYear;
  for (let step = 1; !until(lo, hi); step++) {
    const reached = roster.filter(p => !steps.has(p.id) && !excluded.has(p.id) && p.birthYear <= hi && lo <= p.deathYear);
    if (reached.length === 0) break;
    for (const p of reached) {
      steps.set(p.id, step);
      lo = Math.min(lo, p.birthYear);
      hi = Math.max(hi, p.deathYear);
    }
  }
  return steps;
}

/** Par and options per step for two targets, or null when their lives overlap or nothing bridges them. */
export function chainShape(roster: RosterPerson[], targetA: Life, targetB: Life): ChainShape | null {
  const [earlier, later] = [targetA, targetB].sort((x, y) => x.birthYear - y.birthYear);
  if (areContemporaries(earlier, later)) return null;

  const excluded = new Set([earlier.id, later.id]);
  const fromEarlier = stepsFrom(roster, earlier, excluded, (_, hi) => hi >= later.birthYear);
  const fromLater = stepsFrom(roster, later, excluded, lo => lo <= earlier.deathYear);

  let shortest = Infinity;
  for (const [id, steps] of fromEarlier) {
    const back = fromLater.get(id);
    if (back !== undefined) shortest = Math.min(shortest, steps + back);
  }
  if (shortest === Infinity) return null;

  const par = shortest - 1;
  const optionsPerStep = Array<number>(par).fill(0);
  for (const [id, steps] of fromEarlier) {
    if (steps <= par && fromLater.get(id) === shortest - steps) optionsPerStep[steps - 1] += 1;
  }
  return { par, optionsPerStep };
}

export function fitsBand(shape: ChainShape, band: DifficultyBand): boolean {
  const narrowest = Math.min(...shape.optionsPerStep);
  return shape.par >= band.minPar && shape.par <= band.maxPar && narrowest >= band.minNarrowest && narrowest <= band.maxNarrowest;
}

/** The roster's most widely known people, most known first: the best-known 400 unless told otherwise. */
export function famousPeople(roster: RosterPerson[], count = FAMOUS_COUNT): RosterPerson[] {
  return [...roster].sort((a, b) => b.sitelinks - a.sitelinks).slice(0, count);
}

/** Two famous targets whose chain fits the difficulty's band, earlier first, or null if none turned up. */
export function pickTargets(roster: RosterPerson[], difficulty: Difficulty, random: () => number = Math.random): [RosterPerson, RosterPerson] | null {
  const band = DIFFICULTY_BANDS[difficulty];
  const famous = famousPeople(roster);
  const minGap = band.minPar * SHORTLIST_MIN_YEARS_PER_STEP;
  const maxGap = band.maxPar * SHORTLIST_MAX_YEARS_PER_STEP;

  for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS; attempt++) {
    const earlier = famous[Math.floor(random() * famous.length)];
    const candidates = famous.filter(p => p.birthYear - earlier.deathYear >= minGap && p.birthYear - earlier.deathYear <= maxGap);
    if (candidates.length === 0) continue;
    const later = candidates[Math.floor(random() * candidates.length)];
    const shape = chainShape(roster, earlier, later);
    if (shape && fitsBand(shape, band)) return [earlier, later];
  }
  return null;
}

/** Free-play Hard's pair bands, in the daily week's proportions: easy 2, medium 2, hard 3 in 7. */
const HARD_BANDS: Difficulty[] = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard', 'hard'];

/** How far apart a free-play Hard pair is: Hard is a way to play, not only the hardest pairs. */
export function drawHardBand(random: () => number = Math.random): Difficulty {
  return HARD_BANDS[Math.floor(random() * HARD_BANDS.length)];
}
