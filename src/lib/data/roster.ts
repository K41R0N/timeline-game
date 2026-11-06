/**
 * The roster: well-known people the game uses to compute par and suggest hints.
 * Built offline from Wikipedia's "Vital articles/Level 4/People" list with Wikidata dates
 * (see src/lib/services/roster.capture.test.ts) and committed as roster.json.
 */

export interface RosterPerson {
  /** Wikidata QID, the same id a lookup gives the person. */
  id: string;
  /** Canonical English Wikipedia title. */
  name: string;
  /** Negative for BCE. */
  birthYear: number;
  deathYear: number;
  birthApproximate: boolean;
  deathApproximate: boolean;
}

/** One compact row per person: QID, title, birth, death, flags (1 = approximate birth, 2 = approximate death). */
export type RosterRow = [string, string, number, number, number];

export interface RosterFile {
  source: string;
  sourceRevision: number;
  builtAt: string;
  count: number;
  people: RosterRow[];
}

export const APPROXIMATE_BIRTH = 1;
export const APPROXIMATE_DEATH = 2;

export function toRosterRow(person: RosterPerson): RosterRow {
  const flags = (person.birthApproximate ? APPROXIMATE_BIRTH : 0) | (person.deathApproximate ? APPROXIMATE_DEATH : 0);
  return [person.id, person.name, person.birthYear, person.deathYear, flags];
}

export function fromRosterRow([id, name, birthYear, deathYear, flags]: RosterRow): RosterPerson {
  return {
    id,
    name,
    birthYear,
    deathYear,
    birthApproximate: (flags & APPROXIMATE_BIRTH) !== 0,
    deathApproximate: (flags & APPROXIMATE_DEATH) !== 0,
  };
}

let cached: Promise<RosterPerson[]> | null = null;

/** Loads the committed roster once, as its own chunk, sorted by birth year. */
export function loadRoster(): Promise<RosterPerson[]> {
  if (!cached) {
    cached = import('./roster.json')
      .then(module => (module.default as unknown as RosterFile).people.map(fromRosterRow))
      .catch(error => {
        cached = null;
        throw error;
      });
  }
  return cached;
}
