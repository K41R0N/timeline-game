export interface HistoricalFigure {
  /** Wikidata QID (e.g. "Q635") for figures loaded from Wikimedia. */
  id: string;
  /** Canonical Wikipedia title, after redirects and normalisation. */
  name: string;
  /** Negative for BCE. */
  birthYear: number;
  /** Negative for BCE. For living people this is the current year (see `isLiving`). */
  deathYear: number;
  /** One-line description (Wikipedia short description). */
  shortDescription: string;
  imageUrl: string;
  contemporaries: string[];
  wikidataId?: string;
  /** First sentences of the Wikipedia intro, for the detail panel. */
  summary?: string;
  birthApproximate?: boolean;
  deathApproximate?: boolean;
  isLiving?: boolean;
}
