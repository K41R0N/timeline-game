'use client';

import { useState, useEffect, useRef } from 'react';
import { HistoricalFigure, TimelineNode } from '../types/HistoricalFigure';
import { SearchInput } from './ui/SearchInput';
import { DetailPanel } from './ui/DetailPanel';
import { SearchBar } from './ui/SearchBar';
import { WikipediaService } from '../services/WikipediaService';
import { analyzeChain, areContemporaries, ChainAnalysis } from '../utils/ChainAnalyzer';

interface TimelineProps {
  figures: HistoricalFigure[];
  onFiguresChange?: (figures: HistoricalFigure[]) => void;
  isAnimating?: boolean;
  onAnimationComplete?: () => void;
  targetA?: HistoricalFigure | null;
  targetB?: HistoricalFigure | null;
}

export default function Timeline({
  figures,
  onFiguresChange,
  isAnimating = false,
  onAnimationComplete,
  targetA = null,
  targetB = null
}: TimelineProps) {
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [animationProgress, setAnimationProgress] = useState(0);
  const [chainAnalysis, setChainAnalysis] = useState<ChainAnalysis | null>(null);
  const [prevFiguresLength, setPrevFiguresLength] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Constants for timeline dimensions and constraints
  const TIMELINE_WIDTH = 1000;
  const TIMELINE_HEIGHT = 400;
  const MAX_PAN = 200;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const BASE_EXTENSION = 500;

  // Calculate the dynamic timeline extension based on zoom
  const getTimelineExtension = (currentZoom: number) => {
    return BASE_EXTENSION * (1 + (1 / currentZoom));
  };

  // Calculate bubble scale to maintain constant size (exact inverse of zoom)
  const getBubbleScale = (currentZoom: number) => {
    return 1 / currentZoom;
  };

  // Analyze chain whenever figures change
  useEffect(() => {
    if (targetA && targetB && figures.length >= 2) {
      const analysis = analyzeChain(targetA, targetB, figures);
      setChainAnalysis(analysis);
      console.log('📊 Chain Analysis:', {
        isComplete: analysis.isComplete,
        chainLength: analysis.chainLength,
        path: analysis.shortestPath.map(f => f.name).join(' → ')
      });
    }
  }, [figures, targetA, targetB]);

  // Handle figure addition animation
  useEffect(() => {
    if (isAnimating && figures.length > 0) {
      const startTime = Date.now();
      const duration = 1000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimationProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          onAnimationComplete?.();
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isAnimating, figures, onAnimationComplete]);

  // Calculate node positions with collision detection and center timeline
  useEffect(() => {
    if (figures.length === 0) return;

    const allYears = figures.map(f => [f.birthYear, f.deathYear]).flat();
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);
    const timespan = maxYear - minYear;

    // Create nodes with basic positioning
    const basicNodes = figures.map((figure, index) => ({
      figure,
      position: ((figure.birthYear - minYear) / timespan) * 100,
      isAbove: index % 2 === 0
    }));

    // Improved positioning: prevent overlaps by checking horizontal spacing
    const BUBBLE_WIDTH = 8; // Width in percentage points (80px at 1000px width)
    const MIN_SPACING = 10; // Minimum spacing between bubbles in percentage points

    const newNodes = basicNodes.map((node, index) => {
      if (index === 0) return node;

      // Check for overlap with previous nodes on the same side
      let adjustedIsAbove = node.isAbove;
      let needsRepositioning = false;

      // Look back at recent nodes on the same side
      for (let i = index - 1; i >= Math.max(0, index - 3); i--) {
        const prevNode = basicNodes[i];
        if (prevNode.isAbove === adjustedIsAbove) {
          const distance = Math.abs(node.position - prevNode.position);
          if (distance < MIN_SPACING) {
            // Too close, flip to other side
            adjustedIsAbove = !adjustedIsAbove;
            needsRepositioning = true;
            break;
          }
        }
      }

      // If still overlapping after flip, check the other side
      if (needsRepositioning) {
        for (let i = index - 1; i >= Math.max(0, index - 3); i--) {
          const prevNode = basicNodes[i];
          if (prevNode.isAbove === adjustedIsAbove) {
            const distance = Math.abs(node.position - prevNode.position);
            if (distance < MIN_SPACING) {
              // Both sides crowded, keep original but add vertical offset
              adjustedIsAbove = node.isAbove;
              break;
            }
          }
        }
      }

      return {
        ...node,
        isAbove: adjustedIsAbove
      };
    });

    setNodes(newNodes);

    // Auto-snap to latest figure if a new one was added
    const snapToLatest = () => {
      if (!viewportRef.current || !contentRef.current) return;

      const viewport = viewportRef.current.getBoundingClientRect();
      const scaledWidth = TIMELINE_WIDTH * zoom;
      const scaledHeight = TIMELINE_HEIGHT * zoom;

      // If a new figure was added (not initial load), snap to it
      if (figures.length > prevFiguresLength && figures.length > 2) {
        const latestNode = newNodes[newNodes.length - 1];
        // Center on the latest node
        const targetX = (viewport.width / 2) - (latestNode.position / 100) * scaledWidth * zoom;
        const targetY = (viewport.height - scaledHeight) / 2;

        setPan({
          x: targetX,
          y: targetY
        });
      } else {
        // Initial centering
        setPan({
          x: (viewport.width - scaledWidth) / 2,
          y: (viewport.height - scaledHeight) / 2
        });
      }

      setPrevFiguresLength(figures.length);
    };

    setTimeout(snapToLatest, 50);
  }, [figures, zoom, prevFiguresLength]);

  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (viewportRef.current?.contains(e.target as Node) && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
      }
    };

    viewportRef.current?.addEventListener('wheel', preventBrowserZoom, { passive: false });

    return () => {
      viewportRef.current?.removeEventListener('wheel', preventBrowserZoom);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && viewportRef.current) {
      const viewport = viewportRef.current.getBoundingClientRect();
      const scaledWidth = TIMELINE_WIDTH * zoom;
      const scaledHeight = TIMELINE_HEIGHT * zoom;

      const newPan = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };

      const minX = (viewport.width - scaledWidth) / 2 - MAX_PAN;
      const maxX = (viewport.width - scaledWidth) / 2 + MAX_PAN;
      const minY = (viewport.height - scaledHeight) / 2 - MAX_PAN;
      const maxY = (viewport.height - scaledHeight) / 2 + MAX_PAN;

      setPan({
        x: Math.min(Math.max(newPan.x, minX), maxX),
        y: Math.min(Math.max(newPan.y, minY), maxY)
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;

      const cursorX = e.clientX - viewport.left;
      const cursorY = e.clientY - viewport.top;

      let zoomDelta;
      if (Math.abs(e.deltaY) < 50) {
        zoomDelta = -e.deltaY * 0.002;
      } else {
        zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      }

      const newZoom = Math.min(Math.max(zoom * (1 + zoomDelta), MIN_ZOOM), MAX_ZOOM);
      const scale = newZoom / zoom;

      const newPan = {
        x: cursorX - (cursorX - pan.x) * scale,
        y: cursorY - (cursorY - pan.y) * scale
      };

      setZoom(newZoom);
      setPan(newPan);
      return;
    }

    const panSpeed = e.shiftKey ? 2 : 1;
    setPan(prev => ({
      x: prev.x - (e.shiftKey ? e.deltaY : 0) * panSpeed,
      y: prev.y - (!e.shiftKey ? e.deltaY : 0) * panSpeed
    }));
  };

  // Zoom control handlers
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, MAX_ZOOM);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, MIN_ZOOM);
    setZoom(newZoom);
  };

  const centerView = () => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current.getBoundingClientRect();
    const scaledWidth = TIMELINE_WIDTH * zoom;
    const scaledHeight = TIMELINE_HEIGHT * zoom;

    setPan({
      x: (viewport.width - scaledWidth) / 2,
      y: (viewport.height - scaledHeight) / 2
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const getWikimediaUrl = (imageUrl: string): string => {
    try {
      if (imageUrl.startsWith('http')) {
        return imageUrl.replace(/^http:/, 'https:');
      }
      const url = new URL(imageUrl);
      return url.toString();
    } catch (error) {
      console.error('Error processing image URL:', imageUrl, error);
      return imageUrl;
    }
  };


  const ProfileImage = ({ figure }: { figure: HistoricalFigure }) => {
    const [hasError, setHasError] = useState(false);

    if (!figure.imageUrl || hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-primary text-2xl text-background font-medium">
          {getInitials(figure.name)}
        </div>
      );
    }

    return (
      <img
        src={figure.imageUrl}
        alt={figure.name}
        className="absolute inset-0 w-full h-full object-cover"
        crossOrigin="anonymous"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    );
  };

  const handleAddFigure = async (name: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const figure = await WikipediaService.getPersonDetails(name);

      if (!figure) {
        setError(`Could not load details for ${name}`);
        return;
      }

      if (figures.some(f => f.id === figure.id)) {
        return;
      }

      const updatedFigures = [...figures, figure].sort((a, b) => a.birthYear - b.birthYear);
      onFiguresChange?.(updatedFigures);

    } catch (error) {
      console.error(`Error adding figure ${name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Error adding ${name}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for figure status
  const isTargetFigure = (figure: HistoricalFigure) => {
    return figure.id === targetA?.id || figure.id === targetB?.id;
  };

  const isInChain = (figure: HistoricalFigure) => {
    return chainAnalysis?.connectedFigures.has(figure.id) || false;
  };

  const getFigureStatus = (figure: HistoricalFigure) => {
    if (isTargetFigure(figure)) return 'target';
    if (!chainAnalysis || !chainAnalysis.isComplete) {
      // Before chain is complete, check if contemporary with targets
      const isContemporaryWithA = targetA && areContemporaries(figure, targetA);
      const isContemporaryWithB = targetB && areContemporaries(figure, targetB);
      if (isContemporaryWithA || isContemporaryWithB) return 'helpful';
      return 'neutral';
    }
    if (isInChain(figure)) return 'in-chain';
    return 'wasted';
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading timeline...</div>
      </div>
    );
  }

  if (error || figures.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-red-500">{error || 'No historical figures loaded'}</div>
      </div>
    );
  }

  const startFigure = figures[0];
  const endFigure = figures[figures.length - 1];

  return (
    <div className="w-full h-full relative">

      {/* Zoom Controls - Bottom Right */}
      <div className="fixed bottom-24 right-4 z-[90] pointer-events-auto flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="timeline-card p-3 hover:bg-primary/10 transition-colors"
          title="Zoom In (Ctrl + Scroll)"
        >
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          onClick={centerView}
          className="timeline-card p-3 hover:bg-primary/10 transition-colors"
          title="Center View"
        >
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5l-5 5m-11 6v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        <button
          onClick={handleZoomOut}
          className="timeline-card p-3 hover:bg-primary/10 transition-colors"
          title="Zoom Out (Ctrl + Scroll)"
        >
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Timeline Viewport */}
      <div
        ref={viewportRef}
        className="w-full h-full relative overflow-hidden bg-background"
        onWheel={handleWheel}
      >
        <div
          className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            ref={contentRef}
            className="absolute"
            style={{
              width: TIMELINE_WIDTH,
              height: TIMELINE_HEIGHT,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              willChange: 'transform'
            }}
          >
            <div className="relative w-full h-[400px]" style={{ minWidth: TIMELINE_WIDTH }}>
              {/* Timeline bar */}
              <div
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  left: `-${getTimelineExtension(zoom)}px`,
                  right: `-${getTimelineExtension(zoom)}px`
                }}
              >
                <div className="absolute inset-x-0 h-[2px] bg-primary-bright-20" />

                {/* Active timeline segment */}
                <div
                  className="absolute h-[3px] bg-primary-bright shadow-timeline"
                  style={{
                    left: `${nodes[0]?.position || 0}%`,
                    width: `${(nodes[nodes.length - 1]?.position || 100) - (nodes[0]?.position || 0)}%`
                  }}
                />

                {/* Chain connection line - thicker, animated */}
                {chainAnalysis?.isComplete && chainAnalysis.shortestPath.length > 0 && (
                  <div className="absolute h-[6px]" style={{
                    left: `${nodes.find(n => n.figure.id === chainAnalysis.shortestPath[0].id)?.position || 0}%`,
                    width: `${
                      (nodes.find(n => n.figure.id === chainAnalysis.shortestPath[chainAnalysis.shortestPath.length - 1].id)?.position || 100) -
                      (nodes.find(n => n.figure.id === chainAnalysis.shortestPath[0].id)?.position || 0)
                    }%`,
                    top: '-2px'
                  }}>
                    <div className="h-full bg-gradient-to-r from-green-400 via-green-500 to-green-400 animate-pulse shadow-lg shadow-green-500/50 rounded-full" />
                  </div>
                )}

                {/* Year markers */}
                <div
                  className="absolute -bottom-8 text-sm font-medium text-foreground"
                  style={{ left: `${getTimelineExtension(zoom)}px` }}
                >
                  {Math.abs(startFigure.birthYear)} {startFigure.birthYear < 0 ? 'BCE' : 'CE'}
                </div>
                <div
                  className="absolute -bottom-8 text-sm font-medium text-foreground"
                  style={{ right: `${getTimelineExtension(zoom)}px` }}
                >
                  {Math.abs(endFigure.deathYear)} {endFigure.deathYear < 0 ? 'BCE' : 'CE'}
                </div>

                {/* BCE/CE divider */}
                {(() => {
                  const allYears = figures.flatMap(f => [f.birthYear, f.deathYear]);
                  const minYear = Math.min(...allYears);
                  const maxYear = Math.max(...allYears);

                  if (minYear < 0 && maxYear > 0) {
                    const timespan = maxYear - minYear;
                    const bceCrossPosition = ((0 - minYear) / timespan) * 100;

                    return (
                      <div
                        className="absolute -top-8 bottom-8 w-[3px] bg-gradient-to-b from-primary/50 via-primary-bright to-primary/50"
                        style={{ left: `${bceCrossPosition}%` }}
                      >
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap text-primary-bright">
                          <div className="flex items-center gap-1">
                            <span>BCE</span>
                            <span>←</span>
                            <span>|</span>
                            <span>→</span>
                            <span>CE</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Nodes */}
              {nodes.map((node, index) => {
                const status = getFigureStatus(node.figure);
                const bubbleScale = getBubbleScale(zoom);
                const prevNode = index > 0 ? nodes[index - 1] : null;

                // Determine border styling based on status
                let borderClass = 'border-primary';
                let borderWidth = 'border-3';
                let shadowClass = 'shadow-holo';
                let opacity = 'opacity-100';

                // Simplified color system: Yellow (target), Green (good), Red (bad)
                if (status === 'target') {
                  borderClass = 'border-yellow-500';
                  borderWidth = 'border-4';
                  shadowClass = 'shadow-lg shadow-yellow-500/50';
                } else if (status === 'in-chain' || status === 'helpful') {
                  borderClass = 'border-green-500';
                  borderWidth = 'border-4';
                  shadowClass = 'shadow-lg shadow-green-500/50';
                } else if (status === 'wasted') {
                  borderClass = 'border-red-400';
                  opacity = 'opacity-60';
                  shadowClass = 'shadow-sm';
                }

                // Check if contemporary with previous node
                const isContemporaryWithPrev = prevNode && areContemporaries(node.figure, prevNode.figure);

                return (
                  <div
                    key={node.figure.id}
                    className={`absolute transition-all duration-300 ease-in-out ${
                      hoveredNode === node.figure.id ? 'z-hover' : 'z-nodes'
                    } ${opacity}`}
                    style={{
                      left: `${node.position}%`,
                      top: '50%',
                      transform: `translate(-50%, ${node.isAbove ? '-120px' : '120px'}) scale(${bubbleScale})`
                    }}
                  >
                    {/* Connection gradient to timeline */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 transition-all duration-500 ease-in-out"
                      style={{
                        width: '3px',
                        height: '100px',
                        top: node.isAbove ? '80px' : '-100px',
                        background: isContemporaryWithPrev
                          ? node.isAbove
                            ? 'linear-gradient(to bottom, rgba(34, 197, 94, 0.6), rgba(34, 197, 94, 0))'
                            : 'linear-gradient(to top, rgba(34, 197, 94, 0.6), rgba(34, 197, 94, 0))'
                          : node.isAbove
                            ? 'linear-gradient(to bottom, rgba(156, 163, 175, 0.4), rgba(156, 163, 175, 0))'
                            : 'linear-gradient(to top, rgba(156, 163, 175, 0.4), rgba(156, 163, 175, 0))',
                        opacity: hoveredNode === node.figure.id ? 1 : 0.6
                      }}
                    />

                    {/* Profile bubble */}
                    <div
                      className="relative group cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.figure.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => setSelectedFigure(node.figure)}
                    >
                      {/* Profile image/initials */}
                      <div className={`w-[80px] h-[80px] rounded-full overflow-hidden relative ${borderClass} ${borderWidth} ${shadowClass} bg-background-marble transition-all duration-300 hover:scale-110`}>
                        <ProfileImage figure={node.figure} />

                        {/* Status badge */}
                        {status === 'target' && (
                          <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                            TARGET
                          </div>
                        )}
                        {status === 'in-chain' && chainAnalysis?.isComplete && (
                          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                            ✓
                          </div>
                        )}
                      </div>

                      {/* Info card on hover - clickable */}
                      <div
                        className={`
                          timeline-card
                          absolute ${node.isAbove ? 'bottom-full mb-3' : 'top-full mt-3'}
                          left-1/2 -translate-x-1/2
                          w-[320px]
                          transition-all duration-300 ease-in-out
                          cursor-pointer
                          ${hoveredNode === node.figure.id
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-2 pointer-events-none'}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFigure(node.figure);
                        }}
                        onMouseEnter={() => setHoveredNode(node.figure.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {node.figure.name}
                          </h3>
                          <div className="text-primary font-medium mb-2 text-sm">
                            {`${Math.abs(node.figure.birthYear)} ${node.figure.birthYear < 0 ? 'BCE' : 'CE'} - ${Math.abs(node.figure.deathYear)} ${node.figure.deathYear < 0 ? 'BCE' : 'CE'}`}
                          </div>

                          {/* Status indicator - Simplified */}
                          {status !== 'neutral' && (
                            <div className={`text-xs font-medium mb-2 px-2 py-1 rounded inline-block
                              ${status === 'target' ? 'bg-yellow-100 text-yellow-700' : ''}
                              ${status === 'in-chain' ? 'bg-green-100 text-green-700' : ''}
                              ${status === 'wasted' ? 'bg-red-100 text-red-700' : ''}
                              ${status === 'helpful' ? 'bg-green-100 text-green-700' : ''}
                            `}>
                              {status === 'target' && '🎯 TARGET'}
                              {status === 'in-chain' && '✓ IN CHAIN'}
                              {status === 'wasted' && '✗ NOT NEEDED'}
                              {status === 'helpful' && '✓ GOOD CONNECTION'}
                            </div>
                          )}

                          <p className="text-foreground-muted leading-relaxed text-sm mb-3">
                            {node.figure.shortDescription}
                          </p>

                          {/* Click hint */}
                          <div className="text-xs text-primary font-medium border-t border-primary-bright-20 pt-2">
                            👆 Click to view full details
                          </div>

                          {/* Contemporary info */}
                          {prevNode && isContemporaryWithPrev && (
                            <div className="mt-2 pt-2 border-t border-primary-bright-20 text-xs text-blue-600">
                              ⏱️ Contemporary with {prevNode.figure.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        figures={figures}
        onSelect={setSelectedFigure}
        onAddFigure={handleAddFigure}
      />

      {/* Detail Panel */}
      {selectedFigure && (
        <DetailPanel
          figure={selectedFigure}
          onClose={() => setSelectedFigure(null)}
        />
      )}
    </div>
  );
}
