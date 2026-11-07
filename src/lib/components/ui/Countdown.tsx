'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

// One shared ticking clock: whole seconds, so React re-renders once a second at most.
const tickListeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  tickListeners.add(listener);
  ticker ??= setInterval(() => tickListeners.forEach(l => l()), 1000);
  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size === 0 && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

function format(seconds: number): string {
  const s = Math.max(0, seconds);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Time left until the next daily puzzle; refreshes the page when it goes live. */
export function Countdown({ until, label = 'Next puzzle in' }: { until: number; label?: string }) {
  const router = useRouter();
  const now = useSyncExternalStore(subscribe, nowSeconds, () => null);
  const left = now === null ? null : Math.ceil(until / 1000) - now;

  useEffect(() => {
    if (left !== null && left <= 0) router.refresh();
  }, [left, router]);

  return (
    <span className="whitespace-nowrap">
      {label} <span className="font-mono tabular-nums">{left === null ? '--:--:--' : format(left)}</span>
    </span>
  );
}
