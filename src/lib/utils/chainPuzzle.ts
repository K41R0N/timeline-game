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
/** Easy's chains come from this many of the best-known people; its targets and decoys from the best-known 400. */
export const EASY_CHAIN_POOL = 600;

const MAX_TRIES = 400;
const DECOY_TRIES = 60;

/** The styles with one fixed answer. Hard is free typing against par. */
export type ChainStyle = 'easy' | 'medium';

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

/** Hops from each person in `people` to b, counting b's own contemporaries as 1, up to the longest chain allowed. */
function hopsTo(people: RosterPerson[], b: RosterPerson): Map<string, number> {
  const hops = new Map<string, number>();
  let layer: Life[] = [b];
  for (let hop = 1; hop <= MAX_MIDDLE && layer.length > 0; hop++) {
    const next: RosterPerson[] = [];
    for (const person of people) {
      if (!hops.has(person.id) && layer.some(reached => linksWithMargin(reached, person))) {
        hops.set(person.id, hop);
        next.push(person);
      }
    }
    layer = next;
  }
  return hops;
}

function chainPeople(pool: RosterPerson[], a: RosterPerson, b: RosterPerson, leaveOut: ReadonlySet<string>) {
  const people = pool.filter(p => p.id !== a.id && p.id !== b.id && !leaveOut.has(p.id));
  const hops = hopsTo(people, b);
  const firsts = people.filter(p => hops.has(p.id) && linksWithMargin(a, p));
  const middle = linksWithMargin(a, b) ? 0 : Math.min(...firsts.map(p => hops.get(p.id)!));
  return { people, hops, middle: middle >= MIN_MIDDLE && middle <= MAX_MIDDLE ? middle : null };
}

/** How many people stand between a and b on a shortest chain through `pool`, or null when that is fewer or more than allowed. */
export function shortestMiddle(pool: RosterPerson[], a: RosterPerson, b: RosterPerson, leaveOut: ReadonlySet<string> = new Set()): number | null {
  return chainPeople(pool, a, b, leaveOut).middle;
}

/**
 * A shortest chain from a to b through `pool`, drawn one person at a time with odds in proportion
 * to how widely known each candidate is, so famous people are likely but not certain. Null when the
 * shortest chain has fewer or more people between the targets than allowed.
 */
export function sampleChain(pool: RosterPerson[], a: RosterPerson, b: RosterPerson, random: () => number, leaveOut: ReadonlySet<string> = new Set()): RosterPerson[] | null {
  const { people, hops, middle } = chainPeople(pool, a, b, leaveOut);
  if (middle === null) return null;
  const chain: RosterPerson[] = [];
  let current: Life = a;
  for (let step = 1; step <= middle; step++) {
    const options = people.filter(p => hops.get(p.id) === middle - step + 1 && linksWithMargin(current, p));
    const total = options.reduce((sum, p) => sum + p.sitelinks, 0);
    let ticket = random() * total;
    const pick = options.find(p => (ticket -= p.sitelinks) < 0) ?? options[options.length - 1];
    chain.push(pick);
    current = pick;
  }
  return chain;
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

/** An Easy puzzle: famous targets, a chain of well-known people, and two famous decoys that leave one arrangement. */
export function buildEasyPuzzle(roster: RosterPerson[], random: () => number, { leaveOut = new Set(), accept }: BuildOptions = {}): StylePuzzle | null {
  const famous = famousPeople(roster);
  const pool = famousPeople(roster, EASY_CHAIN_POOL);
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const targets = drawTargets(famous, random, leaveOut, accept);
    if (!targets) continue;
    const [a, b] = targets;
    const chain = sampleChain(pool, a, b, random, leaveOut);
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
    const chain = sampleChain(roster, a, b, random, leaveOut);
    if (!chain) continue;
    const line = [a, ...chain, b];
    const ids = new Set(line.map(p => p.id));
    const unique = chain.every((answer, i) => patternIsUnique(roster, line[i], answer, line[i + 2], ids));
    if (unique) return { a, b, chain, decoys: [] };
  }
  return null;
}

/** Builds a puzzle in either one-answer style. */
export function buildStylePuzzle(style: ChainStyle, roster: RosterPerson[], random: () => number, options: BuildOptions = {}): StylePuzzle | null {
  return style === 'easy' ? buildEasyPuzzle(roster, random, options) : buildMediumPuzzle(roster, random, options);
}
