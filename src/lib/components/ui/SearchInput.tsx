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
  /** Blocks submits while the previous name is still being looked up. */
  isSubmitting?: boolean;
  error?: string | null;
  className?: string;
}

export function SearchInput({
  onSearch,
  onSelect,
  onSubmit,
  placeholder = "Name a person",
  suggestions = [],
  isLoading = false,
  isSubmitting = false,
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
      if (isSubmitting) return;
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
    if (isSubmitting) return;
    console.log(`🎯 Selecting suggestion: "${title}"`);
    setValue('');
    onSelect(title);
    setIsOpen(false);
    setSelectedIndex(-1);
    setSubmitAttempted(true);
  };

  const handleSubmit = () => {
    if (!value.trim() || isSubmitting) return;

    console.log(`📥 Submitting search: "${value}"`);
    setSubmitAttempted(true);

    // Submit the value directly - let the backend handle validation
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
            bg-[var(--card-stock)] text-[var(--card-ink)] rounded-xl
            shadow-[0_-8px_30px_rgba(0,0,0,0.35)]
            max-h-[min(300px,45dvh)] overflow-y-auto
          "
        >
          {error ? (
            <div className="px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          ) : (
            <>
              {!suggestions.some(s => s.title.toLowerCase() === value.toLowerCase()) && value.trim() && (
                <button
                  onClick={() => handleSubmit()}
                  className="
                    w-full px-4 py-2 text-left
                    bg-[rgba(232,185,49,0.18)] hover:bg-[rgba(232,185,49,0.32)]
                    transition-colors duration-[var(--transition-fast)]
                    border-b border-[rgba(24,36,42,0.1)]
                  "
                >
                  <span className="font-semibold text-[var(--card-ink)]">
                    Play &ldquo;{value.trim()}&rdquo;
                  </span>
                </button>
              )}

              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.title}
                  onClick={() => handleSuggestionClick(suggestion.title)}
                  className={`
                    w-full px-4 py-2 text-left
                    ${index === selectedIndex ? 'bg-[#efece3]' : ''}
                    hover:bg-[#efece3]
                    transition-colors duration-[var(--transition-fast)]
                    border-b border-[rgba(24,36,42,0.1)] last:border-0
                  `}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="font-semibold text-[var(--card-ink)]">
                      {suggestion.title}
                      {suggestion.isExisting && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[rgba(13,58,66,0.1)] text-[var(--card-muted)]">
                          On the table
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-[var(--card-muted)] sm:text-right">
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
            aria-label="Person to place"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={`
              h-12 w-full px-4 rounded-xl text-base
              bg-[var(--card-stock)]
              text-[var(--card-ink)] placeholder-[var(--card-muted)]
              focus:outline-none focus:ring-4 focus:ring-[rgba(232,185,49,0.55)]
              transition-all duration-[var(--transition-fast)]
              ${className}
            `}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[var(--table)] border-t-transparent" />
            </div>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading || isSubmitting}
          className={`
            type-display h-12 min-w-[5.5rem] px-5 rounded-xl
            text-xl font-black uppercase tracking-[0.06em]
            transition-all duration-200
            ${value.trim() && !isLoading && !isSubmitting
              ? 'bg-[var(--foil)] text-[var(--foil-ink)] shadow-[0_3px_0_var(--foil-deep)] hover:-translate-y-px'
              : 'bg-[var(--foil)] text-[var(--foil-ink)] opacity-40 cursor-not-allowed'}
          `}
        >
          {isSubmitting ? 'Drawing…' : 'Play'}
        </button>
      </div>
    </div>
  );
} 