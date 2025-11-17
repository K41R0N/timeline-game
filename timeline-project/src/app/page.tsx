'use client';

import { useState, useEffect } from 'react';
import {
  Timeline,
  HistoricalFigure,
  WikipediaService,
  SearchBar,
  ScoreDisplay,
  WinModal,
  analyzeChain,
  TargetSelectionService
} from '@timeline/game-core';

console.log('🚀 Initializing Timeline Game...');

export default function Home() {
  const [figures, setFigures] = useState<HistoricalFigure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Game state
  const [score, setScore] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [winningChain, setWinningChain] = useState<HistoricalFigure[]>([]);
  const [targetA, setTargetA] = useState<HistoricalFigure | null>(null);
  const [targetB, setTargetB] = useState<HistoricalFigure | null>(null);

  // Load initial figures
  useEffect(() => {
    const loadInitialFigures = async () => {
      try {
        console.log('🔄 Loading random historical figures for new game...');
        setIsLoading(true);
        setError(null);

        // Try to select random targets (medium difficulty)
        let targets = await TargetSelectionService.selectRandomTargets('medium');

        // Fallback to default targets if random selection fails
        if (!targets) {
          console.warn('⚠️ Random selection failed, using default targets...');
          targets = await TargetSelectionService.selectDefaultTargets();
        }

        if (!targets) {
          throw new Error('Failed to load historical figures');
        }

        const [targetA, targetB] = targets;

        console.log('✅ Game targets loaded:', {
          targetA: { name: targetA.name, years: `${targetA.birthYear}-${targetA.deathYear}` },
          targetB: { name: targetB.name, years: `${targetB.birthYear}-${targetB.deathYear}` }
        });

        // Set targets and initial figures
        setTargetA(targetA);
        setTargetB(targetB);
        setFigures([targetA, targetB]);
      } catch (err) {
        console.error('❌ Error loading initial figures:', err);
        setError('Failed to load initial figures. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialFigures();
  }, []);

  // Calculate score (number of intermediate figures)
  useEffect(() => {
    if (figures.length >= 2) {
      // Score = total figures minus the 2 targets
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
    console.log('🔄 Restarting game with new random targets...');
    setHasWon(false);
    setWinningChain([]);
    setScore(0);
    setFigures([]);
    setTargetA(null);
    setTargetB(null);
    setIsLoading(true);
    setError(null);

    // Load new random figures
    const loadInitialFigures = async () => {
      try {
        // Try to select random targets (medium difficulty)
        let targets = await TargetSelectionService.selectRandomTargets('medium');

        // Fallback to default targets if random selection fails
        if (!targets) {
          console.warn('⚠️ Random selection failed, using default targets...');
          targets = await TargetSelectionService.selectDefaultTargets();
        }

        if (!targets) {
          throw new Error('Failed to load historical figures');
        }

        const [targetA, targetB] = targets;
        setTargetA(targetA);
        setTargetB(targetB);
        setFigures([targetA, targetB]);
      } catch (err) {
        console.error('❌ Error reloading figures:', err);
        setError('Failed to restart game. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialFigures();
  };

  const handleAddFigure = async (name: string) => {
    console.log(`🔍 Searching for historical figure: "${name}"`);
    setIsAnimating(true);
    
    try {
      // Check if figure already exists (case-insensitive)
      const existingFigure = figures.find(f => 
        f.name.toLowerCase() === name.toLowerCase() ||
        f.id === name.toLowerCase().replace(/\s+/g, '_')
      );

      if (existingFigure) {
        console.log(`⚠️ Figure "${name}" already exists in timeline`);
        setError(`${name} is already in the timeline`);
        return;
      }

      const figure = await WikipediaService.getPersonDetails(name);
      if (figure) {
        console.log('✨ Found figure details:', { 
          name: figure.name, 
          years: `${figure.birthYear}-${figure.deathYear}`,
          imageUrl: figure.imageUrl 
        });

        // Double check no duplicate by ID (in case name differs slightly)
        if (figures.some(f => f.id === figure.id)) {
          console.log(`⚠️ Figure with ID "${figure.id}" already exists in timeline`);
          setError(`${name} is already in the timeline`);
          return;
        }

        const updatedFigures = [...figures, figure].sort((a, b) => a.birthYear - b.birthYear);
        setFigures(updatedFigures);
        setError(null);
      } else {
        console.warn(`⚠️ No details found for: "${name}"`);
        setError(`Could not find historical details for ${name}`);
      }
    } catch (err) {
      console.error(`❌ Error adding figure "${name}":`, err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error adding ${name}: ${errorMessage}`);
    } finally {
      setIsAnimating(false);
    }
  };

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
      {/* Score Display - Top Right */}
      <div className="fixed top-4 right-4 z-[100] pointer-events-auto">
        <ScoreDisplay
          score={score}
          targetA={targetA?.name}
          targetB={targetB?.name}
        />
      </div>

      {/* Game Title - Top Left */}
      <div className="fixed top-4 left-4 z-[100] pointer-events-auto">
        <div className="timeline-card px-4 py-2">
          <h1 className="text-lg font-bold text-primary">
            History Links
          </h1>
          <p className="text-xs text-foreground-muted">
            Connect through time
          </p>
        </div>
      </div>

      {/* Timeline Canvas Container */}
      <main className="w-full h-screen bg-background">
        <Timeline
          figures={figures}
          onFiguresChange={handleFiguresChange}
          isAnimating={isAnimating}
          onAnimationComplete={() => setIsAnimating(false)}
          targetA={targetA}
          targetB={targetB}
        />
      </main>

      {/* Search Bar Layer */}
      <div className="fixed bottom-0 left-0 right-0 z-[100]">
        <SearchBar
          figures={figures}
          onSelect={setSelectedFigure}
          onAddFigure={handleAddFigure}
        />
      </div>

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
