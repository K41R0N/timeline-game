import { connection } from 'next/server';
import Link from 'next/link';
import { ArchiveList, currentTime, weekdayName } from '@/lib';
import { dailyArchive, dailyToday } from '@/lib/server/daily';

/** Every daily puzzle so far, newest first. Past puzzles play as practice. */
export default async function Archive() {
  await connection();
  const now = currentTime();
  const today = dailyToday(now);
  const rows = dailyArchive(now).map(p => ({
    number: p.number,
    date: p.date,
    weekday: weekdayName(p.date),
    band: p.band,
    targetA: p.targetA.name,
    targetB: p.targetB.name,
  }));

  return (
    <div className="min-h-screen w-full bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-primary">Past puzzles</h1>
          <Link href="/" className="text-sm font-semibold text-primary underline">
            Home
          </Link>
        </div>
        <p className="text-sm text-foreground-muted mb-6">Replays of past puzzles are practice: your result from the day stays your record.</p>
        {rows.length === 0 ? (
          <p className="text-foreground-muted">No daily puzzles yet.</p>
        ) : (
          <ArchiveList rows={rows} todayNumber={today.puzzle?.number ?? null} />
        )}
      </div>
    </div>
  );
}
