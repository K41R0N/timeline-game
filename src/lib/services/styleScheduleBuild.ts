/**
 * Builds the Easy and Medium daily schedules from the committed roster, offline. Each Hard date
 * gets an Easy and a Medium puzzle seeded by style and date, snapshotted so later roster rebuilds
 * never change a published puzzle. Run through src/lib/services/daily.capture.test.ts.
 */
import { PERSON_GAP_DAYS, pairKey, type ScheduleFile } from '../data/dailySchedule';
import { toRosterRow, type RosterPerson } from '../data/roster';
import { leftOutFor, recentChainPeople, stylePeople, type StyleEntryRow, type StyleScheduleFile } from '../data/styleSchedule';
import { buildStylePuzzle, type ChainStyle } from '../utils/chainPuzzle';
import { seededRandom, seedFor } from '../utils/random';

function entryFor(style: ChainStyle, roster: RosterPerson[], revision: string, n: number, date: string, entries: StyleEntryRow[], leaveOut: Set<string>): StyleEntryRow {
  const usedPairs = new Set(entries.map(entry => pairKey(entry.a[0], entry.b[0])));
  const recent = new Set(entries.slice(-PERSON_GAP_DAYS).flatMap(entry => [entry.a[0], entry.b[0]]));
  const puzzle = buildStylePuzzle(style, roster, seededRandom(seedFor(style + date)), {
    leaveOut,
    accept: (a, b) => !usedPairs.has(pairKey(a.id, b.id)) && !recent.has(a.id) && !recent.has(b.id),
  });
  if (!puzzle) throw new Error(`No ${style} puzzle for ${date} avoids that day's other puzzles, the recent targets and earlier pairs`);
  return {
    n,
    date,
    rev: revision,
    a: toRosterRow(puzzle.a),
    b: toRosterRow(puzzle.b),
    chain: puzzle.chain.map(toRosterRow),
    decoys: puzzle.decoys.map(toRosterRow),
  };
}

/**
 * Gives the Easy and Medium schedules one puzzle for every Hard puzzle, appending after their last
 * entries. Existing entries are returned unchanged.
 */
export function generateStyleSchedules(
  roster: RosterPerson[],
  revision: string,
  hard: ScheduleFile,
  existing: { easy: StyleScheduleFile | null; medium: StyleScheduleFile | null }
): { easy: StyleScheduleFile; medium: StyleScheduleFile } {
  const easy = [...(existing.easy?.entries ?? [])];
  const medium = [...(existing.medium?.entries ?? [])];

  hard.entries.forEach((hardEntry, i) => {
    const leaveOut = (style: ChainStyle, entries: StyleEntryRow[]) => {
      const ids = new Set([...leftOutFor(style, hardEntry, style === 'medium' ? easy[i] : undefined), ...recentChainPeople(entries, i)]);
      // When only the Easy file is being rebuilt, keep clear of the Medium puzzle already on that date.
      if (style === 'easy' && medium[i]) stylePeople(medium[i]).forEach(id => ids.add(id));
      return ids;
    };
    if (i >= easy.length) easy.push(entryFor('easy', roster, revision, hardEntry.n, hardEntry.date, easy, leaveOut('easy', easy)));
    if (i >= medium.length) medium.push(entryFor('medium', roster, revision, hardEntry.n, hardEntry.date, medium, leaveOut('medium', medium)));
  });

  return {
    easy: { style: 'easy', firstDate: hard.firstDate, entries: easy },
    medium: { style: 'medium', firstDate: hard.firstDate, entries: medium },
  };
}
