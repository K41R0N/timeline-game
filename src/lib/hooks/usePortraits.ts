'use client';

import { useEffect, useState } from 'react';
import { WikipediaService } from '../services/WikipediaService';

/** Portraits for a puzzle's people, by title, from one Wikipedia request; empty until it answers or when it fails. */
export function usePortraits(titles: string[]): Record<string, string> {
  const key = titles.join('|');
  const [loaded, setLoaded] = useState<{ key: string; images: Record<string, string> }>({ key: '', images: {} });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    WikipediaService.portraits(key.split('|')).then(images => {
      if (!cancelled) setLoaded({ key, images });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return loaded.key === key ? loaded.images : {};
}
