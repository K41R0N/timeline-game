import { afterEach, describe, expect, it, vi } from 'vitest';
import { TargetSelectionService } from './TargetSelectionService';
import { WikipediaService, type PersonLookupResult } from './WikipediaService';
import type { HistoricalFigure } from '../types/HistoricalFigure';

const person = (name: string, birthYear: number, deathYear: number): HistoricalFigure => ({
  id: name, name, birthYear, deathYear, shortDescription: '', imageUrl: '', contemporaries: [],
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TargetSelectionService.selectRandomTargets', () => {
  it('stops after one attempt when Wikimedia is unreachable instead of retrying ten pairs', async () => {
    const lookup = vi
      .spyOn(WikipediaService, 'lookupPerson')
      .mockResolvedValue({ ok: false, reason: 'network', title: 'x' });

    await expect(TargetSelectionService.selectRandomTargets('hard')).resolves.toBeNull();
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('keeps trying other pairs when a candidate is merely unusable', async () => {
    const lookup = vi.spyOn(WikipediaService, 'lookupPerson').mockImplementation(async (title: string): Promise<PersonLookupResult> => {
      // First pair: one candidate has no reliable dates. Every later lookup succeeds.
      if (lookup.mock.calls.length === 1) return { ok: false, reason: 'no_dates', title };
      return { ok: true, figure: lookup.mock.calls.length % 2 === 0 ? person(title, -356, -323) : person(title, 1879, 1955) };
    });

    const targets = await TargetSelectionService.selectRandomTargets('hard');
    expect(targets).not.toBeNull();
    expect(lookup.mock.calls.length).toBeGreaterThan(2);
  });

  it('retries a pair the playability check rejects', async () => {
    let call = 0;
    const lookup = vi.spyOn(WikipediaService, 'lookupPerson').mockImplementation(async (title: string): Promise<PersonLookupResult> => {
      call += 1;
      return { ok: true, figure: call % 2 === 1 ? person(title, -356, -323) : person(title, 1879, 1955) };
    });
    const isPlayable = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);

    const targets = await TargetSelectionService.selectRandomTargets('hard', isPlayable);
    expect(targets).not.toBeNull();
    expect(isPlayable).toHaveBeenCalledTimes(2);
    expect(lookup).toHaveBeenCalledTimes(4);
  });

  it('gives up after the attempt limit when no pair is playable', async () => {
    let call = 0;
    vi.spyOn(WikipediaService, 'lookupPerson').mockImplementation(async (title: string): Promise<PersonLookupResult> => {
      call += 1;
      return { ok: true, figure: call % 2 === 1 ? person(title, -356, -323) : person(title, 1879, 1955) };
    });
    await expect(TargetSelectionService.selectRandomTargets('hard', () => false)).resolves.toBeNull();
  });
});

describe('TargetSelectionService.selectDefaultTargets', () => {
  it('refuses the default pair when it is not playable', async () => {
    vi.spyOn(WikipediaService, 'getPersonDetails').mockImplementation(async (title: string) => person(title, -356, -323));
    await expect(TargetSelectionService.selectDefaultTargets(() => false)).resolves.toBeNull();
    await expect(TargetSelectionService.selectDefaultTargets(() => true)).resolves.not.toBeNull();
  });
});
