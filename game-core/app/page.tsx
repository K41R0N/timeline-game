'use client';

import Timeline from '../components/Timeline';
import historicalFigures from '../data/historical-figures.json';
import { HistoricalFigure } from '../types/HistoricalFigure';

export default function Home() {
  const figures = historicalFigures.figures as HistoricalFigure[];
  const startFigure = figures.find(f => f.id === 'alexander_great')!;
  const endFigure = figures.find(f => f.id === 'leonardo_da_vinci')!;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Historical Timeline Game</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Connect the Historical Figures</h2>
          <p className="text-gray-600 mb-2">
            Start: <span className="font-semibold text-green-600">{startFigure.name}</span>
          </p>
          <p className="text-gray-600 mb-4">
            End: <span className="font-semibold text-red-600">{endFigure.name}</span>
          </p>
        </div>

        <Timeline 
          figures={figures}
          startFigure={startFigure}
          endFigure={endFigure}
        />
      </div>
    </main>
  );
} 