import { describe, expect, it } from 'vitest';
import type { RosterPerson } from '../data/roster';
import { judgeGuess, judgeLookup, matchesAnswer } from './guessMatch';

function person(id: string, name: string, birthYear: number, deathYear: number): RosterPerson {
  return { id, name, birthYear, deathYear, birthApproximate: false, deathApproximate: false, sitelinks: 100 };
}

const newton = person('Q935', 'Isaac Newton', 1643, 1727);
const before = person('Q1', 'Before', 1600, 1660);
const after = person('Q2', 'After', 1680, 1740);
const barrow = person('Q3', 'Isaac Barrow', 1630, 1677);
const leibniz = person('Q4', 'Gottfried Wilhelm Leibniz', 1646, 1716);
const caesar = person('Q5', 'Julius Caesar', -100, -44);
const roster = [before, newton, barrow, leibniz, caesar, after];

describe('matchesAnswer', () => {
  it('accepts the surname, any case and the full name', () => {
    for (const guess of ['Newton', 'isaac newton', 'Isaac Newton', '  ISAAC   Newton ']) expect(matchesAnswer(guess, newton)).toBe(true);
  });

  it('accepts a full name with particles, but not a particle alone', () => {
    const leonardo = person('Q762', 'Leonardo da Vinci', 1452, 1519);
    expect(matchesAnswer('Leonardo da Vinci', leonardo)).toBe(true);
    expect(matchesAnswer('da', leonardo)).toBe(false);
  });

  it('accepts a surname after a particle', () => {
    expect(matchesAnswer('Goethe', person('Q5879', 'Johann Wolfgang von Goethe', 1749, 1832))).toBe(true);
  });

  it('ignores accents and punctuation', () => {
    expect(matchesAnswer('Rene Descartes', person('Q9191', 'René Descartes', 1596, 1650))).toBe(true);
    expect(matchesAnswer('descartes', person('Q9191', 'René Descartes', 1596, 1650))).toBe(true);
  });

  it('does not take a first name for the surname when the last word is too short', () => {
    expect(matchesAnswer('Chien-Shiung', person('Q1', 'Chien-Shiung Wu', 1912, 1997))).toBe(false);
    expect(matchesAnswer('Chien-Shiung Wu', person('Q1', 'Chien-Shiung Wu', 1912, 1997))).toBe(true);
  });

  it('does not treat a place, an epithet or a numeral as a surname', () => {
    expect(matchesAnswer('England', person('Q38370', 'Henry VIII of England', 1491, 1547))).toBe(false);
    expect(matchesAnswer('Great', person('Q8409', 'Alexander the Great', -356, -323))).toBe(false);
    expect(matchesAnswer('Alexander the Great', person('Q8409', 'Alexander the Great', -356, -323))).toBe(true);
  });

  it('matches the name without its bracketed disambiguation', () => {
    expect(matchesAnswer('Thomas Young', person('Q186', 'Thomas Young (scientist)', 1773, 1829))).toBe(true);
    expect(matchesAnswer('scientist', person('Q186', 'Thomas Young (scientist)', 1773, 1829))).toBe(false);
  });
});

describe('judgeGuess', () => {
  it('fills the blank for its own answer', () => {
    expect(judgeGuess('Newton', newton, before, after, roster)).toEqual({ kind: 'match' });
  });

  it('marks a roster person who fits between the neighbours but is not the answer', () => {
    expect(judgeGuess('Isaac Barrow', newton, before, after, roster)).toEqual({ kind: 'miss', name: 'Isaac Barrow', fits: false });
    expect(judgeGuess('gottfried wilhelm leibniz', newton, before, after, roster)).toEqual({ kind: 'miss', name: 'Gottfried Wilhelm Leibniz', fits: true });
  });

  it('counts a roster person who does not fit as a plain miss', () => {
    expect(judgeGuess('Julius Caesar', newton, before, after, roster)).toEqual({ kind: 'miss', name: 'Julius Caesar', fits: false });
  });

  it('sends a name the roster does not know to the live lookup', () => {
    expect(judgeGuess('Sir Isaac', newton, before, after, roster)).toEqual({ kind: 'lookup' });
  });
});

describe('judgeLookup', () => {
  const figure = (id: string, name: string, birthYear: number, deathYear: number) => ({
    ok: true as const,
    figure: { id, name, birthYear, deathYear, shortDescription: '', imageUrl: '', contemporaries: [] },
  });

  it('fills the blank when the lookup finds the same Wikidata person under another name', () => {
    expect(judgeLookup(figure('Q935', 'Isaac Newton', 1643, 1727), newton, before, after)).toEqual({ kind: 'match' });
  });

  it('marks someone else who fits as a fitting miss', () => {
    expect(judgeLookup(figure('Q99', 'Edmond Halley', 1656, 1742), newton, before, after)).toEqual({ kind: 'miss', name: 'Edmond Halley', fits: true });
  });

  it('does not count a guess Wikipedia could not check', () => {
    expect(judgeLookup({ ok: false, reason: 'network', title: 'Newton' }, newton, before, after)).toEqual({ kind: 'unchecked', reason: 'network', title: 'Newton' });
  });

  it('does not count a name that is no person', () => {
    expect(judgeLookup({ ok: false, reason: 'not_a_person', title: 'Newton' }, newton, before, after)).toEqual({ kind: 'nobody', reason: 'not_a_person', title: 'Newton' });
  });
});
