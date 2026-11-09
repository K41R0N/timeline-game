/** Titles recorded in wikimedia-responses.json. Each covers a case from the 2026-11-02 audit. */
export const FIXTURE_PEOPLE = [
  'Cleopatra', // century-only category; Wikidata has 69 BCE (circa)
  'Genghis Khan', // no birth category; old parser used death - 30
  'Johannes Gutenberg', // no birth year category
  'Ramesses II', // century midpoints in categories
  'Barack Obama', // living person
  'Rome', // not a person
  'Pink Floyd', // a band, not a person
  'julius caesar', // lowercase input resolves to canonical title
  'Machiavelli', // redirect to Niccolò Machiavelli
  'Aristotle', // description regex used to produce "istotle was..."
] as const;

/** Titles recorded as one batched portrait request (an Easy puzzle's chain). */
export const FIXTURE_PORTRAITS = ['Michelangelo', 'Galileo Galilei', 'Isaac Newton'] as const;
