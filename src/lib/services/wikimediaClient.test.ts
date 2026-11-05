import { describe, expect, it, vi } from 'vitest';
import { API_USER_AGENT, WikimediaRequestError, buildApiUrl, createWikimediaClient } from './wikimediaClient';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

const RATE_LIMIT_BODY = 'You are making too many requests to the API.\nPlease follow the best practices at https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits.';

describe('buildApiUrl', () => {
  it('always requests JSON with anonymous CORS', () => {
    const url = new URL(buildApiUrl('https://en.wikipedia.org/w/api.php', { action: 'query', titles: 'Plato' }));
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('origin')).toBe('*');
    expect(url.searchParams.get('titles')).toBe('Plato');
  });
});

describe('createWikimediaClient', () => {
  it('sends the Api-User-Agent header', async () => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => jsonResponse({ ok: true }));
    const client = createWikimediaClient({ fetchImpl, sleep: async () => {} });
    await client.getJson('https://example.test/a');
    const init = fetchImpl.mock.calls[0][1]!;
    expect((init.headers as Record<string, string>)['Api-User-Agent']).toBe(API_USER_AGENT);
  });

  it('retries a 429 plain-text response, honouring Retry-After, then succeeds', async () => {
    const delays: number[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(RATE_LIMIT_BODY, { status: 429, headers: { 'retry-after': '2' } }))
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ value: 42 }));
    const client = createWikimediaClient({ fetchImpl, baseDelayMs: 100, sleep: async ms => { delays.push(ms); } });

    await expect(client.getJson('https://example.test/b')).resolves.toEqual({ value: 42 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([2000, 200]);
  });

  it('gives up after maxRetries with a typed error instead of a JSON parse crash', async () => {
    const fetchImpl = vi.fn(async () => new Response(RATE_LIMIT_BODY, { status: 429 }));
    const client = createWikimediaClient({ fetchImpl, maxRetries: 2, sleep: async () => {} });

    const error = (await client.getJson('https://example.test/c').catch((e: unknown) => e)) as WikimediaRequestError;
    expect(error).toBeInstanceOf(WikimediaRequestError);
    expect(error.status).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('rejects a 200 response that is not JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response('<!DOCTYPE html><title>Wikimedia Error</title>', { status: 200 }));
    const client = createWikimediaClient({ fetchImpl, sleep: async () => {} });
    await expect(client.getJson('https://example.test/d')).rejects.toThrow('non-JSON');
  });

  it('surfaces MediaWiki API error payloads', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: 'badvalue', info: 'Unrecognized value' } }));
    const client = createWikimediaClient({ fetchImpl, sleep: async () => {} });
    await expect(client.getJson('https://example.test/e')).rejects.toThrow('badvalue');
  });

  it('retries network failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    const client = createWikimediaClient({ fetchImpl, sleep: async () => {} });
    await expect(client.getJson('https://example.test/f')).resolves.toEqual({ ok: 1 });
  });

  it('caches successful responses and de-duplicates in-flight requests', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ cached: true }));
    const client = createWikimediaClient({ fetchImpl, sleep: async () => {} });

    const [a, b] = await Promise.all([client.getJson('https://example.test/g'), client.getJson('https://example.test/g')]);
    const c = await client.getJson('https://example.test/g');
    expect(a).toEqual({ cached: true });
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ later: true }));
    const client = createWikimediaClient({ fetchImpl, sleep: async () => {} });
    await expect(client.getJson('https://example.test/h')).rejects.toBeInstanceOf(WikimediaRequestError);
    await expect(client.getJson('https://example.test/h')).resolves.toEqual({ later: true });
  });

  it('never runs more than maxConcurrent requests at once', async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchImpl = vi.fn(async (url: string) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise(resolve => setTimeout(resolve, 5));
      inFlight--;
      return jsonResponse({ url });
    });
    const client = createWikimediaClient({ fetchImpl, maxConcurrent: 2, sleep: async () => {} });

    await Promise.all(Array.from({ length: 7 }, (_, i) => client.getJson(`https://example.test/p${i}`)));
    expect(peak).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(7);
  });

  it('evicts the least recently used entry beyond maxCacheEntries', async () => {
    const fetchImpl = vi.fn(async (url: string) => jsonResponse({ url }));
    const client = createWikimediaClient({ fetchImpl, maxCacheEntries: 2, sleep: async () => {} });
    await client.getJson('https://example.test/1');
    await client.getJson('https://example.test/2');
    await client.getJson('https://example.test/1'); // refresh 1
    await client.getJson('https://example.test/3'); // evicts 2
    await client.getJson('https://example.test/1');
    await client.getJson('https://example.test/2');
    expect(fetchImpl.mock.calls.map(c => c[0])).toEqual([
      'https://example.test/1',
      'https://example.test/2',
      'https://example.test/3',
      'https://example.test/2',
    ]);
  });
});
