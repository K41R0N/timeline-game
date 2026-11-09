import type { HistoricalFigure } from '../types/HistoricalFigure';
import { DAY_MS } from './daily';

/**
 * What this browser has done with each daily puzzle: one scored attempt per puzzle and style, plus
 * one practice slot per style for replaying a past puzzle. Hard records keep their original place
 * (`attempts`, `practice`), so a record stored before Easy and Medium existed reads as Hard. Kept
 * apart from the free-play save, so neither can overwrite the other.
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

/** How one slot of an Easy or Medium puzzle was solved: at once, after a wrong try, or revealed. */
export type SlotOutcome = 'first' | 'later' | 'revealed';

/** A finished Easy or Medium attempt: Checks (Easy) or misses (Medium), and one outcome per slot. */
export interface StyleResult {
  score: number;
  squares: SlotOutcome[];
}

/** An Easy or Medium round in progress, as its round module saves it. */
export type StyleRoundSave = object;

export interface StyleAttempt {
  number: number;
  startedAt: number;
  finishedAt: number | null;
  /** Null once a finished attempt has been compacted. */
  round: StyleRoundSave | null;
  result: StyleResult | null;
}

export interface StyleProgress {
  attempts: Record<number, StyleAttempt>;
  practice: { number: number; round: StyleRoundSave } | null;
}

export type ChainStyleKey = 'easy' | 'medium';

export interface DailyProgress {
  /** Hard attempts. */
  attempts: Record<number, DailyAttempt>;
  /** Hard practice. */
  practice: PracticeSave | null;
  easy: StyleProgress;
  medium: StyleProgress;
}

export type AttemptKind = 'scored' | 'practice';

export type PuzzleOpening =
  | { kind: 'scored'; save: RoundSave | null }
  | { kind: 'practice'; save: RoundSave | null }
  | { kind: 'result'; attempt: DailyAttempt; canPractice: boolean };

export type PuzzleStatus = { status: 'play' | 'resume' | 'unplayed' | 'practice' } | { status: 'result'; result: DailyResult };

export type StyleOpening =
  | { kind: 'scored'; save: StyleRoundSave | null }
  | { kind: 'practice'; save: StyleRoundSave | null }
  | { kind: 'result'; attempt: StyleAttempt; canPractice: boolean };

export type StyleStatus = { status: 'play' | 'resume' | 'unplayed' | 'practice' } | { status: 'result'; result: StyleResult };

const EMPTY_STYLE: StyleProgress = { attempts: {}, practice: null };

export const EMPTY_PROGRESS: DailyProgress = { attempts: {}, practice: null, easy: EMPTY_STYLE, medium: EMPTY_STYLE };

/** Finished attempts older than this keep only their result, so storage stays small. */
export const COMPACT_AFTER_DAYS = 7;

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
  const isOld = (finishedAt: number | null) => finishedAt !== null && now - finishedAt > COMPACT_AFTER_DAYS * DAY_MS;
  const attempts: Record<number, DailyAttempt> = {};
  for (const [key, attempt] of Object.entries(progress.attempts)) {
    attempts[Number(key)] = isOld(attempt.finishedAt) && attempt.figures.length > 0 ? { ...attempt, figures: [], hint: null } : attempt;
  }
  const compactStyle = (style: StyleProgress): StyleProgress => {
    const styleAttempts: Record<number, StyleAttempt> = {};
    for (const [key, attempt] of Object.entries(style.attempts)) {
      styleAttempts[Number(key)] = isOld(attempt.finishedAt) && attempt.round ? { ...attempt, round: null } : attempt;
    }
    return { ...style, attempts: styleAttempts };
  };
  return { ...progress, attempts, easy: compactStyle(progress.easy), medium: compactStyle(progress.medium) };
}

/** How the home card and the archive label puzzle n for this browser. */
export function puzzleStatus(progress: DailyProgress, n: number, todayNumber: number): PuzzleStatus {
  const attempt = progress.attempts[n];
  if (attempt?.result) return { status: 'result', result: attempt.result };
  if (attempt) return { status: 'resume' };
  if (n === todayNumber) return { status: 'play' };
  return { status: progress.practice?.number === n ? 'practice' : 'unplayed' };
}

/** What opening Easy or Medium puzzle n shows, by the same rules as Hard. */
export function openStylePuzzle(progress: DailyProgress, style: ChainStyleKey, n: number, todayNumber: number): StyleOpening {
  const { attempts, practice } = progress[style];
  const attempt = attempts[n];
  if (attempt?.result) return { kind: 'result', attempt, canPractice: n < todayNumber };
  if (attempt) return { kind: 'scored', save: attempt.round };
  if (n === todayNumber) return { kind: 'scored', save: null };
  return { kind: 'practice', save: practice?.number === n ? practice.round : null };
}

/** Records an Easy or Medium round's progress: the scored attempt for n, or that style's practice slot. */
export function saveStyleRound(progress: DailyProgress, style: ChainStyleKey, n: number, kind: AttemptKind, round: StyleRoundSave, now: number): DailyProgress {
  const record = progress[style];
  if (kind === 'practice') return { ...progress, [style]: { ...record, practice: { number: n, round } } };
  const existing = record.attempts[n];
  if (existing?.result) return progress;
  const attempt: StyleAttempt = { number: n, startedAt: existing?.startedAt ?? now, finishedAt: null, round, result: null };
  return { ...progress, [style]: { ...record, attempts: { ...record.attempts, [n]: attempt } } };
}

/** Marks the scored Easy or Medium attempt for n finished with its final round and result. */
export function finishStyleScored(progress: DailyProgress, style: ChainStyleKey, n: number, round: StyleRoundSave, result: StyleResult, now: number): DailyProgress {
  const record = progress[style];
  const existing = record.attempts[n];
  if (existing?.result) return progress;
  const attempt: StyleAttempt = { number: n, startedAt: existing?.startedAt ?? now, finishedAt: now, round, result };
  return { ...progress, [style]: { ...record, attempts: { ...record.attempts, [n]: attempt } } };
}

/** How the menu and the archive label Easy or Medium puzzle n for this browser. */
export function styleStatus(progress: DailyProgress, style: ChainStyleKey, n: number, todayNumber: number): StyleStatus {
  const { attempts, practice } = progress[style];
  const attempt = attempts[n];
  if (attempt?.result) return { status: 'result', result: attempt.result };
  if (attempt) return { status: 'resume' };
  if (n === todayNumber) return { status: 'play' };
  return { status: practice?.number === n ? 'practice' : 'unplayed' };
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

const OUTCOMES: readonly string[] = ['first', 'later', 'revealed'];

function normalizeStyleResult(value: unknown): StyleResult | null {
  if (!isRecord(value) || typeof value.score !== 'number' || !Array.isArray(value.squares)) return null;
  if (!value.squares.every(square => typeof square === 'string' && OUTCOMES.includes(square))) return null;
  return { score: value.score, squares: value.squares as SlotOutcome[] };
}

function normalizeStyleProgress(raw: unknown): StyleProgress {
  if (!isRecord(raw)) return EMPTY_STYLE;
  const attempts: Record<number, StyleAttempt> = {};
  if (isRecord(raw.attempts)) {
    for (const [key, value] of Object.entries(raw.attempts)) {
      const n = Number(key);
      if (!Number.isInteger(n) || n < 1 || !isRecord(value) || typeof value.startedAt !== 'number') continue;
      const result = normalizeStyleResult(value.result);
      const round = isRecord(value.round) ? value.round : null;
      if (!round && !result) continue;
      attempts[n] = { number: n, startedAt: value.startedAt, finishedAt: result && typeof value.finishedAt === 'number' ? value.finishedAt : null, round, result };
    }
  }
  const practice = isRecord(raw.practice) && typeof raw.practice.number === 'number' && isRecord(raw.practice.round) ? { number: raw.practice.number, round: raw.practice.round } : null;
  return { attempts, practice };
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
  return { attempts, practice, easy: normalizeStyleProgress(raw.easy), medium: normalizeStyleProgress(raw.medium) };
}
