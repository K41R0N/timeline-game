// Main components
export { default as Timeline } from './components/Timeline';

// UI components
export { SearchBar } from './components/ui/SearchBar';
export { SearchInput } from './components/ui/SearchInput';
export { DetailPanel } from './components/ui/DetailPanel';
export { WinModal } from './components/ui/WinModal';
export { SplashScreen } from './components/ui/SplashScreen';
export { PlacementReveal } from './components/ui/PlacementReveal';
export { HintButton } from './components/ui/HintButton';

// Types
export * from './types/HistoricalFigure';

// Services
export { WikipediaService, lookupFailureMessage } from './services/WikipediaService';
export type { PersonLookupResult, PersonLookupFailure } from './services/WikipediaService';
export { TargetSelectionService } from './services/TargetSelectionService';

// Utilities
export * from './utils/ChainAnalyzer';
export * from './utils/GameLogic';
export * from './utils/overlap';
export * from './utils/style';
export * from './utils/par';
export * from './utils/difficulty';

// Data
export { loadRoster } from './data/roster';
export type { RosterPerson } from './data/roster';

// Hooks
export * from './hooks/useGameState';
