import { HistoricalFigure } from '../types/HistoricalFigure';
import { livesConnectedTo } from './ChainAnalyzer';

type Life = Pick<HistoricalFigure, 'birthYear' | 'deathYear' | 'birthApproximate' | 'deathApproximate' | 'isLiving'>;

/**
 * How a person shows on the board:
 * - target: one of the two people to connect.
 * - linked: joined to a target through a run of overlapping lives.
 * - loose: placed, but not yet joined to either target.
 * - chain / off-chain: once the chain is complete, on the final chain or not.
 */
export type LaneStatus = 'target' | 'linked' | 'loose' | 'chain' | 'off-chain';

export interface Lane {
  figure: HistoricalFigure;
  status: LaneStatus;
  /** Where the life starts, as a percentage of the board's width. */
  left: number;
  /** How long the life is, as a percentage of the board's width. */
  width: number;
}

/** The stretch neither target's chain reaches yet: from the earlier side's latest death to the later side's earliest birth. */
export interface BoardGap {
  from: number;
  to: number;
  years: number;
  left: number;
  width: number;
}

export interface BoardLayout {
  /** The years the board spans, padded so no life touches an edge. */
  from: number;
  to: number;
  /** One lane per person, earliest-born first. */
  lanes: Lane[];
  gap: BoardGap | null;
}

const EDGE_PADDING = 0.04;
const MIN_PADDING_YEARS = 5;

/** Lanes, statuses and the open gap for a board. `finalChainIds` holds the winning chain once the round is won. */
export function boardLayout(
  figures: HistoricalFigure[],
  targetA: HistoricalFigure,
  targetB: HistoricalFigure,
  finalChainIds: ReadonlySet<string> | null = null
): BoardLayout {
  const people = figures.some(f => f.id === targetA.id) && figures.some(f => f.id === targetB.id) ? figures : [targetA, targetB, ...figures];
  const earliest = Math.min(...people.map(f => f.birthYear));
  const latest = Math.max(...people.map(f => f.deathYear));
  const padding = Math.max(MIN_PADDING_YEARS, Math.round((latest - earliest) * EDGE_PADDING));
  const from = earliest - padding;
  const to = latest + padding;
  const at = (year: number) => ((year - from) / (to - from)) * 100;

  const [earlier, later] = targetA.birthYear <= targetB.birthYear ? [targetA, targetB] : [targetB, targetA];
  const earlierSide = livesConnectedTo(people, [earlier]);
  const laterSide = livesConnectedTo(people, [later]);
  const targetIds = new Set([targetA.id, targetB.id]);

  const statusOf = (figure: HistoricalFigure): LaneStatus => {
    if (targetIds.has(figure.id)) return 'target';
    if (finalChainIds) return finalChainIds.has(figure.id) ? 'chain' : 'off-chain';
    return earlierSide.has(figure.id) || laterSide.has(figure.id) ? 'linked' : 'loose';
  };

  const lanes = [...people]
    .sort((x, y) => x.birthYear - y.birthYear || x.deathYear - y.deathYear)
    .map(figure => ({ figure, status: statusOf(figure), left: at(figure.birthYear), width: at(figure.deathYear) - at(figure.birthYear) }));

  let gap: BoardGap | null = null;
  if (!earlierSide.has(later.id)) {
    const reach = Math.max(...[...earlierSide.values()].map(f => f.deathYear));
    const reachBack = Math.min(...[...laterSide.values()].map(f => f.birthYear));
    if (reachBack > reach) {
      gap = { from: reach, to: reachBack, years: reachBack - reach, left: at(reach), width: at(reachBack) - at(reach) };
    }
  }

  return { from, to, lanes, gap };
}

const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

/** Round years to mark on the axis between `from` and `to`, at most `maxTicks` of them. */
export function yearTicks(from: number, to: number, maxTicks: number): number[] {
  const span = to - from;
  const step = TICK_STEPS.find(s => span / s <= maxTicks) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const ticks: number[] = [];
  for (let year = Math.ceil(from / step) * step; year <= to; year += step) ticks.push(year);
  return ticks;
}

/** A tick's label: BCE years marked, CE years marked only when the axis also shows BCE. There is no year 0, so it reads 1 CE. */
export function axisLabel(year: number, axisHasBce: boolean): string {
  if (year < 0) return `${-year} BCE`;
  const shown = year === 0 ? 1 : year;
  return axisHasBce ? `${shown} CE` : `${shown}`;
}

/** A lifespan as a lane labels it: "c." for approximate years, era marks only when the board shows BCE years. */
export function laneYears(life: Life, axisHasBce: boolean): string {
  const year = (value: number, approximate?: boolean) => `${approximate ? 'c. ' : ''}${axisLabel(value, axisHasBce)}`;
  const birth = year(life.birthYear, life.birthApproximate);
  if (life.isLiving) return `born ${birth}`;
  return `${birth}${axisHasBce ? ' – ' : '–'}${year(life.deathYear, life.deathApproximate)}`;
}

/** The era a card's frame is coloured by, from the birth year. */
export type Era = 'ancient' | 'medieval' | 'renaissance' | 'enlightenment' | 'modern';

export function eraOf(birthYear: number): Era {
  if (birthYear < 500) return 'ancient';
  if (birthYear < 1400) return 'medieval';
  if (birthYear < 1650) return 'renaissance';
  if (birthYear < 1850) return 'enlightenment';
  return 'modern';
}

export interface TableCard {
  lane: Lane;
  /** Pixels from the top of the table to the birth year. */
  top: number;
  /** The life's length in pixels, raised to the card's minimum height. */
  height: number;
  /** Which column of the table the card lies in, from the left. */
  column: number;
  /** How many cards it lies on top of in its column; 0 when it lies on the bare table. */
  depth: number;
}

export interface TableLayout {
  pxPerYear: number;
  /** The table's full height in pixels. */
  height: number;
  cards: TableCard[];
  gap: { top: number; height: number } | null;
  ticks: { year: number; top: number }[];
}

export interface TableOptions {
  columns: number;
  /** A card is never shorter than this, so its portrait and name fit. */
  minCardHeight: number;
  /** The height the whole span should take when the scale allows it. */
  targetHeight: number;
  minPxPerYear: number;
  maxPxPerYear: number;
  /** Space kept between two cards in the same column. */
  cardGap?: number;
}

const PX_PER_TICK = 110;

/**
 * Lays a board out as a table where time runs down: each card starts at its birth year and is as long as the
 * life, and cards fill the columns in turn so neighbours in time sit side by side. When every column is
 * still covered at a card's birth year, the card lies on top of the one that ends first.
 */
export function tableLayout(board: BoardLayout, options: TableOptions): TableLayout {
  const { columns, minCardHeight, targetHeight, minPxPerYear, maxPxPerYear, cardGap = 6 } = options;
  const span = board.to - board.from;
  const pxPerYear = Math.min(maxPxPerYear, Math.max(minPxPerYear, targetHeight / span));
  const at = (year: number) => (year - board.from) * pxPerYear;

  const bottoms: number[] = Array(columns).fill(-Infinity);
  const depths: number[] = Array(columns).fill(0);
  let previous = -1;
  const cards = board.lanes.map(lane => {
    const top = at(lane.figure.birthYear);
    const height = Math.max(minCardHeight, (lane.figure.deathYear - lane.figure.birthYear) * pxPerYear);
    const order = Array.from({ length: columns }, (_, i) => (previous + 1 + i) % columns);
    let column = order.find(c => bottoms[c] + cardGap <= top);
    let depth = 0;
    if (column === undefined) {
      column = order.reduce((best, c) => (bottoms[c] < bottoms[best] ? c : best));
      depth = depths[column] + 1;
    }
    bottoms[column] = Math.max(bottoms[column], top + height);
    depths[column] = depth;
    previous = column;
    return { lane, top, height, column, depth };
  });

  const height = Math.max(at(board.to), ...cards.map(card => card.top + card.height));
  const gap = board.gap ? { top: at(board.gap.from), height: board.gap.years * pxPerYear } : null;
  const ticks = yearTicks(board.from, board.to, Math.max(2, Math.floor(height / PX_PER_TICK))).map(year => ({ year, top: at(year) }));
  return { pxPerYear, height, cards, gap, ticks };
}
