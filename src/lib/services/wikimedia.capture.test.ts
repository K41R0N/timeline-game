/**
 * Records live Wikimedia responses into __fixtures__/wikimedia-responses.json.
 * Skipped by default; run with:  CAPTURE_WIKIMEDIA=1 npx vitest run src/lib/services/wikimedia.capture.test.ts
 * Wikimedia rate-limits shared IPs hard, so requests are spaced and retried patiently.
 */
import { describe, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { API_USER_AGENT, createWikimediaClient } from './wikimediaClient';
import { WikipediaService } from './WikipediaService';
import { FIXTURE_PEOPLE, FIXTURE_PORTRAITS } from './__fixtures__/people';

const FIXTURE_FILE = path.join(__dirname, '__fixtures__', 'wikimedia-responses.json');
const MIN_INTERVAL_MS = 1500;

describe.skipIf(!process.env.CAPTURE_WIKIMEDIA)('capture Wikimedia fixtures', () => {
  it('records responses for every fixture person', async () => {
    const recorded: Record<string, unknown> = fs.existsSync(FIXTURE_FILE) ? JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf8')) : {};
    let last = 0;

    const client = createWikimediaClient({
      maxConcurrent: 1,
      maxRetries: 8,
      baseDelayMs: 4000,
      fetchImpl: async (url, init) => {
        const wait = last + MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
        last = Date.now();
        const response = await fetch(url, { ...init, headers: { ...(init?.headers as Record<string, string>), 'User-Agent': API_USER_AGENT } });
        if (response.ok) {
          const body = await response.clone().text();
          try {
            recorded[url] = JSON.parse(body);
          } catch {
            // Non-JSON bodies are left to the client's error handling.
          }
        }
        return response;
      },
    });

    for (const title of FIXTURE_PEOPLE) {
      const result = await WikipediaService.lookupPerson(title, client, 2026);
      console.log(title, '=>', result.ok ? `${result.figure.name} ${result.figure.birthYear}..${result.figure.deathYear}` : result.reason);
    }
    const portraits = await WikipediaService.portraits([...FIXTURE_PORTRAITS], client);
    console.log('portraits =>', Object.keys(portraits).join(', '));
    fs.writeFileSync(FIXTURE_FILE, JSON.stringify(recorded, null, 1) + '\n');
  }, 900_000);
});
