'use client';

import { HistoricalFigure } from '../../types/HistoricalFigure';
import { formatYearRange, getScoreColor } from '../../utils/GameLogic';

interface WinModalProps {
  score: number;
  winningChain: HistoricalFigure[];
  onPlayAgain: () => void;
}

export function WinModal({ score, winningChain, onPlayAgain }: WinModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="timeline-card p-8 max-w-2xl max-h-[80vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-4xl font-bold text-primary mb-2">
            Victory!
          </h2>
          <p className="text-foreground-muted">
            You've successfully connected the timeline!
          </p>
        </div>

        {/* Score */}
        <div className="bg-background-alt rounded-lg p-6 mb-6 text-center">
          <div className="text-sm text-foreground-muted uppercase tracking-wide mb-2">
            Final Score
          </div>
          <div className={`text-6xl font-bold ${getScoreColor(score)} mb-2`}>
            {score}
          </div>
          <div className="text-sm text-foreground-subtle">
            {score === 1 ? '1 intermediate figure' : `${score} intermediate figures`}
          </div>
          <div className="text-xs text-foreground-subtle mt-2">
            {score <= 3 && '🏆 Excellent! Expert historian!'}
            {score > 3 && score <= 6 && '⭐ Great job! Well done!'}
            {score > 6 && score <= 10 && '👍 Good effort! Keep learning!'}
            {score > 10 && '🎓 Nice work! History is complex!'}
          </div>
        </div>

        {/* Winning Chain */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 text-center">
            Your Connection Chain
          </h3>
          <div className="space-y-3">
            {winningChain.map((figure, index) => (
              <div key={figure.id}>
                {/* Figure Card */}
                <div className="bg-background-alt rounded-lg p-3 hover:bg-background-hover transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Position Number */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 || index === winningChain.length - 1
                        ? 'bg-primary text-white'
                        : 'bg-primary-bright/20 text-primary'
                    }`}>
                      {index === 0 ? '🎯' : index === winningChain.length - 1 ? '🎯' : index}
                    </div>

                    {/* Figure Info */}
                    <div className="flex-grow min-w-0">
                      <div className="font-semibold text-foreground text-sm">
                        {figure.name}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {formatYearRange(figure.birthYear, figure.deathYear)}
                      </div>
                      {figure.shortDescription && (
                        <div className="text-xs text-foreground-subtle mt-1 line-clamp-2">
                          {figure.shortDescription}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow between figures */}
                {index < winningChain.length - 1 && (
                  <div className="text-center text-primary text-2xl my-1">
                    ↓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 bg-primary hover:bg-primary-bright text-white font-semibold rounded-lg transition-all hover:shadow-glow"
          >
            Play Again
          </button>
        </div>

        {/* Share tip */}
        <div className="text-center mt-4 text-xs text-foreground-subtle">
          Share your score with friends! 🎮
        </div>
      </div>
    </div>
  );
}
