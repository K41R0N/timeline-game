'use client';

import { useEffect, useRef, useState } from 'react';
import { HistoricalFigure } from '../../types/HistoricalFigure';
import { WikipediaService } from '../../services/WikipediaService';
import { formatYearRange } from '../../utils/GameLogic';

interface DetailPanelProps {
  figure: HistoricalFigure | null;
  onClose: () => void;
  className?: string;
}

export function DetailPanel({
  figure,
  onClose,
  className = ""
}: DetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [contemporaries, setContemporaries] = useState<HistoricalFigure[]>([]);
  const [loadingContemporaries, setLoadingContemporaries] = useState(false);

  // Load contemporaries when figure changes
  useEffect(() => {
    if (!figure) {
      setContemporaries([]);
      return;
    }

    const loadContemporaries = async () => {
      setLoadingContemporaries(true);
      try {
        console.log(`🔍 Loading contemporaries for ${figure.name}...`);
        const titles = await WikipediaService.findContemporaries(figure);
        console.log(`✅ Found ${titles.length} potential contemporaries for ${figure.name}`);

        // Fetch details for the first 5 contemporaries
        const detailsPromises = titles.slice(0, 5).map(title =>
          WikipediaService.getPersonDetails(title)
        );
        const details = await Promise.all(detailsPromises);

        // Filter out any null results
        const validContemporaries = details.filter((c): c is HistoricalFigure => c !== null);
        setContemporaries(validContemporaries);
        console.log(`📊 Loaded ${validContemporaries.length} contemporary details`);
      } catch (error) {
        console.error('❌ Error loading contemporaries:', error);
        setContemporaries([]);
      } finally {
        setLoadingContemporaries(false);
      }
    };

    loadContemporaries();
  }, [figure]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!figure) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-foreground/20">
      <div
        ref={panelRef}
        className={`
          absolute right-0 top-0 bottom-0
          w-full max-w-lg
          bg-background
          shadow-[-4px_0_20px_rgba(0,0,0,0.1)]
          transition-transform duration-[var(--transition-normal)]
          ${className}
        `}
      >
        <div className="h-full overflow-auto p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                {figure.name}
              </h2>
              <div className="text-[var(--interactive)] font-medium">
                {`${Math.abs(figure.birthYear)} ${figure.birthYear < 0 ? 'BCE' : 'CE'} - ${Math.abs(figure.deathYear)} ${figure.deathYear < 0 ? 'BCE' : 'CE'}`}
              </div>
            </div>
            <button
              onClick={onClose}
              className="
                p-2 rounded-full
                text-foreground-muted hover:text-foreground
                hover:bg-background-hover
                transition-colors duration-[var(--transition-fast)]
              "
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Image */}
            {figure.imageUrl && (
              <div className="aspect-video rounded-lg overflow-hidden bg-background-alt">
                <img
                  src={figure.imageUrl}
                  alt={figure.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description */}
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground/80 leading-relaxed">
                {figure.shortDescription}
              </p>
            </div>

            {/* Contemporary Hints */}
            <div className="rounded-lg border border-primary-bright/30 bg-primary-glow p-4">
              <h3 className="text-lg font-medium text-foreground mb-2 flex items-center gap-2">
                <span>💡</span>
                <span>Connection Hints</span>
              </h3>
              <p className="text-xs text-foreground-muted mb-3">
                Historical figures who lived during the same time period:
              </p>

              {loadingContemporaries ? (
                <div className="text-sm text-foreground-muted animate-pulse">
                  Searching for contemporaries...
                </div>
              ) : contemporaries.length > 0 ? (
                <div className="space-y-2">
                  {contemporaries.map((contemporary) => (
                    <div
                      key={contemporary.id}
                      className="p-3 rounded-lg bg-background-alt hover:bg-background-hover transition-colors border border-primary-bright/10"
                    >
                      <div className="font-medium text-sm text-foreground">
                        {contemporary.name}
                      </div>
                      <div className="text-xs text-foreground-muted mt-1">
                        {formatYearRange(contemporary.birthYear, contemporary.deathYear)}
                      </div>
                      {contemporary.shortDescription && (
                        <div className="text-xs text-foreground-subtle mt-1 line-clamp-2">
                          {contemporary.shortDescription}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-foreground-muted">
                  No contemporary suggestions found. Try searching for historical figures from this era!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 