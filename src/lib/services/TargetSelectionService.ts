import { HistoricalFigure } from '../types/HistoricalFigure';
import { WikipediaService } from './WikipediaService';

export type PlayabilityCheck = (targetA: HistoricalFigure, targetB: HistoricalFigure) => boolean;

/**
 * Service for selecting random target figures for the game
 * Provides curated pools of historical figures across different eras and difficulties
 */
export class TargetSelectionService {
  // Curated pools of well-known historical figures with good Wikipedia coverage
  private static readonly ANCIENT_FIGURES = [
    'Alexander the Great',
    'Julius Caesar',
    'Cleopatra',
    'Aristotle',
    'Plato',
    'Socrates',
    'Augustus',
    'Hannibal',
    'Confucius',
    'Ramesses II',
    'Hammurabi',
    'Pericles',
    'Archimedes',
    'Herodotus',
    'Marcus Aurelius'
  ];

  private static readonly MEDIEVAL_FIGURES = [
    'Charlemagne',
    'Genghis Khan',
    'Saladin',
    'William the Conqueror',
    'Richard the Lionheart',
    'Joan of Arc',
    'Marco Polo',
    'Dante Alighieri',
    'Thomas Aquinas',
    'Kublai Khan',
    'Eleanor of Aquitaine',
    'Frederick Barbarossa',
    'Akbar the Great',
    'Suleiman the Magnificent'
  ];

  private static readonly RENAISSANCE_FIGURES = [
    'Leonardo da Vinci',
    'Michelangelo',
    'William Shakespeare',
    'Christopher Columbus',
    'Martin Luther',
    'Galileo Galilei',
    'Johannes Gutenberg',
    'Elizabeth I',
    'Isaac Newton',
    'René Descartes',
    'Nicolaus Copernicus',
    'Raphael',
    'Erasmus',
    'Machiavelli'
  ];

  private static readonly MODERN_FIGURES = [
    'Napoleon Bonaparte',
    'George Washington',
    'Abraham Lincoln',
    'Queen Victoria',
    'Charles Darwin',
    'Karl Marx',
    'Thomas Edison',
    'Vincent van Gogh',
    'Marie Curie',
    'Albert Einstein',
    'Winston Churchill',
    'Mahatma Gandhi',
    'Franklin D. Roosevelt',
    'Pablo Picasso',
    'Nelson Mandela'
  ];

  /**
   * Select two random target figures with appropriate difficulty
   * @param difficulty - 'easy': 200-600 years apart, 'medium': 600-1200 years, 'hard': 1200+ years
   * @param isPlayable - rejects pairs a round cannot be built on, such as ones par cannot connect
   */
  static async selectRandomTargets(
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    isPlayable: PlayabilityCheck = () => true
  ): Promise<[HistoricalFigure, HistoricalFigure] | null> {
    console.log(`🎲 Selecting random targets with difficulty: ${difficulty}`);

    let targetA: HistoricalFigure | null = null;
    let targetB: HistoricalFigure | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Attempt ${attempts}/${maxAttempts}...`);

      // Select two different eras based on difficulty
      const [eraA, eraB] = this.selectErasByDifficulty(difficulty);

      // Get random figure from each era
      const figureNameA = this.getRandomFromArray(eraA);
      const figureNameB = this.getRandomFromArray(eraB);

      console.log(`📍 Trying: ${figureNameA} and ${figureNameB}`);

      // Fetch details from Wikipedia
      try {
        const [resultA, resultB] = await Promise.all([
          WikipediaService.lookupPerson(figureNameA),
          WikipediaService.lookupPerson(figureNameB)
        ]);

        // The client has already retried with backoff; another candidate pair won't
        // help if Wikimedia itself is unreachable, so hand over to the fallback now.
        if ((!resultA.ok && resultA.reason === 'network') || (!resultB.ok && resultB.reason === 'network')) {
          console.warn('⚠️ Wikimedia is unavailable; stopping random target selection');
          return null;
        }

        const figA = resultA.ok ? resultA.figure : null;
        const figB = resultB.ok ? resultB.figure : null;

        if (!figA || !figB) {
          console.warn(`⚠️ Failed to load one or both figures, retrying...`);
          continue;
        }

        // Validate time gap meets difficulty requirements
        const yearGap = Math.abs(figA.birthYear - figB.birthYear);
        const meetsRequirements = this.validateDifficulty(yearGap, difficulty);

        if (meetsRequirements) {
          // Sort by birth year (earliest first)
          if (figA.birthYear < figB.birthYear) {
            targetA = figA;
            targetB = figB;
          } else {
            targetA = figB;
            targetB = figA;
          }

          if (!isPlayable(targetA, targetB)) {
            console.log(`⚠️ ${targetA.name} and ${targetB.name} cannot make a round, retrying...`);
            continue;
          }

          console.log(`✅ Selected targets:`, {
            targetA: { name: targetA.name, years: `${targetA.birthYear}-${targetA.deathYear}` },
            targetB: { name: targetB.name, years: `${targetB.birthYear}-${targetB.deathYear}` },
            yearGap,
            difficulty
          });

          return [targetA, targetB];
        } else {
          console.log(`⚠️ Year gap (${yearGap}) doesn't meet difficulty ${difficulty}, retrying...`);
        }
      } catch (error) {
        console.error(`❌ Error fetching figures:`, error);
        continue;
      }
    }

    console.error(`❌ Failed to find suitable targets after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * Select two era pools based on difficulty level
   */
  private static selectErasByDifficulty(
    difficulty: 'easy' | 'medium' | 'hard'
  ): [string[], string[]] {
    const allEras = [
      this.ANCIENT_FIGURES,
      this.MEDIEVAL_FIGURES,
      this.RENAISSANCE_FIGURES,
      this.MODERN_FIGURES
    ];

    switch (difficulty) {
      case 'easy':
        // Adjacent eras (e.g., Medieval + Renaissance)
        const easyIndex = Math.floor(Math.random() * 3); // 0, 1, or 2
        return [allEras[easyIndex], allEras[easyIndex + 1]];

      case 'medium':
        // Skip one era (e.g., Ancient + Renaissance or Medieval + Modern)
        const mediumIndex = Math.floor(Math.random() * 2); // 0 or 1
        return [allEras[mediumIndex], allEras[mediumIndex + 2]];

      case 'hard':
        // Opposite ends (Ancient + Modern)
        return [this.ANCIENT_FIGURES, this.MODERN_FIGURES];

      default:
        return [this.ANCIENT_FIGURES, this.MODERN_FIGURES];
    }
  }

  /**
   * Validate that the year gap meets difficulty requirements
   */
  private static validateDifficulty(yearGap: number, difficulty: 'easy' | 'medium' | 'hard'): boolean {
    switch (difficulty) {
      case 'easy':
        return yearGap >= 200 && yearGap <= 700;
      case 'medium':
        return yearGap >= 600 && yearGap <= 1400;
      case 'hard':
        return yearGap >= 1200;
      default:
        return true;
    }
  }

  /**
   * Get a random element from an array
   */
  private static getRandomFromArray<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Quick target selection with fallback to Alexander and Caesar
   * Use this for reliable game start with known-good figures
   */
  static async selectDefaultTargets(isPlayable: PlayabilityCheck = () => true): Promise<[HistoricalFigure, HistoricalFigure] | null> {
    console.log('🎯 Loading default targets (Alexander + Caesar)...');
    try {
      const [alexander, caesar] = await Promise.all([
        WikipediaService.getPersonDetails('Alexander the Great'),
        WikipediaService.getPersonDetails('Julius Caesar')
      ]);

      if (alexander && caesar && isPlayable(alexander, caesar)) {
        console.log('✅ Default targets loaded successfully');
        return [alexander, caesar];
      }
    } catch (error) {
      console.error('❌ Error loading default targets:', error);
    }
    return null;
  }
}
