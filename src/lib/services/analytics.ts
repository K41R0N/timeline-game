/**
 * Product analytics (PostHog). Off unless NEXT_PUBLIC_POSTHOG_KEY is set at build time, so local
 * development and tests never load the SDK or make a request. Players stay anonymous: no
 * accounts, no person profiles, no session recording (STRATEGY.md boundary).
 */

export interface AnalyticsClient {
  init(key: string, options: Record<string, unknown>): unknown;
  capture(event: string, properties?: Record<string, unknown>): unknown;
  register_once(properties: Record<string, unknown>): unknown;
}

export interface AnalyticsOptions {
  key: string | undefined;
  host?: string;
  load: () => Promise<AnalyticsClient>;
  /** The page URL; a `ref` parameter is kept as the player's referrer code. */
  url?: string;
}

export interface Analytics {
  track(event: string, properties: Record<string, unknown>): void;
  /** Resolves once every event tracked so far has been handed to the SDK. */
  flush(): Promise<void>;
}

const DEFAULT_HOST = 'https://us.i.posthog.com';

/** Wall-clock milliseconds, for round durations. */
export function currentTime(): number {
  return Date.now();
}

export function createAnalytics({ key, host = DEFAULT_HOST, load, url }: AnalyticsOptions): Analytics {
  if (!key) return { track() {}, flush: async () => {} };

  let client: Promise<AnalyticsClient | null> | null = null;
  let queue: Promise<void> = Promise.resolve();

  const ready = () =>
    (client ??= load()
      .then(posthog => {
        posthog.init(key, {
          api_host: host,
          person_profiles: 'identified_only',
          autocapture: false,
          capture_pageview: true,
          disable_session_recording: true,
        });
        const referrer = url ? new URL(url).searchParams.get('ref') : null;
        if (referrer) posthog.register_once({ referrer_code: referrer });
        return posthog;
      })
      .catch(error => {
        console.warn('⚠️ Analytics unavailable:', error);
        return null;
      }));

  return {
    track(event, properties) {
      queue = queue
        .then(() => ready())
        .then(posthog => {
          posthog?.capture(event, properties);
        })
        .catch(error => console.warn('⚠️ Analytics event not sent:', error));
    },
    flush: () => queue,
  };
}

/** The app's analytics, configured from the build environment. */
export const analytics: Analytics = createAnalytics({
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  load: () => import('posthog-js').then(module => module.default),
  url: typeof window === 'undefined' ? undefined : window.location.href,
});
