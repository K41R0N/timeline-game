import { afterEach, describe, expect, it, vi } from 'vitest';
import rosterFile from '../data/roster.json';
import { RosterFile, fromRosterRow } from '../data/roster';
import { TargetSelectionService } from './TargetSelectionService';
import { WikipediaService, type PersonLookupResult } from './WikipediaService';
import { DIFFICULTY_BANDS, chainShape, famousPeople, fitsBand } from '../utils/difficulty';

const roster = (rosterFile as unknown as RosterFile).people.map(fromRosterRow);
const byName = new Map(roster.map(p => [p.name, p]));
const famousNames = new Set(famousPeople(roster).map(p => p.name));

/** A lookup that answers with the roster's own years, as a live lookup would. */
const rosterLookup = async (title: string): Promise<PersonLookupResult> => {
  const p = byName.get(title)!;
  return { ok: true, figure: { ...p, shortDescription: '', imageUrl: '', contemporaries: [] } };
};

/** Deterministic random numbers for repeatable picks. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TargetSelectionService.selectTargets', () => {
  it('looks up only the two chosen famous people and returns them earlier first, inside the band', async () => {
    const lookup = vi.spyOn(WikipediaService, 'lookupPerson').mockImplementation(rosterLookup);

    const targets = await TargetSelectionService.selectTargets(roster, 'medium', seeded(11));
    expect(targets).not.toBeNull();
    const [a, b] = targets!;
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(famousNames.has(a.name) && famousNames.has(b.name)).toBe(true);
    expect(a.birthYear).toBeLessThanOrEqual(b.birthYear);
    expect(fitsBand(chainShape(roster, a, b)!, DIFFICULTY_BANDS.medium)).toBe(true);
  });

  it('stops after one attempt when Wikimedia is unreachable', async () => {
    const lookup = vi.spyOn(WikipediaService, 'lookupPerson').mockResolvedValue({ ok: false, reason: 'network', title: 'x' });

    await expect(TargetSelectionService.selectTargets(roster, 'hard')).resolves.toBeNull();
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('tries another pair when a chosen person does not resolve', async () => {
    const lookup = vi.spyOn(WikipediaService, 'lookupPerson').mockImplementation(async (title: string) =>
      lookup.mock.calls.length === 1 ? { ok: false, reason: 'not_found', title } : rosterLookup(title)
    );

    await expect(TargetSelectionService.selectTargets(roster, 'easy')).resolves.not.toBeNull();
    expect(lookup).toHaveBeenCalledTimes(4);
  });
});
