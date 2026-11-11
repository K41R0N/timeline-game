'use client';

import { useState } from 'react';
import type { HistoricalFigure } from '../../types/HistoricalFigure';
import { eraOf, type Era } from '../../utils/board';

/** The colour of each era of birth, from the Deck tokens in globals.css. */
export const ERA_COLOR: Record<Era, string> = {
  ancient: 'var(--era-ancient)',
  medieval: 'var(--era-medieval)',
  renaissance: 'var(--era-renaissance)',
  enlightenment: 'var(--era-enlightenment)',
  modern: 'var(--era-modern)',
};

const SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-lg',
  lg: 'h-14 w-14 text-2xl',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(part => /^[A-Z]/.test(part))
    .map(part => part[0])
    .join('')
    .slice(0, 2);
}

type PortraitPerson = Pick<HistoricalFigure, 'name' | 'birthYear'> & { imageUrl?: string };

/** A person's Wikipedia portrait, or their initials on their era's colour when there is none or it fails to load. */
export function Portrait({ figure, size = 'md' }: { figure: PortraitPerson; size?: keyof typeof SIZES }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (figure.imageUrl && figure.imageUrl !== failedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Wikimedia thumbnails at their own size; nothing to optimise
      <img
        src={figure.imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(figure.imageUrl ?? null)}
        className={`${SIZES[size]} shrink-0 rounded-md bg-[var(--card-muted)] object-cover object-top`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`type-display grid ${SIZES[size]} shrink-0 place-items-center rounded-md font-extrabold text-white`}
      style={{ background: ERA_COLOR[eraOf(figure.birthYear)] }}
    >
      {initials(figure.name) || '?'}
    </span>
  );
}
