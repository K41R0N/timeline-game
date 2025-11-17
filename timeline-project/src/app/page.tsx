'use client';

import { useState, useEffect } from 'react';
import { Timeline, HistoricalFigure, WikipediaService, SearchBar } from '@timeline/game-core';

console.log('🚀 Initializing Timeline Game...');

export default function Home() {
  const [figures, setFigures] = useState<HistoricalFigure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Load initial figures
  useEffect(() => {
    const loadInitialFigures = async () => {
      try {
        console.log('🔄 Loading initial historical figures...');
        setIsLoading(true);
        setError(null);

        // Fetch Alexander and Caesar as our initial timeline anchors
        const [alexander, caesar] = await Promise.all([
          WikipediaService.getPersonDetails('Alexander the Great'),
          WikipediaService.getPersonDetails('Julius Caesar')
        ]);

        if (!alexander || !caesar) {
          throw new Error('Failed to load initial historical figures');
        }

        console.log('✅ Initial figures loaded:', { 
          alexander: { name: alexander.name, years: `${alexander.birthYear}-${alexander.deathYear}` },
          caesar: { name: caesar.name, years: `${caesar.birthYear}-${caesar.deathYear}` }
        });
        
        setFigures([alexander, caesar]);
      } catch (err) {
        console.error('❌ Error loading initial figures:', err);
        setError('Failed to load initial figures. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialFigures();
  }, []);

  const handleFiguresChange = (updatedFigures: HistoricalFigure[]) => {
    console.log('📝 Updating timeline with figures:', 
      updatedFigures.map(f => ({ name: f.name, years: `${f.birthYear}-${f.deathYear}` }))
    );
    setFigures(updatedFigures);
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

  if (error) {
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
      {/* Fixed UI Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-2 left-2 z-[100] text-2xl pointer-events-auto">
          🌟
        </div>
      </div>

      {/* Timeline Canvas Container */}
      <main className="w-full h-screen bg-background">
        <Timeline 
          figures={figures}
          onFiguresChange={handleFiguresChange}
          isAnimating={isAnimating}
          onAnimationComplete={() => setIsAnimating(false)}
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
    </>
  );
}
