import { describe, expect, it } from 'vitest';
import rosterFile from './roster.json';
import { RosterFile, fromRosterRow, loadRoster } from './roster';
import { findCoverageGaps } from '../services/rosterBuild';

const file = rosterFile as unknown as RosterFile;
const people = file.people.map(fromRosterRow);
const byId = new Map(people.map(p => [p.id, p]));

describe('committed roster', () => {
  it('records where and when it was built', () => {
    expect(file.source).toBe('Wikipedia:Vital articles/Level 4/People');
    expect(file.sourceRevision).toBeGreaterThan(0);
    expect(file.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(file.count).toBe(people.length);
  });

  it('holds a plausible number of unique, well-formed people sorted by birth', () => {
    expect(people.length).toBeGreaterThanOrEqual(1500);
    expect(people.length).toBeLessThanOrEqual(2500);
    expect(new Set(people.map(p => p.id)).size).toBe(people.length);
    for (let i = 0; i < people.length; i++) {
      expect(people[i].deathYear).toBeGreaterThanOrEqual(people[i].birthYear);
      expect(people[i].sitelinks).toBeGreaterThan(0);
      if (i > 0) expect(people[i].birthYear).toBeGreaterThanOrEqual(people[i - 1].birthYear);
    }
  });

  it('matches the years a lookup returns for the same people', () => {
    expect(byId.get('Q1048')).toMatchObject({ name: 'Julius Caesar', birthYear: -100, deathYear: -44 });
    expect(byId.get('Q635')).toMatchObject({ name: 'Cleopatra', birthYear: -69, deathYear: -30, birthApproximate: true });
  });

  it('connects every century from 500 BCE to 1950', () => {
    expect(findCoverageGaps(people, -500, 1950)).toEqual([]);
  });

  it('loads the same people through the lazy loader', async () => {
    const loaded = await loadRoster();
    expect(loaded.length).toBe(people.length);
    expect(loaded[0]).toEqual(people[0]);
  });
});
