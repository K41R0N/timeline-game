/**
 * Rules for the one-answer puzzles: Easy (arrange name cards, decoys included) and Medium (fill
 * letter-count blanks). Both are a fixed chain of people between two targets, built from the
 * committed roster. The daily capture seeds these builders by date; free play seeds them at random.
 */
import type { RosterPerson } from '../data/roster';
import { areContemporaries } from './ChainAnalyzer';
import { famousPeople } from './difficulty';

type Life = Pick<RosterPerson, 'birthYear' | 'deathYear' | 'birthApproximate' | 'deathApproximate'>;

/** Years two neighbours must share when an approximate year sets either end of their shared stretch. */
export const APPROXIMATE_MARGIN_YEARS = 5;
export const MIN_MIDDLE = 2;
export const MAX_MIDDLE = 4;
export const DECOY_COUNT = 2;

const MAX_TRIES = 400;
const DECOY_TRIES = 60;

/** A one-answer puzzle: the targets (earlier-born first), the chain between them, and Easy's decoys. */
export interface StylePuzzle {
  a: RosterPerson;
  b: RosterPerson;
  chain: RosterPerson[];
  decoys: RosterPerson[];
}

export interface BuildOptions {
  /** People the puzzle may not use, as target, chain or decoy. */
  leaveOut?: ReadonlySet<string>;
  /** Extra say over a target pair, such as the schedule's no-repeat rules. */
  accept?: (a: RosterPerson, b: RosterPerson) => boolean;
}

/**
 * Whether two lives link in a one-answer chain: they overlap, and when an approximate year sets
 * either end of their shared stretch, they share at least the margin.
 */
export function linksWithMargin(x: Life, y: Life): boolean {
  const from = Math.max(x.birthYear, y.birthYear);
  const to = Math.min(x.deathYear, y.deathYear);
  const shared = to - from;
  if (shared < 0) return false;
  const approximateStart = (x.birthYear === from && x.birthApproximate) || (y.birthYear === from && y.birthApproximate);
  const approximateEnd = (x.deathYear === to && x.deathApproximate) || (y.deathYear === to && y.deathApproximate);
  return approximateStart || approximateEnd ? shared >= APPROXIMATE_MARGIN_YEARS : true;
}

interface PathNode {
  person: RosterPerson;
  /** Language editions of the least known person on the path so far. */
  fame: number;
  path: RosterPerson[];
}

/**
 * The shortest chain from a to b through `pool`, choosing the one whose least known member is best
 * known. Null when the shortest chain has fewer or more people between the targets than allowed.
 */
export function bestChain(pool: RosterPerson[], a: RosterPerson, b: RosterPerson, leaveOut: ReadonlySet<string> = new Set()): RosterPerson[] | null {
  const people = pool.filter(p => p.id !== a.id && p.id !== b.id && !leaveOut.has(p.id));
  let layer = new Map<string, PathNode>([[a.id, { person: a, fame: Infinity, path: [] }]]);
  const seen = new Set([a.id]);

  for (let depth = 0; depth <= MAX_MIDDLE; depth++) {
    const finals = [...layer.values()].filter(node => linksWithMargin(node.person, b));
    if (finals.length > 0) {
      if (depth < MIN_MIDDLE) return null;
      return finals.reduce((best, node) => (node.fame > best.fame ? node : best)).path;
    }
    if (depth === MAX_MIDDLE) break;

    const next = new Map<string, PathNode>();
    for (const node of layer.values()) {
      for (const candidate of people) {
        if (seen.has(candidate.id) || !linksWithMargin(node.person, candidate)) continue;
        const fame = Math.min(node.fame, candidate.sitelinks);
        const current = next.get(candidate.id);
        if (!current || current.fame < fame) next.set(candidate.id, { person: candidate, fame, path: [...node.path, candidate] });
      }
    }
    if (next.size === 0) break;
    for (const id of next.keys()) seen.add(id);
    layer = next;
  }
  return null;
}

/** How many ways `slots` cards from the hand can sit between a and b as a linked chain, counting no further than `stopAt`. */
export function countArrangements(hand: Life[], a: Life, b: Life, slots: number, stopAt = 2): number {
  let count = 0;
  const used = hand.map(() => false);
  const place = (previous: Life, depth: number) => {
    if (count >= stopAt) return;
    if (depth === slots) {
      if (linksWithMargin(previous, b)) count++;
      return;
    }
    hand.forEach((card, i) => {
      if (used[i] || !linksWithMargin(previous, card)) return;
      used[i] = true;
      place(card, depth + 1);
      used[i] = false;
    });
  };
  place(a, 0);
  return count;
}

/** A name as a blank shows it: without bracketed disambiguation. */
export function displayName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}

/** Letters in each word of a name, without bracketed disambiguation or punctuation. */
export function letterPattern(name: string): number[] {
  return displayName(name)
    .split(/\s+/)
    .map(word => word.replace(/[^\p{L}]/gu, '').length)
    .filter(length => length > 0);
}

/** Whether a blank's letter pattern singles out its answer among roster people who fit between its neighbours. */
export function patternIsUnique(roster: RosterPerson[], before: Life, answer: RosterPerson, after: Life, chainIds: ReadonlySet<string>): boolean {
  const pattern = letterPattern(answer.name).join('-');
  return !roster.some(
    p => !chainIds.has(p.id) && linksWithMargin(before, p) && linksWithMargin(p, after) && letterPattern(p.name).join('-') === pattern
  );
}

function drawTargets(famous: RosterPerson[], random: () => number, leaveOut: ReadonlySet<string>, accept?: BuildOptions['accept']) {
  let a = famous[Math.floor(random() * famous.length)];
  let b = famous[Math.floor(random() * famous.length)];
  if (a.birthYear > b.birthYear) [a, b] = [b, a];
  if (a.id === b.id || leaveOut.has(a.id) || leaveOut.has(b.id) || areContemporaries(a, b)) return null;
  if (accept && !accept(a, b)) return null;
  return [a, b] as const;
}

function pickDecoys(famous: RosterPerson[], a: RosterPerson, b: RosterPerson, chain: RosterPerson[], random: () => number, leaveOut: ReadonlySet<string>) {
  const taken = new Set([a.id, b.id, ...chain.map(p => p.id)]);
  const span = famous.filter(p => !taken.has(p.id) && !leaveOut.has(p.id) && p.birthYear > a.birthYear && p.birthYear < b.deathYear);
  if (span.length < DECOY_COUNT) return null;
  for (let attempt = 0; attempt < DECOY_TRIES; attempt++) {
    const first = span[Math.floor(random() * span.length)];
    const second = span[Math.floor(random() * span.length)];
    if (first.id === second.id) continue;
    if (countArrangements([...chain, first, second], a, b, chain.length) === 1) return [first, second];
  }
  return null;
}

/** An Easy puzzle: famous targets, a chain of famous people, and two famous decoys that leave one arrangement. */
export function buildEasyPuzzle(roster: RosterPerson[], random: () => number, { leaveOut = new Set(), accept }: BuildOptions = {}): StylePuzzle | null {
  const famous = famousPeople(roster);
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const targets = drawTargets(famous, random, leaveOut, accept);
    if (!targets) continue;
    const [a, b] = targets;
    const chain = bestChain(famous, a, b, leaveOut);
    if (!chain) continue;
    const decoys = pickDecoys(famous, a, b, chain, random, leaveOut);
    if (decoys) return { a, b, chain, decoys };
  }
  return null;
}

/** A Medium puzzle: famous targets, a chain drawn from the whole roster, and blanks whose letter patterns single out their answers. */
export function buildMediumPuzzle(roster: RosterPerson[], random: () => number, { leaveOut = new Set(), accept }: BuildOptions = {}): StylePuzzle | null {
  const famous = famousPeople(roster);
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const targets = drawTargets(famous, random, leaveOut, accept);
    if (!targets) continue;
    const [a, b] = targets;
    const chain = bestChain(roster, a, b, leaveOut);
    if (!chain) continue;
    const line = [a, ...chain, b];
    const ids = new Set(line.map(p => p.id));
    const unique = chain.every((answer, i) => patternIsUnique(roster, line[i], answer, line[i + 2], ids));
    if (unique) return { a, b, chain, decoys: [] };
  }
  return null;
}
