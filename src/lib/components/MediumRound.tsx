'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PuzzlePerson } from '../data/dailySchedule';
import { loadRoster, type RosterPerson } from '../data/roster';
import { usePortraits } from '../hooks/usePortraits';
import { analytics, currentTime } from '../services/analytics';
import { WikipediaService, lookupFailureMessage } from '../services/WikipediaService';
import { letterPattern } from '../utils/chainPuzzle';
import type { StyleResult as Result } from '../utils/dailyProgress';
import { chainRoundCompletedProps, type RoundContext } from '../utils/roundEvents';
import { formatLifespan } from '../utils/GameLogic';
import { judgeGuess, judgeLookup, type GuessVerdict } from '../utils/guessMatch';
import { applyVerdict, mediumFinished, mediumResult, mediumScore, newMediumRound, nextOpenBlank, revealBlank, type MediumRound as MediumState } from '../utils/styleRound';
import { ChainLine, CountPlate, EmptySlot, PersonCard, StyleShell, type ChainPuzzleView } from './ui/ChainTable';
import { SearchBar } from './ui/SearchBar';
import { StyleResult } from './ui/StyleResult';

export interface MediumRoundProps {
  puzzle: ChainPuzzleView;
  /** A saved round to resume, or null for a fresh one. */
  initial: MediumState | null;
  label: ReactNode;
  onSave: (round: MediumState) => void;
  onFinish: (round: MediumState, result: Result) => void;
  onHome: () => void;
  onRestart?: () => void;
  endHeading: string;
  endActionLabel: string;
  onEndAction: () => void;
  endExtra?: ReactNode;
  /** Free play or a daily puzzle, attached to the completion event. */
  analyticsContext: RoundContext;
}

const LINE_MS = 4500;
const RESULT_DELAY_MS = 1100;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** An open blank: one box per letter, grouped by word. */
function LetterBoxes({ name }: { name: string }) {
  const words = letterPattern(name);
  return (
    <span aria-hidden className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
      {words.map((length, w) => (
        <span key={w} className="flex gap-[3px]">
          {Array.from({ length }, (_, i) => (
            <span key={i} className="h-5 w-3.5 rounded-[3px] border-b-2 border-[var(--chalk-text)] bg-[rgba(243,207,134,0.12)]" />
          ))}
        </span>
      ))}
    </span>
  );
}

/** The one line the dock shows after a guess. */
function lineFor(verdict: GuessVerdict, guess: string): string | null {
  switch (verdict.kind) {
    case 'match':
    case 'lookup':
      return null;
    case 'miss':
      return verdict.fits ? `${verdict.name} fits, but the chain wants someone else` : `Not ${verdict.name}`;
    case 'nobody':
      return lookupFailureMessage(verdict.reason, verdict.title || guess);
    case 'unchecked':
      return lookupFailureMessage('network', verdict.title || guess);
  }
}

/** Medium: name the hidden people between the two gold targets; each blank shows its letter count. */
export function MediumRound({ puzzle, initial, label, onSave, onFinish, onHome, onRestart, endHeading, endActionLabel, onEndAction, endExtra, analyticsContext }: MediumRoundProps) {
  const line = useMemo(() => [puzzle.targetA, ...puzzle.chain, puzzle.targetB], [puzzle]);
  const titles = useMemo(() => line.map(p => p.name), [line]);
  const images = usePortraits(titles);

  const [round, setRound] = useState<MediumState>(() => initial ?? newMediumRound(puzzle.chain.length));
  const [selected, setSelected] = useState<number | null>(() => nextOpenBlank(initial ?? newMediumRound(puzzle.chain.length), -1));
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [fresh, setFresh] = useState<number | null>(null);
  const [roster, setRoster] = useState<RosterPerson[] | null>(null);
  const finished = mediumFinished(round);
  const [showResult, setShowResult] = useState(finished);

  const onSaveRef = useRef(onSave);
  const onFinishRef = useRef(onFinish);
  const reported = useRef(finished);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = currentTime();
  }, []);
  useEffect(() => {
    onSaveRef.current = onSave;
    onFinishRef.current = onFinish;
  }, [onSave, onFinish]);
  useEffect(() => {
    onSaveRef.current(round);
  }, [round]);
  useEffect(() => {
    if (!finished || reported.current) return;
    reported.current = true;
    const result = mediumResult(round);
    onFinishRef.current(round, result);
    const reveals = round.filled.filter(fill => fill === 'revealed').length;
    analytics.track('game_completed', chainRoundCompletedProps({ result, reveals, startedAt: startedAt.current, now: currentTime(), context: analyticsContext }));
  }, [finished, round, analyticsContext]);
  useEffect(() => {
    if (!finished || showResult) return;
    const timer = setTimeout(() => setShowResult(true), prefersReducedMotion() ? 0 : RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [finished, showResult]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), LINE_MS);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    loadRoster()
      .then(setRoster)
      .catch(error => console.error('❌ Could not load the roster:', error));
  }, []);

  const settle = (blank: number, next: MediumState) => {
    setRound(next);
    if (next.filled[blank] !== null) {
      setFresh(blank);
      setSelected(nextOpenBlank(next, blank));
    }
  };

  const guess = async (name: string) => {
    if (selected === null || checking || !roster) return;
    const blank = selected;
    const [answer, before, after] = [line[blank + 1], line[blank], line[blank + 2]];
    let verdict = judgeGuess(name, answer, before, after, roster);
    if (verdict.kind === 'lookup') {
      setChecking(true);
      verdict = judgeLookup(await WikipediaService.lookupPerson(name), answer, before, after);
      setChecking(false);
    }
    setMessage(lineFor(verdict, name));
    settle(blank, applyVerdict(round, blank, verdict));
  };

  const reveal = () => {
    if (selected === null) return;
    setMessage(null);
    settle(selected, revealBlank(round, selected));
  };

  const imageOf = (person: PuzzlePerson) => images[person.name];
  const untouched = mediumScore(round) === 0 && round.filled.every(fill => fill === null);

  const table = (
    <ChainLine>
      <li>
        <PersonCard person={puzzle.targetA} imageUrl={imageOf(puzzle.targetA)} state="target" label={`${puzzle.targetA.name}, ${formatLifespan(puzzle.targetA)}, target`} />
      </li>
      {puzzle.chain.map((person, blank) => {
        const fill = round.filled[blank];
        const words = letterPattern(person.name);
        return (
          <li key={person.id}>
            {fill ? (
              <PersonCard
                person={person}
                imageUrl={imageOf(person)}
                state={fill === 'revealed' ? 'revealed' : 'locked'}
                fresh={fresh === blank}
                label={`Person ${blank + 1}: ${person.name}, ${formatLifespan(person)}${fill === 'revealed' ? ', revealed' : ''}`}
              />
            ) : (
              <div className={selected === blank ? 'rounded-[12px] ring-4 ring-[var(--foil-light)]' : ''}>
                <EmptySlot index={blank} active={selected === blank} onClick={() => setSelected(blank)}>
                  <span className="sr-only">
                    Person {blank + 1}, hidden: {words.length} {words.length === 1 ? 'word' : 'words'} of {words.join(', ')} letters{selected === blank ? ', selected' : ''}
                  </span>
                  <LetterBoxes name={person.name} />
                </EmptySlot>
              </div>
            )}
          </li>
        );
      })}
      <li>
        <PersonCard person={puzzle.targetB} imageUrl={imageOf(puzzle.targetB)} state="target" label={`${puzzle.targetB.name}, ${formatLifespan(puzzle.targetB)}, target`} />
      </li>
    </ChainLine>
  );

  const dock = (
    <>
      {message && (
        <p role="status" className="rounded-lg bg-[var(--card-stock)] px-3 py-2 text-[15px] font-semibold text-[var(--card-ink)] ring-2 ring-[var(--under-par)]">
          {message}
        </p>
      )}
      {!finished && (
        <>
          <button
            type="button"
            onClick={reveal}
            disabled={selected === null || checking}
            aria-label="Wild card: reveal the selected person, costs one miss"
            className="type-display inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-[var(--foil)] px-4 text-[15px] font-extrabold uppercase tracking-[0.06em] text-[var(--chalk-text)] transition-colors hover:bg-[rgba(232,185,49,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foil-light)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Wild card <span className="font-bold text-[var(--table-muted)]">+1</span>
          </button>
          <SearchBar figures={[]} onSelect={() => {}} onAddFigure={name => void guess(name)} isAdding={checking || !roster} />
        </>
      )}
    </>
  );

  const overlay = showResult ? (
    <StyleResult
      style="medium"
      result={mediumResult(round)}
      chain={line.map(p => ({ ...p, imageUrl: imageOf(p) }))}
      heading={endHeading}
      actionLabel={endActionLabel}
      onAction={onEndAction}
      extra={endExtra}
    />
  ) : null;

  const misses = mediumScore(round);
  return (
    <StyleShell
      label={label}
      style="medium"
      plate={large => <CountPlate label={misses === 1 ? 'Miss' : 'Misses'} value={misses} large={large} />}
      targetA={puzzle.targetA}
      targetB={puzzle.targetB}
      rule={untouched ? 'Name the hidden people. Each box is a letter.' : null}
      onHome={onHome}
      onRestart={onRestart}
      dock={dock}
      table={table}
      overlay={overlay}
    />
  );
}
