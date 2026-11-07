'use client';

import Link from 'next/link';
import type { Difficulty } from '../../utils/GameLogic';
import { useDailyProgress } from '../../hooks/useDailyProgress';
import { puzzleStatus, type PuzzleStatus } from '../../utils/dailyProgress';
import { BandBadge } from './BandBadge';

export interface ArchiveRow {
  number: number;
  date: string;
  weekday: string;
  band: Difficulty;
  targetA: string;
  targetB: string;
}

function statusText(status: PuzzleStatus): string {
  switch (status.status) {
    case 'result':
      return status.result.par === null ? `${status.result.strokes} strokes` : `${status.result.strokes} strokes · par ${status.result.par}`;
    case 'resume':
      return 'In progress';
    case 'practice':
      return 'Practised';
    case 'play':
      return 'Today';
    default:
      return 'Not played';
  }
}

/** Published daily puzzles, newest first, with what this browser did on each. */
export function ArchiveList({ rows, todayNumber }: { rows: ArchiveRow[]; todayNumber: number | null }) {
  const progress = useDailyProgress();

  return (
    <ol className="space-y-2">
      {rows.map(row => {
        const status = progress && todayNumber !== null ? puzzleStatus(progress, row.number, todayNumber) : null;
        return (
          <li key={row.number}>
            <Link href={`/daily/${row.number}`} className="timeline-card block p-3 hover:shadow-glow transition-shadow">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">
                    #{row.number} · {row.weekday} <span className="text-foreground-subtle font-normal">{row.date}</span>
                  </div>
                  <div className="text-sm text-foreground-muted truncate">
                    {row.targetA} → {row.targetB}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <BandBadge band={row.band} />
                  {status && (
                    <span className={`text-xs ${status.status === 'result' ? 'font-semibold text-green-700' : 'text-foreground-subtle'}`}>
                      {statusText(status)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
