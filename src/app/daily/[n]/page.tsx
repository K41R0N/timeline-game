import { connection } from 'next/server';
import Link from 'next/link';
import { DailyRound, Countdown, currentTime } from '@/lib';
import { dailyPuzzle, dailyToday, parsePuzzleParam } from '@/lib/server/daily';

/** One daily puzzle. Rendered per request, so a puzzle exists only once its UTC date arrives. */
export default async function DailyPuzzlePage({ params }: { params: Promise<{ n: string }> }) {
  await connection();
  const { n: raw } = await params;
  const now = currentTime();
  const today = dailyToday(now);
  const n = parsePuzzleParam(raw);
  const puzzle = n === null ? null : dailyPuzzle(n, now);

  if (!puzzle || !today.puzzle) {
    const future = n !== null && today.puzzle !== null && n > today.puzzle.number;
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background px-4">
        <div className="timeline-card p-8 max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-primary">{future ? `Puzzle #${n} isn't out yet` : 'No such daily puzzle'}</h1>
          <p className="text-foreground-muted">
            <Countdown until={today.nextSwitchAt} />
          </p>
          <div className="flex justify-center gap-3">
            {today.puzzle && (
              <Link href={`/daily/${today.puzzle.number}`} className="px-4 py-2 bg-primary hover:bg-primary-bright text-white font-semibold rounded-lg">
                Play today&apos;s #{today.puzzle.number}
              </Link>
            )}
            <Link href="/" className="px-4 py-2 rounded-lg border-2 border-primary text-primary font-semibold">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <DailyRound puzzle={puzzle} todayNumber={today.puzzle.number} nextSwitchAt={today.nextSwitchAt} />;
}
