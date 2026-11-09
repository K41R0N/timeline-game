import { connection } from 'next/server';
import { DailyStyleRound, currentTime } from '@/lib';
import { dailyStylePuzzle, dailyToday, parsePuzzleParam } from '@/lib/server/daily';
import { NotOut } from './NotOut';

/** One Easy or Medium daily puzzle. Rendered per request, so a puzzle exists only once its UTC date arrives. */
export async function StylePage({ style, params }: { style: 'easy' | 'medium'; params: Promise<{ n: string }> }) {
  await connection();
  const { n: raw } = await params;
  const now = currentTime();
  const today = dailyToday(now);
  const n = parsePuzzleParam(raw);
  const puzzle = n === null ? null : dailyStylePuzzle(style, n, now);
  if (!puzzle) return <NotOut n={n} today={today} path={`/${style}`} />;
  return <DailyStyleRound key={`${style}-${puzzle.number}`} puzzle={puzzle} todayNumber={today.number ?? puzzle.number} nextSwitchAt={today.nextSwitchAt} />;
}
