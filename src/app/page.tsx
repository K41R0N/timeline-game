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
  TargetSelectionService,
  useAutoSave,
  useGameStatePersistence,
  PlacementReveal,
  HintButton,
  loadRoster,
  computePar,
  nextHint,
  revealPlacement,
  finalChain,
  countStrokes,
  hintPolicy,
  DIFFICULTY_BANDS,
} from '@/lib';
import type { Difficulty, RosterPerson, RevealResult, SavedHint, StyleBadge } from '@/lib';

console.log('🚀 Initializing Timeline Game...');

const DIFFICULTY_OPTIONS: Array<{ difficulty: Difficulty; label: string; knowledge: string; className: string }> = [
  { difficulty: 'easy', label: 'Easy', knowledge: 'Many famous people fit every step', className: 'border-green-400 bg-green-50 hover:bg-green-100 text-green-700' },
  { difficulty: 'medium', label: 'Medium', knowledge: 'Some steps have only a few famous answers', className: 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-700' },
  { difficulty: 'hard', label: 'Hard', knowledge: 'At least one step has only one or two famous answers', className: 'border-red-400 bg-red-50 hover:bg-red-100 text-red-700' },
];

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
  // Bumped on every new game; lookups started in an earlier game are ignored when they resolve.
  const gameGenerationRef = useRef(0);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Splash screen state
  const [showSplash, setShowSplash] = useState(true);

  // Game state
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState<SavedHint | null>(null);
  const [reveal, setReveal] = useState<{ figure: HistoricalFigure; reveal: RevealResult } | null>(null);
  const [roster, setRoster] = useState<RosterPerson[] | null>(null);
  const [parChain, setParChain] = useState<RosterPerson[] | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const [winningChain, setWinningChain] = useState<HistoricalFigure[]>([]);
  const [winningBadges, setWinningBadges] = useState<StyleBadge[]>([]);
  const [targetA, setTargetA] = useState<HistoricalFigure | null>(null);
  const [targetB, setTargetB] = useState<HistoricalFigure | null>(null);

  // State persistence hooks
  const { loadSavedState, clearState } = useGameStatePersistence();
  useAutoSave(figures, targetA, targetB, difficulty, hintsUsed, hint);
  const strokes = countStrokes(figures, hintsUsed, difficulty);
  const par = parChain?.length ?? null;
  const policy = hintPolicy(difficulty);

  // Load saved state on mount - runs ONCE only
  useEffect(() => {
    const savedState = loadSavedState();
    if (savedState && savedState.figures.length > 0) {
      console.log('🔄 Restoring saved game...');
      setFigures(savedState.figures);
      setTargetA(savedState.targetA);
      setTargetB(savedState.targetB);
      setDifficulty(savedState.difficulty);
      setHintsUsed(savedState.hintsUsed);
      setHint(savedState.hint);
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

      const rosterPeople = await loadRoster();
      const targets = await TargetSelectionService.selectTargets(rosterPeople, selectedDifficulty);

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

  useEffect(() => {
    if (!targetA || !targetB) return;
    let cancelled = false;
    loadRoster()
      .then(people => {
        if (cancelled) return;
        const result = computePar(people, targetA, targetB);
        setRoster(people);
        setParChain(result.playable ? result.chain : null);
        console.log(`📊 Par ${result.playable ? result.par : 'unavailable'} for ${targetA.name} → ${targetB.name}`);
      })
      .catch(err => {
        console.error('❌ Error loading the roster:', err);
        if (!cancelled) setError('Failed to load the game data. Please refresh the page.');
      });
    return () => {
      cancelled = true;
    };
  }, [targetA, targetB]);

  // Check for win condition
  useEffect(() => {
    if (figures.length < 2 || !targetA || !targetB || hasWon) return;

    const final = finalChain(targetA, targetB, figures);

    if (final) {
      console.log('🎉 WIN CONDITION MET!', {
        chainLength: final.chain.length - 2,
        path: final.chain.map(f => f.name).join(' → ')
      });
      setHasWon(true);
      setWinningChain(final.chain);
      setWinningBadges(final.badges);
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
    // Abandon any lookup still in flight: its result belongs to the old game, and the
    // new game should not stay locked waiting for it.
    gameGenerationRef.current += 1;
    isAddingRef.current = false;
    setIsAdding(false);
    setIsAnimating(false);
    clearState(); // Clear saved progress
    setHasWon(false);
    setWinningChain([]);
    setWinningBadges([]);
    setHintsUsed(0);
    setHint(null);
    setReveal(null);
    setParChain(null);
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
    const generation = gameGenerationRef.current;
    isAddingRef.current = true;
    setIsAdding(true);
    setIsAnimating(true);

    try {
      const result = await WikipediaService.lookupPerson(query);
      if (generation !== gameGenerationRef.current) {
        console.log(`⚠️ Ignoring "${query}": the game it was added to has ended`);
        return;
      }
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

      if (targetA && targetB) {
        setReveal({ figure, reveal: revealPlacement(figure, figuresRef.current, targetA, targetB) });
      }
      setHint(current => (current?.id === figure.id ? null : current));

      // Functional update so concurrent renders never drop an addition (#62).
      setFigures(prev =>
        prev.some(f => f.id === figure.id) ? prev : [...prev, figure].sort((a, b) => a.birthYear - b.birthYear)
      );
    } finally {
      // A new game already released the lock; don't release one a newer lookup holds.
      if (generation === gameGenerationRef.current) {
        isAddingRef.current = false;
        setIsAdding(false);
        setIsAnimating(false);
      }
    }
  };

  const handleHint = () => {
    if (!roster || !targetA || !targetB || hint) return;
    const next = nextHint(roster, targetA, targetB, figuresRef.current);
    if (!next) return;
    setHint({ id: next.id, name: next.name });
    setHintsUsed(count => count + 1);
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
            Connect two famous people in as few strokes as you can. Harder rounds need longer chains and people fewer players know.
          </p>

          <div className="space-y-3">
            {DIFFICULTY_OPTIONS.map(option => {
              const band = DIFFICULTY_BANDS[option.difficulty];
              return (
                <button
                  key={option.difficulty}
                  onClick={() => loadGame(option.difficulty)}
                  className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${option.className}`}
                >
                  <div className="font-bold">{option.label}</div>
                  <div className="text-sm">
                    Par {band.minPar}–{band.maxPar} • about {band.yearsApart} years apart
                  </div>
                  <div className="text-xs opacity-80">{option.knowledge}</div>
                </button>
              );
            })}
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
            <div className="text-center">
              <div className={`text-2xl font-bold leading-none ${par !== null && strokes > par ? 'text-amber-600' : 'text-green-600'}`}>
                {strokes}
              </div>
              <div className="text-[9px] text-foreground-muted uppercase mt-0.5">
                Strokes
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold leading-none text-primary">
                {par ?? '…'}
              </div>
              <div className="text-[9px] text-foreground-muted uppercase mt-0.5">
                Par
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
                  {par !== null
                    ? `Connect them in as few people as you can • Par is ${par} • Every person placed is a stroke`
                    : 'Connect them in as few people as you can • Every person placed is a stroke'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {targetA && targetB && !hasWon && (
        <div className="fixed top-24 right-4 z-[21] pointer-events-auto">
          <HintButton
            costLabel={policy.label}
            hintName={hint && !figures.some(f => f.id === hint.id) ? hint.name : null}
            disabled={!roster || isAdding}
            onRequest={handleHint}
            onPlace={handleAddFigure}
          />
        </div>
      )}

      {reveal && (
        <PlacementReveal
          key={reveal.figure.id}
          figure={reveal.figure}
          reveal={reveal.reveal}
          won={hasWon}
          onDismiss={() => setReveal(null)}
        />
      )}

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

      {/* Win Modal: opens once the winning placement's reveal is dismissed */}
      {hasWon && !reveal && (
        <WinModal
          strokes={strokes}
          par={par}
          chain={winningChain}
          badges={winningBadges}
          parChain={parChain && targetA && targetB ? [targetA, ...parChain, targetB] : null}
          hintsUsed={policy.recorded ? hintsUsed : null}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </>
  );
}
