'use client';

import { useState, useRef, useEffect } from 'react';

interface Suggestion {
  title: string;
  description: string;
  isExisting?: boolean;
}

interface SearchInputProps {
  onSearch: (query: string) => void;
  onSelect: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  suggestions?: Suggestion[];
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function SearchInput({
  onSearch,
  onSelect,
  onSubmit,
  placeholder = "Search historical figures...",
  suggestions = [],
  isLoading = false,
  error = null,
  className = ""
}: SearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setSelectedIndex(-1);
    setSubmitAttempted(false);
    onSearch(newValue);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && isOpen && suggestions.length > 0) {
        handleSuggestionClick(suggestions[selectedIndex].title);
      } else if (value.trim()) {
        handleSubmit();
      }
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSuggestionClick = (title: string) => {
    console.log(`🎯 Selecting suggestion: "${title}"`);
    setValue(title);
    onSelect(title);
    setIsOpen(false);
    setSelectedIndex(-1);
    setSubmitAttempted(true);
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    
    console.log(`📥 Submitting search: "${value}"`);
    setSubmitAttempted(true);
    
    // If we have suggestions and none match exactly, show them
    if (suggestions.length > 0 && !suggestions.some(s => s.title.toLowerCase() === value.toLowerCase())) {
      setIsOpen(true);
      return;
    }
    
    // Otherwise, submit the value
    onSubmit(value);
    setIsOpen(false);
    setSelectedIndex(-1);
    setValue('');
  };

  return (
    <div className="relative">
      {isOpen && (suggestions.length > 0 || error) && (
        <div
          ref={suggestionsRef}
          className="
            absolute z-[80] w-full
            bottom-full mb-2
            bg-background rounded-lg
            border border-[var(--card-border)]
            shadow-[var(--card-shadow)]
            max-h-[300px] overflow-y-auto
          "
        >
          {error ? (
            <div className="px-4 py-3 text-red-500 text-sm">
              {error}
            </div>
          ) : (
            <>
              {!suggestions.some(s => s.title.toLowerCase() === value.toLowerCase()) && value.trim() && (
                <button
                  onClick={() => handleSubmit()}
                  className="
                    w-full px-4 py-2 text-left
                    bg-primary/10 hover:bg-primary/20
                    transition-colors duration-[var(--transition-fast)]
                    border-b border-[var(--card-border)]
                  "
                >
                  <div className="flex items-center">
                    <span className="text-primary">＋</span>
                    <span className="ml-2 font-medium text-foreground">
                      Search for "{value}" in Wikipedia
                    </span>
                  </div>
                </button>
              )}

              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.title}
                  onClick={() => handleSuggestionClick(suggestion.title)}
                  className={`
                    w-full px-4 py-2 text-left
                    ${index === selectedIndex ? 'bg-background-hover' : ''}
                    hover:bg-background-hover
                    transition-colors duration-[var(--transition-fast)]
                    border-b border-[var(--card-border)] last:border-0
                    ${suggestion.title.toLowerCase() === value.toLowerCase() ? 'bg-primary/5' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {suggestion.title}
                      {suggestion.isExisting && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          In Timeline
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-foreground-muted">
                      {suggestion.description}
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div className="relative flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`
              w-full px-4 py-2 rounded-lg
              bg-background-alt
              border border-[var(--card-border)]
              text-foreground placeholder-foreground-subtle
              focus:outline-none focus:ring-2 focus:ring-[var(--interactive)]
              transition-all duration-[var(--transition-fast)]
              ${className}
            `}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className={`
            px-4 py-2 rounded-lg
            font-medium
            transition-all duration-200
            ${value.trim() && !isLoading
              ? 'bg-primary text-white hover:bg-primary-bright'
              : 'bg-primary/20 text-foreground-muted cursor-not-allowed'}
          `}
        >
          Search
        </button>
      </div>
    </div>
  );
} 