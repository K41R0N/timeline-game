import { connection } from 'next/server';
import Link from 'next/link';
import { ArchiveList, currentTime, weekdayName } from '@/lib';
import { dailyArchive, dailyToday } from '@/lib/server/daily';

/** Every daily puzzle so far, newest first, in each style. Past puzzles play as practice. */
export default async function Archive() {
  await connection();
  const now = currentTime();
  const today = dailyToday(now);
  const rows = dailyArchive(now).map(p => ({ number: p.number, date: p.date, weekday: weekdayName(p.date) }));

  return (
    <main className="min-h-dvh w-full bg-[radial-gradient(120%_70%_at_50%_0%,var(--table-light)_0%,var(--table)_50%,var(--table-deep)_100%)] px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] text-[var(--table-ink)]">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-5 flex items-center gap-2">
          <Link href="/" aria-label="Home" className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--table-muted)] hover:text-[var(--table-ink)]">
            <svg aria-hidden className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.5 4.5 7 10l5.5 5.5" />
            </svg>
          </Link>
          <h1 className="type-display text-4xl font-black uppercase leading-none text-[var(--table-ink)] [text-shadow:none]">Past puzzles</h1>
        </div>
        {rows.length === 0 ? (
          <p className="text-[var(--table-muted)]">No daily puzzles yet.</p>
        ) : (
          <ArchiveList rows={rows} todayNumber={today.number} />
        )}
      </div>
    </main>
  );
}
