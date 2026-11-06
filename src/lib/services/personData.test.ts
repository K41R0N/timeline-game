import { describe, expect, it } from 'vitest';
import { WikidataClaim, datelessDescription, isHuman, parseWikidataYear, resolveLifespan, summarize, yearFromClaims, yearsFromCategories } from './personData';

const time = (t: string, precision: number, extra: Partial<WikidataClaim> = {}): WikidataClaim => ({
  rank: 'normal',
  mainsnak: { snaktype: 'value', datavalue: { value: { time: t, precision } } },
  ...extra,
});

describe('parseWikidataYear', () => {
  it('uses historical BCE numbering', () => {
    expect(parseWikidataYear('-0069-01-13T00:00:00Z')).toBe(-69);
    expect(parseWikidataYear('+1769-08-15T00:00:00Z')).toBe(1769);
  });
});

describe('yearFromClaims', () => {
  it('prefers preferred-rank statements and skips deprecated ones', () => {
    const claims = [
      time('-0102-00-00T00:00:00Z', 9),
      { ...time('-0100-07-12T00:00:00Z', 10), rank: 'preferred' as const },
      { ...time('-0050-00-00T00:00:00Z', 9), rank: 'deprecated' as const },
    ];
    expect(yearFromClaims(claims)).toEqual({ year: -100, approximate: false });
  });

  it('flags circa qualifiers and coarse precision as approximate', () => {
    const circa = time('-0069-00-00T00:00:00Z', 9, { qualifiers: { P1480: [{ datavalue: { value: { id: 'Q5727902' } } }] } });
    expect(yearFromClaims([circa])).toEqual({ year: -69, approximate: true });
    expect(yearFromClaims([time('+1160-00-00T00:00:00Z', 8)])).toEqual({ year: 1165, approximate: true });
    expect(yearFromClaims([time('-0350-00-00T00:00:00Z', 7)])).toEqual({ year: -350, approximate: true });
  });

  it('reads century precision with Wikidata\'s strict ranges (1401–1500 is the 15th century)', () => {
    expect(yearFromClaims([time('+1500-00-00T00:00:00Z', 7)])).toEqual({ year: 1450, approximate: true });
    expect(yearFromClaims([time('+1501-00-00T00:00:00Z', 7)])).toEqual({ year: 1550, approximate: true });
    expect(yearFromClaims([time('-0400-00-00T00:00:00Z', 7)])).toEqual({ year: -350, approximate: true });
  });

  it('ignores unknown-value statements', () => {
    expect(yearFromClaims([{ rank: 'normal', mainsnak: { snaktype: 'somevalue' } }])).toBeNull();
  });
});

describe('isHuman', () => {
  it('requires instance of human (Q5)', () => {
    const human = { rank: 'normal' as const, mainsnak: { snaktype: 'value' as const, datavalue: { value: { id: 'Q5' } } } };
    const city = { rank: 'normal' as const, mainsnak: { snaktype: 'value' as const, datavalue: { value: { id: 'Q515' } } } };
    expect(isHuman([human])).toBe(true);
    expect(isHuman([city])).toBe(false);
    expect(isHuman(undefined)).toBe(false);
  });
});

describe('yearsFromCategories', () => {
  it('prefers exact years over decades over centuries, BCE negative', () => {
    expect(yearsFromCategories(['Category:356 BC births', 'Category:4th-century BC births', 'Category:323 BC deaths'])).toEqual({
      birth: { year: -356, approximate: false },
      death: { year: -323, approximate: false },
      living: false,
    });
    expect(yearsFromCategories(['Category:350s BC births']).birth).toEqual({ year: -355, approximate: true });
    expect(yearsFromCategories(['Category:15th-century births']).birth).toEqual({ year: 1450, approximate: true });
    expect(yearsFromCategories(['Category:Living people']).living).toBe(true);
  });
});

describe('resolveLifespan', () => {
  it('treats a recent birth with no death statement as living', () => {
    expect(resolveLifespan([time('+1961-08-04T00:00:00Z', 11)], [], [], 2026)).toMatchObject({ birthYear: 1961, deathYear: 2026, isLiving: true });
  });

  it('rejects an old figure with no death date instead of guessing', () => {
    expect(resolveLifespan([time('+1162-00-00T00:00:00Z', 9)], [], [], 2026)).toBeNull();
  });

  it('falls back to categories when Wikidata has no dates', () => {
    expect(resolveLifespan([], [], ['Category:1452 births', 'Category:1519 deaths'], 2026)).toMatchObject({ birthYear: 1452, deathYear: 1519, isLiving: false });
  });

  it('rejects a death before birth', () => {
    expect(resolveLifespan([time('+1500-00-00T00:00:00Z', 9)], [time('+1400-00-00T00:00:00Z', 9)], [], 2026)).toBeNull();
  });
});

describe('summarize', () => {
  it('keeps the first sentences and cleans pronunciation leftovers', () => {
    const text = 'Ptolemy I Soter (; Greek: Πτολεμαῖος Σωτήρ; c. 367 BC – 282 BC) was a general. He founded a dynasty. It ruled Egypt. It ended with Cleopatra.';
    expect(summarize(text)).toBe('Ptolemy I Soter (Greek: Πτολεμαῖος Σωτήρ; c. 367 BC – 282 BC) was a general. He founded a dynasty. It ruled Egypt.');
  });
});

describe('datelessDescription', () => {
  it.each([
    ['Pharaoh of Egypt from 51 to 30 BC', 'Pharaoh of Egypt'],
    ['Roman general and dictator (100–44 BC)', 'Roman general and dictator'],
    ['German inventor and craftsman (c. 1393–1406 – 1468)', 'German inventor and craftsman'],
    ['President of the United States from 2009 to 2017', 'President of the United States'],
    ['American politician (born 1961)', 'American politician'],
    ['5th-century BC Greek philosopher', 'Greek philosopher'],
    ['Khan of the Mongol Empire since 1206', 'Khan of the Mongol Empire'],
    ['English rock band', 'English rock band'],
  ])('turns "%s" into "%s"', (description, expected) => {
    expect(datelessDescription(description)).toBe(expected);
  });

  it('drops a description when a number survives the cleanup', () => {
    expect(datelessDescription('Member of the 1st Parliament')).toBe('');
  });
});
