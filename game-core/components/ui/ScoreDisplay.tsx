'use client';

import { getScoreColor } from '../../utils/GameLogic';

interface ScoreDisplayProps {
  score: number;
  targetA?: string;
  targetB?: string;
}

export function ScoreDisplay({ score, targetA, targetB }: ScoreDisplayProps) {
  return (
    <div className="timeline-card p-4 min-w-[180px]">
      {/* Score */}
      <div className="text-center">
        <div className="text-xs text-foreground-muted uppercase tracking-wide mb-1">
          Current Score
        </div>
        <div className={`text-4xl font-bold ${getScoreColor(score)} transition-colors duration-300`}>
          {score}
        </div>
        <div className="text-xs text-foreground-subtle mt-1">
          ⛳ Lower is better
        </div>
      </div>

      {/* Target Info */}
      {targetA && targetB && (
        <div className="mt-4 pt-4 border-t border-primary-bright/20">
          <div className="text-xs text-foreground-muted uppercase tracking-wide mb-2">
            Connect
          </div>
          <div className="space-y-1">
            <div className="text-xs text-foreground truncate" title={targetA}>
              🎯 {targetA}
            </div>
            <div className="text-xs text-foreground-subtle text-center">
              ↕
            </div>
            <div className="text-xs text-foreground truncate" title={targetB}>
              🎯 {targetB}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
