export interface HistoricalFigure {
  id: string;
  name: string;
  birthYear: number;
  deathYear: number;
  shortDescription: string;
  imageUrl: string;
  contemporaries: string[];
}

export interface TimelineNode {
  figure: HistoricalFigure;
  x: number;  // Position on timeline
  selected: boolean;
  isStart?: boolean;
  isEnd?: boolean;
} 