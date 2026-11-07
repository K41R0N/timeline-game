'use client';

import Link from 'next/link';
import type { Difficulty } from '../../utils/GameLogic';
import { useDailyProgress } from '../../hooks/useDailyProgress';
import { puzzleStatus, type PuzzleStatus } from '../../utils/dailyProgress';

export interface ArchiveRow {
  number: number;
  date: string;
  weekday: string;
  band: Difficulty;
  targetA: string;
  targetB: string;
}

const BAND_ON_STOCK: Record<Difficulty, string> = {
  easy: 'text-[#15803d]',
  medium: 'text-[#a16207]',
  hard: 'text-[#b91c1c]',
};

function statusText(status: PuzzleStatus): string {
  switch (status.status) {
    case 'result':
      return status.result.par === null ? `${status.result.strokes}` : `${status.result.strokes} / par ${status.result.par}`;
    case 'resume':
      return 'Playing';
    case 'practice':
      return 'Practised';
    case 'play':
      return 'Today';
    default:
      return '';
  }
}

/** Published daily puzzles, newest first, with what this browser did on each. */
export function ArchiveList({ rows, todayNumber }: { rows: ArchiveRow[]; todayNumber: number | null }) {
  const progress = useDailyProgress();

  return (
    <ol className="space-y-2.5">
      {rows.map(row => {
        const status = progress && todayNumber !== null ? puzzleStatus(progress, row.number, todayNumber) : null;
        const text = status ? statusText(status) : '';
        return (
          <li key={row.number}>
            <Link
              href={`/daily/${row.number}`}
              className="flex items-center gap-4 rounded-xl bg-[var(--card-stock)] px-4 py-3 text-[var(--card-ink)] shadow-[0_3px_0_rgba(0,0,0,0.3)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)]"
            >
              <span className="type-display w-12 shrink-0 text-center leading-none">
                <span className="block text-2xl font-black">#{row.number}</span>
                <span className="block text-xs font-bold uppercase text-[var(--card-muted)]">{row.weekday.slice(0, 3)}</span>
              </span>
              <span className="type-display min-w-0 flex-1 text-[17px] font-extrabold uppercase leading-[0.95]">
                {row.targetA} <span className="font-semibold text-[var(--card-muted)]">to</span> {row.targetB}
              </span>
              <span className="type-display shrink-0 text-right text-sm font-bold uppercase leading-tight">
                <span className={`block ${BAND_ON_STOCK[row.band]}`}>{row.band}</span>
                {text && <span className={`block ${status?.status === 'result' ? 'text-[var(--card-ink)]' : 'text-[var(--card-muted)]'}`}>{text}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
