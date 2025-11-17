import { HistoricalFigure } from '../types/HistoricalFigure';

interface WikipediaSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  description?: string;
}

interface WikipediaExtract {
  title: string;
  extract: string;
  birthDate?: string;
  deathDate?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

interface WikipediaImageInfo {
  source: string;
  width: number;
  height: number;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
}

export class WikipediaService {
  private static BASE_URL = 'https://en.wikipedia.org/w/api.php';
  private static COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  private static THUMBNAIL_SIZE = 440;

  // Search for people using Wikipedia categories
  static async searchPerson(query: string): Promise<WikipediaSearchResult[]> {
    console.log(`[WikipediaService] 🔍 Searching for: "${query}"`);
    
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${query} -disambiguation`,
      gsrlimit: '10',
      prop: 'categories|extracts|pageimages',
      piprop: 'thumbnail|original',
      pithumbsize: '400',
      pilimit: 'max',
      cllimit: 'max',
      exintro: '1',
      format: 'json',
      origin: '*'
    });

    try {
      const response = await fetch(`${this.BASE_URL}?${params}`);
      const data = await response.json();
      
      console.log(`[WikipediaService] 📊 Raw API response for "${query}":`, data);

      if (!data.query?.pages) {
        console.log(`[WikipediaService] ❌ No results found for: "${query}"`);
        return [];
      }

      const results = Object.values(data.query.pages)
        .filter((page: any) => {
          const categories = page.categories || [];
          const isPersonPage = categories.some((cat: any) => {
            const catTitle = cat.title.toLowerCase();
            return catTitle.includes('births') || 
                   catTitle.includes('deaths') || 
                   catTitle.includes('century bc births') ||
                   catTitle.includes('century bc deaths');
          });
          
          if (isPersonPage) {
            console.log(`[WikipediaService] ✅ Found person page:`, {
              title: page.title,
              thumbnail: page.thumbnail?.source,
              original: page.original?.source,
              categories: categories.map((c: any) => c.title)
            });
          }
          
          return isPersonPage;
        })
        .map((page: any) => ({
          pageid: page.pageid,
          title: page.title,
          snippet: page.extract
            .replace(/<\/?[^>]+(>|$)/g, '')
            .split('.')[0] + '.',
          thumbnail: page.thumbnail?.source,
          original: page.original?.source
        }));

      console.log(`[WikipediaService] 📝 Found ${results.length} matching people for "${query}"`);
      return results;
    } catch (error) {
      console.error('[WikipediaService] ❌ Error searching Wikipedia:', error);
      return [];
    }
  }

  // Get the best available image for a person
  private static async getBestPersonImage(title: string): Promise<string | null> {
    console.log(`[WikipediaService] 🖼️ Fetching image for "${title}"`);
    try {
      // First, try to get the main page image
      const params = new URLSearchParams({
        action: 'query',
        titles: title,
        prop: 'pageimages|images',
        piprop: 'original|thumbnail',
        pithumbsize: this.THUMBNAIL_SIZE.toString(),
        iiprop: 'url|size|mime',
        format: 'json',
        origin: '*'
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      const data = await response.json();
      
      console.log(`[WikipediaService] 📄 Page images API response for "${title}":`, data);

      const page = Object.values(data.query.pages)[0] as any;

      // Log all available images
      if (page.images) {
        console.log(`[WikipediaService] 📸 Available images for "${title}":`, 
          page.images.map((img: any) => ({
            title: img.title,
            size: img.size,
            mime: img.mime
          }))
        );
      }

      // Try to get the main image first
      if (page?.original?.source || page?.thumbnail?.source) {
        const imageUrl = page.original?.source || page.thumbnail?.source;
        console.log(`[WikipediaService] ✨ Found main image for "${title}":`, imageUrl);
        return imageUrl;
      }

      // If no main image, try to find a suitable portrait
      if (page.images) {
        const portraitImage = page.images.find((img: any) => {
          const title = img.title.toLowerCase();
          return (
            title.includes('portrait') ||
            title.includes('bust') ||
            title.includes('statue') ||
            (title.includes(title.toLowerCase()) && !title.includes('signature'))
          );
        });

        if (portraitImage) {
          console.log(`[WikipediaService] 🎭 Found portrait image for "${title}":`, portraitImage.url);
          return portraitImage.url;
        }
      }

      console.log(`[WikipediaService] ⚠️ No suitable image found for "${title}"`);
      return null;
    } catch (error) {
      console.error(`[WikipediaService] ❌ Error fetching image for "${title}":`, error);
      return null;
    }
  }

  // Get person details with improved image handling
  static async getPersonDetails(title: string): Promise<HistoricalFigure | null> {
    console.log(`[WikipediaService] 👤 Fetching details for: "${title}"`);
    
    try {
      // Get basic information first
      const params = new URLSearchParams({
        action: 'query',
        prop: 'extracts|categories|pageimages',
        exintro: '1',
        piprop: 'original|thumbnail',
        pithumbsize: this.THUMBNAIL_SIZE.toString(),
        cllimit: 'max',
        format: 'json',
        titles: title,
        redirects: '1',
        origin: '*'
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      const data = await response.json();
      
      console.log(`[WikipediaService] 📋 Person details API response:`, data);

      const page = Object.values(data.query.pages)[0] as any;

      if (!page) {
        console.warn(`[WikipediaService] ❌ No page found for: "${title}"`);
        return null;
      }

      // Process birth and death years with improved detection
      let birthYear: number | null = null;
      let deathYear: number | null = null;
      let birthCentury: number | null = null;
      let deathCentury: number | null = null;
      let birthDecade: number | null = null;
      let deathDecade: number | null = null;
      const categories = page.categories || [];

      console.log(`[WikipediaService] 📅 Processing categories for "${title}":`, 
        categories.map((c: any) => c.title)
      );

      // First pass: Look for exact years
      for (const category of categories) {
        const catTitle = category.title.toLowerCase();
        
        // Check for birth year
        if (catTitle.includes('births')) {
          // Exact year (e.g., "453 births" or "453 BC births")
          const exactYearMatch = catTitle.match(/(\d+)\s*(?:bc\s+)?births/i);
          if (exactYearMatch) {
            birthYear = catTitle.includes('bc') ? -parseInt(exactYearMatch[1]) : parseInt(exactYearMatch[1]);
            console.log(`[WikipediaService] 📅 Found exact birth year: ${birthYear}`);
          }
          
          // Century (e.g., "5th century BC births" or "15th-century births")
          const centuryMatch = catTitle.match(/(\d+)(?:st|nd|rd|th)[- ]century(?:\s+bc)?\s+births/i);
          if (centuryMatch) {
            birthCentury = parseInt(centuryMatch[1]);
            console.log(`[WikipediaService] 📅 Found birth century: ${birthCentury}`);
          }

          // Decade (e.g., "400s births")
          const decadeMatch = catTitle.match(/(\d+)0s(?:\s+bc)?\s+births/i);
          if (decadeMatch) {
            birthDecade = parseInt(decadeMatch[1] + '0');
            console.log(`[WikipediaService] 📅 Found birth decade: ${birthDecade}`);
          }
        }
        
        // Check for death year
        if (catTitle.includes('deaths')) {
          // Exact year
          const exactYearMatch = catTitle.match(/(\d+)\s*(?:bc\s+)?deaths/i);
          if (exactYearMatch) {
            deathYear = catTitle.includes('bc') ? -parseInt(exactYearMatch[1]) : parseInt(exactYearMatch[1]);
            console.log(`[WikipediaService] 📅 Found exact death year: ${deathYear}`);
          }
          
          // Century
          const centuryMatch = catTitle.match(/(\d+)(?:st|nd|rd|th)[- ]century(?:\s+bc)?\s+deaths/i);
          if (centuryMatch) {
            deathCentury = parseInt(centuryMatch[1]);
            console.log(`[WikipediaService] 📅 Found death century: ${deathCentury}`);
          }

          // Decade
          const decadeMatch = catTitle.match(/(\d+)0s(?:\s+bc)?\s+deaths/i);
          if (decadeMatch) {
            deathDecade = parseInt(decadeMatch[1] + '0');
            console.log(`[WikipediaService] 📅 Found death decade: ${deathDecade}`);
          }
        }
      }

      // Second pass: Try to extract years from the article extract
      if (!birthYear || !deathYear) {
        const extract = page.extract || '';
        
        // Look for patterns like "(c. 406 – 453)" or "(born c. 406; died 453)"
        const lifespanMatch = extract.match(/\((?:c\. )?(\d+)(?: BC)?(?:\s*[-–]\s*(?:c\. )?(\d+)(?: BC)?)/i);
        if (lifespanMatch) {
          if (!birthYear && lifespanMatch[1]) {
            birthYear = parseInt(lifespanMatch[1]);
            if (extract.toLowerCase().includes('bc')) birthYear = -birthYear;
            console.log(`[WikipediaService] 📅 Found birth year from extract: ${birthYear}`);
          }
          if (!deathYear && lifespanMatch[2]) {
            deathYear = parseInt(lifespanMatch[2]);
            if (extract.toLowerCase().includes('bc')) deathYear = -deathYear;
            console.log(`[WikipediaService] 📅 Found death year from extract: ${deathYear}`);
          }
        }
      }

      // Third pass: Use available information to approximate missing years
      
      // Handle decade information first
      if (!birthYear && birthDecade !== null) {
        birthYear = birthDecade + 5; // Mid-decade approximation
        console.log(`[WikipediaService] 📅 Approximated birth year from decade: ${birthYear}`);
      }
      if (!deathYear && deathDecade !== null) {
        deathYear = deathDecade + 5;
        console.log(`[WikipediaService] 📅 Approximated death year from decade: ${deathYear}`);
      }

      // Then handle century information
      if (!birthYear && birthCentury !== null) {
        birthYear = (birthCentury - 1) * 100 + 50; // Mid-century approximation
        console.log(`[WikipediaService] 📅 Approximated birth year from century: ${birthYear}`);
      }
      if (!deathYear && deathCentury !== null) {
        deathYear = (deathCentury - 1) * 100 + 50;
        console.log(`[WikipediaService] 📅 Approximated death year from century: ${deathYear}`);
      }

      // Finally, approximate missing years based on the other year if available
      if (!birthYear && deathYear !== null) {
        birthYear = deathYear - 30; // Assume ~30 years before death
        console.log(`[WikipediaService] 📅 Approximated birth year from death year: ${birthYear}`);
      } else if (!deathYear && birthYear !== null) {
        deathYear = birthYear + 60; // Assume ~60 year lifespan
        console.log(`[WikipediaService] 📅 Approximated death year from birth year: ${deathYear}`);
      }

      console.log(`[WikipediaService] ⏳ Final years for "${title}":`, { birthYear, deathYear });

      // Get the image URL using the new method
      const imageUrl = await this.getBestPersonImage(title);
      console.log(`[WikipediaService] 🖼️ Final image URL for "${title}":`, imageUrl);

      // Only return null if we couldn't determine ANY years
      if (birthYear === null && deathYear === null) {
        console.warn(`[WikipediaService] ⚠️ Could not determine any years for: "${title}"`);
        return null;
      }

      return {
        id: title.toLowerCase().replace(/\s+/g, '_'),
        name: title,
        birthYear: birthYear ?? -500, // Use nullish coalescing for fallback
        deathYear: deathYear ?? -400,
        shortDescription: this.extractShortDescription(page.extract || ''),
        imageUrl: imageUrl ?? '',
        contemporaries: []
      };
    } catch (error) {
      console.error(`[WikipediaService] ❌ Error fetching person details for "${title}":`, error);
      return null;
    }
  }

  // Extract a cleaner description focused on historical relevance
  private static extractShortDescription(extract: string): string {
    // Remove HTML tags and parenthetical content
    let cleanText = extract
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/\([^)]+\)/g, '')
      .split('.')
      .slice(0, 2)
      .join('.')
      .trim();

    // Focus on biographical information
    const bioMatch = cleanText.match(/(?:was|is|became|lived).*?(?:\.|\n|$)/);
    if (bioMatch) {
      cleanText = bioMatch[0];
    }

    return cleanText.length > 200 ? cleanText.slice(0, 197) + '...' : cleanText;
  }

  // Get contemporaries for a historical figure
  static async findContemporaries(figure: HistoricalFigure): Promise<string[]> {
    console.log(`[WikipediaService] Finding contemporaries for: ${figure.name}`);
    
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: `${figure.birthYear} ${figure.deathYear} births deaths -disambiguation`,
      srlimit: '20',
      format: 'json',
      origin: '*'
    });

    try {
      const response = await fetch(`${this.BASE_URL}?${params}`);
      const data = await response.json();
      
      const contemporaries = data.query.search
        .map((result: any) => result.title)
        .filter((title: string) => title !== figure.name);

      console.log(`[WikipediaService] Found ${contemporaries.length} potential contemporaries for: ${figure.name}`);
      return contemporaries;
    } catch (error) {
      console.error(`[WikipediaService] Error finding contemporaries for ${figure.name}:`, error);
      return [];
    }
  }
} 