import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { currentTime } from '@/lib';
import { dailyToday } from '@/lib/server/daily';

/** /daily always means today's puzzle. */
export default async function TodaysPuzzle() {
  await connection();
  const { puzzle } = dailyToday(currentTime());
  redirect(puzzle ? `/daily/${puzzle.number}` : '/');
}
