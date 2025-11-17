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
  position: number;  // Calculated position (0-100%)
  isAbove: boolean;  // Alternating vertical display
} 