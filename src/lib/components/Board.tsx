'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { axisLabel, boardLayout, eraOf, laneYears, tableLayout, type LaneStatus, type TableCard } from '../utils/board';
import { ERA_COLOR, Portrait } from './ui/Portrait';
import { formatLifespan } from '../utils/GameLogic';

interface BoardProps {
  figures: HistoricalFigure[];
  targetA: HistoricalFigure;
  targetB: HistoricalFigure;
  /** The winning chain's people, targets included, once the round is won. */
  finalChainIds: ReadonlySet<string> | null;
  /** The person just placed: their card lands face down, turns over, and scrolls into view. */
  highlightId: string | null;
  selectedId: string | null;
  onSelect: (figure: HistoricalFigure) => void;
}


const STATUS_TEXT: Record<LaneStatus, string> = {
  target: 'target',
  linked: 'linked to a target',
  loose: 'not linked yet',
  chain: 'on your chain',
  'off-chain': 'not on your chain',
};

/** Width of the year rail on the table's left edge. */
const RAIL = 44;
/** Space between card columns, and kept clear on the table's right edge. */
const GUTTER = 12;
/** A card is never shorter than its portrait and two lines of name. */
const MIN_CARD_HEIGHT = 60;
/** How far a card lying on another is shifted right, so both stay visible. */
const STACK_SHIFT = 10;
const TABLE_PADDING = 20;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Counts a card's years up from earlier ones while it turns over; returns the years to show. */
function useCountedYears(figure: HistoricalFigure, active: boolean) {
  const [shown, setShown] = useState({ birth: figure.birthYear, death: figure.deathYear });
  useEffect(() => {
    if (!active || prefersReducedMotion()) return;
    const run = 60;
    const start = performance.now() + 200;
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, Math.max(0, (now - start) / 650));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown({
        birth: Math.round(figure.birthYear - run * (1 - eased)),
        death: Math.round(figure.deathYear - run * (1 - eased)),
      });
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, figure.birthYear, figure.deathYear]);
  // A count cut short by the next placement must not leave its in-between years on the card.
  return active ? shown : { birth: figure.birthYear, death: figure.deathYear };
}

interface CardProps {
  card: TableCard;
  left: number;
  width: number;
  pxPerYear: number;
  axisHasBce: boolean;
  fresh: boolean;
  selected: boolean;
  onSelect: (figure: HistoricalFigure) => void;
  anchorRef: (element: HTMLDivElement | null) => void;
}

function Card({ card, left, width, pxPerYear, axisHasBce, fresh, selected, onSelect, anchorRef }: CardProps) {
  const { figure, status } = card.lane;
  const era = eraOf(figure.birthYear);
  const years = useCountedYears(figure, fresh);
  const lifeHeight = Math.max(4, (figure.deathYear - figure.birthYear) * pxPerYear);
  const isTarget = status === 'target';
  const large = width >= 200;
  const split = card.height >= (large ? 150 : 120);
  const yearText = (year: number, approximate?: boolean) => `${approximate ? 'c. ' : ''}${axisLabel(year, axisHasBce)}`;
  const spine = isTarget ? 'linear-gradient(180deg, var(--foil-light), var(--foil) 40%, var(--foil-deep))' : ERA_COLOR[era];

  const treatment =
    status === 'loose'
      ? 'opacity-75 saturate-50'
      : status === 'off-chain'
        ? 'opacity-50 saturate-[0.3]'
        : status === 'chain'
          ? '-translate-y-0.5 shadow-[0_6px_0_rgba(0,0,0,0.3),0_16px_28px_rgba(0,0,0,0.35)]'
          : '';

  return (
    <div
      ref={anchorRef}
      className={`absolute [transform-style:preserve-3d] ${fresh ? 'card-landing' : ''}`}
      style={{ top: card.top, left, width, height: card.height, zIndex: 1 + card.depth, perspective: 900 }}
    >
      <button
        type="button"
        onClick={() => onSelect(figure)}
        aria-label={`${figure.name}, ${formatLifespan(figure)}, ${STATUS_TEXT[status]}`}
        className={`card-front relative flex h-full w-full flex-col justify-start overflow-hidden rounded-[10px] bg-[var(--card-stock)] text-left text-[var(--card-ink)] shadow-[0_4px_0_rgba(0,0,0,0.28),0_10px_18px_rgba(0,0,0,0.2)] transition-[transform,opacity,filter] duration-200 [backface-visibility:hidden] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)] ${
          isTarget ? 'ring-2 ring-[var(--foil)]' : ''
        } ${selected ? 'ring-4 ring-[var(--foil-light)]' : ''} ${treatment}`}
      >
        {/* The spine is the life to scale: it starts at birth and is exactly as long as the life. */}
        <span aria-hidden className="absolute left-0 top-0 w-[5px] rounded-br-sm" style={{ height: Math.min(lifeHeight, card.height), background: spine }} />
        <span className={`flex items-start ${large ? 'gap-3 p-3 pl-4' : 'gap-2 py-2 pl-3 pr-2'}`}>
          <Portrait figure={figure} size={large ? 'lg' : 'md'} />
          <span className="min-w-0">
            <span className={`type-display line-clamp-2 block font-extrabold uppercase leading-[0.95] tracking-[0.01em] ${large ? 'text-[22px]' : 'text-[15px]'}`}>
              {figure.name}
            </span>
            <span className={`type-display mt-1 block font-semibold leading-none text-[var(--card-muted)] ${large ? 'text-xl' : 'text-[15px]'}`}>
              {split ? yearText(years.birth, figure.birthApproximate) : laneYears({ ...figure, birthYear: years.birth, deathYear: years.death }, axisHasBce)}
            </span>
          </span>
        </span>
        {/* A tall card prints its death year at its bottom edge, where the life ends on the table. */}
        {split && (
          <span className={`type-display absolute bottom-2 font-semibold leading-none text-[var(--card-muted)] ${large ? 'left-4 text-xl' : 'left-3 text-[15px]'}`}>
            {figure.isLiving ? 'living' : yearText(years.death, figure.deathApproximate)}
          </span>
        )}
      </button>
      {fresh && (
        <span
          aria-hidden
          className="card-back absolute inset-0 grid place-items-center rounded-[10px] border-[3px] border-[var(--card-stock)] [backface-visibility:hidden]"
          style={{ background: 'repeating-linear-gradient(45deg, var(--foil) 0 6px, var(--foil-deep) 6px 12px)' }}
        >
          <span className="type-display grid h-9 w-9 place-items-center rounded-full bg-[var(--table)] text-xl font-black text-[var(--chalk-text)]">?</span>
        </span>
      )}
    </div>
  );
}

/**
 * The table: time runs down, each card starts at its birth year and is as long as the life it holds,
 * and the stretch neither target's chain reaches yet is an empty, chalk-outlined bay.
 */
export function Board({ figures, targetA, targetB, finalChainIds, highlightId, selectedId, onSelect }: BoardProps) {
  const board = useMemo(() => boardLayout(figures, targetA, targetB, finalChainIds), [figures, targetA, targetB, finalChainIds]);
  const [scrollRef, size] = useSize<HTMLDivElement>();
  const width = size.width || 360;
  const columns = width >= 900 ? 4 : width >= 560 ? 3 : 2;
  const columnWidth = (width - RAIL - GUTTER * columns) / columns;
  // Wide columns get larger cards, which need room for a bigger portrait.
  const minCardHeight = columnWidth >= 200 ? 84 : MIN_CARD_HEIGHT;
  const table = useMemo(
    () =>
      tableLayout(board, {
        columns,
        minCardHeight,
        // Wide tables fit the whole span on screen; narrow ones run a little longer so cards keep their size.
        targetHeight: Math.max(420, (size.height || 600) * (columns >= 3 ? 1 : 1.15) - TABLE_PADDING * 2),
        minPxPerYear: 0.45,
        maxPxPerYear: 3,
      }),
    [board, columns, minCardHeight, size.height]
  );
  const placeOf = (card: TableCard) => {
    const shift = Math.min(card.depth, 2) * STACK_SHIFT;
    return { left: RAIL + card.column * (columnWidth + GUTTER) + shift, width: columnWidth - shift };
  };
  const axisHasBce = board.from < 0;
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!highlightId) return;
    cardRefs.current.get(highlightId)?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [highlightId, figures.length]);

  // The winning chain's thread runs through the middle of each card's top, in chain order from target to target.
  const thread = finalChainIds
    ? [...finalChainIds]
        .map(id => table.cards.find(card => card.lane.figure.id === id))
        .filter((card): card is TableCard => card !== undefined)
        .map(card => {
          const { left, width: w } = placeOf(card);
          return { x: left + w / 2, y: card.top + Math.min(card.height, minCardHeight) / 2 };
        })
    : [];
  const threadLength = thread.reduce((sum, point, i) => (i === 0 ? 0 : sum + Math.hypot(point.x - thread[i - 1].x, point.y - thread[i - 1].y)), 0);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overscroll-contain bg-[radial-gradient(120%_70%_at_50%_0%,var(--table-light)_0%,var(--table)_55%,var(--table-deep)_100%)]"
      aria-label="Table of placed people, earliest born at the top"
    >
      <div className="relative" style={{ height: table.height + TABLE_PADDING * 2, paddingTop: TABLE_PADDING }}>
        <div className="relative" style={{ height: table.height }}>
          {table.ticks.map(tick => (
            <div key={tick.year} aria-hidden className="absolute inset-x-0" style={{ top: tick.top }}>
              <span className="type-display absolute left-2 -translate-y-1/2 text-[13px] font-bold text-[var(--table-muted)]">
                {axisLabel(tick.year, axisHasBce)}
              </span>
              <span className="absolute right-0 border-t border-dotted border-[var(--table-line)]" style={{ left: RAIL }} />
            </div>
          ))}
          <div aria-hidden className="absolute inset-y-0 border-r border-[var(--table-line)]" style={{ left: RAIL - 6 }} />

          {table.gap && board.gap && (
            <div
              className="absolute rounded-xl border-2 border-dashed border-[var(--chalk)]"
              style={{ top: table.gap.top, height: Math.max(table.gap.height, 28), left: RAIL, right: GUTTER }}
            >
              <span className="type-display absolute left-1/2 top-2 z-[25] -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--chalk)] bg-[var(--table)] px-3 py-0.5 text-sm font-extrabold uppercase tracking-[0.06em] text-[var(--chalk-text)] shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                {board.gap.years} years to bridge
              </span>
            </div>
          )}

          {table.cards.map(card => {
            const { left, width: w } = placeOf(card);
            const id = card.lane.figure.id;
            return (
              <Card
                key={id}
                card={card}
                left={left}
                width={w}
                pxPerYear={table.pxPerYear}
                axisHasBce={axisHasBce}
                fresh={id === highlightId}
                selected={id === selectedId}
                onSelect={onSelect}
                anchorRef={element => {
                  if (element) cardRefs.current.set(id, element);
                  else cardRefs.current.delete(id);
                }}
              />
            );
          })}

          {thread.length > 1 && (
            <svg aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
              <polyline
                className="thread-draw"
                style={{ ['--thread-length' as string]: `${threadLength}` }}
                points={thread.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="var(--foil)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {thread.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={5} fill="var(--foil-light)" stroke="var(--foil-deep)" strokeWidth={2} />
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
