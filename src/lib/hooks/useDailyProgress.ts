'use client';

import { useSyncExternalStore } from 'react';
import { EMPTY_PROGRESS, compactProgress, normalizeDailyProgress, type DailyProgress } from '../utils/dailyProgress';

// Separate from the free-play save (timeline-game-state-v2), so the two never overwrite each other.
const STORAGE_KEY = 'history-links-daily-v1';

let cache: DailyProgress | null = null;
const listeners = new Set<() => void>();

function readProgress(): DailyProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeDailyProgress(JSON.parse(saved)) : EMPTY_PROGRESS;
  } catch (error) {
    console.error('❌ Error loading daily progress:', error);
    return EMPTY_PROGRESS;
  }
}

function writeProgress(progress: DailyProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('❌ Error saving daily progress:', error);
  }
}

function getSnapshot(): DailyProgress {
  cache ??= compactProgress(readProgress(), Date.now());
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab may have saved while nothing here was listening.
  cache = null;
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Applies a change to this browser's daily progress and saves it at once. */
export function updateDailyProgress(change: (progress: DailyProgress) => DailyProgress) {
  // Start from what is stored now, so a change from another tab is not overwritten by a stale copy.
  const current = compactProgress(readProgress(), Date.now());
  const next = change(current);
  if (next === current) return;
  cache = next;
  writeProgress(next);
  listeners.forEach(listener => listener());
}

/** This browser's daily progress, or null while rendering on the server and during hydration. */
export function useDailyProgress(): DailyProgress | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
