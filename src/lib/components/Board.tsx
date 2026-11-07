'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { axisLabel, boardLayout, laneYears, yearTicks, type Lane, type LaneStatus } from '../utils/board';
import { formatLifespan } from '../utils/GameLogic';

interface BoardProps {
  figures: HistoricalFigure[];
  targetA: HistoricalFigure;
  targetB: HistoricalFigure;
  /** The winning chain's people once the round is won. */
  finalChainIds: ReadonlySet<string> | null;
  /** The person just placed: their lane scrolls into view and lands with a brief highlight. */
  highlightId: string | null;
  selectedId: string | null;
  onSelect: (figure: HistoricalFigure) => void;
}

/** Bar colour per status, from the lane tokens in globals.css. */
const LANE_COLOR: Record<LaneStatus, string> = {
  target: 'var(--lane-target)',
  linked: 'var(--lane-linked)',
  loose: 'var(--lane-loose)',
  chain: 'var(--lane-chain)',
  'off-chain': 'var(--lane-off-chain)',
};

const STATUS_TEXT: Record<LaneStatus, string> = {
  target: 'target',
  linked: 'linked to a target',
  loose: 'not linked yet',
  chain: 'on your chain',
  'off-chain': 'not on your chain',
};

/** Roughly one axis label per this many pixels. */
const PIXELS_PER_TICK = 88;

/**
 * Places an element at `percent` across its container without letting it spill over either edge:
 * at 0% its left edge sits on the left side, at 100% its right edge sits on the right side.
 */
function anchoredAt(percent: number): CSSProperties {
  const clamped = Math.min(100, Math.max(0, percent));
  return { left: `${clamped}%`, transform: `translateX(-${clamped}%)` };
}

/** Fades the ends of a bar whose birth or death year is approximate. */
function barBackground(lane: Lane): string {
  const color = LANE_COLOR[lane.status];
  const start = lane.figure.birthApproximate ? `transparent 0%, ${color} 40%` : `${color} 0%`;
  const end = lane.figure.deathApproximate ? `${color} 60%, transparent 100%` : `${color} 100%`;
  return `linear-gradient(to right, ${start}, ${end})`;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Every life on the board as a bar on one year axis that always fits the screen's width, earliest-born at the top.
 * The stretch neither target's chain reaches yet is shaded across all lanes.
 */
export function Board({ figures, targetA, targetB, finalChainIds, highlightId, selectedId, onSelect }: BoardProps) {
  const layout = useMemo(() => boardLayout(figures, targetA, targetB, finalChainIds), [figures, targetA, targetB, finalChainIds]);
  const [axisRef, width] = useWidth<HTMLDivElement>();
  const ticks = yearTicks(layout.from, layout.to, Math.max(2, Math.floor((width || 360) / PIXELS_PER_TICK)));
  const axisHasBce = layout.from < 0;
  const laneRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!highlightId) return;
    laneRefs.current.get(highlightId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightId, figures.length]);

  const { gap } = layout;

  return (
    <div className="h-full overflow-y-auto overscroll-contain" aria-label="Timeline">
      <div className="sticky top-0 z-10 bg-background-marble backdrop-blur-sm border-b border-[var(--card-border)] px-4 sm:px-8">
        <div ref={axisRef} className="relative h-8" aria-hidden>
          {ticks.map(year => {
            const at = ((year - layout.from) / (layout.to - layout.from)) * 100;
            return (
              <div key={year} className="absolute inset-y-0" style={{ left: `${at}%` }}>
                <div className="absolute bottom-0 h-2 w-px bg-[var(--card-border)]" />
                <span
                  className="absolute top-1.5 whitespace-nowrap text-[11px] font-medium tabular-nums text-foreground-muted"
                  style={{ transform: `translateX(-${at}%)` }}
                >
                  {axisLabel(year, axisHasBce)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative px-4 sm:px-8 pb-6">
        <div className="relative">
          {gap && (
            <>
              <div
                aria-hidden
                className="absolute inset-y-0 border-x border-dashed border-[var(--gap-edge)] bg-[var(--gap-fill)]"
                style={{ left: `${gap.left}%`, width: `${gap.width}%` }}
              />
              <div className="relative h-9">
                <span
                  className="absolute top-2 whitespace-nowrap rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold text-[var(--gap-text)] ring-1 ring-[var(--gap-edge)]"
                  style={anchoredAt(gap.left + gap.width / 2)}
                >
                  {gap.years}-year gap · {laneYears({ birthYear: gap.from, deathYear: gap.to }, axisHasBce)}
                </span>
              </div>
            </>
          )}

          <ol className={`relative ${gap ? '' : 'pt-3'}`}>
            {layout.lanes.map(lane => {
              const { figure, status } = lane;
              const isTarget = status === 'target';
              const muted = status === 'loose' || status === 'off-chain';
              const selected = figure.id === selectedId;
              const fresh = figure.id === highlightId;
              return (
                <li
                  key={figure.id}
                  ref={element => {
                    if (element) laneRefs.current.set(figure.id, element);
                    else laneRefs.current.delete(figure.id);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(figure)}
                    aria-label={`${figure.name}, ${formatLifespan(figure)}, ${STATUS_TEXT[status]}`}
                    className={`group relative block w-full rounded-lg py-1.5 text-left transition-colors duration-200 hover:bg-background-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      selected ? 'bg-background-hover ring-1 ring-primary' : ''
                    } ${fresh ? 'animate-laneLand' : ''}`}
                  >
                    <div className="relative h-5">
                      <span className="absolute top-0 flex max-w-full items-baseline gap-1.5 whitespace-nowrap" style={anchoredAt(lane.left + lane.width / 2)}>
                        <span className={`truncate text-sm ${isTarget ? 'font-bold' : 'font-medium'} ${muted ? 'text-foreground-subtle' : 'text-foreground'}`}>
                          {figure.name}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-foreground-muted">{laneYears(figure, axisHasBce)}</span>
                      </span>
                    </div>
                    <div className="relative mt-1 h-2.5">
                      <div
                        className={`absolute inset-y-0 min-w-[6px] rounded-full ${fresh ? 'origin-left animate-barGrow' : ''} ${isTarget ? 'ring-2 ring-[var(--lane-target-ring)]' : ''}`}
                        style={{ left: `${lane.left}%`, width: `${lane.width}%`, backgroundImage: barBackground(lane) }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
