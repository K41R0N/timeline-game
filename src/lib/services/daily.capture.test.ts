/**
 * Writes the daily schedules from the committed roster: src/lib/data/daily-schedule.json (Hard),
 * then daily-easy.json and daily-medium.json. Offline and deterministic. Skipped by default; run with:
 *
 *   CAPTURE_DAILY=1 npx vitest run src/lib/services/daily.capture.test.ts
 *
 * With no Hard schedule yet, it starts on DAILY_FROM (default: today, UTC), which becomes puzzle #1.
 * With a schedule, it appends days until the schedule reaches DAILY_DAYS (default 365) days past
 * today. Easy and Medium then get one puzzle for every Hard puzzle. Published puzzles are never
 * rewritten.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import rosterFile from '../data/roster.json';
import { RosterFile, fromRosterRow } from '../data/roster';
import { scheduleProblems, type ScheduleFile } from '../data/dailySchedule';
import { rosterRevision, styleScheduleProblems, type StyleScheduleFile } from '../data/styleSchedule';
import { addDays, puzzleNumber, utcDateKey } from '../utils/daily';
import { generateSchedule } from './dailyScheduleBuild';
import { generateStyleSchedules } from './styleScheduleBuild';

const DATA = path.join(__dirname, '..', 'data');
const SCHEDULE_FILE = path.join(DATA, 'daily-schedule.json');
const STYLE_FILES = { easy: path.join(DATA, 'daily-easy.json'), medium: path.join(DATA, 'daily-medium.json') };

function readJson<T>(file: string): T | null {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as T) : null;
}

/** One entry per line, so a diff shows exactly which days were added. */
function writeSchedule(file: string, header: object, entries: object[]) {
  const rows = entries.map(entry => '    ' + JSON.stringify(entry)).join(',\n');
  const head = JSON.stringify(header, null, 2).slice(0, -2);
  fs.writeFileSync(file, `${head},\n  "entries": [\n${rows}\n  ]\n}\n`);
}

describe.skipIf(!process.env.CAPTURE_DAILY)('daily schedule capture', () => {
  it('extends the schedules to a year past today', () => {
    const file = rosterFile as unknown as RosterFile;
    const roster = file.people.map(fromRosterRow);
    const today = utcDateKey(Date.now());
    const horizon = addDays(today, Number(process.env.DAILY_DAYS ?? 365));

    const existing = readJson<ScheduleFile>(SCHEDULE_FILE);
    const from = existing?.firstDate ?? process.env.DAILY_FROM ?? today;
    const lastDate = existing?.entries.at(-1)?.date ?? addDays(from, -1);
    const days = Math.max(0, puzzleNumber(horizon, lastDate)! - 1);

    const schedule = generateSchedule(roster, existing, { from, days, rosterRevision: file.sourceRevision });
    expect(scheduleProblems(schedule, today)).toEqual([]);
    writeSchedule(SCHEDULE_FILE, { firstDate: schedule.firstDate, rosterRevision: schedule.rosterRevision }, schedule.entries);
    console.log(`📊 Hard: #1 on ${schedule.firstDate}, ${schedule.entries.length} puzzles, last ${schedule.entries.at(-1)?.date} (${days} added)`);

    const revision = rosterRevision(file.people);
    const before = { easy: readJson<StyleScheduleFile>(STYLE_FILES.easy), medium: readJson<StyleScheduleFile>(STYLE_FILES.medium) };
    const styles = generateStyleSchedules(roster, revision, schedule, before);
    expect(styleScheduleProblems({ hard: schedule, ...styles }, today, { people: roster, revision })).toEqual([]);
    for (const style of ['easy', 'medium'] as const) {
      const { entries, ...header } = styles[style];
      writeSchedule(STYLE_FILES[style], header, entries);
      console.log(`📊 ${style}: ${entries.length} puzzles (${entries.length - (before[style]?.entries.length ?? 0)} added)`);
    }
  }, 600_000);
});
