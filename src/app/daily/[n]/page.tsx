import { connection } from 'next/server';
import { DailyRound, currentTime } from '@/lib';
import { dailyPuzzle, dailyToday, parsePuzzleParam } from '@/lib/server/daily';
import { NotOut } from './NotOut';

/** One daily puzzle, played Hard. Rendered per request, so a puzzle exists only once its UTC date arrives. */
export default async function DailyPuzzlePage({ params }: { params: Promise<{ n: string }> }) {
  await connection();
  const { n: raw } = await params;
  const now = currentTime();
  const today = dailyToday(now);
  const n = parsePuzzleParam(raw);
  const puzzle = n === null ? null : dailyPuzzle(n, now);
  if (!puzzle) return <NotOut n={n} today={today} />;
  return <DailyRound key={puzzle.number} puzzle={puzzle} todayNumber={today.number ?? puzzle.number} nextSwitchAt={today.nextSwitchAt} />;
}
