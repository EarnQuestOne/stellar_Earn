import { useState, useEffect, useCallback, useRef } from 'react';
import {
  searchGlobal,
  getRecentSearches,
  saveRecentSearch,
  type SearchResult,
  type SearchFilters,
} from '@/lib/api/search';
import { debounce } from '@/lib/utils/debounce';

interface UseSearchReturn {
  results: SearchResult[];
  suggestions: string[];
  recentSearches: string[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  search: (query: string) => void;
  clearRecent: () => void;
}

export function useSearch(
  initialQuery = '',
  filters?: SearchFilters,
  debounceDelay = 300,
): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setSuggestions([]);
        setTotal(0);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchGlobal(searchQuery, filters);
        setResults(response.results);
        setSuggestions(response.suggestions);
        setTotal(response.total);
        saveRecentSearch(searchQuery);
        const recent = await getRecentSearches();
        setRecentSearches(recent);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
          setResults([]);
          setSuggestions([]);
          setTotal(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [filters],
  );

  const debouncedSearch = useRef(
    debounce((searchQuery: string) => {
      performSearch(searchQuery);
    }, debounceDelay),
  ).current;

  const search = useCallback(
    (searchQuery: string) => {
      debouncedSearch(searchQuery);
    },
    [debouncedSearch],
  );

  const clearRecent = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('recentSearches');
    }
    setRecentSearches([]);
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      const recent = await getRecentSearches();
      setRecentSearches(recent);
      if (initialQuery) {
        performSearch(initialQuery);
      }
    };
    loadInitial();
  }, [initialQuery, performSearch]);

  return {
    results,
    suggestions,
    recentSearches,
    isLoading,
    error,
    total,
    search,
    clearRecent,
  };
}
