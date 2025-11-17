'use client';

import { useState, useCallback } from 'react';
import { HistoricalFigure } from '../../types/HistoricalFigure';
import { SearchInput } from './SearchInput';
import { WikipediaService } from '../../services/WikipediaService';
import debounce from 'lodash/debounce';

interface SearchBarProps {
  figures: HistoricalFigure[];
  onSelect: (figure: HistoricalFigure) => void;
  onAddFigure: (name: string) => void;
}

interface SearchSuggestion {
  title: string;
  snippet: string;
  isExisting?: boolean;
}

export function SearchBar({ figures, onSelect, onAddFigure }: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(`🔍 Searching for: "${query}"`);
        
        // First, check existing figures
        const existingMatches = figures
          .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
          .map(f => ({
            title: f.name,
            snippet: `${Math.abs(f.birthYear)} ${f.birthYear < 0 ? 'BCE' : 'CE'} - ${Math.abs(f.deathYear)} ${f.deathYear < 0 ? 'BCE' : 'CE'}`,
            isExisting: true
          }));

        // Search Wikipedia
        const wikiResults = await WikipediaService.searchPerson(query);
        console.log(`📚 Found ${wikiResults.length} results from Wikipedia`);
        
        const wikiMatches = wikiResults
          .filter(result => !existingMatches.some(em => em.title === result.title))
          .map(result => ({
            title: result.title,
            snippet: result.snippet,
            isExisting: false
          }));

        // Combine results, prioritizing exact matches
        const exactMatches = [...existingMatches, ...wikiMatches]
          .filter(s => s.title.toLowerCase() === query.toLowerCase());
        const partialMatches = [...existingMatches, ...wikiMatches]
          .filter(s => s.title.toLowerCase() !== query.toLowerCase());

        const allMatches = [...exactMatches, ...partialMatches].slice(0, 5);
        console.log(`✨ Showing ${allMatches.length} suggestions`);
        
        setSuggestions(allMatches);
      } catch (err) {
        console.error('❌ Search error:', err);
        setError('Failed to fetch suggestions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [figures]
  );

  const handleSearch = (query: string) => {
    debouncedSearch(query);
  };

  const handleSelect = async (title: string) => {
    console.log(`👆 Selected: "${title}"`);
    const existingFigure = figures.find(f => f.name === title);
    
    if (existingFigure) {
      console.log(`📍 Using existing figure: ${title}`);
      onSelect(existingFigure);
    } else {
      console.log(`➕ Adding new figure: ${title}`);
      onAddFigure(title);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[40] w-full max-w-2xl px-4">
      <div className="timeline-card p-3 shadow-glow backdrop-blur-lg">
        <SearchInput
          onSearch={handleSearch}
          onSelect={handleSelect}
          onSubmit={onAddFigure}
          suggestions={suggestions.map(s => ({
            title: s.title,
            description: s.snippet,
            isExisting: s.isExisting
          }))}
          isLoading={isLoading}
          error={error}
          className="search-input"
        />
      </div>
    </div>
  );
} 