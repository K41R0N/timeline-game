'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Board } from './Board';
import { SearchBar } from './ui/SearchBar';
import { WinModal } from './ui/WinModal';
import { PlacementReveal } from './ui/PlacementReveal';
import { HintButton } from './ui/HintButton';
import { DetailPanel } from './ui/DetailPanel';
import { BandBadge } from './ui/BandBadge';
import { HistoricalFigure } from '../types/HistoricalFigure';
import { WikipediaService, lookupFailureMessage } from '../services/WikipediaService';
import { analytics, currentTime } from '../services/analytics';
import { loadRoster, type RosterPerson } from '../data/roster';
import { computePar, nextHint } from '../utils/par';
import { revealPlacement, type RevealResult } from '../utils/overlap';
import { finalChain, type StyleBadge } from '../utils/style';
import { countStrokes, hintPolicy, type Difficulty } from '../utils/GameLogic';
import { roundCompletedProps, type RoundContext } from '../utils/roundEvents';
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
  /** Back to the home page. The round is saved on every change, so leaving only pauses it. */
  onHome: () => void;
  /** Free play: give up this round for new targets. Unfinished rounds ask `restartConfirm` first and count as abandoned. */
  onRestart?: () => void;
  restartConfirm?: string;
  /** The end screen's button: starts over when the round can restart, otherwise goes home. */
  endActionLabel: string;
  /** Beside the Home control, such as the daily puzzle's number or "Free play". */
  roundLabel?: ReactNode;
  /** The end screen's heading and extra content, such as the countdown to the next puzzle. */
  endHeading?: string;
  endExtra?: ReactNode;
  /** Free play or a daily puzzle, attached to every round event. */
  analyticsContext: RoundContext;
}

type ScoreTone = 'under' | 'over' | 'even';

/** Strokes on white card stock beside par on gold foil; an under-par finish shows red, the golf convention. */
function ScorePlates({ strokes, par, tone, large = false, className = '' }: { strokes: number; par: string | number; tone: ScoreTone; large?: boolean; className?: string }) {
  const number = `type-display font-black leading-none ${large ? 'text-[44px]' : 'text-[26px]'}`;
  const label = `font-bold uppercase tracking-[0.1em] ${large ? 'text-[11px]' : 'text-[9px]'}`;
  const plate = `flex flex-col-reverse items-center ${large ? 'min-w-[5.5rem] px-4 py-2' : 'min-w-[3.25rem] px-2.5 py-1'}`;
  return (
    <dl className={`flex shrink-0 overflow-hidden rounded-lg text-center shadow-[0_3px_0_rgba(0,0,0,0.35)] ${className}`}>
      <div className={`${plate} bg-[var(--card-stock)] text-[var(--card-ink)]`}>
        <dt className={label}>Strokes</dt>
        <dd className={`${number} ${tone === 'under' ? 'text-[var(--under-par)]' : tone === 'over' ? 'text-amber-700' : ''}`}>{strokes}</dd>
      </div>
      <div className={`${plate} bg-[var(--foil)] text-[var(--foil-ink)]`}>
        <dt className={label}>Par</dt>
        <dd className={number}>{par}</dd>
      </div>
    </dl>
  );
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
  onHome,
  onRestart,
  restartConfirm,
  endActionLabel,
  roundLabel,
  endHeading,
  endExtra,
  analyticsContext,
}: GameRoundProps) {
  const [figures, setFigures] = useState<HistoricalFigure[]>(initial?.figures ?? [targetA, targetB]);
  const [hintsUsed, setHintsUsed] = useState(initial?.hintsUsed ?? 0);
  const [hint, setHint] = useState<SavedHintName | null>(initial?.hint ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  /** The person placed most recently in this session, whose lane lands with a highlight. */
  const [lastPlacedId, setLastPlacedId] = useState<string | null>(null);
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
  // Par chains run from the earlier-born target; a round saved before targets were ordered can list them the other way.
  const [earlierTarget, laterTarget] = targetA.birthYear <= targetB.birthYear ? [targetA, targetB] : [targetB, targetA];
  const policy = hintPolicy(difficulty);
  const finalChainIds = useMemo(() => (hasWon ? new Set(winningChain.map(f => f.id)) : null), [hasWon, winningChain]);

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
          context: analyticsContext,
        })
      );
    }
  }, [figures, targetA, targetB, hasWon, difficulty, hintsUsed, hint, parChain, analyticsContext]);

  const handleHome = () => {
    // Abandon any lookup still in flight: its result belongs to the round being left.
    generationRef.current += 1;
    onHome();
  };

  const handleRestart = () => {
    if (!onRestart) return;
    if (restartConfirm && !hasWon && !confirm(restartConfirm)) return;
    if (!hasWon) {
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
          context: analyticsContext,
        })
      );
    }
    generationRef.current += 1;
    onRestart();
  };

  const handleAddFigure = async (name: string) => {
    const query = name.trim();
    if (!query || isAddingRef.current || hasWon) return;

    const nameMatch = figuresRef.current.find(f => f.name.toLowerCase() === query.toLowerCase());
    if (nameMatch) {
      showError(`${nameMatch.name} is already in the timeline`);
      analytics.track('figure_added', { accepted: false, reason: 'duplicate', ...analyticsContext });
      setSelectedFigure(nameMatch);
      return;
    }

    console.log(`🔍 Looking up historical figure: "${query}"`);
    const generation = generationRef.current;
    isAddingRef.current = true;
    setIsAdding(true);

    try {
      const result = await WikipediaService.lookupPerson(query);
      if (generation !== generationRef.current) {
        console.log(`⚠️ Ignoring "${query}": the round it was added to has ended`);
        return;
      }
      if (!result.ok) {
        console.warn(`⚠️ Rejected "${query}": ${result.reason}`);
        showError(lookupFailureMessage(result.reason, result.title));
        analytics.track('figure_added', { accepted: false, reason: result.reason, ...analyticsContext });
        return;
      }

      const figure = result.figure;
      if (figuresRef.current.some(f => f.id === figure.id)) {
        showError(`${figure.name} is already in the timeline`);
        analytics.track('figure_added', { accepted: false, reason: 'duplicate', ...analyticsContext });
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
        ...analyticsContext,
      });
      setHint(current => (current?.id === figure.id ? null : current));
      setLastPlacedId(figure.id);

      // Functional update so concurrent renders never drop an addition (#62).
      setFigures(prev =>
        prev.some(f => f.id === figure.id) ? prev : [...prev, figure].sort((a, b) => a.birthYear - b.birthYear)
      );
    } finally {
      // A newer round already released the lock; don't release one a newer lookup holds.
      if (generation === generationRef.current) {
        isAddingRef.current = false;
        setIsAdding(false);
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
    analytics.track('hint_taken', { difficulty, costs_stroke: policy.costsStroke, ...analyticsContext });
  };

  const parText = par ?? (parUnavailable ? '–' : '…');
  const scoreTone: ScoreTone = hasWon && par !== null && strokes < par ? 'under' : par !== null && strokes > par ? 'over' : 'even';

  return (
    <div className="flex h-dvh flex-col bg-[var(--table-deep)] text-[var(--table-ink)] lg:flex-row">
      {/* Phone: header, table, hand stacked. Desktop: header and hand in a left column beside the table. */}
      <div className="contents lg:order-1 lg:flex lg:w-[400px] lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--table-line)]">
        <header className="order-1 shrink-0 px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6 lg:pt-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHome}
              aria-label="Home"
              className="-ml-2 inline-flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[var(--table-muted)] transition-colors hover:text-[var(--table-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil)]"
            >
              <svg aria-hidden className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.5 4.5 7 10l5.5 5.5" />
              </svg>
              <span className="hidden lg:inline">Home</span>
            </button>
            {roundLabel && (
              <div className="type-display min-w-0 truncate text-[15px] font-bold uppercase tracking-[0.06em] text-[var(--table-ink)]">{roundLabel}</div>
            )}
            {onRestart && (
              <button
                type="button"
                onClick={handleRestart}
                className="type-display inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--table-line)] px-3 text-sm font-bold uppercase tracking-[0.06em] text-[var(--table-muted)] transition-colors hover:border-[var(--foil)] hover:text-[var(--chalk-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil)]"
              >
                New game
              </button>
            )}
            <ScorePlates strokes={strokes} par={parText} tone={scoreTone} className="ml-auto lg:hidden" />
          </div>

          <h1 className="type-display mt-2 text-[24px] font-extrabold uppercase leading-[1.02] tracking-[0.01em] text-[var(--table-ink)] [text-shadow:none] lg:mt-5 lg:text-[34px]">
            <span className="text-[var(--foil)]">{earlierTarget.name}</span>
            <span className="mx-1.5 font-bold text-[var(--table-muted)]">to</span>
            <span className="text-[var(--foil)]">{laterTarget.name}</span>
          </h1>
          <p className="mt-1.5 text-[13px] leading-snug text-[var(--table-muted)] lg:mt-3 lg:text-sm">
            <span className="mr-2 align-[1px]">
              <BandBadge band={difficulty} />
            </span>
            Lay down people alive at the same time. Each card you play is a stroke.
          </p>
          <ScorePlates strokes={strokes} par={parText} tone={scoreTone} large className="mt-6 hidden lg:inline-flex" />
        </header>

        <div className="relative z-20 order-3 shrink-0 border-t border-[var(--table-line)] bg-[var(--table-deep)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:mt-auto lg:border-t-0 lg:pb-6">
          <div className="mx-auto max-w-2xl space-y-2.5 lg:max-w-none">
            {reveal && (
              <PlacementReveal
                key={reveal.figure.id}
                figure={reveal.figure}
                reveal={reveal.reveal}
                won={hasWon}
                onDismiss={() => setReveal(null)}
              />
            )}

            {error && (
              <div role="alert" className="rounded-lg border border-red-400 bg-[#3a1517] px-3 py-2 text-sm font-medium text-red-100">
                {error}
              </div>
            )}

            {/* Gone once the chain is complete, so the result cannot change */}
            {!hasWon && (
              <>
                <HintButton
                  costLabel={policy.label}
                  hintName={hint && !figures.some(f => f.id === hint.id) ? hint.name : null}
                  disabled={!roster || isAdding}
                  onRequest={handleHint}
                  onPlace={handleAddFigure}
                />
                <SearchBar figures={figures} onSelect={setSelectedFigure} onAddFigure={handleAddFigure} isAdding={isAdding} />
              </>
            )}
          </div>
        </div>
      </div>

      <main className="order-2 min-h-0 flex-1 lg:order-2">
        <Board
          figures={figures}
          targetA={targetA}
          targetB={targetB}
          finalChainIds={finalChainIds}
          highlightId={lastPlacedId}
          selectedId={selectedFigure?.id ?? null}
          onSelect={setSelectedFigure}
        />
      </main>

      {selectedFigure && <DetailPanel figure={selectedFigure} onClose={() => setSelectedFigure(null)} />}

      {/* Win Modal: opens once the winning placement's reveal is dismissed */}
      {hasWon && !reveal && (
        <WinModal
          strokes={strokes}
          par={par}
          chain={winningChain}
          badges={winningBadges}
          parChain={parChain ? [earlierTarget, ...parChain, laterTarget] : null}
          hintsUsed={policy.recorded ? hintsUsed : null}
          onPlayAgain={onRestart ? handleRestart : handleHome}
          playAgainLabel={endActionLabel}
          heading={endHeading}
          extra={endExtra}
        />
      )}
    </div>
  );
}
