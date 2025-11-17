import { HistoricalFigure } from '../types/HistoricalFigure';

export interface ChainAnalysis {
  targetA: HistoricalFigure;
  targetB: HistoricalFigure;
  connectedFigures: Set<string>; // IDs of figures in the chain connecting targets
  unconnectedFigures: Set<string>; // IDs of figures not part of the connection
  isComplete: boolean; // Are the two targets connected?
  chainLength: number; // Number of intermediate figures (excludes targets)
  shortestPath: HistoricalFigure[]; // The actual chain of figures from A to B
}

/**
 * Check if two historical figures are contemporaries (overlapping lifetimes)
 */
export function areContemporaries(fig1: HistoricalFigure, fig2: HistoricalFigure): boolean {
  return fig1.birthYear <= fig2.deathYear && fig2.birthYear <= fig1.deathYear;
}

/**
 * Find the shortest path between two figures using BFS (Breadth-First Search)
 * Returns the path including both start and end figures, or null if no path exists
 */
function findShortestPath(
  start: HistoricalFigure,
  end: HistoricalFigure,
  allFigures: HistoricalFigure[]
): HistoricalFigure[] | null {
  // Build adjacency map of contemporaries
  const adjacencyMap = new Map<string, Set<string>>();

  for (const figure of allFigures) {
    adjacencyMap.set(figure.id, new Set());
    for (const other of allFigures) {
      if (figure.id !== other.id && areContemporaries(figure, other)) {
        adjacencyMap.get(figure.id)!.add(other.id);
      }
    }
  }

  // BFS to find shortest path
  const queue: { figure: HistoricalFigure; path: HistoricalFigure[] }[] = [
    { figure: start, path: [start] }
  ];
  const visited = new Set<string>([start.id]);

  while (queue.length > 0) {
    const { figure, path } = queue.shift()!;

    // Found the target!
    if (figure.id === end.id) {
      return path;
    }

    // Explore neighbors (contemporaries)
    const neighbors = adjacencyMap.get(figure.id) || new Set();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const neighborFigure = allFigures.find(f => f.id === neighborId)!;
        queue.push({
          figure: neighborFigure,
          path: [...path, neighborFigure]
        });
      }
    }
  }

  // No path found
  return null;
}

/**
 * Analyze the connection chain between two target figures
 * Returns detailed information about the chain, unconnected figures, and completion status
 */
export function analyzeChain(
  targetA: HistoricalFigure,
  targetB: HistoricalFigure,
  allFigures: HistoricalFigure[]
): ChainAnalysis {
  console.log('🔗 Analyzing chain between:', targetA.name, 'and', targetB.name);

  // Find shortest path between targets
  const shortestPath = findShortestPath(targetA, targetB, allFigures);

  if (!shortestPath) {
    // No connection yet
    console.log('❌ No connection found between targets');
    return {
      targetA,
      targetB,
      connectedFigures: new Set([targetA.id, targetB.id]),
      unconnectedFigures: new Set(
        allFigures
          .filter(f => f.id !== targetA.id && f.id !== targetB.id)
          .map(f => f.id)
      ),
      isComplete: false,
      chainLength: 0,
      shortestPath: []
    };
  }

  // Extract connected figures (those in the shortest path)
  const connectedIds = new Set(shortestPath.map(f => f.id));
  const unconnectedIds = new Set(
    allFigures
      .filter(f => !connectedIds.has(f.id))
      .map(f => f.id)
  );

  // Chain length excludes the two targets
  const chainLength = shortestPath.length - 2;

  console.log('✅ Chain found!', {
    length: chainLength,
    path: shortestPath.map(f => f.name).join(' → ')
  });

  return {
    targetA,
    targetB,
    connectedFigures: connectedIds,
    unconnectedFigures: unconnectedIds,
    isComplete: true,
    chainLength,
    shortestPath
  };
}

/**
 * Check if adding a new figure would improve the connection between targets
 * Returns true if the new figure shortens the chain or connects previously disconnected figures
 */
export function wouldImproveChain(
  newFigure: HistoricalFigure,
  targetA: HistoricalFigure,
  targetB: HistoricalFigure,
  currentFigures: HistoricalFigure[]
): boolean {
  const currentAnalysis = analyzeChain(targetA, targetB, currentFigures);
  const newAnalysis = analyzeChain(targetA, targetB, [...currentFigures, newFigure]);

  // Improvement if:
  // 1. Chain becomes complete when it wasn't before
  if (!currentAnalysis.isComplete && newAnalysis.isComplete) {
    return true;
  }

  // 2. Chain becomes shorter
  if (newAnalysis.isComplete && currentAnalysis.isComplete) {
    return newAnalysis.chainLength < currentAnalysis.chainLength;
  }

  // 3. New figure is a contemporary of at least one target (progress toward connection)
  if (!currentAnalysis.isComplete) {
    return areContemporaries(newFigure, targetA) || areContemporaries(newFigure, targetB);
  }

  return false;
}
