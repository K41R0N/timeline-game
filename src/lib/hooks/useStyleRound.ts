'use client';

import { useEffect, useRef, useState } from 'react';
import { analytics, currentTime } from '../services/analytics';
import type { StyleResult } from '../utils/dailyProgress';
import { chainRoundCompletedProps, type RoundContext } from '../utils/roundEvents';

const RESULT_DELAY_MS = 1100;
const LINE_MS = 4500;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface StyleRoundOptions<R> {
  finished: boolean;
  /** The finished round's result, and how many people the wild card revealed. */
  score: (round: R) => { result: StyleResult; reveals: number };
  onSave: (round: R) => void;
  onFinish: (round: R, result: StyleResult) => void;
  analyticsContext: RoundContext;
}

/**
 * What the Easy and Medium rounds share: save on every change, report the finish once (a round
 * restored already finished is not a new completion), and open the result once the last card has
 * turned over. Returns whether the result is showing.
 */
export function useStyleRound<R>(round: R, { finished, score, onSave, onFinish, analyticsContext }: StyleRoundOptions<R>): boolean {
  const callbacks = useRef({ score, onSave, onFinish });
  const reported = useRef(finished);
  const startedAt = useRef(0);
  const [showResult, setShowResult] = useState(finished);

  useEffect(() => {
    callbacks.current = { score, onSave, onFinish };
  }, [score, onSave, onFinish]);
  useEffect(() => {
    startedAt.current = currentTime();
  }, []);
  useEffect(() => {
    callbacks.current.onSave(round);
  }, [round]);
  useEffect(() => {
    if (!finished || reported.current) return;
    reported.current = true;
    const { result, reveals } = callbacks.current.score(round);
    callbacks.current.onFinish(round, result);
    analytics.track('game_completed', chainRoundCompletedProps({ result, reveals, startedAt: startedAt.current, now: currentTime(), context: analyticsContext }));
  }, [finished, round, analyticsContext]);
  useEffect(() => {
    if (!finished || showResult) return;
    const timer = setTimeout(() => setShowResult(true), prefersReducedMotion() ? 0 : RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [finished, showResult]);

  return showResult;
}

/** A one-line message in the dock that clears itself. */
export function useClearingLine(): [string | null, (line: string | null) => void] {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    if (!line) return;
    const timer = setTimeout(() => setLine(null), LINE_MS);
    return () => clearTimeout(timer);
  }, [line]);
  return [line, setLine];
}
