import { describe, expect, it } from 'vitest';
import { axisLabel, boardLayout, laneYears, yearTicks } from './board';
import type { HistoricalFigure } from '../types/HistoricalFigure';

const person = (id: string, birthYear: number, deathYear: number): HistoricalFigure => ({
  id,
  name: id,
  birthYear,
  deathYear,
  shortDescription: '',
  imageUrl: '',
  contemporaries: [],
});

const ibnBattuta = person('Ibn Battuta', 1304, 1369);
const walterScott = person('Walter Scott', 1771, 1832);
const leonardo = person('Leonardo', 1452, 1519);
const galileo = person('Galileo', 1564, 1642);
const newton = person('Newton', 1642, 1727);
const chaucer = person('Chaucer', 1343, 1400);
const goethe = person('Goethe', 1749, 1832);

describe('boardLayout', () => {
  it('pads the span so no life touches an edge, and places bars by year', () => {
    const layout = boardLayout([ibnBattuta, walterScott], ibnBattuta, walterScott);
    expect(layout.from).toBeLessThan(1304);
    expect(layout.to).toBeGreaterThan(1832);
    const [first, last] = layout.lanes;
    expect(first.left).toBeGreaterThan(0);
    expect(last.left + last.width).toBeLessThan(100);
    expect(first.figure.id).toBe('Ibn Battuta');
  });

  it('shows the whole stretch between the targets as the gap when nothing is placed', () => {
    const { gap } = boardLayout([ibnBattuta, walterScott], ibnBattuta, walterScott);
    expect(gap).toMatchObject({ from: 1369, to: 1771, years: 402 });
  });

  it('narrows the gap from both ends as each chain grows, ignoring loose lives in between', () => {
    const board = [ibnBattuta, chaucer, leonardo, galileo, newton, goethe, walterScott];
    const layout = boardLayout(board, ibnBattuta, walterScott);
    expect(layout.gap).toMatchObject({ from: 1400, to: 1749, years: 349 });
    const status = Object.fromEntries(layout.lanes.map(lane => [lane.figure.id, lane.status]));
    expect(status).toMatchObject({
      'Ibn Battuta': 'target',
      Chaucer: 'linked',
      Leonardo: 'loose',
      Galileo: 'loose',
      Newton: 'loose',
      Goethe: 'linked',
      'Walter Scott': 'target',
    });
  });

  it('measures from the earlier-born target whichever order the targets come in', () => {
    const { gap } = boardLayout([walterScott, ibnBattuta], walterScott, ibnBattuta);
    expect(gap).toMatchObject({ from: 1369, to: 1771 });
  });

  it('has no gap once the chain connects, and marks the final chain after a win', () => {
    const scottEarly = person('Scott early', 1700, 1780);
    const board = [ibnBattuta, chaucer, leonardo, galileo, person('Bridge', 1390, 1460), person('Late bridge', 1500, 1720), scottEarly, walterScott];
    expect(boardLayout(board, ibnBattuta, walterScott).gap).toBeNull();
    const won = boardLayout(board, ibnBattuta, walterScott, new Set(['Chaucer', 'Bridge', 'Leonardo', 'Late bridge', 'Scott early']));
    const status = Object.fromEntries(won.lanes.map(lane => [lane.figure.id, lane.status]));
    expect(status).toMatchObject({ 'Ibn Battuta': 'target', Chaucer: 'chain', Galileo: 'off-chain', 'Walter Scott': 'target' });
  });

  it('adds the targets when the board omits them', () => {
    expect(boardLayout([], ibnBattuta, walterScott).lanes).toHaveLength(2);
  });
});

describe('yearTicks', () => {
  it('picks the smallest round step that fits', () => {
    expect(yearTicks(1280, 1855, 4)).toEqual([1400, 1600, 1800]);
    expect(yearTicks(1280, 1855, 8)).toEqual([1300, 1400, 1500, 1600, 1700, 1800]);
  });

  it('crosses from BCE to CE on round years', () => {
    expect(yearTicks(-420, 130, 6)).toEqual([-400, -300, -200, -100, 0, 100]);
  });
});

describe('axisLabel', () => {
  it('marks BCE, and CE only beside BCE; year 0 reads 1 CE', () => {
    expect(axisLabel(-400, true)).toBe('400 BCE');
    expect(axisLabel(0, true)).toBe('1 CE');
    expect(axisLabel(100, true)).toBe('100 CE');
    expect(axisLabel(1600, false)).toBe('1600');
  });
});

describe('laneYears', () => {
  it('drops era marks on an all-CE board and keeps them beside BCE', () => {
    expect(laneYears(ibnBattuta, false)).toBe('1304–1369');
    expect(laneYears({ birthYear: -100, deathYear: -44 }, true)).toBe('100 BCE – 44 BCE');
    expect(laneYears({ birthYear: 1343, deathYear: 1400, birthApproximate: true }, false)).toBe('c. 1343–1400');
    expect(laneYears({ birthYear: 1950, deathYear: 2026, isLiving: true }, false)).toBe('born 1950');
  });
});
