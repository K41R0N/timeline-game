/**
 * Pure helpers for building the roster from Wikidata Query Service (SPARQL) results.
 * The network side lives in roster.capture.test.ts; everything here is testable offline.
 *
 * SPARQL returns RDF time values, which count 1 BC as year 0 ("astronomical" numbering).
 * The game and the Wikidata JSON API use historical numbering (-100 = 100 BC), so every
 * SPARQL year of 0 or below is shifted down by one before the shared claim parser reads it.
 */
import type { RosterPerson } from '../data/roster';
import { WikidataClaim, rankedClaims, resolveLifespan, yearFromClaims } from './personData';

export type SparqlBinding = Record<string, { value: string }>;

export interface ItemStatements {
  /** Wikipedia language editions with an article on the item: the roster's measure of fame. */
  sitelinks: number;
  human: WikidataClaim[];
  births: WikidataClaim[];
  deaths: WikidataClaim[];
  /** Properties with a Julian date that SPARQL's Gregorian conversion may have moved into another year. */
  julianNearNewYear: Set<'P569' | 'P570'>;
}

const JULIAN_CALENDAR = 'Q1985786';
const PRECISION_MONTH = 10;
/** Julian and Gregorian dates differ by at most 13 days, so only dates this close to 1 January can change year. */
const CALENDAR_SHIFT_DAYS = 15;

function nearNewYear(time: string): boolean {
  const match = /-(\d{2})-(\d{2})T/.exec(time);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  return (month === 1 && day <= CALENDAR_SHIFT_DAYS) || (month === 12 && day > 31 - CALENDAR_SHIFT_DAYS);
}

const RANKS: Record<string, WikidataClaim['rank']> = {
  PreferredRank: 'preferred',
  NormalRank: 'normal',
  DeprecatedRank: 'deprecated',
};

const lastSegment = (iri: string) => iri.slice(Math.max(iri.lastIndexOf('/'), iri.lastIndexOf('#')) + 1);

/** "-0099-07-01T00:00:00Z" (astronomical) -> "-0100-07-01T00:00:00Z"; "1162-..." -> "+1162-...". */
export function toHistoricalTime(time: string): string {
  const match = /^(-?)(\d+)(-.*)$/.exec(time);
  if (!match) throw new Error(`Unrecognised SPARQL time: ${time}`);
  const astronomical = (match[1] ? -1 : 1) * parseInt(match[2], 10);
  const historical = astronomical <= 0 ? astronomical - 1 : astronomical;
  const digits = String(Math.abs(historical)).padStart(4, '0');
  return `${historical < 0 ? '-' : '+'}${digits}${match[3]}`;
}

/** Wikidata items to fetch in one query: instance-of human, birth and death statements with rank, precision and circa qualifiers. */
export function rosterStatementsQuery(qids: string[]): string {
  const dateBlock = (kind: string, property: string) =>
    `{ ?item p:${property} ?st. ?st wikibase:rank ?rank. BIND("${kind}" AS ?kind) ` +
    `OPTIONAL { ?st psv:${property} ?v. ?v wikibase:timeValue ?time; wikibase:timePrecision ?prec; wikibase:timeCalendarModel ?cal. } ` +
    `OPTIONAL { ?st pq:P1480 ?q. } }`;
  return (
    `SELECT ?item ?sl ?kind ?st ?rank ?time ?prec ?cal ?q WHERE { VALUES ?item { ${qids.map(q => `wd:${q}`).join(' ')} } ` +
    `?item wikibase:sitelinks ?sl. ` +
    `{ ?item p:P31 ?st. ?st ps:P31 wd:Q5; wikibase:rank ?rank. BIND("human" AS ?kind) } UNION ` +
    `${dateBlock('birth', 'P569')} UNION ${dateBlock('death', 'P570')} }`
  );
}

/** Group SPARQL rows into claim lists per item, in the shape the shared claim parser reads. */
export function statementsFromSparql(bindings: SparqlBinding[]): Map<string, ItemStatements> {
  const items = new Map<string, ItemStatements>();
  const claimsById = new Map<string, WikidataClaim>();

  for (const binding of bindings) {
    const qid = lastSegment(binding.item.value);
    const kind = binding.kind.value as 'human' | 'birth' | 'death';
    const statementId = binding.st.value;
    if (!items.has(qid)) items.set(qid, { sitelinks: 0, human: [], births: [], deaths: [], julianNearNewYear: new Set() });
    if (binding.sl) items.get(qid)!.sitelinks = Number(binding.sl.value);

    let claim = claimsById.get(statementId);
    if (!claim) {
      const rank = RANKS[lastSegment(binding.rank.value)] ?? 'normal';
      claim =
        kind === 'human'
          ? { rank, mainsnak: { snaktype: 'value', datavalue: { value: { id: 'Q5' } } } }
          : binding.time
            ? {
                rank,
                mainsnak: {
                  snaktype: 'value',
                  datavalue: { value: { time: toHistoricalTime(binding.time.value), precision: Number(binding.prec?.value ?? 9) } },
                },
              }
            : { rank, mainsnak: { snaktype: 'somevalue' } };
      claimsById.set(statementId, claim);
      const statements = items.get(qid)!;
      const julian = binding.cal && lastSegment(binding.cal.value) === JULIAN_CALENDAR;
      if (kind !== 'human' && julian && Number(binding.prec?.value) >= PRECISION_MONTH && nearNewYear(binding.time!.value)) {
        statements.julianNearNewYear.add(kind === 'birth' ? 'P569' : 'P570');
      }
      (kind === 'human' ? statements.human : kind === 'birth' ? statements.births : statements.deaths).push(claim);
    }

    if (binding.q) {
      const qualifiers = (claim.qualifiers ??= {});
      const circumstances = (qualifiers.P1480 ??= []);
      circumstances.push({ datavalue: { value: { id: lastSegment(binding.q.value) } } });
    }
  }
  return items;
}

/**
 * Properties the JSON API must settle so the roster's year matches what a lookup returns:
 * best-rank values that disagree on the year (SPARQL rows carry no statement order, and a
 * lookup takes the first), and Julian dates SPARQL converted to Gregorian near a new year.
 */
export function propertiesToReread(statements: ItemStatements): Array<'P569' | 'P570'> {
  const reread: Array<'P569' | 'P570'> = [];
  for (const [property, claims] of [['P569', statements.births], ['P570', statements.deaths]] as const) {
    if (statements.julianNearNewYear.has(property)) {
      reread.push(property);
      continue;
    }
    const valued = rankedClaims(claims).filter(c => c.mainsnak.snaktype === 'value');
    if (valued.length < 2) continue;
    const topIsPreferred = valued[0].rank === 'preferred';
    const top = valued.filter(c => (c.rank === 'preferred') === topIsPreferred);
    const years = new Set(top.map(c => yearFromClaims([c])?.year));
    if (years.size > 1) reread.push(property);
  }
  return reread;
}

/** A roster entry for a dead human with both years, using the same rules as a lookup; null otherwise. */
export function rosterPersonFrom(qid: string, name: string, statements: ItemStatements, currentYear: number): RosterPerson | null {
  if (!statements.human.some(c => c.rank !== 'deprecated')) return null;
  const lifespan = resolveLifespan(statements.births, statements.deaths, [], currentYear);
  if (!lifespan || lifespan.isLiving) return null;
  return {
    id: qid,
    name,
    birthYear: lifespan.birthYear,
    deathYear: lifespan.deathYear,
    birthApproximate: lifespan.birthApproximate,
    deathApproximate: lifespan.deathApproximate,
    sitelinks: statements.sitelinks,
  };
}

/**
 * Stretches between `from` and `to` that no chain of overlapping lives crosses.
 * An empty result means any two people in the range can be connected through the roster.
 */
export function findCoverageGaps(
  people: Array<{ birthYear: number; deathYear: number }>,
  from: number,
  to: number
): Array<{ from: number; to: number }> {
  const sorted = [...people].sort((a, b) => a.birthYear - b.birthYear);
  const gaps: Array<{ from: number; to: number }> = [];
  let reach = from;

  for (const p of sorted) {
    if (p.birthYear > to) break;
    if (p.birthYear > reach) gaps.push({ from: reach, to: p.birthYear });
    reach = Math.max(reach, p.deathYear);
  }
  if (reach < to) gaps.push({ from: reach, to });
  return gaps;
}
