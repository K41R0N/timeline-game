/**
 * Round state for the one-answer styles, kept as plain data so a round can be saved after every
 * change and resumed. Easy: cards placed in slots and Checked. Medium: blanks filled by guesses.
 */
import type { SlotOutcome, StyleResult } from './dailyProgress';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

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
