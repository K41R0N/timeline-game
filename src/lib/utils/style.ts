import { HistoricalFigure } from '../types/HistoricalFigure';
import { areContemporaries } from './ChainAnalyzer';
import { isClutchLink, isLongLife, sharedYears } from './overlap';

export type StyleBadge =
  | { kind: 'clutch'; from: HistoricalFigure; to: HistoricalFigure; sharedYears: number }
  | { kind: 'longBridge'; person: HistoricalFigure; years: number };

export interface FinalChain {
  /** Target A first, target B last. */
  chain: HistoricalFigure[];
  badges: StyleBadge[];
}

/**
 * The chain the round is scored on: the shortest path between the targets through the
 * player's placements, and among equally short paths the one earning the most style.
 * Targets are given rather than picked, so they never earn long bridge themselves.
 */
export function finalChain(targetA: HistoricalFigure, targetB: HistoricalFigure, figures: HistoricalFigure[]): FinalChain | null {
  const nodes = [targetA, ...figures.filter(f => f.id !== targetA.id && f.id !== targetB.id), targetB];
  const isTarget = (f: HistoricalFigure) => f.id === targetA.id || f.id === targetB.id;
  const nodeStyle = (f: HistoricalFigure) => (!isTarget(f) && isLongLife(f) ? 1 : 0);
  const linkStyle = (a: HistoricalFigure, b: HistoricalFigure) => (isClutchLink(a, b) ? 1 : 0);

  // Breadth-first layers from target A.
  const distance = new Map<string, number>([[targetA.id, 0]]);
  const layers: HistoricalFigure[][] = [[targetA]];
  while (!distance.has(targetB.id)) {
    const next: HistoricalFigure[] = [];
    for (const current of layers[layers.length - 1]) {
      for (const other of nodes) {
        if (!distance.has(other.id) && areContemporaries(current, other)) {
          distance.set(other.id, layers.length);
          next.push(other);
        }
      }
    }
    if (next.length === 0) return null;
    layers.push(next);
  }

  // Most style reachable at each node along shortest paths only.
  const best = new Map<string, { score: number; previous: HistoricalFigure | null }>([[targetA.id, { score: 0, previous: null }]]);
  for (let depth = 1; depth < layers.length; depth++) {
    for (const node of layers[depth]) {
      for (const previous of layers[depth - 1]) {
        if (!areContemporaries(previous, node)) continue;
        const score = best.get(previous.id)!.score + linkStyle(previous, node) + nodeStyle(node);
        if (!best.has(node.id) || score > best.get(node.id)!.score) best.set(node.id, { score, previous });
      }
    }
  }

  const chain: HistoricalFigure[] = [];
  for (let node: HistoricalFigure | null = targetB; node; node = best.get(node.id)!.previous) chain.unshift(node);

  const badges: StyleBadge[] = [];
  chain.forEach((node, i) => {
    if (i > 0 && linkStyle(chain[i - 1], node)) {
      badges.push({ kind: 'clutch', from: chain[i - 1], to: node, sharedYears: sharedYears(chain[i - 1], node)! });
    }
    if (nodeStyle(node)) badges.push({ kind: 'longBridge', person: node, years: node.deathYear - node.birthYear });
  });
  return { chain, badges };
}
