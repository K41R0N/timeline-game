import { describe, expect, it } from 'vitest';
import sample from './__fixtures__/roster-sparql-sample.json';
import {
  type SparqlBinding,
  findCoverageGaps,
  propertiesToReread,
  rosterPersonFrom,
  statementsFromSparql,
  toHistoricalTime,
} from './rosterBuild';

const bindings = (sample as { results: { bindings: SparqlBinding[] } }).results.bindings;
const statements = statementsFromSparql(bindings);
const person = (qid: string, name: string) => rosterPersonFrom(qid, name, statements.get(qid)!, 2026);

const WD = 'http://www.wikidata.org/entity/';
const ONTOLOGY = 'http://wikiba.se/ontology#';
const row = (item: string, kind: string, st: string, time?: string, rank = 'NormalRank'): SparqlBinding => ({
  item: { value: WD + item },
  kind: { value: kind },
  st: { value: `${WD}statement/${st}` },
  rank: { value: ONTOLOGY + rank },
  ...(time ? { time: { value: time }, prec: { value: '9' } } : {}),
});

describe('toHistoricalTime', () => {
  it('moves SPARQL BCE years from astronomical to historical numbering', () => {
    expect(toHistoricalTime('-0099-07-01T00:00:00Z')).toBe('-0100-07-01T00:00:00Z');
    expect(toHistoricalTime('0000-01-01T00:00:00Z')).toBe('-0001-01-01T00:00:00Z');
  });

  it('keeps CE years and adds the sign the claim parser expects', () => {
    expect(toHistoricalTime('1162-06-07T00:00:00Z')).toBe('+1162-06-07T00:00:00Z');
  });
});

describe('rosterPersonFrom (recorded SPARQL rows)', () => {
  it('reads Caesar from the preferred statement in historical years', () => {
    expect(person('Q1048', 'Julius Caesar')).toEqual({
      id: 'Q1048', name: 'Julius Caesar', birthYear: -100, deathYear: -44, birthApproximate: false, deathApproximate: false, sitelinks: 283,
    });
  });

  it('marks Cleopatra’s circa birth as approximate', () => {
    expect(person('Q635', 'Cleopatra')).toMatchObject({ birthYear: -69, birthApproximate: true, deathYear: -30, deathApproximate: false });
  });

  it('reads Alexander the Great and Genghis Khan', () => {
    expect(person('Q8409', 'Alexander the Great')).toMatchObject({ birthYear: -356, deathYear: -323 });
    expect(person('Q720', 'Genghis Khan')).toMatchObject({ birthYear: 1162, deathYear: 1227 });
  });

  it('excludes items that are not humans', () => {
    const map = statementsFromSparql([row('Q1', 'birth', 'a', '1900-01-01T00:00:00Z'), row('Q1', 'death', 'b', '1950-01-01T00:00:00Z')]);
    expect(rosterPersonFrom('Q1', 'Not a person', map.get('Q1')!, 2026)).toBeNull();
  });

  it('leaves out lifespans no one could have lived', () => {
    const circa = { P1480: [{ datavalue: { value: { id: 'Q5727902' } } }] };
    const map = statementsFromSparql([
      row('Q5', 'human', 'h5'), row('Q5', 'birth', 'b5', '-0349-01-01T00:00:00Z'), row('Q5', 'death', 'd5', '-0129-01-01T00:00:00Z'),
      row('Q6', 'human', 'h6'), row('Q6', 'birth', 'b6', '1875-02-21T00:00:00Z'), row('Q6', 'death', 'd6', '1997-08-04T00:00:00Z'),
    ]);
    map.get('Q5')!.births[0].qualifiers = circa;
    expect(rosterPersonFrom('Q5', 'Menander I', map.get('Q5')!, 2026)).toBeNull();
    expect(rosterPersonFrom('Q6', 'Jeanne Calment', map.get('Q6')!, 2026)).toMatchObject({ birthYear: 1875, deathYear: 1997 });
  });

  it('excludes living people', () => {
    const map = statementsFromSparql([row('Q2', 'human', 'h'), row('Q2', 'birth', 'b', '1961-08-04T00:00:00Z')]);
    expect(rosterPersonFrom('Q2', 'Someone alive', map.get('Q2')!, 2026)).toBeNull();
  });
});

describe('propertiesToReread', () => {
  it('flags best-rank births that disagree on the year', () => {
    const map = statementsFromSparql([
      row('Q3', 'birth', 'a', '1155-01-01T00:00:00Z'),
      row('Q3', 'birth', 'b', '1162-01-01T00:00:00Z'),
      row('Q3', 'death', 'c', '1227-01-01T00:00:00Z'),
    ]);
    expect(propertiesToReread(map.get('Q3')!)).toEqual(['P569']);
  });

  it('does not flag statements that agree on the year', () => {
    const map = statementsFromSparql([row('Q4', 'birth', 'a', '1809-01-01T00:00:00Z'), row('Q4', 'birth', 'b', '1809-02-12T00:00:00Z')]);
    expect(propertiesToReread(map.get('Q4')!)).toEqual([]);
  });

  const julian = (item: string, kind: string, time: string): SparqlBinding => ({
    ...row(item, kind, `${item}-${kind}`, time),
    prec: { value: '11' },
    cal: { value: `${WD}Q1985786` },
  });

  it('rereads a Julian day-precision date that conversion may have moved across a new year (Newton, 25 December 1642)', () => {
    const map = statementsFromSparql([julian('Q935', 'birth', '1643-01-04T00:00:00Z'), julian('Q935', 'death', '1727-03-31T00:00:00Z')]);
    expect(propertiesToReread(map.get('Q935')!)).toEqual(['P569']);
  });

  it('trusts a Julian date far from the new year (Genghis Khan, 31 May 1162)', () => {
    const map = statementsFromSparql([julian('Q720', 'birth', '1162-06-07T00:00:00Z')]);
    expect(propertiesToReread(map.get('Q720')!)).toEqual([]);
  });

  it('lets a preferred statement settle disagreeing normal ones, as Caesar’s birth does', () => {
    expect(propertiesToReread(statements.get('Q1048')!)).toEqual([]);
  });
});

describe('findCoverageGaps', () => {
  const life = (birthYear: number, deathYear: number) => ({ birthYear, deathYear });

  it('reports a stretch nobody bridges', () => {
    expect(findCoverageGaps([life(500, 600), life(650, 700)], 500, 700)).toEqual([{ from: 600, to: 650 }]);
  });

  it('reports nothing when consecutive lives overlap', () => {
    expect(findCoverageGaps([life(500, 600), life(600, 700)], 500, 700)).toEqual([]);
  });

  it('reports a stretch before the first life', () => {
    expect(findCoverageGaps([life(550, 600)], 500, 600)).toEqual([{ from: 500, to: 550 }]);
  });

  it('reports a stretch that starts before the range', () => {
    expect(findCoverageGaps([life(400, 450), life(520, 600)], 500, 600)).toEqual([{ from: 500, to: 520 }]);
  });

  it('reports a range that runs past the last life', () => {
    expect(findCoverageGaps([life(500, 600)], 500, 700)).toEqual([{ from: 600, to: 700 }]);
  });
});
