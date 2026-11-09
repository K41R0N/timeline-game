/**
 * Round state for the one-answer styles, kept as plain data so a round can be saved after every
 * change and resumed. Easy: cards placed in slots and Checked. Medium: blanks filled by guesses.
 */
import { isRecord, type SlotOutcome, type StyleResult } from './dailyProgress';
import type { GuessVerdict } from './guessMatch';

export interface EasyRound {
  /** The card in each slot, by person id, or null when the slot is empty. */
  slots: (string | null)[];
  /** Slots whose card was right at a Check; their cards stay put. */
  locked: boolean[];
  /** The Check on which each slot locked (1 for the first), or null while unlocked. */
  lockedAt: (number | null)[];
  checks: number;
}

export function newEasyRound(slotCount: number): EasyRound {
  return { slots: Array(slotCount).fill(null), locked: Array(slotCount).fill(false), lockedAt: Array(slotCount).fill(null), checks: 0 };
}

/** The cards still in the hand, in the hand's order. */
export function handCards(round: EasyRound, cardIds: string[]): string[] {
  return cardIds.filter(id => !round.slots.includes(id));
}

/** Puts a card in a slot: a card already elsewhere moves, and the slot's earlier card goes back to the hand. */
export function placeCard(round: EasyRound, cardId: string, slot: number): EasyRound {
  if (round.locked[slot] || round.slots.some((id, i) => id === cardId && round.locked[i])) return round;
  const slots = round.slots.map(id => (id === cardId ? null : id));
  slots[slot] = cardId;
  return { ...round, slots };
}

export function returnCard(round: EasyRound, slot: number): EasyRound {
  if (round.locked[slot] || round.slots[slot] === null) return round;
  return { ...round, slots: round.slots.map((id, i) => (i === slot ? null : id)) };
}

export function easyFinished(round: EasyRound): boolean {
  return round.locked.every(Boolean);
}

export function canCheck(round: EasyRound): boolean {
  return !easyFinished(round) && round.slots.every(id => id !== null);
}

/** One Check: right cards lock and turn over, the rest go back to the hand. */
export function checkEasy(round: EasyRound, answerIds: string[]): EasyRound {
  if (!canCheck(round)) return round;
  const checks = round.checks + 1;
  const right = round.slots.map((id, i) => round.locked[i] || id === answerIds[i]);
  return {
    slots: round.slots.map((id, i) => (right[i] ? id : null)),
    locked: right,
    lockedAt: round.lockedAt.map((at, i) => at ?? (right[i] ? checks : null)),
    checks,
  };
}

export function easyResult(round: EasyRound): StyleResult {
  return { score: round.checks, squares: round.lockedAt.map((at): SlotOutcome => (at === 1 ? 'first' : 'later')) };
}

/** A saved Easy round, or null when it does not fit this puzzle's slots and cards. */
export function normalizeEasyRound(raw: unknown, slotCount: number, cardIds: string[]): EasyRound | null {
  if (!isRecord(raw) || typeof raw.checks !== 'number') return null;
  const { slots, locked, lockedAt } = raw;
  if (!Array.isArray(slots) || !Array.isArray(locked) || !Array.isArray(lockedAt)) return null;
  if (slots.length !== slotCount || locked.length !== slotCount || lockedAt.length !== slotCount) return null;
  if (!slots.every(id => id === null || (typeof id === 'string' && cardIds.includes(id)))) return null;
  if (!locked.every(value => typeof value === 'boolean') || !lockedAt.every(at => at === null || typeof at === 'number')) return null;
  return { slots, locked, lockedAt, checks: raw.checks };
}

export type BlankFill = 'guessed' | 'revealed';

export interface MediumRound {
  /** How each blank was filled, or null while it is open. */
  filled: (BlankFill | null)[];
  /** Wrong guesses made on each blank. */
  misses: number[];
}

export function newMediumRound(blankCount: number): MediumRound {
  return { filled: Array(blankCount).fill(null), misses: Array(blankCount).fill(0) };
}

/** A judged guess on one blank: a match fills it, a miss counts against it, anything else changes nothing. */
export function applyVerdict(round: MediumRound, blank: number, verdict: GuessVerdict): MediumRound {
  if (round.filled[blank] !== null) return round;
  if (verdict.kind === 'match') return { ...round, filled: round.filled.map((fill, i) => (i === blank ? 'guessed' : fill)) };
  if (verdict.kind === 'miss') return { ...round, misses: round.misses.map((count, i) => (i === blank ? count + 1 : count)) };
  return round;
}

/** The wild card: shows one blank's person, at the cost of a miss. */
export function revealBlank(round: MediumRound, blank: number): MediumRound {
  if (round.filled[blank] !== null) return round;
  return { ...round, filled: round.filled.map((fill, i) => (i === blank ? 'revealed' : fill)) };
}

export function mediumFinished(round: MediumRound): boolean {
  return round.filled.every(fill => fill !== null);
}

/** Wrong guesses plus revealed people. */
export function mediumScore(round: MediumRound): number {
  return round.misses.reduce((sum, count) => sum + count, 0) + round.filled.filter(fill => fill === 'revealed').length;
}

export function mediumResult(round: MediumRound): StyleResult {
  return {
    score: mediumScore(round),
    squares: round.filled.map((fill, i): SlotOutcome => (fill === 'revealed' ? 'revealed' : round.misses[i] > 0 ? 'later' : 'first')),
  };
}

/** The next open blank after `from`, wrapping round, or null when every blank is filled. */
export function nextOpenBlank(round: MediumRound, from: number): number | null {
  const count = round.filled.length;
  for (let step = 1; step <= count; step++) {
    const blank = (from + step) % count;
    if (round.filled[blank] === null) return blank;
  }
  return null;
}

/** A saved Medium round, or null when it does not fit this puzzle's blanks. */
export function normalizeMediumRound(raw: unknown, blankCount: number): MediumRound | null {
  if (!isRecord(raw) || !Array.isArray(raw.filled) || !Array.isArray(raw.misses)) return null;
  if (raw.filled.length !== blankCount || raw.misses.length !== blankCount) return null;
  if (!raw.filled.every(fill => fill === null || fill === 'guessed' || fill === 'revealed')) return null;
  if (!raw.misses.every(count => Number.isInteger(count) && count >= 0)) return null;
  return { filled: raw.filled, misses: raw.misses };
}
