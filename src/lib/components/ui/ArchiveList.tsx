'use client';

import Link from 'next/link';
import type { Difficulty } from '../../utils/GameLogic';
import { useDailyProgress } from '../../hooks/useDailyProgress';
import { dailyStatusLine } from './dailyStatus';
import { STYLE_ON_STOCK } from './styles';

export interface ArchiveRow {
  number: number;
  date: string;
  weekday: string;
}

const STYLES: { style: Difficulty; path: string }[] = [
  { style: 'easy', path: '/easy' },
  { style: 'medium', path: '/medium' },
  { style: 'hard', path: '' },
];

/** Published daily puzzles, newest first, with what this browser did in each style. */
export function ArchiveList({ rows, todayNumber }: { rows: ArchiveRow[]; todayNumber: number | null }) {
  const progress = useDailyProgress();

  return (
    <ol className="space-y-2.5">
      {rows.map(row => (
        <li key={row.number} className="flex items-stretch gap-3 rounded-xl bg-[var(--card-stock)] px-3 py-2 text-[var(--card-ink)] shadow-[0_3px_0_rgba(0,0,0,0.3)]">
          <span className="type-display flex w-12 shrink-0 flex-col justify-center text-center leading-none">
            <span className="block text-2xl font-black">#{row.number}</span>
            <span className="block text-xs font-bold uppercase text-[var(--card-muted)]">{row.weekday.slice(0, 3)}</span>
            <span className="block text-[11px] font-semibold text-[var(--card-muted)]">{row.date.slice(5)}</span>
          </span>
          <span className="grid flex-1 grid-cols-3 gap-1.5">
            {STYLES.map(({ style, path }) => {
              const line = progress && todayNumber !== null ? dailyStatusLine(progress, style, row.number, todayNumber) : null;
              return (
                <Link
                  key={style}
                  href={`/daily/${row.number}${path}`}
                  aria-label={`Daily #${row.number}, ${row.date}, ${style}${line ? `: ${line.text}` : ''}`}
                  className="type-display flex min-h-12 flex-col items-center justify-center rounded-lg px-1 py-1 text-center uppercase leading-tight transition-colors hover:bg-[rgba(15,30,34,0.06)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]"
                >
                  <span className={`text-sm font-black ${STYLE_ON_STOCK[style]}`}>{style}</span>
                  <span className={`text-[13px] font-bold ${line?.status === 'result' ? 'text-[var(--card-ink)]' : 'text-[var(--card-muted)]'}`}>{line?.text ?? ''}</span>
                </Link>
              );
            })}
          </span>
        </li>
      ))}
    </ol>
  );
}
