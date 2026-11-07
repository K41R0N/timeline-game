import type { HistoricalFigure } from '../types/HistoricalFigure';

/**
 * What this browser has done with each daily puzzle: one scored attempt per puzzle, plus one
 * practice slot for replaying a past puzzle. Kept apart from the free-play save, so neither can
 * overwrite the other.
 */

export interface SavedHintName {
  id: string;
  name: string;
}

/** A round in progress, as a daily puzzle saves it (targets come from the puzzle itself). */
export interface RoundSave {
  figures: HistoricalFigure[];
  hintsUsed: number;
  hint: SavedHintName | null;
}

/** What a finished attempt keeps after its board has been compacted away. */
export interface DailyResult {
  strokes: number;
  par: number | null;
  hintsUsed: number;
  clutchBadges: number;
  longBridgeBadges: number;
}

export interface DailyAttempt extends RoundSave {
  number: number;
  startedAt: number;
  finishedAt: number | null;
  result: DailyResult | null;
}

export interface PracticeSave extends RoundSave {
  number: number;
}

export interface DailyProgress {
  attempts: Record<number, DailyAttempt>;
  practice: PracticeSave | null;
}

export type AttemptKind = 'scored' | 'practice';

export type PuzzleOpening =
  | { kind: 'scored'; save: RoundSave | null }
  | { kind: 'practice'; save: RoundSave | null }
  | { kind: 'result'; attempt: DailyAttempt; canPractice: boolean };

export type PuzzleStatus = { status: 'play' | 'resume' | 'unplayed' | 'practice' } | { status: 'result'; result: DailyResult };

export const EMPTY_PROGRESS: DailyProgress = { attempts: {}, practice: null };

/** Finished attempts older than this keep only their result, so storage stays small. */
export const COMPACT_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

function roundOf(save: RoundSave): RoundSave {
  return { figures: save.figures, hintsUsed: save.hintsUsed, hint: save.hint };
}

/**
 * What opening puzzle n shows. A scored attempt in progress always resumes as scored, even after
 * its day has passed; otherwise today's puzzle starts the scored attempt and a past one is practice.
 */
export function openPuzzle(progress: DailyProgress, n: number, todayNumber: number): PuzzleOpening {
  const attempt = progress.attempts[n];
  if (attempt?.result) return { kind: 'result', attempt, canPractice: n < todayNumber };
  if (attempt) return { kind: 'scored', save: roundOf(attempt) };
  if (n === todayNumber) return { kind: 'scored', save: null };
  return openPractice(progress, n);
}

/** Replaying puzzle n as practice, resuming the practice slot when it holds that puzzle. */
export function openPractice(progress: DailyProgress, n: number): PuzzleOpening {
  return { kind: 'practice', save: progress.practice?.number === n ? roundOf(progress.practice) : null };
}

/** Records a round's progress: the scored attempt for n, or the single practice slot. */
export function saveRound(progress: DailyProgress, n: number, kind: AttemptKind, round: RoundSave, now: number): DailyProgress {
  if (kind === 'practice') return { ...progress, practice: { number: n, ...roundOf(round) } };
  const existing = progress.attempts[n];
  if (existing?.result) return progress;
  const attempt: DailyAttempt = { number: n, startedAt: existing?.startedAt ?? now, finishedAt: null, result: null, ...roundOf(round) };
  return { ...progress, attempts: { ...progress.attempts, [n]: attempt } };
}

/** Marks the scored attempt for n finished with its final board and result. */
export function finishScored(progress: DailyProgress, n: number, round: RoundSave, result: DailyResult, now: number): DailyProgress {
  const existing = progress.attempts[n];
  if (existing?.result) return progress;
  const attempt: DailyAttempt = { number: n, startedAt: existing?.startedAt ?? now, finishedAt: now, result, ...roundOf(round) };
  return { ...progress, attempts: { ...progress.attempts, [n]: attempt } };
}

export function compactProgress(progress: DailyProgress, now: number): DailyProgress {
  const attempts: Record<number, DailyAttempt> = {};
  for (const [key, attempt] of Object.entries(progress.attempts)) {
    const old = attempt.finishedAt !== null && now - attempt.finishedAt > COMPACT_AFTER_DAYS * DAY_MS;
    attempts[Number(key)] = old && attempt.figures.length > 0 ? { ...attempt, figures: [], hint: null } : attempt;
  }
  return { ...progress, attempts };
}

/** How the home card and the archive label puzzle n for this browser. */
export function puzzleStatus(progress: DailyProgress, n: number, todayNumber: number): PuzzleStatus {
  const attempt = progress.attempts[n];
  if (attempt?.result) return { status: 'result', result: attempt.result };
  if (attempt) return { status: 'resume' };
  if (n === todayNumber) return { status: 'play' };
  return { status: progress.practice?.number === n ? 'practice' : 'unplayed' };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function normalizeRound(value: Record<string, unknown>): RoundSave | null {
  if (!Array.isArray(value.figures)) return null;
  const hint = isRecord(value.hint) && typeof value.hint.id === 'string' && typeof value.hint.name === 'string' ? { id: value.hint.id, name: value.hint.name } : null;
  return { figures: value.figures as HistoricalFigure[], hintsUsed: typeof value.hintsUsed === 'number' ? value.hintsUsed : 0, hint };
}

function normalizeResult(value: unknown): DailyResult | null {
  if (!isRecord(value) || typeof value.strokes !== 'number') return null;
  const count = (key: string) => (typeof value[key] === 'number' ? (value[key] as number) : 0);
  return {
    strokes: value.strokes,
    par: typeof value.par === 'number' ? value.par : null,
    hintsUsed: count('hintsUsed'),
    clutchBadges: count('clutchBadges'),
    longBridgeBadges: count('longBridgeBadges'),
  };
}

/** Stored progress in the current shape; anything unreadable is dropped rather than trusted. */
export function normalizeDailyProgress(raw: unknown): DailyProgress {
  if (!isRecord(raw)) return EMPTY_PROGRESS;
  const attempts: Record<number, DailyAttempt> = {};
  if (isRecord(raw.attempts)) {
    for (const [key, value] of Object.entries(raw.attempts)) {
      const n = Number(key);
      if (!Number.isInteger(n) || n < 1 || !isRecord(value)) continue;
      const round = normalizeRound(value);
      if (!round || typeof value.startedAt !== 'number') continue;
      const result = normalizeResult(value.result);
      attempts[n] = {
        number: n,
        startedAt: value.startedAt,
        finishedAt: result && typeof value.finishedAt === 'number' ? value.finishedAt : null,
        result,
        ...round,
      };
    }
  }
  let practice: PracticeSave | null = null;
  if (isRecord(raw.practice) && typeof raw.practice.number === 'number') {
    const round = normalizeRound(raw.practice);
    if (round) practice = { number: raw.practice.number, ...round };
  }
  return { attempts, practice };
}
