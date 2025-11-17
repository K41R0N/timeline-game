'use client';

import { useState, useEffect } from 'react';
import { HistoricalFigure, TimelineNode } from '../types/HistoricalFigure';

interface TimelineProps {
  figures: HistoricalFigure[];
  startFigure: HistoricalFigure;
  endFigure: HistoricalFigure;
}

export default function Timeline({ figures, startFigure, endFigure }: TimelineProps) {
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Calculate timeline positions
  useEffect(() => {
    const allYears = figures.map(f => [f.birthYear, f.deathYear]).flat();
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);
    const timespan = maxYear - minYear;

    const newNodes = figures.map(figure => ({
      figure,
      x: ((figure.birthYear - minYear) / timespan) * 100,
      selected: false,
      isStart: figure.id === startFigure.id,
      isEnd: figure.id === endFigure.id
    }));

    setNodes(newNodes);
  }, [figures, startFigure, endFigure]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    setNodes(nodes.map(node => ({
      ...node,
      selected: node.figure.id === nodeId
    })));
  };

  return (
    <div className="w-full h-[600px] relative bg-gray-100 p-8">
      {/* Timeline line */}
      <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-300" />

      {/* Timeline nodes */}
      {nodes.map((node) => (
        <div
          key={node.figure.id}
          className={`absolute transform -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-all duration-300
            ${node.selected ? 'scale-110' : ''}
            ${node.isStart ? 'border-green-500' : ''}
            ${node.isEnd ? 'border-red-500' : ''}`}
          style={{ left: `${node.x}%`, top: '50%' }}
          onClick={() => handleNodeClick(node.figure.id)}
        >
          {/* Figure image */}
          <div className={`w-16 h-16 rounded-full overflow-hidden border-4 
            ${node.isStart ? 'border-green-500' : ''}
            ${node.isEnd ? 'border-red-500' : ''}
            ${node.selected ? 'border-blue-500' : 'border-gray-300'}`}>
            <img
              src={node.figure.imageUrl}
              alt={node.figure.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Figure info */}
          <div className={`absolute -bottom-24 left-1/2 transform -translate-x-1/2 
            bg-white p-2 rounded-lg shadow-lg w-48 text-center
            ${node.selected ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
            <h3 className="font-bold text-sm">{node.figure.name}</h3>
            <p className="text-xs text-gray-600">
              {Math.abs(node.figure.birthYear)} {node.figure.birthYear < 0 ? 'BC' : 'AD'} - 
              {Math.abs(node.figure.deathYear)} {node.figure.deathYear < 0 ? 'BC' : 'AD'}
            </p>
            <p className="text-xs mt-1">{node.figure.shortDescription}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 