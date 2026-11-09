import type { Difficulty } from '../../utils/GameLogic';

/** Each style's word on the dark table. */
export const STYLE_TEXT: Record<Difficulty, string> = {
  easy: 'text-[#7ee0a1]',
  medium: 'text-[#f5d06b]',
  hard: 'text-[#ff8f80]',
};

/** Each style's word on white card stock: a darker shade of its table colour, so it reads on white. */
export const STYLE_ON_STOCK: Record<Difficulty, string> = {
  easy: 'text-[#15803d]',
  medium: 'text-[#a16207]',
  hard: 'text-[#b91c1c]',
};

/** How each style plays, in two or three words; only Hard is scored against par. */
export const STYLE_HOW: Record<Difficulty, string> = {
  easy: 'Arrange cards',
  medium: 'Fill blanks',
  hard: 'Type vs par',
};

export const STYLE_NAME: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};
