'use client';

import { useState } from 'react';

interface SplashScreenProps {
  onStart: (difficulty: 'easy' | 'medium' | 'hard') => void;
  isPreloading: boolean;
}

export function SplashScreen({ onStart, isPreloading }: SplashScreenProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  return (
    <div className="w-full h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center overflow-hidden animate-fadeIn">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-bright/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-7xl font-bold text-primary mb-4 tracking-tight">
            History Links
          </h1>
          <p className="text-xl md:text-2xl text-foreground-muted">
            Connect historical figures through time
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="timeline-card p-6">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-bold text-primary mb-2">Simple Goal</h3>
            <p className="text-sm text-foreground-muted">
              Connect two historical figures using people who lived at the same time
            </p>
          </div>

          <div className="timeline-card p-6">
            <div className="text-4xl mb-3">⛳</div>
            <h3 className="font-bold text-primary mb-2">Golf Scoring</h3>
            <p className="text-sm text-foreground-muted">
              Fewer connections = better score. Find the shortest path through history!
            </p>
          </div>

          <div className="timeline-card p-6">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-primary mb-2">Learn History</h3>
            <p className="text-sm text-foreground-muted">
              Discover how historical figures from different eras connect and overlap
            </p>
          </div>
        </div>

        {/* How to Play */}
        <div className="timeline-card p-8 mb-8 text-left max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-primary mb-4 text-center">How to Play</h2>
          <ol className="space-y-3 text-foreground-muted">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              <span>You'll get two <span className="text-yellow-600 font-medium">target figures</span> to connect (marked in yellow)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              <span>Search for people who lived during overlapping time periods</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              <span>Add figures to build a chain - <span className="text-green-600 font-medium">green</span> means good, <span className="text-red-600 font-medium">red</span> means wasted</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              <span>Win when both targets are connected with the fewest links!</span>
            </li>
          </ol>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-primary mb-4">Choose Your Challenge</h3>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => setSelectedDifficulty('easy')}
              className={`px-6 py-3 rounded-lg border-2 transition-all ${
                selectedDifficulty === 'easy'
                  ? 'border-green-500 bg-green-50 text-green-700 font-bold shadow-lg scale-105'
                  : 'border-green-300 bg-white text-green-600 hover:bg-green-50'
              }`}
            >
              <div className="font-bold">🟢 Easy</div>
              <div className="text-xs">200-700 years</div>
            </button>

            <button
              onClick={() => setSelectedDifficulty('medium')}
              className={`px-6 py-3 rounded-lg border-2 transition-all ${
                selectedDifficulty === 'medium'
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-700 font-bold shadow-lg scale-105'
                  : 'border-yellow-300 bg-white text-yellow-600 hover:bg-yellow-50'
              }`}
            >
              <div className="font-bold">🟡 Medium</div>
              <div className="text-xs">600-1400 years</div>
            </button>

            <button
              onClick={() => setSelectedDifficulty('hard')}
              className={`px-6 py-3 rounded-lg border-2 transition-all ${
                selectedDifficulty === 'hard'
                  ? 'border-red-500 bg-red-50 text-red-700 font-bold shadow-lg scale-105'
                  : 'border-red-300 bg-white text-red-600 hover:bg-red-50'
              }`}
            >
              <div className="font-bold">🔴 Hard</div>
              <div className="text-xs">1200+ years</div>
            </button>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStart(selectedDifficulty)}
          disabled={isPreloading}
          className={`
            px-12 py-4 rounded-lg text-xl font-bold
            transition-all duration-300 transform
            ${isPreloading
              ? 'bg-primary/50 text-white/50 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-bright text-white hover:scale-105 shadow-lg hover:shadow-glow'
            }
          `}
        >
          {isPreloading ? (
            <span className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading Game...
            </span>
          ) : (
            '▶ Start Playing'
          )}
        </button>

        {/* Keyboard shortcuts hint */}
        <div className="mt-8 text-sm text-foreground-muted">
          <p>💡 Tip: Use <kbd className="px-2 py-1 bg-background-marble rounded text-xs">Ctrl + Scroll</kbd> to zoom the timeline</p>
        </div>
      </div>
    </div>
  );
}
