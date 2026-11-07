import { describe, expect, it } from 'vitest';
import { axisLabel, boardLayout, eraOf, laneYears, tableLayout, yearTicks } from './board';
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

describe('eraOf', () => {
  it('splits history into five eras by birth year', () => {
    expect([-100, 499, 500, 1399, 1400, 1649, 1650, 1849, 1850].map(eraOf)).toEqual([
      'ancient', 'ancient', 'medieval', 'medieval', 'renaissance', 'renaissance', 'enlightenment', 'enlightenment', 'modern',
    ]);
  });
});

describe('tableLayout', () => {
  const options = { columns: 2, minCardHeight: 60, targetHeight: 900, minPxPerYear: 0.8, maxPxPerYear: 2.4 };

  it('scales the span to the target height within the allowed range', () => {
    const board = boardLayout([ibnBattuta, walterScott], ibnBattuta, walterScott);
    const table = tableLayout(board, options);
    expect(table.pxPerYear).toBeCloseTo(900 / (board.to - board.from));
    expect(tableLayout(board, { ...options, targetHeight: 100 }).pxPerYear).toBe(0.8);
    expect(tableLayout(board, { ...options, targetHeight: 5000 }).pxPerYear).toBe(2.4);
  });

  it('starts each card at its birth year and makes it as long as the life', () => {
    const board = boardLayout([ibnBattuta, chaucer, walterScott], ibnBattuta, walterScott);
    const table = tableLayout(board, options);
    const card = table.cards.find(c => c.lane.figure.id === 'Chaucer')!;
    expect(card.top).toBeCloseTo((1343 - board.from) * table.pxPerYear);
    expect(card.height).toBeCloseTo(57 * table.pxPerYear);
  });

  it('puts overlapping lives side by side, and stacks a card when every column is taken', () => {
    const board = boardLayout([ibnBattuta, chaucer, person('Third', 1350, 1390), walterScott], ibnBattuta, walterScott);
    const table = tableLayout(board, options);
    const byId = Object.fromEntries(table.cards.map(c => [c.lane.figure.id, c]));
    expect(byId['Ibn Battuta'].column).not.toBe(byId.Chaucer.column);
    expect(byId.Third.depth).toBe(1);
    expect(byId['Walter Scott'].depth).toBe(0);
  });

  it('places the gap and the ticks on the same scale', () => {
    const board = boardLayout([ibnBattuta, walterScott], ibnBattuta, walterScott);
    const table = tableLayout(board, options);
    expect(table.gap!.top).toBeCloseTo((1369 - board.from) * table.pxPerYear);
    expect(table.gap!.height).toBeCloseTo(402 * table.pxPerYear);
    expect(table.ticks.every(t => t.top >= 0 && t.top <= table.height)).toBe(true);
  });
});
