'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearch } from '@/lib/hooks/useSearch';
import { SearchResults } from './SearchResults';
import { SearchFilters } from './SearchFilters';
import { SearchSuggestions } from './SearchSuggestions';
import type { SearchFilters as SearchFiltersType } from '@/lib/api/search';

interface GlobalSearchProps {
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function GlobalSearch({
  placeholder = 'Search quests, users, submissions...',
  autoFocus = false,
  className = '',
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFiltersType>({ type: 'all' });
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, suggestions, recentSearches, isLoading, error, total, search, clearRecent } =
    useSearch(query, filters);

  useEffect(() => {
    search(query);
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = suggestions.length + results.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      if (highlightedIndex < suggestions.length) {
        const suggestion = suggestions[highlightedIndex];
        setQuery(suggestion);
        search(suggestion);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    search(suggestion);
    setIsOpen(false);
  };

  const handleRecentClick = (recent: string) => {
    setQuery(recent);
    search(recent);
  };

  const handleFilterChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
  };

  const handleClearInput = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-5 w-5 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-10 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#089ec3] focus:outline-none focus:ring-2 focus:ring-[#089ec3]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
          aria-label="Global search"
          aria-controls="search-results"
          aria-activedescendant={
            highlightedIndex >= 0 ? `search-item-${highlightedIndex}` : undefined
          }
        />

        {query && (
          <button
            onClick={handleClearInput}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="Clear search"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div
          id="search-results"
          className="absolute z-50 mt-2 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        >
          <SearchFilters filters={filters} onChange={handleFilterChange} />

          {!query && recentSearches.length > 0 && (
            <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecent}
                  className="text-xs text-[#089ec3] hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((recent, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentClick(recent)}
                    className="block w-full rounded px-2 py-1 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {recent}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && suggestions.length > 0 && (
            <SearchSuggestions
              suggestions={suggestions}
              onSelect={handleSuggestionClick}
              highlightedIndex={highlightedIndex}
            />
          )}

          {query && (
            <SearchResults
              results={results}
              isLoading={isLoading}
              error={error}
              total={total}
              highlightedIndex={highlightedIndex - suggestions.length}
              onResultClick={() => setIsOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
