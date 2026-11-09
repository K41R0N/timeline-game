'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { PuzzlePerson } from '../data/dailySchedule';
import { usePortraits } from '../hooks/usePortraits';
import { useClearingLine, useStyleRound } from '../hooks/useStyleRound';
import type { StyleResult as Result } from '../utils/dailyProgress';
import type { RoundContext } from '../utils/roundEvents';
import { formatLifespan } from '../utils/GameLogic';
import { seededRandom, seedFor } from '../utils/random';
import { canCheck, checkEasy, easyFinished, easyResult, handCards, newEasyRound, placeCard, returnCard, type EasyRound as EasyState } from '../utils/styleRound';
import { ChainLine, CountPlate, EmptySlot, PersonCard, StyleShell, type ChainPuzzleView } from './ui/ChainTable';
import { Portrait } from './ui/Portrait';
import { StyleResult } from './ui/StyleResult';

export interface EasyRoundProps {
  puzzle: ChainPuzzleView;
  /** A saved round to resume, or null for a fresh one. */
  initial: EasyState | null;
  /** Beside the Home control, such as the daily puzzle's number. */
  label: ReactNode;
  /** Called with the round after every change, so progress survives a reload. */
  onSave: (round: EasyState) => void;
  /** Called once every slot is right. */
  onFinish: (round: EasyState, result: Result) => void;
  onHome: () => void;
  /** Free play: give up this round for a new puzzle. */
  onRestart?: () => void;
  endHeading: string;
  endActionLabel: string;
  onEndAction: () => void;
  endExtra?: ReactNode;
  /** Free play or a daily puzzle, attached to the completion event. */
  analyticsContext: RoundContext;
}

/** The same shuffled hand every time a puzzle is opened, so a reload does not reorder it. */
function dealOrder(ids: string[]): string[] {
  const random = seededRandom(seedFor([...ids].sort().join('|')));
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Easy: arrange the dealt name cards, decoys included, between the two gold targets, and Check. */
export function EasyRound({ puzzle, initial, label, onSave, onFinish, onHome, onRestart, endHeading, endActionLabel, onEndAction, endExtra, analyticsContext }: EasyRoundProps) {
  const people = useMemo(() => new Map([...puzzle.chain, ...puzzle.decoys].map(p => [p.id, p])), [puzzle]);
  const answerIds = useMemo(() => puzzle.chain.map(p => p.id), [puzzle]);
  const deck = useMemo(() => dealOrder([...puzzle.chain, ...puzzle.decoys].map(p => p.id)), [puzzle]);
  const titles = useMemo(() => [puzzle.targetA, ...puzzle.chain, ...puzzle.decoys, puzzle.targetB].map(p => p.name), [puzzle]);
  const images = usePortraits(titles);

  const [round, setRound] = useState<EasyState>(() => initial ?? newEasyRound(answerIds.length));
  const [selected, setSelected] = useState<string | null>(null);
  const [line, setLine] = useClearingLine();
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());
  const finished = easyFinished(round);
  const showResult = useStyleRound(round, { finished, score: done => ({ result: easyResult(done), reveals: 0 }), onSave, onFinish, analyticsContext });

  const tapSlot = (slot: number) => {
    if (round.locked[slot]) return;
    setFresh(new Set());
    if (selected) {
      setRound(current => placeCard(current, selected, slot));
      setSelected(null);
    } else if (round.slots[slot]) {
      setRound(current => returnCard(current, slot));
    }
  };

  const check = () => {
    const next = checkEasy(round, answerIds);
    if (next === round) return;
    setFresh(new Set(next.locked.flatMap((locked, i) => (locked && !round.locked[i] ? [i] : []))));
    setRound(next);
    setSelected(null);
    const right = next.locked.filter(Boolean).length;
    setLine(easyFinished(next) ? null : `${right} of ${next.slots.length} in place`);
  };

  const imageOf = (person: PuzzlePerson) => images[person.name];
  const hand = handCards(round, deck);
  const untouched = round.checks === 0 && round.slots.every(id => id === null);

  const table = (
    <ChainLine>
      <li>
        <PersonCard person={puzzle.targetA} imageUrl={imageOf(puzzle.targetA)} state="target" label={`${puzzle.targetA.name}, ${formatLifespan(puzzle.targetA)}, target`} />
      </li>
      {round.slots.map((id, slot) => {
        const person = id ? people.get(id) : undefined;
        return (
          <li key={slot}>
            {person ? (
              <PersonCard
                person={person}
                imageUrl={imageOf(person)}
                state={round.locked[slot] ? 'locked' : 'placed'}
                fresh={fresh.has(slot)}
                onClick={round.locked[slot] ? undefined : () => tapSlot(slot)}
                label={
                  round.locked[slot]
                    ? `Slot ${slot + 1}: ${person.name}, ${formatLifespan(person)}, in place`
                    : `Slot ${slot + 1}: ${person.name}, ${selected ? 'swap in the selected card' : 'tap to take back'}`
                }
              />
            ) : (
              <EmptySlot index={slot} active={selected !== null} onClick={() => tapSlot(slot)} />
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
      {line && (
        <p role="status" className="rounded-lg bg-[var(--card-stock)] px-3 py-2 text-[15px] font-semibold text-[var(--card-ink)]">
          {line}
        </p>
      )}
      {!finished && (
        <>
          <ul aria-label="Your hand" className="flex flex-wrap gap-2">
            {hand.map(id => {
              const person = people.get(id)!;
              const isSelected = selected === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelected(current => (current === id ? null : id))}
                    className={`flex min-h-11 items-center gap-2 rounded-lg bg-[var(--card-stock)] py-1 pl-1 pr-3 text-left text-[var(--card-ink)] shadow-[0_3px_0_rgba(0,0,0,0.3)] transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)] ${
                      isSelected ? '-translate-y-1 ring-4 ring-[var(--foil-light)]' : 'hover:-translate-y-0.5'
                    }`}
                  >
                    <Portrait figure={{ ...person, imageUrl: imageOf(person) }} size="sm" />
                    <span className="type-display text-[15px] font-extrabold uppercase leading-[0.95]">{person.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={check}
            disabled={!canCheck(round)}
            className="type-display flex h-12 w-full items-center justify-center rounded-xl bg-[var(--foil)] text-xl font-black uppercase tracking-[0.06em] text-[var(--foil-ink)] shadow-[0_3px_0_var(--foil-deep)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--foil-light)] disabled:translate-y-0 disabled:opacity-40"
          >
            Check
          </button>
        </>
      )}
    </>
  );

  const overlay = showResult ? (
    <StyleResult
      style="easy"
      result={easyResult(round)}
      chain={[puzzle.targetA, ...puzzle.chain, puzzle.targetB].map(p => ({ ...p, imageUrl: imageOf(p) }))}
      heading={endHeading}
      actionLabel={endActionLabel}
      onAction={onEndAction}
      extra={endExtra}
    />
  ) : null;

  return (
    <StyleShell
      label={label}
      style="easy"
      plate={large => <CountPlate label={round.checks === 1 ? 'Check' : 'Checks'} value={round.checks} large={large} />}
      targetA={puzzle.targetA}
      targetB={puzzle.targetB}
      rule={untouched ? 'Tap a card, then a slot. Each life must overlap the next.' : null}
      onHome={onHome}
      onRestart={onRestart}
      dock={dock}
      dockScrolls
      table={table}
      overlay={overlay}
    />
  );
}
