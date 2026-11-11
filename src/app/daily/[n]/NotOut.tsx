import Link from 'next/link';
import { Countdown, weekdayName } from '@/lib';
import { dailyDate, type DailyToday } from '@/lib/server/daily';

/** A daily puzzle that is not live: a future number says when it goes out and nothing else; anything else is no puzzle. */
export function NotOut({ n, today, path = '' }: { n: number | null; today: DailyToday; path?: string }) {
  const future = n !== null && (today.number === null || n > today.number);
  const date = future ? dailyDate(n) : null;
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[var(--table-deep)] px-4 text-[var(--table-ink)]">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-[var(--card-stock)] p-7 text-center text-[var(--card-ink)]">
        <h1 className="type-display text-3xl font-black uppercase leading-none text-[var(--card-ink)] [text-shadow:none]">{future ? `#${n} isn't out yet` : 'No such puzzle'}</h1>
        <p className="text-[var(--card-muted)]">
          {date ? (
            <>
              Out on {weekdayName(date)} {date}
              <br />
              <Countdown until={Date.parse(`${date}T00:00:00Z`)} label="in" />
            </>
          ) : (
            <Countdown until={today.nextSwitchAt} />
          )}
        </p>
        <div className="flex justify-center gap-3">
          {today.puzzle && (
            <Link href={`/daily/${today.puzzle.number}${path}`} className="type-display inline-flex h-12 items-center rounded-xl bg-[var(--foil)] px-5 text-lg font-black uppercase text-[var(--foil-ink)] shadow-[0_3px_0_var(--foil-deep)]">
              Play #{today.puzzle.number}
            </Link>
          )}
          <Link href="/" className="type-display inline-flex h-12 items-center rounded-xl border-2 border-[var(--card-ink)] px-5 text-lg font-black uppercase text-[var(--card-ink)]">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
