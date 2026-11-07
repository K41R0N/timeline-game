// Main components
export { default as Timeline } from './components/Timeline';
export { GameRound } from './components/GameRound';
export type { GameRoundProps, ParPerson } from './components/GameRound';
export { DailyRound } from './components/DailyRound';

// UI components
export { SearchBar } from './components/ui/SearchBar';
export { SearchInput } from './components/ui/SearchInput';
export { DetailPanel } from './components/ui/DetailPanel';
export { WinModal } from './components/ui/WinModal';
export { SplashScreen } from './components/ui/SplashScreen';
export { PlacementReveal } from './components/ui/PlacementReveal';
export { HintButton } from './components/ui/HintButton';
export { Countdown } from './components/ui/Countdown';

// Types
export * from './types/HistoricalFigure';

// Services
export { WikipediaService, lookupFailureMessage } from './services/WikipediaService';
export type { PersonLookupResult, PersonLookupFailure } from './services/WikipediaService';
export { TargetSelectionService } from './services/TargetSelectionService';
export { analytics, currentTime } from './services/analytics';

// Utilities
export * from './utils/ChainAnalyzer';
export * from './utils/GameLogic';
export * from './utils/overlap';
export * from './utils/style';
export * from './utils/par';
export * from './utils/difficulty';
export * from './utils/roundEvents';
export * from './utils/daily';
export * from './utils/dailyProgress';

// Data
export { loadRoster } from './data/roster';
export type { RosterPerson } from './data/roster';
// Types only: the schedule itself is read on the server (src/lib/server/daily.ts), never through this barrel.
export type { DailyPuzzle, PuzzlePerson } from './data/dailySchedule';

// Hooks
export * from './hooks/useGameState';
export { useDailyProgress, updateDailyProgress } from './hooks/useDailyProgress';
