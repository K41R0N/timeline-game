'use client';

import { useState, useEffect, useRef } from 'react';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { SearchInput } from './ui/SearchInput';
import { DetailPanel } from './ui/DetailPanel';
import { SearchBar } from './ui/SearchBar';
import { WikipediaService } from '../services/WikipediaService';

interface TimelineNode {
  figure: HistoricalFigure;
  position: number;
  isAbove: boolean;
}

interface TimelineProps {
  figures: HistoricalFigure[];
  onFiguresChange?: (figures: HistoricalFigure[]) => void;
  isAnimating?: boolean;
  onAnimationComplete?: () => void;
}

export default function Timeline({ 
  figures,
  onFiguresChange,
  isAnimating = false,
  onAnimationComplete
}: TimelineProps) {
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [animationProgress, setAnimationProgress] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Constants for timeline dimensions and constraints
  const TIMELINE_WIDTH = 1000;
  const TIMELINE_HEIGHT = 400;
  const MAX_PAN = 200;
  const MIN_ZOOM = 0.5;  // Reduced to allow more zoom out
  const MAX_ZOOM = 3;    // Increased to allow more zoom in
  const BASE_EXTENSION = 500;  // Base extension of timeline beyond viewport
  const ZOOM_SPEED = 0.05;

  // Calculate the dynamic timeline extension based on zoom
  const getTimelineExtension = (currentZoom: number) => {
    return BASE_EXTENSION * (1 + (1 / currentZoom));
  };

  // Calculate bubble scale based on zoom (inverse relationship)
  const getBubbleScale = (currentZoom: number) => {
    return Math.min(1, 1 / (currentZoom * 0.8)); // 0.8 to make scaling less aggressive
  };

  // Handle figure addition animation
  useEffect(() => {
    if (isAnimating && figures.length > 0) {
      const startTime = Date.now();
      const duration = 1000; // 1 second animation

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
  }, [isAnimating, figures]);

  // Calculate node positions and center timeline
  useEffect(() => {
    if (figures.length === 0) return;

    // Calculate node positions
    const allYears = figures.map(f => [f.birthYear, f.deathYear]).flat();
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);
    const timespan = maxYear - minYear;

    const newNodes = figures.map((figure, index) => ({
      figure,
      position: ((figure.birthYear - minYear) / timespan) * 100,
      isAbove: index % 2 === 0
    }));

    setNodes(newNodes);

    // Center timeline after nodes are set
    const centerTimeline = () => {
      if (!viewportRef.current || !contentRef.current) return;
      
      const viewport = viewportRef.current.getBoundingClientRect();
      const scaledWidth = TIMELINE_WIDTH * zoom;
      const scaledHeight = TIMELINE_HEIGHT * zoom;
      
      setPan({
        x: (viewport.width - scaledWidth) / 2,
        y: (viewport.height - scaledHeight) / 2
      });
    };

    // Initial centering with a slight delay to ensure rendering
    setTimeout(centerTimeline, 50);
  }, [figures, zoom]);

  useEffect(() => {
    // Prevent browser zoom only within timeline viewport
    const preventBrowserZoom = (e: WheelEvent) => {
      if (viewportRef.current?.contains(e.target as Node) && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
      }
    };

    // Add the listener with passive: false to allow preventDefault
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

      // Constrain pan to keep timeline visible
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
    // Handle zooming with Ctrl + Wheel or trackpad pinch
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation(); // Stop event propagation
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;

      const cursorX = e.clientX - viewport.left;
      const cursorY = e.clientY - viewport.top;

      // Normalize the zoom delta
      let zoomDelta;
      if (Math.abs(e.deltaY) < 50) {
        // Trackpad pinch - smaller, smoother changes
        zoomDelta = -e.deltaY * 0.002;
      } else {
        // Mouse wheel - larger, more discrete changes
        zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      }

      const newZoom = Math.min(Math.max(zoom * (1 + zoomDelta), MIN_ZOOM), MAX_ZOOM);
      
      // Calculate the scaling factor change
      const scale = newZoom / zoom;

      // Calculate new pan position to zoom toward cursor
      const newPan = {
        x: cursorX - (cursorX - pan.x) * scale,
        y: cursorY - (cursorY - pan.y) * scale
      };

      setZoom(newZoom);
      setPan(newPan);
      return;
    }

    // Handle regular scrolling/panning
    const panSpeed = e.shiftKey ? 2 : 1;
    setPan(prev => ({
      x: prev.x - (e.shiftKey ? e.deltaY : 0) * panSpeed,
      y: prev.y - (!e.shiftKey ? e.deltaY : 0) * panSpeed
    }));
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      return;
    }
    const suggestions = figures
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
      .map(f => f.name);
  };

  const handleSelect = (name: string) => {
    const figure = figures.find(f => f.name === name);
    if (figure) {
      setSelectedFigure(figure);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  // Utility function to get Wikimedia Commons image URL
  const getWikimediaUrl = (imageUrl: string): string => {
    try {
      // If it's already a full URL, just ensure it's HTTPS
      if (imageUrl.startsWith('http')) {
        return imageUrl.replace(/^http:/, 'https:');
      }

      // Handle both direct Wikimedia URLs and API response URLs
      const url = new URL(imageUrl);
      console.log('Processing image URL:', url.toString());
      return url.toString();
    } catch (error) {
      console.error('Error processing image URL:', imageUrl, error);
      return imageUrl;
    }
  };

  // Improved URL encoding function with Wikimedia-specific handling
  const encodeWikiUrl = (url: string) => {
    try {
      // First, try to get a proper Wikimedia URL
      const wikiUrl = getWikimediaUrl(url);
      
      // Then encode only necessary characters while preserving Wikimedia URL structure
      return wikiUrl
        .replace(/\s+/g, '_')           // Replace spaces with underscores (Wikimedia standard)
        .replace(/\(/g, '%28')          // Left parenthesis
        .replace(/\)/g, '%29')          // Right parenthesis
        .replace(/'/g, '%27')           // Single quote
        .replace(/&/g, '%26')           // Ampersand
        .replace(/\[/g, '%5B')          // Left bracket
        .replace(/\]/g, '%5D')          // Right bracket
        .replace(/"/g, '%22')           // Double quote
        .replace(/!/g, '%21')           // Exclamation mark
        .replace(/\$/g, '%24')          // Dollar sign
        .replace(/`/g, '%60')           // Backtick
        .replace(/{/g, '%7B')           // Left brace
        .replace(/}/g, '%7D');          // Right brace
    } catch (error) {
      console.error('Error encoding URL:', error);
      return url;
    }
  };

  // Image loading with detailed error handling
  const loadImage = (figure: HistoricalFigure) => {
    if (!figure.imageUrl) {
      console.log(`No image URL provided for ${figure.name}`);
      return;
    }

    const img = new Image();
    const processedUrl = getWikimediaUrl(figure.imageUrl);
    
    img.onload = () => {
      console.log(`Successfully loaded image for ${figure.name}:`, {
        originalUrl: figure.imageUrl,
        processedUrl,
        dimensions: `${img.width}x${img.height}`
      });
      setImageErrors(prev => {
        const newSet = new Set(prev);
        newSet.delete(figure.id);
        return newSet;
      });
    };

    img.onerror = (error) => {
      console.error(`Failed to load image for ${figure.name}:`, {
        originalUrl: figure.imageUrl,
        processedUrl,
        error
      });
      setImageErrors(prev => new Set(prev).add(figure.id));
    };

    // Set crossOrigin to allow loading from Wikipedia/Wikimedia
    img.crossOrigin = 'anonymous';
    img.src = processedUrl;
  };

  // Modified image loading effect
  useEffect(() => {
    figures.forEach(figure => {
      if (figure.imageUrl) {
        loadImage(figure);
      }
    });
  }, [figures]);

  // Profile image component with robust error handling
  const ProfileImage = ({ figure }: { figure: HistoricalFigure }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      if (!figure.imageUrl) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      let isMounted = true;
      const controller = new AbortController();

      const loadImage = async () => {
        try {
          // First verify the image URL is accessible
          const response = await fetch(figure.imageUrl, {
            method: 'HEAD',
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`Failed to verify image: ${response.status}`);
          }

          if (!isMounted) return;

          // Create a new image element for loading
          const img = new Image();
          
          img.onload = () => {
            if (!isMounted) return;
            setIsLoading(false);
            setHasError(false);
            if (imageRef.current) {
              imageRef.current.src = figure.imageUrl!;
            }
          };

          img.onerror = () => {
            if (!isMounted) return;
            setIsLoading(false);
            setHasError(true);
          };

          img.src = figure.imageUrl;
          img.crossOrigin = "anonymous";

        } catch (error) {
          if (!isMounted) return;
          console.error(`Error loading image for ${figure.name}:`, error);
          setIsLoading(false);
          setHasError(true);
        }
      };

      loadImage();

      return () => {
        isMounted = false;
        controller.abort();
      };
    }, [figure.imageUrl, figure.name]);

    if (!figure.imageUrl || hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-primary text-2xl text-background font-medium">
          {getInitials(figure.name)}
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        <img
          ref={imageRef}
          className={`
            absolute inset-0 w-full h-full object-cover
            transition-opacity duration-300
            ${isLoading ? 'opacity-0' : 'opacity-100'}
          `}
          alt={figure.name}
          loading="lazy"
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background-marble">
            <div className="animate-pulse bg-primary/20 w-full h-full" />
          </div>
        )}
      </div>
    );
  };

  // Handle adding a new figure
  const handleAddFigure = async (name: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const figure = await WikipediaService.getPersonDetails(name);
      
      if (!figure) {
        setError(`Could not load details for ${name}`);
        return;
      }

      // Check if figure already exists
      if (figures.some(f => f.id === figure.id)) {
        return;
      }

      // Add the new figure and sort by birth year
      const updatedFigures = [...figures, figure].sort((a, b) => a.birthYear - b.birthYear);
      onFiguresChange?.(updatedFigures);

    } catch (error) {
      console.error(`Error adding figure ${name}:`, error);
      setError(`Error adding ${name}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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
    <div className="w-full h-full">
      {/* Fixed UI Layer */}
      <div className="fixed inset-0 pointer-events-none z-[100]">
        <div className="absolute top-2 left-2 text-2xl pointer-events-auto">
          🌟
        </div>
      </div>

      {/* Timeline Viewport */}
      <div 
        ref={viewportRef}
        className="w-full h-full relative overflow-hidden bg-background"
        onWheel={handleWheel}
      >
        {/* Pan Container */}
        <div 
          className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Timeline Content */}
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
            {/* Extend container to full width */}
            <div className="relative w-full h-[400px]" style={{ minWidth: TIMELINE_WIDTH }}>
              {/* Timeline bar - now with dynamic extension */}
              <div 
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  left: `-${getTimelineExtension(zoom)}px`,
                  right: `-${getTimelineExtension(zoom)}px`
                }}
              >
                {/* Main timeline bar with extended background */}
                <div className="absolute inset-x-0 h-[2px] bg-primary-bright-20" />
                
                {/* Active timeline segment - adjusted positioning */}
                <div 
                  className="absolute h-[2px] bg-primary-bright"
                  style={{
                    left: `${nodes[0]?.position || 0}%`,
                    width: `${(nodes[nodes.length - 1]?.position || 100) - (nodes[0]?.position || 0)}%`
                  }}
                />

                {/* Year markers - positioned relative to content */}
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
              </div>

              {/* Nodes with progress bars */}
              {nodes.map((node, index) => {
                const isIntermediate = index > 0 && index < nodes.length - 1;
                const prevNode = nodes[index - 1];
                const nextNode = nodes[index + 1];
                
                // Get the target figures (first and last added)
                const startTarget = figures[0];
                const endTarget = figures[1];
                
                // Calculate year differences with adjacent nodes
                const yearDiff = isIntermediate ? {
                  // For BCE dates (negative years), we need to account for counting backwards
                  birthYearDiff: (node.figure.birthYear < 0 && prevNode.figure.birthYear < 0) 
                    ? prevNode.figure.birthYear - node.figure.birthYear  // Both BCE (larger negative number means earlier)
                    : (node.figure.birthYear >= 0 && prevNode.figure.birthYear >= 0)
                    ? node.figure.birthYear - prevNode.figure.birthYear  // Both CE
                    : node.figure.birthYear - prevNode.figure.birthYear,  // Crossing BCE/CE boundary
                  deathYearDiff: (node.figure.deathYear < 0 && prevNode.figure.deathYear < 0)
                    ? prevNode.figure.deathYear - node.figure.deathYear
                    : (node.figure.deathYear >= 0 && prevNode.figure.deathYear >= 0)
                    ? node.figure.deathYear - prevNode.figure.deathYear
                    : node.figure.deathYear - prevNode.figure.deathYear,
                  lifespan: node.figure.deathYear - node.figure.birthYear,
                  prevLifespan: prevNode.figure.deathYear - prevNode.figure.birthYear,
                  // Calculate if this connection is better than the previous one
                  isImprovingConnection: function() {
                    // For the first added figure (index 2), check if it's between the targets
                    if (index === 2) {
                      const [target1, target2] = figures.slice(0, 2);
                      const earliestTarget = target1.birthYear < target2.birthYear ? target1 : target2;
                      const latestTarget = target1.birthYear < target2.birthYear ? target2 : target1;
                      return node.figure.birthYear > earliestTarget.birthYear && 
                             node.figure.birthYear < latestTarget.birthYear;
                    }
                    // For subsequent figures, compare with previous connection
                    return Math.abs(node.figure.birthYear - prevNode.figure.birthYear) < 
                           Math.abs(prevNode.figure.birthYear - (index > 1 ? nodes[index - 2].figure.birthYear : prevNode.figure.birthYear));
                  }()
                } : null;

                // Progress bar should be:
                // - Green and pointing left if this addition improves the connection
                // - Red and pointing right if this addition makes the connection worse
                const isForward = yearDiff?.isImprovingConnection ?? false;
                const bubbleScale = getBubbleScale(zoom);
                
                // Calculate animation progress for the latest added node
                const isLatestNode = index === nodes.length - 1;
                const progressBarWidth = isLatestNode && isAnimating
                  ? 50 * animationProgress
                  : 50;
                
                return (
        <div
          key={node.figure.id}
                    className={`absolute transition-all duration-300 ease-in-out ${
                      hoveredNode === node.figure.id ? 'z-hover' : 'z-nodes'
                    }`}
                    style={{
                      left: `${node.position}%`,
                      top: '50%',
                      transform: `translate(-50%, ${node.isAbove ? '-120px' : '120px'}) scale(${bubbleScale})`
                    }}
                  >
                    {/* Progress bar for intermediate nodes */}
                    {isIntermediate && yearDiff && (
                      <div className="absolute" style={{
                        // Position at the middle of the bubble
                        top: node.isAbove ? '40px' : '-40px',
                        // Align with the bubble edge
                        left: '-40px',
                        width: '100%',
                        height: '2px'
                      }}>
                        {/* Progress bar container */}
                        <div className="relative w-full h-full">
                          {/* Progress bar line */}
                          <div 
                            className={`absolute h-full group
                              ${isForward ? 'bg-green-500' : 'bg-red-500'} 
                              transition-all duration-300 ease-in-out
                              hover:opacity-100
                              ${hoveredNode === node.figure.id ? 'opacity-80' : 'opacity-50'}`}
                            style={{
                              // Always extend towards the previous bubble
                              right: '100%',
                              width: `${Math.min(Math.max(Math.abs(yearDiff.birthYearDiff), 40), 600)}px`,
                              transformOrigin: 'right center'
                            }}
                          >
                            {/* Simple year difference on hover */}
                            <div className={`
                              absolute ${node.isAbove ? '-top-6' : '-bottom-6'} left-1/2 -translate-x-1/2
                              px-2 py-1 rounded text-xs font-medium whitespace-nowrap
                              ${isForward ? 'text-green-600' : 'text-red-600'}
                              opacity-0 group-hover:opacity-100
                              transition-all duration-200 ease-in-out
                              pointer-events-none
                              bg-background/90 backdrop-blur-sm
                              shadow-sm
                            `}>
                              {node.figure.name} lived {Math.abs(yearDiff.birthYearDiff)} years {yearDiff.birthYearDiff > 0 ? 'after' : 'before'} {prevNode.figure.name}
                            </div>

                            {/* Detailed tooltip on hover */}
                            <div className={`
                              absolute ${node.isAbove ? '-top-24' : '-bottom-24'} left-1/2 -translate-x-1/2
                              p-3 rounded bg-background/95 backdrop-blur-sm
                              border border-primary-bright-20
                              text-sm leading-relaxed whitespace-nowrap
                              opacity-0 group-hover:opacity-100
                              transition-all duration-200 ease-in-out
                              shadow-glow z-[var(--z-tooltip)]
                              pointer-events-none
                            `}>
                              <div className="font-medium text-foreground">
                                {isForward ? 'Getting closer to target!' : 'Moving away from target'}
                              </div>
                              <div className="text-foreground-muted mt-1 text-xs">
                                Birth year difference: {Math.abs(yearDiff.birthYearDiff)} years
                                {yearDiff.birthYearDiff !== yearDiff.deathYearDiff && 
                                  ` • Death year difference: ${Math.abs(yearDiff.deathYearDiff)} years`}
                              </div>
                            </div>

                            {/* Arrow indicator */}
                            <div 
                              className={`absolute h-2 w-2 top-1/2 -mt-1
                                ${isForward ? 'bg-green-500' : 'bg-red-500'} -left-1
                                transform rotate-45
                              `}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Connection line to timeline - with constant width */}
                    <div 
                      className={`absolute left-1/2 w-[2px] bg-primary-bright transition-all duration-300 ease-in-out
                        ${hoveredNode === node.figure.id ? 'opacity-100' : 'opacity-70'}`}
                      style={{
                        height: '60px',
                        top: node.isAbove ? '60px' : '-60px'
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
                      <div className="timeline-node w-[80px] h-[80px] bg-background-marble overflow-hidden relative">
                        <ProfileImage figure={node.figure} />
          </div>

                      {/* Info card */}
                      <div className={`
                        timeline-card
                        absolute ${node.isAbove ? 'bottom-full mb-3' : 'top-full mt-3'}
                        left-1/2 -translate-x-1/2
                        w-[300px]
                        transition-all duration-300 ease-in-out
                        ${hoveredNode === node.figure.id 
                          ? 'opacity-100 translate-y-0' 
                          : 'opacity-0 translate-y-2 pointer-events-none'}
                      `}>
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {node.figure.name}
                          </h3>
                          <div className="text-primary font-medium mb-2 text-sm">
                            {`${Math.abs(node.figure.birthYear)} ${node.figure.birthYear < 0 ? 'BCE' : 'CE'} - ${Math.abs(node.figure.deathYear)} ${node.figure.deathYear < 0 ? 'BCE' : 'CE'}`}
                          </div>
                          <p className="text-foreground-muted leading-relaxed text-sm">
                            {node.figure.shortDescription}
                          </p>
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