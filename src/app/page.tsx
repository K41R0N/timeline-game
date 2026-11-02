'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Timeline,
  HistoricalFigure,
  WikipediaService,
  lookupFailureMessage,
  SearchBar,
  WinModal,
  SplashScreen,
  analyzeChain,
  TargetSelectionService,
  useAutoSave,
  useGameStatePersistence
} from '@/lib';

console.log('🚀 Initializing Timeline Game...');

export default function Home() {
  const [figures, setFigures] = useState<HistoricalFigure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
  // Latest figures for async handlers; avoids appending to a stale list (#62).
  const figuresRef = useRef<HistoricalFigure[]>([]);
  const isAddingRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);

  // Game state
  const [score, setScore] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [winningChain, setWinningChain] = useState<HistoricalFigure[]>([]);
  const [targetA, setTargetA] = useState<HistoricalFigure | null>(null);
  const [targetB, setTargetB] = useState<HistoricalFigure | null>(null);

  // State persistence hooks
  const { loadSavedState, clearState } = useGameStatePersistence();
  useAutoSave(figures, targetA, targetB, difficulty, score);

  // Load saved state on mount - runs ONCE only
  useEffect(() => {
    const savedState = loadSavedState();
    if (savedState && savedState.figures.length > 0) {
      console.log('🔄 Restoring saved game...');
      setFigures(savedState.figures);
      setTargetA(savedState.targetA);
      setTargetB(savedState.targetB);
      setDifficulty(savedState.difficulty);
      setScore(savedState.score);
      setShowSplash(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = run once on mount only

  // Handle splash screen "Start Playing" button - show difficulty selector
  const handleStartGame = () => {
    console.log('🎮 Showing difficulty selector...');
    setShowSplash(false);
    setShowDifficultySelect(true);
  };

  const loadGame = async (selectedDifficulty: 'easy' | 'medium' | 'hard') => {
    try {
      console.log(`🔄 Loading ${selectedDifficulty} difficulty game...`);
      setIsLoading(true);
      setError(null);

      let targets = await TargetSelectionService.selectRandomTargets(selectedDifficulty);

      if (!targets) {
        console.warn('⚠️ Random selection failed, using default targets...');
        targets = await TargetSelectionService.selectDefaultTargets();
      }

      if (!targets) {
        throw new Error('Failed to load historical figures');
      }

      const [targetA, targetB] = targets;

      console.log('✅ Game targets loaded:', {
        difficulty: selectedDifficulty,
        targetA: { name: targetA.name, years: `${targetA.birthYear}-${targetA.deathYear}` },
        targetB: { name: targetB.name, years: `${targetB.birthYear}-${targetB.deathYear}` }
      });

      setTargetA(targetA);
      setTargetB(targetB);
      setFigures([targetA, targetB]);
      setDifficulty(selectedDifficulty);
      setShowDifficultySelect(false);
    } catch (err) {
      console.error('❌ Error loading initial figures:', err);
      setError('Failed to load initial figures. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    figuresRef.current = figures;
  }, [figures]);

  const showError = (message: string) => {
    setError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 3000);
  };

  // Calculate score
  useEffect(() => {
    if (figures.length >= 2) {
      const newScore = Math.max(0, figures.length - 2);
      setScore(newScore);
      console.log(`📊 Score updated: ${newScore}`);
    }
  }, [figures]);

  // Check for win condition
  useEffect(() => {
    if (figures.length < 2 || !targetA || !targetB || hasWon) return;

    const analysis = analyzeChain(targetA, targetB, figures);

    if (analysis.isComplete) {
      console.log('🎉 WIN CONDITION MET!', {
        chainLength: analysis.chainLength,
        path: analysis.shortestPath.map(f => f.name).join(' → ')
      });
      setHasWon(true);
      setWinningChain(analysis.shortestPath);
    }
  }, [figures, targetA, targetB, hasWon]);

  const handleFiguresChange = (updatedFigures: HistoricalFigure[]) => {
    console.log('📝 Updating timeline with figures:',
      updatedFigures.map(f => ({ name: f.name, years: `${f.birthYear}-${f.deathYear}` }))
    );
    setFigures(updatedFigures);
  };

  const handlePlayAgain = () => {
    console.log('🔄 Returning to splash screen...');
    clearState(); // Clear saved progress
    setHasWon(false);
    setWinningChain([]);
    setScore(0);
    setFigures([]);
    setTargetA(null);
    setTargetB(null);
    setSelectedFigure(null);
    setShowDifficultySelect(false);
    setShowSplash(true);
  };

  const handleAddFigure = async (name: string) => {
    const query = name.trim();
    if (!query || isAddingRef.current) return;

    const nameMatch = figuresRef.current.find(f => f.name.toLowerCase() === query.toLowerCase());
    if (nameMatch) {
      showError(`${nameMatch.name} is already in the timeline`);
      setSelectedFigure(nameMatch);
      return;
    }

    console.log(`🔍 Looking up historical figure: "${query}"`);
    isAddingRef.current = true;
    setIsAdding(true);
    setIsAnimating(true);

    try {
      const result = await WikipediaService.lookupPerson(query);
      if (!result.ok) {
        console.warn(`⚠️ Rejected "${query}": ${result.reason}`);
        showError(lookupFailureMessage(result.reason, result.title));
        return;
      }

      const figure = result.figure;
      if (figuresRef.current.some(f => f.id === figure.id)) {
        showError(`${figure.name} is already in the timeline`);
        return;
      }

      // Functional update so concurrent renders never drop an addition (#62).
      setFigures(prev =>
        prev.some(f => f.id === figure.id) ? prev : [...prev, figure].sort((a, b) => a.birthYear - b.birthYear)
      );
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
      setIsAnimating(false);
    }
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onStart={handleStartGame} />;
  }

  if (showDifficultySelect) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="timeline-card p-8 max-w-md">
          <h2 className="text-2xl font-bold text-primary mb-4">Select Difficulty</h2>
          <p className="text-foreground-muted mb-6">
            Choose how far apart the targets will be:
          </p>

          <div className="space-y-3">
            <button
              onClick={() => loadGame('easy')}
              className="w-full p-4 rounded-lg border-2 border-green-400 bg-green-50 hover:bg-green-100 transition-colors text-left"
            >
              <div className="font-bold text-green-700">Easy</div>
              <div className="text-sm text-green-600">200-700 years apart</div>
            </button>

            <button
              onClick={() => loadGame('medium')}
              className="w-full p-4 rounded-lg border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
            >
              <div className="font-bold text-yellow-700">Medium</div>
              <div className="text-sm text-yellow-600">600-1400 years apart</div>
            </button>

            <button
              onClick={() => loadGame('hard')}
              className="w-full p-4 rounded-lg border-2 border-red-400 bg-red-50 hover:bg-red-100 transition-colors text-left"
            >
              <div className="font-bold text-red-700">Hard</div>
              <div className="text-sm text-red-600">1200+ years apart</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-xl">
          Loading Timeline...
        </div>
      </div>
    );
  }

  if (error && figures.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-red-500 text-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* New Game Button - Top Left */}
      <div className="fixed top-4 left-4 z-[22] pointer-events-auto">
        <button
          onClick={() => {
            if (confirm('Start a new game? Your current progress will be lost.')) {
              handlePlayAgain();
            }
          }}
          className="timeline-card px-4 py-2 shadow-glow hover:shadow-xl transition-all hover:scale-105"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎮</span>
            <span className="text-sm font-medium text-primary">New Game</span>
          </div>
        </button>
      </div>

      {/* Compact Floating Score Badge - Top Right */}
      <div className="fixed top-4 right-4 z-[22] pointer-events-auto group">
        <div className="timeline-card p-3 shadow-glow hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3">
            {/* Score */}
            <div className="text-center">
              <div className={`text-2xl font-bold leading-none ${score === 0 ? 'text-green-600' : score <= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                {score}
              </div>
              <div className="text-[9px] text-foreground-muted uppercase mt-0.5">
                Score
              </div>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-8 bg-primary-bright-20" />

            {/* Difficulty Badge */}
            <div className="text-center">
              <div className="text-xs font-bold text-primary">
                {difficulty === 'easy' ? '⭐' : difficulty === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
              </div>
              <div className="text-[9px] text-foreground-muted uppercase">
                {difficulty}
              </div>
            </div>
          </div>

          {/* Goal Tooltip on Hover */}
          {targetA && targetB && (
            <div className="absolute top-full right-0 mt-2 w-[300px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
              <div className="timeline-card p-3 shadow-lg">
                <div className="text-[10px] text-foreground-muted uppercase mb-1">
                  Goal
                </div>
                <div className="text-sm font-semibold text-primary">
                  <span className="text-yellow-600">{targetA.name}</span>
                  <span className="mx-1 text-foreground-muted">→</span>
                  <span className="text-yellow-600">{targetB.name}</span>
                </div>
                <div className="text-[10px] text-foreground-subtle mt-1">
                  Find the shortest path • Lower score is better
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[101] pointer-events-none">
          <div className="timeline-card px-6 py-3 bg-red-50 border-2 border-red-400 animate-fadeIn">
            <div className="text-sm text-red-700 font-medium">
              ⚠️ {error}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Canvas Container */}
      <main className="w-full h-screen bg-background">
        <Timeline
          figures={figures}
          onFiguresChange={handleFiguresChange}
          isAnimating={isAnimating}
          onAnimationComplete={() => setIsAnimating(false)}
          targetA={targetA}
          targetB={targetB}
          selectedFigure={selectedFigure}
          onSelectFigure={setSelectedFigure}
        />
      </main>

      {/* Floating Search Bar */}
      <SearchBar
        figures={figures}
        onSelect={setSelectedFigure}
        onAddFigure={handleAddFigure}
        isAdding={isAdding}
      />

      {/* Win Modal */}
      {hasWon && (
        <WinModal
          score={score}
          winningChain={winningChain}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </>
  );
}
