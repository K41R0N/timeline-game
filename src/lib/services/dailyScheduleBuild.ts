/**
 * Builds the daily puzzle schedule from the committed roster, offline. Each day gets a pair of
 * famous targets that fits its weekday's band, snapshotted with its par chain so later roster
 * rebuilds never change a published puzzle. Run through src/lib/services/daily.capture.test.ts.
 */
import type { RosterPerson } from '../data/roster';
import { PERSON_GAP_DAYS, pairKey, toPuzzleRow, type ScheduleEntryRow, type ScheduleFile } from '../data/dailySchedule';
import { addDays, bandForDate, puzzleNumber, type DateKey } from '../utils/daily';
import { chainShape, pickTargets } from '../utils/difficulty';
import { computePar } from '../utils/par';

const MAX_TRIES_PER_DAY = 200;

/** Deterministic random numbers (mulberry32), so a date always draws the same candidates. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(date: DateKey): number {
  let hash = 2166136261;
  for (const char of date) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function puzzleFor(roster: RosterPerson[], date: DateKey, firstDate: DateKey, previous: ScheduleEntryRow[], usedPairs: Set<string>): ScheduleEntryRow {
  const band = bandForDate(date);
  const recent = new Set(previous.slice(-PERSON_GAP_DAYS).flatMap(entry => [entry.a[0], entry.b[0]]));
  const random = seededRandom(seedFor(date));

  for (let attempt = 0; attempt < MAX_TRIES_PER_DAY; attempt++) {
    const pair = pickTargets(roster, band, random);
    if (!pair) break;
    const [a, b] = pair;
    if (usedPairs.has(pairKey(a.id, b.id)) || recent.has(a.id) || recent.has(b.id)) continue;

    const par = computePar(roster, a, b);
    const shape = chainShape(roster, a, b);
    if (!par.playable || !shape) continue;
    return {
      n: puzzleNumber(date, firstDate)!,
      date,
      band,
      a: toPuzzleRow(a),
      b: toPuzzleRow(b),
      chain: par.chain.map(toPuzzleRow),
      narrowest: Math.min(...shape.optionsPerStep),
    };
  }
  throw new Error(`No ${band} pair for ${date} avoids the recent targets and earlier pairs`);
}

/**
 * Appends `days` puzzles after the last day of `existing` (or from `from` when there is none).
 * Existing entries are returned unchanged.
 */
export function generateSchedule(
  roster: RosterPerson[],
  existing: ScheduleFile | null,
  { from, days, rosterRevision = 0 }: { from: DateKey; days: number; rosterRevision?: number }
): ScheduleFile {
  const firstDate = existing?.firstDate ?? from;
  const entries = [...(existing?.entries ?? [])];
  const usedPairs = new Set(entries.map(entry => pairKey(entry.a[0], entry.b[0])));
  const start = entries.length > 0 ? addDays(entries[entries.length - 1].date, 1) : firstDate;

  for (let i = 0; i < days; i++) {
    const entry = puzzleFor(roster, addDays(start, i), firstDate, entries, usedPairs);
    entries.push(entry);
    usedPairs.add(pairKey(entry.a[0], entry.b[0]));
  }
  return { firstDate, rosterRevision: existing?.rosterRevision ?? rosterRevision, entries };
}
