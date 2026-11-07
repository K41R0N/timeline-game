/**
 * Pure helpers that turn Wikimedia responses into game data.
 * No network access here, so everything is unit-testable against recorded fixtures.
 *
 * Year convention: negative integers are BCE (-69 = 69 BCE). Wikidata's JSON time
 * values use the same historical numbering ("-0069-..." is 69 BCE).
 */

export interface WikidataTimeValue {
  time: string;
  precision: number;
}

export interface WikidataClaim {
  rank?: 'preferred' | 'normal' | 'deprecated';
  mainsnak: {
    snaktype: 'value' | 'somevalue' | 'novalue';
    datavalue?: { value: unknown; type?: string };
  };
  qualifiers?: Record<string, Array<{ datavalue?: { value?: { id?: string } } }>>;
}

export interface YearValue {
  year: number;
  approximate: boolean;
}

export interface Lifespan {
  birthYear: number;
  deathYear: number;
  birthApproximate: boolean;
  deathApproximate: boolean;
  isLiving: boolean;
}

const HUMAN_QID = 'Q5';
const CIRCA_QID = 'Q5727902';
const SOURCING_CIRCUMSTANCES = 'P1480';
/** People with no recorded death and a birth within this many years are treated as living. */
const MAX_LIVING_AGE = 120;
/** The longest verified human life. */
const MAX_LIFESPAN_YEARS = 122;
/** Century-precision dates are stored as midpoints, which can stretch a life far past its real length. */
const MAX_APPROXIMATE_LIFESPAN_YEARS = 110;

const PRECISION_YEAR = 9;
const PRECISION_DECADE = 8;
const PRECISION_CENTURY = 7;

/** Statements in rank order: preferred first, then normal; deprecated ones are dropped. */
export function rankedClaims(claims: WikidataClaim[] | undefined): WikidataClaim[] {
  const usable = (claims ?? []).filter(c => c.rank !== 'deprecated');
  const preferred = usable.filter(c => c.rank === 'preferred');
  return preferred.length > 0 ? [...preferred, ...usable.filter(c => c.rank !== 'preferred')] : usable;
}

export function isHuman(instanceOfClaims: WikidataClaim[] | undefined): boolean {
  return (instanceOfClaims ?? []).some(claim => {
    const value = claim.mainsnak.datavalue?.value as { id?: string } | undefined;
    return claim.rank !== 'deprecated' && value?.id === HUMAN_QID;
  });
}

/** Parse a Wikidata time string ("+1769-08-15T00:00:00Z", "-0069-00-00T00:00:00Z") into a signed year. */
export function parseWikidataYear(time: string): number {
  const match = /^([+-])(\d+)-/.exec(time);
  if (!match) throw new Error(`Unrecognised Wikidata time: ${time}`);
  const year = parseInt(match[2], 10);
  return match[1] === '-' ? -year : year;
}

/** Decade precision: "1160" means the 1160s (1160–1169). */
function decadeMidpointOf(year: number): number {
  const mid = Math.floor(Math.abs(year) / 10) * 10 + 5;
  return year < 0 ? -mid : mid;
}

/**
 * Century precision uses Wikidata's strict ranges: 1401–1500 is the 15th century,
 * so "+1500" and "+1450" both mean 1450, and "-0400" (400–301 BCE) means -350.
 */
function centuryMidpointOf(year: number): number {
  const mid = Math.ceil(Math.abs(year) / 100) * 100 - 50;
  return year < 0 ? -mid : mid;
}

/** The best year from a list of P569/P570 claims, or null when none has a usable value. */
export function yearFromClaims(claims: WikidataClaim[] | undefined): YearValue | null {
  for (const claim of rankedClaims(claims)) {
    if (claim.mainsnak.snaktype !== 'value') continue;
    const value = claim.mainsnak.datavalue?.value as WikidataTimeValue | undefined;
    if (!value?.time) continue;

    const raw = parseWikidataYear(value.time);
    const circa = (claim.qualifiers?.[SOURCING_CIRCUMSTANCES] ?? []).some(q => q.datavalue?.value?.id === CIRCA_QID);

    if (value.precision >= PRECISION_YEAR) return { year: raw, approximate: circa };
    if (value.precision === PRECISION_DECADE) return { year: decadeMidpointOf(raw), approximate: true };
    if (value.precision === PRECISION_CENTURY) return { year: centuryMidpointOf(raw), approximate: true };
    return { year: raw, approximate: true };
  }
  return null;
}

/** True when the item records a death at all, even with an unknown date ("somevalue"). */
export function hasDeathStatement(claims: WikidataClaim[] | undefined): boolean {
  return rankedClaims(claims).some(c => c.mainsnak.snaktype === 'value' || c.mainsnak.snaktype === 'somevalue');
}

export interface CategoryYears {
  birth: YearValue | null;
  death: YearValue | null;
  living: boolean;
}

/**
 * Fallback for pages whose Wikidata item has no dates: read Wikipedia categories such as
 * "356 BC births", "1160s deaths" or "4th-century BC births". Exact years beat decades beat centuries.
 */
export function yearsFromCategories(categoryTitles: string[]): CategoryYears {
  const found: Record<'births' | 'deaths', { exact?: number; decade?: number; century?: number }> = {
    births: {},
    deaths: {},
  };
  let living = false;

  for (const raw of categoryTitles) {
    const title = raw.replace(/^Category:/i, '').replace(/_/g, ' ').trim();
    if (/^living people$/i.test(title)) living = true;

    const exact = /^(\d+)( BC)? (births|deaths)$/i.exec(title);
    if (exact) {
      const year = parseInt(exact[1], 10);
      found[exact[3].toLowerCase() as 'births' | 'deaths'].exact = exact[2] ? -year : year;
      continue;
    }
    const decade = /^(\d+)0s( BC)? (births|deaths)$/i.exec(title);
    if (decade) {
      const start = parseInt(decade[1], 10) * 10;
      found[decade[3].toLowerCase() as 'births' | 'deaths'].decade = decade[2] ? -(start + 5) : start + 5;
      continue;
    }
    const century = /^(\d+)(?:st|nd|rd|th)-century( BC)? (births|deaths)$/i.exec(title);
    if (century) {
      const mid = (parseInt(century[1], 10) - 1) * 100 + 50;
      found[century[3].toLowerCase() as 'births' | 'deaths'].century = century[2] ? -mid : mid;
    }
  }

  const pick = (k: 'births' | 'deaths'): YearValue | null => {
    const f = found[k];
    if (f.exact !== undefined) return { year: f.exact, approximate: false };
    if (f.decade !== undefined) return { year: f.decade, approximate: true };
    if (f.century !== undefined) return { year: f.century, approximate: true };
    return null;
  };

  return { birth: pick('births'), death: pick('deaths'), living };
}

/**
 * Combine Wikidata dates with the category fallback. Returns null when no honest lifespan
 * can be formed: the old "death - 30" / "birth + 60" guesses are intentionally gone, and a
 * life no one could have lived counts as no reliable dates.
 */
export function resolveLifespan(
  birthClaims: WikidataClaim[] | undefined,
  deathClaims: WikidataClaim[] | undefined,
  categoryTitles: string[],
  currentYear: number
): Lifespan | null {
  const categories = yearsFromCategories(categoryTitles);
  const birth = yearFromClaims(birthClaims) ?? categories.birth;
  if (!birth) return null;

  const deathRecorded = hasDeathStatement(deathClaims);
  const death = yearFromClaims(deathClaims) ?? categories.death;

  if (!deathRecorded && !categories.death) {
    const plausiblyAlive = categories.living || birth.year >= currentYear - MAX_LIVING_AGE;
    if (plausiblyAlive) {
      return { birthYear: birth.year, deathYear: currentYear, birthApproximate: birth.approximate, deathApproximate: false, isLiving: true };
    }
  }

  if (!death || death.year < birth.year) return null;
  const years = death.year - birth.year;
  if (years > MAX_LIFESPAN_YEARS || ((birth.approximate || death.approximate) && years > MAX_APPROXIMATE_LIFESPAN_YEARS)) return null;
  return {
    birthYear: birth.year,
    deathYear: death.year,
    birthApproximate: birth.approximate,
    deathApproximate: death.approximate,
    isLiving: false,
  };
}

/** First few sentences of a plain-text intro, for the detail panel. */
export function summarize(extract: string, maxSentences = 3, maxLength = 600): string {
  const clean = extract
    .replace(/\(\s*[;,]\s*/g, '(')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z"“])/).slice(0, maxSentences).join(' ');
  return sentences.length > maxLength ? `${sentences.slice(0, maxLength - 1).trimEnd()}…` : sentences;
}

const ERA = String.raw`(?:\s*(?:BC|BCE|AD|CE)\b)?`;
const YEAR = String.raw`(?:c\.\s*)?\d+` + ERA;
const YEAR_PATTERNS = [
  /\s*\([^)]*\d[^)]*\)/g,
  new RegExp(String.raw`\s*\bfrom\s+${YEAR}\s+(?:to|until)\s+${YEAR}`, 'gi'),
  new RegExp(String.raw`\s*\b(?:born|died|since|until|in)\s+${YEAR}`, 'gi'),
  new RegExp(String.raw`\b\d+(?:st|nd|rd|th)[- ]century` + ERA + String.raw`\s*`, 'gi'),
];

/**
 * A short description with every year removed, so autocomplete never reveals when someone lived.
 * Returns an empty string when a number survives, rather than risk leaking a date.
 */
export function datelessDescription(description: string): string {
  let text = description;
  for (const pattern of YEAR_PATTERNS) text = text.replace(pattern, '');
  text = text.replace(/\s+/g, ' ').replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, '').trim();
  return /\d/.test(text) ? '' : text;
}
