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
  human: WikidataClaim[];
  births: WikidataClaim[];
  deaths: WikidataClaim[];
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
    `OPTIONAL { ?st psv:${property} ?v. ?v wikibase:timeValue ?time; wikibase:timePrecision ?prec. } ` +
    `OPTIONAL { ?st pq:P1480 ?q. } }`;
  return (
    `SELECT ?item ?kind ?st ?rank ?time ?prec ?q WHERE { VALUES ?item { ${qids.map(q => `wd:${q}`).join(' ')} } ` +
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
    if (!items.has(qid)) items.set(qid, { human: [], births: [], deaths: [] });

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
 * Properties whose best-rank values disagree on the year. SPARQL rows carry no statement
 * order, while a lookup takes the first statement of the best rank, so these must be
 * re-read from the JSON API to match what a lookup returns.
 */
export function ambiguousProperties(statements: ItemStatements): Array<'P569' | 'P570'> {
  const ambiguous: Array<'P569' | 'P570'> = [];
  for (const [property, claims] of [['P569', statements.births], ['P570', statements.deaths]] as const) {
    const valued = rankedClaims(claims).filter(c => c.mainsnak.snaktype === 'value');
    if (valued.length < 2) continue;
    const topIsPreferred = valued[0].rank === 'preferred';
    const top = valued.filter(c => (c.rank === 'preferred') === topIsPreferred);
    const years = new Set(top.map(c => yearFromClaims([c])?.year));
    if (years.size > 1) ambiguous.push(property);
  }
  return ambiguous;
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
  let reach = -Infinity;

  for (const p of sorted) {
    if (p.birthYear > to) break;
    if (reach !== -Infinity && p.birthYear > reach && reach >= from) gaps.push({ from: reach, to: p.birthYear });
    reach = Math.max(reach, p.deathYear);
  }
  if (reach < to) gaps.push({ from: Math.max(reach, from), to });
  return gaps;
}
