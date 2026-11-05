import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/wikimedia-responses.json';
import { createWikimediaClient, type WikimediaClient } from './wikimediaClient';
import { WikipediaService, type PersonLookupResult } from './WikipediaService';

const recorded = fixtures as Record<string, unknown>;

/** Replays recorded Wikimedia responses; any unrecorded URL fails the test. */
const client = createWikimediaClient({
  sleep: async () => {},
  maxRetries: 0,
  fetchImpl: async url => {
    if (!(url in recorded)) return new Response(`No fixture for ${url}`, { status: 404 });
    return new Response(JSON.stringify(recorded[url]), { status: 200 });
  },
});

const lookup = (title: string) => WikipediaService.lookupPerson(title, client, 2026);

function expectFigure(result: PersonLookupResult) {
  if (!result.ok) throw new Error(`expected a figure, got ${result.reason}`);
  return result.figure;
}

describe('WikipediaService.lookupPerson (recorded fixtures)', () => {
  it('reads Cleopatra’s birth from Wikidata, not the 1st-century category midpoint', async () => {
    const f = expectFigure(await lookup('Cleopatra'));
    expect(f.birthYear).toBe(-69);
    expect(f.deathYear).toBe(-30);
  });

  it('reads Genghis Khan’s birth instead of guessing death - 30', async () => {
    const f = expectFigure(await lookup('Genghis Khan'));
    expect(f.birthYear).toBeGreaterThanOrEqual(1155);
    expect(f.birthYear).toBeLessThanOrEqual(1167);
    expect(f.deathYear).toBe(1227);
  });

  it('reads Gutenberg’s birth instead of guessing death - 30', async () => {
    const f = expectFigure(await lookup('Johannes Gutenberg'));
    expect(f.birthYear).toBeGreaterThanOrEqual(1393);
    expect(f.birthYear).toBeLessThanOrEqual(1406);
    expect(f.deathYear).toBe(1468);
  });

  it('places Ramesses II in the 13th century BCE rather than century midpoints', async () => {
    const f = expectFigure(await lookup('Ramesses II'));
    expect(f.birthYear).toBeGreaterThanOrEqual(-1310);
    expect(f.birthYear).toBeLessThanOrEqual(-1290);
    expect(f.deathYear).toBeGreaterThanOrEqual(-1215);
    expect(f.deathYear).toBeLessThanOrEqual(-1210);
  });

  it('marks living people as living instead of inventing a death year', async () => {
    const f = expectFigure(await lookup('Barack Obama'));
    expect(f.birthYear).toBe(1961);
    expect(f.isLiving).toBe(true);
    expect(f.deathYear).toBe(2026);
  });

  it.each(['Rome', 'Pink Floyd'])('rejects %s as not a person', async title => {
    const result = await lookup(title);
    expect(result).toMatchObject({ ok: false, reason: 'not_a_person' });
  });

  it('resolves casing to the canonical title and uses the Wikidata QID as id', async () => {
    const f = expectFigure(await lookup('julius caesar'));
    expect(f.name).toBe('Julius Caesar');
    expect(f.id).toBe('Q1048');
    expect([f.birthYear, f.deathYear]).toEqual([-100, -44]);
  });

  it('resolves redirects so aliases share one identity', async () => {
    const f = expectFigure(await lookup('Machiavelli'));
    expect(f.name).toBe('Niccolò Machiavelli');
    expect(f.id).toMatch(/^Q\d+$/);
  });

  it('uses a clean short description (no "istotle was…" corruption)', async () => {
    const f = expectFigure(await lookup('Aristotle'));
    expect(f.shortDescription.length).toBeGreaterThan(0);
    expect(f.shortDescription).not.toMatch(/^istotle/);
    expect(f.summary).toMatch(/^Aristotle/);
  });

  it('reports malformed Wikidata dates as no_dates, not as a network failure', async () => {
    const malformed: WikimediaClient = {
      clearCache() {},
      async getJson<T>(url: string): Promise<T> {
        if (url.includes('wbgetclaims')) {
          const property = new URL(url).searchParams.get('property') ?? '';
          const value = property === 'P31' ? { id: 'Q5' } : { time: 'not-a-time', precision: 9 };
          return { claims: { [property]: [{ rank: 'normal', mainsnak: { snaktype: 'value', datavalue: { value } } }] } } as T;
        }
        return { query: { pages: [{ title: 'Someone', pageprops: { wikibase_item: 'Q1' } }] } } as T;
      },
    };
    const result = await WikipediaService.lookupPerson('Someone', malformed, 2026);
    expect(result).toMatchObject({ ok: false, reason: 'no_dates' });
  });

  it('reports a network failure without throwing', async () => {
    const result = await lookup('A title with no recorded fixture');
    expect(result).toMatchObject({ ok: false, reason: 'network' });
  });
});
