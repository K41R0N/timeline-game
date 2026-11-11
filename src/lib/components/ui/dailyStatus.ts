import type { Difficulty } from '../../utils/GameLogic';
import { puzzleStatus, styleStatus, type DailyProgress } from '../../utils/dailyProgress';

export interface DailyStatusLine {
  status: 'play' | 'resume' | 'unplayed' | 'practice' | 'result';
  /** The result in a few words ("2 checks", "1 miss", "5 / par 5"), or what playing it would do. */
  text: string;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const TEXT = { play: 'Play', resume: 'Continue', unplayed: 'Practise', practice: 'Practising' } as const;

/** How the menu and the archive describe one style of daily puzzle n for this browser. */
export function dailyStatusLine(progress: DailyProgress, style: Difficulty, n: number, todayNumber: number): DailyStatusLine {
  if (style === 'hard') {
    const status = puzzleStatus(progress, n, todayNumber);
    if (status.status === 'result') {
      const { strokes, par } = status.result;
      return { status: 'result', text: par === null ? count(strokes, 'stroke', 'strokes') : `${strokes} / par ${par}` };
    }
    return { status: status.status, text: TEXT[status.status] };
  }
  const status = styleStatus(progress, style, n, todayNumber);
  if (status.status === 'result') {
    const { score } = status.result;
    return { status: 'result', text: style === 'easy' ? count(score, 'check', 'checks') : count(score, 'miss', 'misses') };
  }
  return { status: status.status, text: TEXT[status.status] };
}

