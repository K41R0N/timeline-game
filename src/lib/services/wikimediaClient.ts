/**
 * The only module that talks to Wikimedia APIs (Wikipedia and Wikidata).
 *
 * - Identifies the app with `Api-User-Agent` (browsers forbid overriding User-Agent).
 * - Limits concurrent requests so a game start or hint panel cannot burst.
 * - Retries 429/5xx and network errors with backoff, honouring Retry-After.
 * - Checks status and parses JSON safely (Wikimedia rate-limit responses are HTML/text).
 * - Caches successful responses by URL and de-duplicates in-flight requests.
 */

export const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
export const API_USER_AGENT = 'HistoryLinks/0.1 (https://github.com/K41R0N/timeline-game)';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface WikimediaClientOptions {
  fetchImpl?: FetchLike;
  maxConcurrent?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxCacheEntries?: number;
  sleep?: (ms: number) => Promise<void>;
}

export class WikimediaRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly url: string
  ) {
    super(message);
    this.name = 'WikimediaRequestError';
  }
}

export interface WikimediaClient {
  getJson<T>(url: string): Promise<T>;
  clearCache(): void;
}

/** Build an Action API URL. `format=json` and anonymous CORS (`origin=*`) are always set. */
export function buildApiUrl(base: string, params: Record<string, string>): string {
  const search = new URLSearchParams({ format: 'json', origin: '*', ...params });
  return `${base}?${search.toString()}`;
}

const RETRYABLE_STATUS = (status: number) => status === 429 || status >= 500;

export function createWikimediaClient(options: WikimediaClientOptions = {}): WikimediaClient {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const maxConcurrent = options.maxConcurrent ?? 4;
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxCacheEntries = options.maxCacheEntries ?? 500;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));

  const cache = new Map<string, Promise<unknown>>();
  let active = 0;
  const waiting: Array<() => void> = [];

  async function acquire(): Promise<void> {
    if (active < maxConcurrent) {
      active++;
      return;
    }
    // The releasing request hands its slot over directly, so `active` is not incremented here.
    await new Promise<void>(resolve => waiting.push(resolve));
  }

  function release(): void {
    const next = waiting.shift();
    if (next) {
      next();
    } else {
      active--;
    }
  }

  function retryDelay(attempt: number, response: Response | null): number {
    const retryAfter = response?.headers.get('retry-after');
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    return baseDelayMs * 2 ** attempt;
  }

  async function request<T>(url: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let response: Response | null = null;
      let networkError: unknown = null;

      await acquire();
      try {
        response = await fetchImpl(url, { headers: { 'Api-User-Agent': API_USER_AGENT } });
      } catch (error) {
        networkError = error;
      } finally {
        release();
      }

      const retryable = networkError !== null || (response !== null && RETRYABLE_STATUS(response.status));
      if (retryable) {
        if (attempt < maxRetries) {
          await sleep(retryDelay(attempt, response));
          continue;
        }
        const reason = networkError ? String(networkError) : `HTTP ${response?.status}`;
        throw new WikimediaRequestError(`Wikimedia request failed after ${attempt + 1} attempts: ${reason}`, response?.status ?? null, url);
      }

      if (!response || !response.ok) {
        throw new WikimediaRequestError(`Wikimedia request failed: HTTP ${response?.status}`, response?.status ?? null, url);
      }

      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new WikimediaRequestError('Wikimedia returned a non-JSON response', response.status, url);
      }

      const apiError = (data as { error?: { code?: string; info?: string } }).error;
      if (apiError) {
        throw new WikimediaRequestError(`Wikimedia API error ${apiError.code}: ${apiError.info}`, response.status, url);
      }
      return data as T;
    }
  }

  return {
    getJson<T>(url: string): Promise<T> {
      const cached = cache.get(url);
      if (cached) {
        // Refresh recency for LRU eviction.
        cache.delete(url);
        cache.set(url, cached);
        return cached as Promise<T>;
      }

      const pending = request<T>(url);
      cache.set(url, pending);
      pending.catch(() => cache.delete(url));

      if (cache.size > maxCacheEntries) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return pending;
    },
    clearCache() {
      cache.clear();
    },
  };
}

/** Shared client for the app. */
export const wikimedia = createWikimediaClient();
