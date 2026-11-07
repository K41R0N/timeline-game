/**
 * Writes src/lib/data/daily-schedule.json from the committed roster. Offline and deterministic.
 * Skipped by default; run with:
 *
 *   CAPTURE_DAILY=1 npx vitest run src/lib/services/daily.capture.test.ts
 *
 * With no schedule yet, it starts on DAILY_FROM (default: today, UTC), which becomes puzzle #1.
 * With a schedule, it appends days until the schedule reaches DAILY_DAYS (default 365) days past
 * today. Published puzzles are never rewritten.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import rosterFile from '../data/roster.json';
import { RosterFile, fromRosterRow } from '../data/roster';
import { scheduleProblems, type ScheduleFile } from '../data/dailySchedule';
import { addDays, puzzleNumber, utcDateKey } from '../utils/daily';
import { generateSchedule } from './dailyScheduleBuild';

const SCHEDULE_FILE = path.join(__dirname, '..', 'data', 'daily-schedule.json');

describe.skipIf(!process.env.CAPTURE_DAILY)('daily schedule capture', () => {
  it('extends the schedule to a year past today', () => {
    const file = rosterFile as unknown as RosterFile;
    const roster = file.people.map(fromRosterRow);
    const today = utcDateKey(Date.now());
    const horizon = addDays(today, Number(process.env.DAILY_DAYS ?? 365));

    const existing: ScheduleFile | null = fs.existsSync(SCHEDULE_FILE) ? JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')) : null;
    const from = existing?.firstDate ?? process.env.DAILY_FROM ?? today;
    const lastDate = existing?.entries.at(-1)?.date ?? addDays(from, -1);
    const days = Math.max(0, puzzleNumber(horizon, lastDate)! - 1);

    const schedule = generateSchedule(roster, existing, { from, days, rosterRevision: file.sourceRevision });
    expect(scheduleProblems(schedule, today)).toEqual([]);

    const rows = schedule.entries.map(entry => '    ' + JSON.stringify(entry)).join(',\n');
    const header = JSON.stringify({ firstDate: schedule.firstDate, rosterRevision: schedule.rosterRevision }, null, 2).slice(0, -2);
    fs.writeFileSync(SCHEDULE_FILE, `${header},\n  "entries": [\n${rows}\n  ]\n}\n`);
    console.log(`📊 Daily schedule: #1 on ${schedule.firstDate}, ${schedule.entries.length} puzzles, last ${schedule.entries.at(-1)?.date} (${days} added)`);
  });
});
