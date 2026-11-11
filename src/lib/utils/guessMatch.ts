/**
 * Judging a Medium guess: does the typed name mean the blank's person? A guess is matched by
 * person, not spelling. The answer's full name or surname matches on the device; any other name is
 * looked up in the roster, then on Wikipedia by Wikidata id (the round runs that lookup).
 */
import type { RosterPerson } from '../data/roster';
import type { PersonLookupFailure, PersonLookupResult } from '../services/WikipediaService';
import { displayName, linksWithMargin } from './chainPuzzle';

type Life = Pick<RosterPerson, 'birthYear' | 'deathYear' | 'birthApproximate' | 'deathApproximate'>;
type Answer = Pick<RosterPerson, 'id' | 'name'>;

export type GuessVerdict =
  | { kind: 'match' }
  /** Someone else; `fits` when they would also link the blank's neighbours. */
  | { kind: 'miss'; name: string; fits: boolean }
  /** The roster does not know the name: look it up on Wikipedia. */
  | { kind: 'lookup' }
  /** The name is no dated person (not found, not a person, no dates): not a miss. */
  | { kind: 'nobody'; reason: Exclude<PersonLookupFailure, 'network'>; title: string }
  /** Wikipedia could not be reached: the guess is not counted. */
  | { kind: 'unchecked'; reason: 'network'; title: string };

const MIN_SURNAME_LETTERS = 3;

/** Lower case, no accents, no punctuation, single spaces. */
export function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[-‐–]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The word that stands for a person on its own: the last word of at least three letters, for
 * ordinary given-name-and-surname names only. Names with a bracket, an "of ..." or "the ..." part, or
 * a regnal numeral have none, so "England" or "Great" never fills a blank.
 */
export function surnameOf(name: string): string | null {
  if (name.includes('(')) return null;
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return null;
  if (words.some(word => /^(of|the)$/i.test(word) || /^[IVXLC]+$/.test(word))) return null;
  const last = normalizeName(words[words.length - 1]);
  return last.replace(/\s/g, '').length >= MIN_SURNAME_LETTERS ? last : null;
}

/** Whether a guess is the answer's full name (without disambiguation) or its surname. */
export function matchesAnswer(guess: string, answer: Answer): boolean {
  const typed = normalizeName(guess);
  if (!typed) return false;
  return typed === normalizeName(displayName(answer.name)) || typed === surnameOf(answer.name);
}

function miss(person: Life & { name: string }, before: Life, after: Life): GuessVerdict {
  return { kind: 'miss', name: person.name, fits: linksWithMargin(before, person) && linksWithMargin(person, after) };
}

/** Judges a guess on the device: the answer itself, then anyone in the roster by name; otherwise it needs the live lookup. */
export function judgeGuess(guess: string, answer: Answer, before: Life, after: Life, roster: RosterPerson[]): GuessVerdict {
  if (matchesAnswer(guess, answer)) return { kind: 'match' };
  const typed = normalizeName(guess);
  const known = roster.find(p => normalizeName(displayName(p.name)) === typed || normalizeName(p.name) === typed);
  if (!known) return { kind: 'lookup' };
  return known.id === answer.id ? { kind: 'match' } : miss(known, before, after);
}

/** Judges a guess from Wikipedia's answer, comparing Wikidata ids, which catches other names for the same person. */
export function judgeLookup(result: PersonLookupResult, answer: Answer, before: Life, after: Life): GuessVerdict {
  if (!result.ok) {
    return result.reason === 'network' ? { kind: 'unchecked', reason: 'network', title: result.title } : { kind: 'nobody', reason: result.reason, title: result.title };
  }
  const { figure } = result;
  if (figure.id === answer.id) return { kind: 'match' };
  return miss({ ...figure, birthApproximate: figure.birthApproximate ?? false, deathApproximate: figure.deathApproximate ?? false }, before, after);
}
