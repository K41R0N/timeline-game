'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Timeline from './Timeline';
import { SearchBar } from './ui/SearchBar';
import { WinModal } from './ui/WinModal';
import { PlacementReveal } from './ui/PlacementReveal';
import { HintButton } from './ui/HintButton';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { WikipediaService, lookupFailureMessage } from '../services/WikipediaService';
import { analytics, currentTime } from '../services/analytics';
import { loadRoster, type RosterPerson } from '../data/roster';
import { computePar, nextHint } from '../utils/par';
import { revealPlacement, type RevealResult } from '../utils/overlap';
import { finalChain, type StyleBadge } from '../utils/style';
import { countStrokes, hintPolicy, type Difficulty } from '../utils/GameLogic';
import { roundCompletedProps } from '../utils/roundEvents';
import type { DailyResult, RoundSave, SavedHintName } from '../utils/dailyProgress';

/** A person on a par chain: identity and years, from the roster or a daily puzzle's snapshot. */
export type ParPerson = Pick<RosterPerson, 'id' | 'name' | 'birthYear' | 'deathYear' | 'birthApproximate' | 'deathApproximate'>;

export interface GameRoundProps {
  targetA: HistoricalFigure;
  targetB: HistoricalFigure;
  difficulty: Difficulty;
  /** A saved board to resume (targets included), or null for a fresh round. */
  initial: RoundSave | null;
  /** A fixed par chain, as a daily puzzle stores it; without one, par is computed from the roster. */
  fixedParChain?: ParPerson[] | null;
  /** Called with the board after every change, so progress survives a reload. */
  onSave: (round: RoundSave) => void;
  /** Called once the chain is complete, with the final board and its result. */
  onWin?: (round: RoundSave, result: DailyResult) => void;
  /** The top-left control: leaving the round. */
  exitLabel: string;
  exitIcon: string;
  /** Asked before leaving, or null to leave without asking. */
  exitConfirm: string | null;
  onExit: () => void;
  /** Whether leaving an unfinished round ends it (free play) rather than pausing it. */
  exitAbandons: boolean;
  /** The end screen's button. */
  endActionLabel: string;
  /** Shown under the exit control, such as the daily puzzle's number. */
  roundLabel?: ReactNode;
  /** The end screen's heading and extra content, such as the countdown to the next puzzle. */
  endHeading?: string;
  endExtra?: ReactNode;
}

/** One round: the board, strokes and par, search, hints, the placement reveal and the end screen. */
export function GameRound({
  targetA,
  targetB,
  difficulty,
  initial,
  fixedParChain = null,
  onSave,
  onWin,
  exitLabel,
  exitIcon,
  exitConfirm,
  onExit,
  exitAbandons,
  endActionLabel,
  roundLabel,
  endHeading,
  endExtra,
}: GameRoundProps) {
  const [figures, setFigures] = useState<HistoricalFigure[]>(initial?.figures ?? [targetA, targetB]);
  const [hintsUsed, setHintsUsed] = useState(initial?.hintsUsed ?? 0);
  const [hint, setHint] = useState<SavedHintName | null>(initial?.hint ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
  const [reveal, setReveal] = useState<{ figure: HistoricalFigure; reveal: RevealResult } | null>(null);
  const [roster, setRoster] = useState<RosterPerson[] | null>(null);
  const [parChain, setParChain] = useState<ParPerson[] | null>(fixedParChain);
  /** The roster cannot link these targets (a round saved before roster-based targets), so the round has no par. */
  const [parUnavailable, setParUnavailable] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [winningChain, setWinningChain] = useState<HistoricalFigure[]>([]);
  const [winningBadges, setWinningBadges] = useState<StyleBadge[]>([]);

  // Latest figures for async handlers; avoids appending to a stale list (#62).
  const figuresRef = useRef<HistoricalFigure[]>(figures);
  const isAddingRef = useRef(false);
  const roundStartedAtRef = useRef(0);
  /** A person was placed in this page session, so a win is new rather than a finished round restored on reload. */
  const placedThisSessionRef = useRef(false);
  // Bumped when the round is left; lookups started before then are ignored when they resolve.
  const generationRef = useRef(0);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const onWinRef = useRef(onWin);

  const strokes = countStrokes(figures, hintsUsed, difficulty);
  const par = parChain?.length ?? null;
  const policy = hintPolicy(difficulty);

  useEffect(() => {
    onSaveRef.current = onSave;
    onWinRef.current = onWin;
  }, [onSave, onWin]);

  useEffect(() => {
    roundStartedAtRef.current = currentTime();
  }, []);

  useEffect(() => {
    figuresRef.current = figures;
  }, [figures]);

  // Save on every change, so a reload never loses or undoes a placement.
  useEffect(() => {
    onSaveRef.current({ figures, hintsUsed, hint });
  }, [figures, hintsUsed, hint]);

  const showError = (message: string) => {
    setError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    loadRoster()
      .then(people => {
        if (cancelled) return;
        setRoster(people);
        if (fixedParChain) return;
        const result = computePar(people, targetA, targetB);
        setParChain(result.playable ? result.chain : null);
        setParUnavailable(!result.playable);
        console.log(`📊 Par ${result.playable ? result.par : 'unavailable'} for ${targetA.name} → ${targetB.name}`);
      })
      .catch(err => {
        console.error('❌ Error loading the roster:', err);
        if (!cancelled) setError('Failed to load the game data. Please refresh the page.');
      });
    return () => {
      cancelled = true;
    };
  }, [targetA, targetB, fixedParChain]);

  // Check for win condition
  useEffect(() => {
    if (figures.length < 2 || hasWon) return;

    const final = finalChain(targetA, targetB, figures);
    if (!final) return;

    console.log('🎉 WIN CONDITION MET!', {
      chainLength: final.chain.length - 2,
      path: final.chain.map(f => f.name).join(' → '),
    });
    setHasWon(true);
    setWinningChain(final.chain);
    setWinningBadges(final.badges);
    const finalStrokes = countStrokes(figures, hintsUsed, difficulty);
    const badgeKinds = final.badges.map(badge => badge.kind);
    onWinRef.current?.(
      { figures, hintsUsed, hint },
      {
        strokes: finalStrokes,
        par: parChain?.length ?? null,
        hintsUsed,
        clutchBadges: badgeKinds.filter(kind => kind === 'clutch').length,
        longBridgeBadges: badgeKinds.filter(kind => kind === 'longBridge').length,
      }
    );
    // A finished round restored on reload is not a new completion.
    if (placedThisSessionRef.current) {
      analytics.track(
        'game_completed',
        roundCompletedProps({
          difficulty,
          strokes: finalStrokes,
          par: parChain?.length ?? null,
          hintsUsed,
          badgeKinds,
          startedAt: roundStartedAtRef.current,
          now: currentTime(),
        })
      );
    }
  }, [figures, targetA, targetB, hasWon, difficulty, hintsUsed, hint, parChain]);

  const handleExit = () => {
    if (exitConfirm && !hasWon && !confirm(exitConfirm)) return;
    if (exitAbandons && !hasWon) {
      analytics.track(
        'game_abandoned',
        roundCompletedProps({
          difficulty,
          strokes,
          par,
          hintsUsed,
          badgeKinds: [],
          startedAt: roundStartedAtRef.current,
          now: currentTime(),
        })
      );
    }
    // Abandon any lookup still in flight: its result belongs to the round being left.
    generationRef.current += 1;
    onExit();
  };

  const handleAddFigure = async (name: string) => {
    const query = name.trim();
    if (!query || isAddingRef.current || hasWon) return;

    const nameMatch = figuresRef.current.find(f => f.name.toLowerCase() === query.toLowerCase());
    if (nameMatch) {
      showError(`${nameMatch.name} is already in the timeline`);
      analytics.track('figure_added', { accepted: false, reason: 'duplicate' });
      setSelectedFigure(nameMatch);
      return;
    }

    console.log(`🔍 Looking up historical figure: "${query}"`);
    const generation = generationRef.current;
    isAddingRef.current = true;
    setIsAdding(true);
    setIsAnimating(true);

    try {
      const result = await WikipediaService.lookupPerson(query);
      if (generation !== generationRef.current) {
        console.log(`⚠️ Ignoring "${query}": the round it was added to has ended`);
        return;
      }
      if (!result.ok) {
        console.warn(`⚠️ Rejected "${query}": ${result.reason}`);
        showError(lookupFailureMessage(result.reason, result.title));
        analytics.track('figure_added', { accepted: false, reason: result.reason });
        return;
      }

      const figure = result.figure;
      if (figuresRef.current.some(f => f.id === figure.id)) {
        showError(`${figure.name} is already in the timeline`);
        analytics.track('figure_added', { accepted: false, reason: 'duplicate' });
        return;
      }

      const placement = revealPlacement(figure, figuresRef.current, targetA, targetB);
      setReveal({ figure, reveal: placement });
      placedThisSessionRef.current = true;
      analytics.track('figure_added', {
        accepted: true,
        overlaps: placement.overlaps.length,
        extends_chain: placement.overlaps.some(overlap => overlap.extendsChain),
        miss_years: placement.miss?.gapYears ?? null,
        from_hint: hint?.id === figure.id,
      });
      setHint(current => (current?.id === figure.id ? null : current));

      // Functional update so concurrent renders never drop an addition (#62).
      setFigures(prev =>
        prev.some(f => f.id === figure.id) ? prev : [...prev, figure].sort((a, b) => a.birthYear - b.birthYear)
      );
    } finally {
      // A newer round already released the lock; don't release one a newer lookup holds.
      if (generation === generationRef.current) {
        isAddingRef.current = false;
        setIsAdding(false);
        setIsAnimating(false);
      }
    }
  };

  const handleHint = () => {
    if (!roster || hint) return;
    const next = nextHint(roster, targetA, targetB, figuresRef.current);
    if (!next) {
      showError('No hint here: no well-known person reaches further from your chain');
      return;
    }
    setHint({ id: next.id, name: next.name });
    setHintsUsed(count => count + 1);
    analytics.track('hint_taken', { difficulty, costs_stroke: policy.costsStroke });
  };

  return (
    <>
      {/* Exit control - Top Left */}
      <div className="fixed top-4 left-4 z-[22] pointer-events-auto">
        <button onClick={handleExit} className="timeline-card px-4 py-2 shadow-glow hover:shadow-xl transition-all hover:scale-105">
          <div className="flex items-center gap-2">
            <span className="text-lg">{exitIcon}</span>
            <span className="text-sm font-medium text-primary">{exitLabel}</span>
          </div>
        </button>
      </div>

      {roundLabel && (
        <div className="fixed top-[4.25rem] left-4 z-[22] pointer-events-auto">
          <div className="timeline-card px-3 py-1.5 text-xs font-semibold text-foreground-muted">{roundLabel}</div>
        </div>
      )}

      {/* Compact Floating Score Badge - Top Right */}
      <div className="fixed top-4 right-4 z-[22] pointer-events-auto group">
        <div className="timeline-card p-3 shadow-glow hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className={`text-2xl font-bold leading-none ${par !== null && strokes > par ? 'text-amber-600' : 'text-green-600'}`}>
                {strokes}
              </div>
              <div className="text-[9px] text-foreground-muted uppercase mt-0.5">Strokes</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold leading-none text-primary">{par ?? (parUnavailable ? '–' : '…')}</div>
              <div className="text-[9px] text-foreground-muted uppercase mt-0.5">Par</div>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-8 bg-primary-bright-20" />

            {/* Difficulty Badge */}
            <div className="text-center">
              <div className="text-xs font-bold text-primary">
                {difficulty === 'easy' ? '⭐' : difficulty === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
              </div>
              <div className="text-[9px] text-foreground-muted uppercase">{difficulty}</div>
            </div>
          </div>

          {/* Goal Tooltip on Hover */}
          <div className="absolute top-full right-0 mt-2 w-[300px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
            <div className="timeline-card p-3 shadow-lg">
              <div className="text-[10px] text-foreground-muted uppercase mb-1">Goal</div>
              <div className="text-sm font-semibold text-primary">
                <span className="text-yellow-600">{targetA.name}</span>
                <span className="mx-1 text-foreground-muted">→</span>
                <span className="text-yellow-600">{targetB.name}</span>
              </div>
              <div className="text-[10px] text-foreground-subtle mt-1">
                {par !== null
                  ? `Connect them in as few people as you can • Par is ${par} • Every person placed is a stroke`
                  : 'Connect them in as few people as you can • Every person placed is a stroke'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!hasWon && (
        <div className="fixed top-24 right-4 z-[21] pointer-events-auto">
          <HintButton
            costLabel={policy.label}
            hintName={hint && !figures.some(f => f.id === hint.id) ? hint.name : null}
            disabled={!roster || isAdding}
            onRequest={handleHint}
            onPlace={handleAddFigure}
          />
        </div>
      )}

      {reveal && (
        <PlacementReveal
          key={reveal.figure.id}
          figure={reveal.figure}
          reveal={reveal.reveal}
          won={hasWon}
          onDismiss={() => setReveal(null)}
        />
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[101] pointer-events-none">
          <div className="timeline-card px-6 py-3 bg-red-50 border-2 border-red-400 animate-fadeIn">
            <div className="text-sm text-red-700 font-medium">⚠️ {error}</div>
          </div>
        </div>
      )}

      {/* Timeline Canvas Container */}
      <main className="w-full h-screen bg-background">
        <Timeline
          figures={figures}
          isAnimating={isAnimating}
          onAnimationComplete={() => setIsAnimating(false)}
          targetA={targetA}
          targetB={targetB}
          selectedFigure={selectedFigure}
          onSelectFigure={setSelectedFigure}
        />
      </main>

      {/* Floating Search Bar: gone once the chain is complete, so the result cannot change */}
      {!hasWon && <SearchBar figures={figures} onSelect={setSelectedFigure} onAddFigure={handleAddFigure} isAdding={isAdding} />}

      {/* Win Modal: opens once the winning placement's reveal is dismissed */}
      {hasWon && !reveal && (
        <WinModal
          strokes={strokes}
          par={par}
          chain={winningChain}
          badges={winningBadges}
          parChain={parChain ? [targetA, ...parChain, targetB] : null}
          hintsUsed={policy.recorded ? hintsUsed : null}
          onPlayAgain={handleExit}
          playAgainLabel={endActionLabel}
          heading={endHeading}
          extra={endExtra}
        />
      )}
    </>
  );
}
