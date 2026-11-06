/**
 * Builds src/lib/data/roster.json from Wikipedia's Level 4 vital people list and Wikidata.
 * Skipped by default; run with:  CAPTURE_ROSTER=1 npx vitest run src/lib/services/roster.capture.test.ts
 * Wikimedia rate-limits shared IPs hard, so requests are spaced and retried patiently.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { API_USER_AGENT, WIKIPEDIA_API, buildApiUrl, createWikimediaClient } from './wikimediaClient';
import { claimsUrl } from './WikipediaService';
import { WikidataClaim } from './personData';
import { RosterFile, RosterPerson, toRosterRow } from '../data/roster';
import {
  ItemStatements,
  SparqlBinding,
  findCoverageGaps,
  propertiesToReread,
  rosterPersonFrom,
  rosterStatementsQuery,
  statementsFromSparql,
} from './rosterBuild';

const SOURCE_PAGE = 'Wikipedia:Vital articles/Level 4/People';
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const ROSTER_FILE = path.join(__dirname, '..', 'data', 'roster.json');
const MIN_INTERVAL_MS = 1000;
const TITLE_BATCH = 50;
const SPARQL_BATCH = 150;
/** Target pools span ancient Greece to the 20th century; the roster must connect all of it. */
const COVERAGE_FROM = -500;
const COVERAGE_TO = 1950;
const LONG_LIFE_YEARS = 90;

interface LinksResponse {
  continue?: Record<string, string>;
  query?: { pages?: Array<{ title: string; links?: Array<{ title: string }>; revisions?: Array<{ revid: number }> }> };
}

interface PagePropsResponse {
  query?: { pages?: Array<{ title: string; missing?: boolean; pageprops?: { wikibase_item?: string; disambiguation?: string } }> };
}

const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

describe.skipIf(!process.env.CAPTURE_ROSTER)('build the roster', () => {
  it('writes roster.json from the Level 4 vital people list', async () => {
    let last = 0;
    const client = createWikimediaClient({
      maxConcurrent: 1,
      maxRetries: 8,
      baseDelayMs: 4000,
      fetchImpl: async (url, init) => {
        const wait = last + MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
        last = Date.now();
        return fetch(url, { ...init, headers: { ...(init?.headers as Record<string, string>), 'User-Agent': API_USER_AGENT } });
      },
    });

    const titles: string[] = [];
    let revision = 0;
    let cont: Record<string, string> = {};
    do {
      const data = await client.getJson<LinksResponse>(
        buildApiUrl(WIKIPEDIA_API, {
          action: 'query', formatversion: '2', redirects: '1', titles: SOURCE_PAGE,
          prop: 'links|revisions', plnamespace: '0', pllimit: 'max', rvprop: 'ids', ...cont,
        })
      );
      const page = data.query?.pages?.[0];
      revision ||= page?.revisions?.[0]?.revid ?? 0;
      titles.push(...(page?.links ?? []).map(l => l.title));
      cont = data.continue ?? {};
    } while (Object.keys(cont).length > 0);
    console.log(`📊 ${titles.length} linked articles at revision ${revision}`);

    const nameByQid = new Map<string, string>();
    for (const batch of chunk(titles, TITLE_BATCH)) {
      const data = await client.getJson<PagePropsResponse>(
        buildApiUrl(WIKIPEDIA_API, {
          action: 'query', formatversion: '2', redirects: '1', titles: batch.join('|'),
          prop: 'pageprops', ppprop: 'wikibase_item|disambiguation',
        })
      );
      for (const page of data.query?.pages ?? []) {
        const qid = page.pageprops?.wikibase_item;
        if (!qid || page.missing || page.pageprops?.disambiguation !== undefined || nameByQid.has(qid)) continue;
        nameByQid.set(qid, page.title);
      }
    }
    console.log(`📊 ${nameByQid.size} Wikidata items`);

    const statements = new Map<string, ItemStatements>();
    for (const batch of chunk([...nameByQid.keys()], SPARQL_BATCH)) {
      const data = await client.getJson<{ results: { bindings: SparqlBinding[] } }>(
        buildApiUrl(SPARQL_ENDPOINT, { query: rosterStatementsQuery(batch) })
      );
      for (const [qid, item] of statementsFromSparql(data.results.bindings)) statements.set(qid, item);
    }

    let reread = 0;
    for (const [qid, item] of statements) {
      for (const property of propertiesToReread(item)) {
        const data = await client.getJson<{ claims?: Record<string, WikidataClaim[]> }>(claimsUrl(qid, property));
        const claims = data.claims?.[property] ?? [];
        if (property === 'P569') item.births = claims;
        else item.deaths = claims;
        reread += 1;
      }
    }
    console.log(`📊 Re-read ${reread} ambiguous or Julian new-year properties from the JSON API`);

    const currentYear = new Date().getUTCFullYear();
    const people: RosterPerson[] = [];
    for (const [qid, name] of nameByQid) {
      const item = statements.get(qid);
      const person = item ? rosterPersonFrom(qid, name, item, currentYear) : null;
      if (person) people.push(person);
    }
    people.sort((a, b) => a.birthYear - b.birthYear || a.name.localeCompare(b.name));

    const gaps = findCoverageGaps(people, COVERAGE_FROM, COVERAGE_TO);
    const longLived = people.filter(p => !p.birthApproximate && !p.deathApproximate && p.deathYear - p.birthYear >= LONG_LIFE_YEARS);
    console.log(`📊 ${people.length} people; ${longLived.length} lived ${LONG_LIFE_YEARS}+ years with exact dates`);
    console.log(`📊 Coverage gaps ${COVERAGE_FROM}..${COVERAGE_TO}:`, gaps);

    const file: RosterFile = {
      source: SOURCE_PAGE,
      sourceRevision: revision,
      builtAt: new Date().toISOString().slice(0, 10),
      count: people.length,
      people: people.map(toRosterRow),
    };
    fs.writeFileSync(ROSTER_FILE, '{\n' + [
      `"source":${JSON.stringify(file.source)}`,
      `"sourceRevision":${file.sourceRevision}`,
      `"builtAt":${JSON.stringify(file.builtAt)}`,
      `"count":${file.count}`,
      `"people":[\n${file.people.map(r => JSON.stringify(r)).join(',\n')}\n]`,
    ].join(',\n') + '\n}\n');

    expect(gaps).toEqual([]);
  }, 3_600_000);
});
