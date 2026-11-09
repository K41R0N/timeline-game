import { describe, expect, it } from 'vitest';
import { canCheck, checkEasy, easyFinished, easyResult, handCards, newEasyRound, normalizeEasyRound, placeCard, returnCard } from './styleRound';

const ANSWER = ['M1', 'M2', 'M3'];
const CARDS = ['M1', 'M2', 'M3', 'D1', 'D2'];

describe('an Easy round', () => {
  it('starts with every card in the hand and every slot empty', () => {
    const round = newEasyRound(3);
    expect(handCards(round, CARDS)).toEqual(CARDS);
    expect(canCheck(round)).toBe(false);
  });

  it('locks right cards, returns the rest and counts one Check', () => {
    let round = newEasyRound(3);
    round = placeCard(round, 'M1', 0);
    round = placeCard(round, 'M2', 1);
    round = placeCard(round, 'D1', 2);
    expect(canCheck(round)).toBe(true);
    round = checkEasy(round, ANSWER);
    expect(round.checks).toBe(1);
    expect(round.locked).toEqual([true, true, false]);
    expect(round.slots).toEqual(['M1', 'M2', null]);
    expect(handCards(round, CARDS)).toEqual(['M3', 'D1', 'D2']);
    expect(easyFinished(round)).toBe(false);
  });

  it('finishes on a correct second Check, marking each slot by the Check it locked on', () => {
    let round = checkEasy(placeCard(placeCard(placeCard(newEasyRound(3), 'M1', 0), 'M2', 1), 'D1', 2), ANSWER);
    round = checkEasy(placeCard(round, 'M3', 2), ANSWER);
    expect(easyFinished(round)).toBe(true);
    expect(easyResult(round)).toEqual({ score: 2, squares: ['first', 'first', 'later'] });
    expect(canCheck(round)).toBe(false);
  });

  it('does not allow a Check until every slot holds a card', () => {
    const round = placeCard(placeCard(newEasyRound(3), 'M1', 0), 'M2', 1);
    expect(canCheck(round)).toBe(false);
    expect(checkEasy(round, ANSWER)).toBe(round);
  });

  it('never moves or returns a locked card', () => {
    const round = checkEasy(placeCard(placeCard(placeCard(newEasyRound(3), 'M1', 0), 'D1', 1), 'D2', 2), ANSWER);
    expect(returnCard(round, 0)).toBe(round);
    expect(placeCard(round, 'M2', 0)).toBe(round);
    expect(placeCard(round, 'M1', 1)).toBe(round);
  });

  it('sends the earlier card back to the hand when another lands on its slot', () => {
    const round = placeCard(placeCard(newEasyRound(3), 'D1', 0), 'M1', 0);
    expect(round.slots).toEqual(['M1', null, null]);
    expect(handCards(round, CARDS)).toContain('D1');
  });

  it('moves a placed card to another slot rather than copying it', () => {
    const round = placeCard(placeCard(newEasyRound(3), 'M1', 0), 'M1', 2);
    expect(round.slots).toEqual([null, null, 'M1']);
  });

  it('returns a placed card to the hand', () => {
    const round = returnCard(placeCard(newEasyRound(3), 'M1', 0), 0);
    expect(round.slots).toEqual([null, null, null]);
  });

  it('restores a saved round and rejects one that does not fit the puzzle', () => {
    const saved = JSON.parse(JSON.stringify(checkEasy(placeCard(placeCard(placeCard(newEasyRound(3), 'M1', 0), 'M2', 1), 'D1', 2), ANSWER)));
    expect(normalizeEasyRound(saved, 3, CARDS)).toEqual(saved);
    expect(normalizeEasyRound({ ...saved, slots: ['M1', 'X', null] }, 3, CARDS)).toBeNull();
    expect(normalizeEasyRound({ ...saved, slots: ['M1'] }, 3, CARDS)).toBeNull();
    expect(normalizeEasyRound('nonsense', 3, CARDS)).toBeNull();
  });
});
