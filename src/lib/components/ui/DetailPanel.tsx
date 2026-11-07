'use client';

import { useEffect, useRef } from 'react';
import { HistoricalFigure } from '../../types/HistoricalFigure';
import { formatLifespan } from '../../utils/GameLogic';

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
    <>
      <div className="fixed inset-0 z-[50] bg-[rgba(44,62,80,0.10)] pointer-events-none animate-fadeIn" />

      {/* A bottom sheet on phones, a drawer from the right from 640px up */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="detail-panel-title"
        className={`
          fixed inset-x-0 bottom-0 z-[50] max-h-[75dvh]
          rounded-t-2xl bg-background shadow-[0_-8px_30px_rgba(44,62,80,0.18)]
          sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:w-[400px] sm:rounded-none sm:shadow-[-8px_0_30px_rgba(44,62,80,0.18)]
          animate-sheetIn
          ${className}
        `}
      >
        <div className="max-h-[75dvh] overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:h-full sm:max-h-none sm:p-6">
          <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--card-border)] sm:hidden" />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="detail-panel-title" className="text-xl font-semibold leading-tight text-foreground [text-shadow:none] sm:text-2xl">
                {figure.name}
              </h2>
              <div className="mt-1 font-medium tabular-nums text-foreground-muted">{formatLifespan(figure)}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-background-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <svg aria-hidden className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M5 5l10 10M15 5 5 15" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {figure.imageUrl && (
              <div className="aspect-video overflow-hidden rounded-lg bg-background-alt">
                <img src={figure.imageUrl} alt={figure.name} className="h-full w-full object-cover" />
              </div>
            )}

            {(figure.summary || figure.shortDescription) && (
              <p className="leading-relaxed text-foreground-muted">{figure.summary || figure.shortDescription}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
