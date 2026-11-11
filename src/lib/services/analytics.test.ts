import { describe, expect, it, vi } from 'vitest';
import { createAnalytics, type AnalyticsClient } from './analytics';

function fakeClient() {
  return { init: vi.fn(), capture: vi.fn(), register_once: vi.fn() } satisfies AnalyticsClient;
}

describe('createAnalytics', () => {
  it('stays off and never loads the SDK without a key, so local dev and tests make no network calls', async () => {
    const load = vi.fn();
    const analytics = createAnalytics({ key: undefined, load });
    analytics.track('game_started', { difficulty: 'easy' });
    await analytics.flush();
    expect(load).not.toHaveBeenCalled();
  });

  it('loads once, sends events in order, and keeps no person profiles for anonymous players', async () => {
    const client = fakeClient();
    const load = vi.fn(async () => client);
    const analytics = createAnalytics({ key: 'phc_test', host: 'https://eu.i.posthog.com', load });

    analytics.track('game_started', { difficulty: 'hard' });
    analytics.track('figure_added', { accepted: true });
    await analytics.flush();

    expect(load).toHaveBeenCalledTimes(1);
    expect(client.init).toHaveBeenCalledWith('phc_test', expect.objectContaining({ api_host: 'https://eu.i.posthog.com', person_profiles: 'identified_only' }));
    expect(client.capture.mock.calls.map(call => call[0])).toEqual(['game_started', 'figure_added']);
  });

  it('records a referrer code from the first visit URL', async () => {
    const client = fakeClient();
    const analytics = createAnalytics({ key: 'phc_test', load: async () => client, url: 'https://historylinks.example/?ref=ludwig' });
    analytics.track('game_started', {});
    await analytics.flush();
    expect(client.register_once).toHaveBeenCalledWith({ referrer_code: 'ludwig' });
  });

  it('drops events instead of throwing when the SDK fails to load', async () => {
    const analytics = createAnalytics({ key: 'phc_test', load: async () => Promise.reject(new Error('blocked by an ad blocker')) });
    analytics.track('game_started', {});
    await expect(analytics.flush()).resolves.toBeUndefined();
  });

  it('keeps sending events after one capture throws', async () => {
    const client = fakeClient();
    client.capture.mockImplementationOnce(() => {
      throw new Error('capture failed');
    });
    const analytics = createAnalytics({ key: 'phc_test', load: async () => client });
    analytics.track('game_started', {});
    analytics.track('game_completed', {});
    await analytics.flush();
    expect(client.capture.mock.calls.map(call => call[0])).toEqual(['game_started', 'game_completed']);
  });
});
