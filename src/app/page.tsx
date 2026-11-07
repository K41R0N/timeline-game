import { connection } from 'next/server';
import { DailyHome, currentTime, weekdayName } from '@/lib';
import { dailyToday } from '@/lib/server/daily';

/** The home page leads with today's daily puzzle. Rendered per request so "today" is always the UTC date. */
export default async function Home() {
  await connection();
  const { puzzle, nextSwitchAt } = dailyToday(currentTime());
  return (
    <DailyHome
      today={puzzle && { number: puzzle.number, weekday: weekdayName(puzzle.date), band: puzzle.band }}
      nextSwitchAt={nextSwitchAt}
    />
  );
}
