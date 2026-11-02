import { HistoricalFigure } from '../types/HistoricalFigure';
import { WIKIDATA_API, WIKIPEDIA_API, WikimediaClient, buildApiUrl, wikimedia } from './wikimediaClient';
import { WikidataClaim, isHuman, resolveLifespan, summarize } from './personData';

export interface WikipediaSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  thumbnail?: string;
}

export type PersonLookupFailure = 'not_found' | 'not_a_person' | 'no_dates' | 'network';

export type PersonLookupResult =
  | { ok: true; figure: HistoricalFigure }
  | { ok: false; reason: PersonLookupFailure; title: string };

interface QueryPage {
  pageid?: number;
  title: string;
  missing?: boolean;
  invalid?: boolean;
  description?: string;
  extract?: string;
  pageprops?: { wikibase_item?: string; disambiguation?: string };
  thumbnail?: { source: string };
  categories?: Array<{ title: string }>;
}

interface QueryResponse {
  query?: { pages?: QueryPage[] };
}

interface ClaimsResponse {
  claims?: Record<string, WikidataClaim[]>;
}

const THUMBNAIL_SIZE = '440';

export function personPageUrl(title: string): string {
  return buildApiUrl(WIKIPEDIA_API, {
    action: 'query',
    formatversion: '2',
    titles: title,
    redirects: '1',
    prop: 'pageprops|pageimages|description|extracts|categories',
    ppprop: 'wikibase_item|disambiguation',
    piprop: 'thumbnail',
    pithumbsize: THUMBNAIL_SIZE,
    exintro: '1',
    explaintext: '1',
    cllimit: 'max',
  });
}

export function claimsUrl(entity: string, property: string): string {
  return buildApiUrl(WIKIDATA_API, { action: 'wbgetclaims', entity, property });
}

export function lookupFailureMessage(reason: PersonLookupFailure, title: string): string {
  switch (reason) {
    case 'not_found':
      return `No Wikipedia article found for "${title}"`;
    case 'not_a_person':
      return `"${title}" isn't a person — only people can join the chain`;
    case 'no_dates':
      return `Couldn't find reliable birth and death years for "${title}"`;
    case 'network':
      return `Wikipedia didn't respond for "${title}" — try again in a moment`;
  }
}

export class WikipediaService {
  /**
   * Resolve a title to a person with Wikidata-backed dates.
   * Redirects and casing resolve to the canonical title; the Wikidata QID is the id.
   */
  static async lookupPerson(title: string, client: WikimediaClient = wikimedia, currentYear = new Date().getUTCFullYear()): Promise<PersonLookupResult> {
    const trimmed = title.trim();
    if (!trimmed) return { ok: false, reason: 'not_found', title };

    try {
      const data = await client.getJson<QueryResponse>(personPageUrl(trimmed));
      const page = data.query?.pages?.[0];
      if (!page || page.missing || page.invalid) return { ok: false, reason: 'not_found', title: trimmed };

      const qid = page.pageprops?.wikibase_item;
      if (!qid || page.pageprops?.disambiguation !== undefined) {
        return { ok: false, reason: qid ? 'not_a_person' : 'not_found', title: page.title };
      }

      const [instanceOf, births, deaths] = await Promise.all(
        ['P31', 'P569', 'P570'].map(property =>
          client.getJson<ClaimsResponse>(claimsUrl(qid, property)).then(r => r.claims?.[property] ?? [])
        )
      );

      if (!isHuman(instanceOf)) return { ok: false, reason: 'not_a_person', title: page.title };

      const categories = (page.categories ?? []).map(c => c.title);
      const lifespan = resolveLifespan(births, deaths, categories, currentYear);
      if (!lifespan) return { ok: false, reason: 'no_dates', title: page.title };

      const summary = summarize(page.extract ?? '');
      const figure: HistoricalFigure = {
        id: qid,
        wikidataId: qid,
        name: page.title,
        ...lifespan,
        shortDescription: page.description?.trim() || summarize(page.extract ?? '', 1, 200),
        summary,
        imageUrl: page.thumbnail?.source ?? '',
        contemporaries: [],
      };
      console.log(`[WikipediaService] ✅ ${figure.name} (${figure.id}) ${figure.birthYear}..${figure.isLiving ? 'living' : figure.deathYear}`);
      return { ok: true, figure };
    } catch (error) {
      console.error(`[WikipediaService] ❌ Lookup failed for "${trimmed}":`, error);
      return { ok: false, reason: 'network', title: trimmed };
    }
  }

  /** Convenience wrapper for callers that only need the figure. */
  static async getPersonDetails(title: string, client: WikimediaClient = wikimedia): Promise<HistoricalFigure | null> {
    const result = await this.lookupPerson(title, client);
    return result.ok ? result.figure : null;
  }

  /** Autocomplete: Wikipedia search filtered to pages with birth/death categories. */
  static async searchPerson(query: string, client: WikimediaClient = wikimedia): Promise<WikipediaSearchResult[]> {
    const url = buildApiUrl(WIKIPEDIA_API, {
      action: 'query',
      formatversion: '2',
      generator: 'search',
      gsrsearch: `${query} -disambiguation`,
      gsrlimit: '10',
      prop: 'categories|description|pageimages',
      piprop: 'thumbnail',
      pithumbsize: '120',
      pilimit: 'max',
      cllimit: 'max',
    });

    try {
      const data = await client.getJson<QueryResponse>(url);
      const pages = data.query?.pages ?? [];
      return pages
        .filter(page => (page.categories ?? []).some(cat => /\b(births|deaths)$/i.test(cat.title) || /living people/i.test(cat.title)))
        .map(page => ({
          pageid: page.pageid ?? 0,
          title: page.title,
          snippet: page.description ?? '',
          thumbnail: page.thumbnail?.source,
        }));
    } catch (error) {
      console.error('[WikipediaService] ❌ Error searching Wikipedia:', error);
      return [];
    }
  }

  /**
   * Hint titles for the detail panel. Known to return noise (year articles); tracked in #51.
   * Kept on the shared client so it is throttled and cached.
   */
  static async findContemporaries(figure: HistoricalFigure, client: WikimediaClient = wikimedia): Promise<string[]> {
    const url = buildApiUrl(WIKIPEDIA_API, {
      action: 'query',
      list: 'search',
      srsearch: `${figure.birthYear} ${figure.deathYear} births deaths -disambiguation`,
      srlimit: '20',
    });

    try {
      const data = await client.getJson<{ query?: { search?: Array<{ title: string }> } }>(url);
      return (data.query?.search ?? []).map(result => result.title).filter(title => title !== figure.name);
    } catch (error) {
      console.error(`[WikipediaService] ❌ Error finding contemporaries for ${figure.name}:`, error);
      return [];
    }
  }
}
