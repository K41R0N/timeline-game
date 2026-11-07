import { describe, expect, it } from 'vitest';
import {
  COMPACT_AFTER_DAYS,
  EMPTY_PROGRESS,
  compactProgress,
  finishScored,
  normalizeDailyProgress,
  openPuzzle,
  puzzleStatus,
  saveRound,
  type DailyProgress,
  type DailyResult,
  type RoundSave,
} from './dailyProgress';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-20T12:00:00Z');
const person = (id: string) => ({ id, name: id, birthYear: 1, deathYear: 50, shortDescription: '', imageUrl: '', contemporaries: [] });
const round = (...ids: string[]): RoundSave => ({ figures: ids.map(person), hintsUsed: 0, hint: null });
const result: DailyResult = { strokes: 3, par: 4, hintsUsed: 1, clutchBadges: 1, longBridgeBadges: 0 };

describe('openPuzzle', () => {
  it('starts a scored attempt for today when there is no record', () => {
    expect(openPuzzle(EMPTY_PROGRESS, 13, 13)).toEqual({ kind: 'scored', save: null });
  });

  it('resumes an unfinished scored attempt for yesterday as scored, so it can still finish as that puzzle', () => {
    const progress = saveRound(EMPTY_PROGRESS, 12, 'scored', round('A', 'B', 'C'), NOW - DAY);
    expect(openPuzzle(progress, 12, 13)).toEqual({ kind: 'scored', save: round('A', 'B', 'C') });

    const finished = finishScored(progress, 12, round('A', 'B', 'C', 'D'), result, NOW);
    expect(finished.attempts[12]).toMatchObject({ result, finishedAt: NOW });
  });

  it('shows a finished attempt for today as its result and starts nothing new', () => {
    const progress = finishScored(saveRound(EMPTY_PROGRESS, 13, 'scored', round('A', 'B'), NOW), 13, round('A', 'C', 'B'), result, NOW);
    const opening = openPuzzle(progress, 13, 13);
    expect(opening).toMatchObject({ kind: 'result', canPractice: false, attempt: { result, figures: round('A', 'C', 'B').figures } });
  });

  it('offers practice on a past puzzle with a finished result, and practice leaves that result alone', () => {
    const scored = finishScored(saveRound(EMPTY_PROGRESS, 12, 'scored', round('A', 'B'), NOW - DAY), 12, round('A', 'C', 'B'), result, NOW - DAY);
    expect(openPuzzle(scored, 12, 13)).toMatchObject({ kind: 'result', canPractice: true });

    const practiced = saveRound(scored, 12, 'practice', round('A', 'X'), NOW);
    expect(practiced.attempts[12]).toEqual(scored.attempts[12]);
    expect(practiced.practice).toEqual({ number: 12, ...round('A', 'X') });
  });

  it('opens a past puzzle with no scored record as practice, resuming the practice slot when it is that puzzle', () => {
    expect(openPuzzle(EMPTY_PROGRESS, 12, 13)).toEqual({ kind: 'practice', save: null });
    const practiced = saveRound(EMPTY_PROGRESS, 12, 'practice', round('A', 'X'), NOW);
    expect(openPuzzle(practiced, 12, 13)).toEqual({ kind: 'practice', save: round('A', 'X') });
    expect(openPuzzle(practiced, 11, 13)).toEqual({ kind: 'practice', save: null });
  });

  it('keeps one practice slot: practising another puzzle replaces it', () => {
    const first = saveRound(EMPTY_PROGRESS, 10, 'practice', round('A'), NOW);
    expect(saveRound(first, 11, 'practice', round('B'), NOW).practice).toEqual({ number: 11, ...round('B') });
  });

  it('keeps the start time of a scored attempt across saves', () => {
    const started = saveRound(EMPTY_PROGRESS, 13, 'scored', round('A', 'B'), NOW);
    const later = saveRound(started, 13, 'scored', round('A', 'C', 'B'), NOW + 60_000);
    expect(later.attempts[13]).toMatchObject({ startedAt: NOW, finishedAt: null, figures: round('A', 'C', 'B').figures });
  });
});

describe('compactProgress', () => {
  it(`keeps only the result of attempts finished more than ${COMPACT_AFTER_DAYS} days ago`, () => {
    let progress: DailyProgress = EMPTY_PROGRESS;
    progress = finishScored(saveRound(progress, 1, 'scored', round('A', 'B'), NOW - 8 * DAY), 1, round('A', 'C', 'B'), result, NOW - 8 * DAY);
    progress = finishScored(saveRound(progress, 3, 'scored', round('A', 'B'), NOW - 6 * DAY), 3, round('A', 'C', 'B'), result, NOW - 6 * DAY);
    const compacted = compactProgress(progress, NOW);
    expect(compacted.attempts[1]).toMatchObject({ figures: [], result });
    expect(compacted.attempts[3].figures).toHaveLength(3);
  });
});

describe('puzzleStatus', () => {
  it('reads "play" for today and "unplayed" for a past puzzle with no record', () => {
    expect(puzzleStatus(EMPTY_PROGRESS, 13, 13)).toEqual({ status: 'play' });
    expect(puzzleStatus(EMPTY_PROGRESS, 12, 13)).toEqual({ status: 'unplayed' });
  });

  it('reads "resume" for an unfinished scored attempt, including yesterday\'s', () => {
    const progress = saveRound(EMPTY_PROGRESS, 12, 'scored', round('A', 'B'), NOW - DAY);
    expect(puzzleStatus(progress, 12, 13)).toEqual({ status: 'resume' });
  });

  it('reads "result" with strokes and par for a finished attempt, also after compaction', () => {
    const finished = finishScored(saveRound(EMPTY_PROGRESS, 1, 'scored', round('A', 'B'), NOW - 9 * DAY), 1, round('A', 'C', 'B'), result, NOW - 9 * DAY);
    expect(puzzleStatus(finished, 1, 13)).toEqual({ status: 'result', result });
    expect(puzzleStatus(compactProgress(finished, NOW), 1, 13)).toEqual({ status: 'result', result });
  });

  it('reads "practice" for a puzzle played only as practice, never as a scored result', () => {
    const practiced = saveRound(EMPTY_PROGRESS, 12, 'practice', round('A', 'X'), NOW);
    expect(puzzleStatus(practiced, 12, 13)).toEqual({ status: 'practice' });
  });
});

describe('normalizeDailyProgress', () => {
  it('turns missing or malformed data into an empty record without throwing', () => {
    expect(normalizeDailyProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(normalizeDailyProgress('nonsense')).toEqual(EMPTY_PROGRESS);
    expect(normalizeDailyProgress({ attempts: 'x', practice: 5 })).toEqual(EMPTY_PROGRESS);
    expect(normalizeDailyProgress({ attempts: { 4: { figures: 'x' } } })).toEqual(EMPTY_PROGRESS);
  });

  it('keeps well-formed attempts and the practice slot', () => {
    const progress = saveRound(saveRound(EMPTY_PROGRESS, 4, 'scored', round('A', 'B'), NOW), 2, 'practice', round('C'), NOW);
    expect(normalizeDailyProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  });
});
