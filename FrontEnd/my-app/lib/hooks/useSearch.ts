import { useState, useEffect, useCallback, useRef } from 'react';
import {
  searchGlobal,
  getRecentSearches,
  saveRecentSearch,
  type SearchResult,
  type SearchFilters,
} from '@/lib/api/search';
import { createCancelToken, type CancelToken } from '@/lib/api/client';
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
  debounceDelay = 300
): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const cancelTokenRef = useRef<CancelToken | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        cancelTokenRef.current?.cancel();
        setResults([]);
        setSuggestions([]);
        setTotal(0);
        return;
      }

      // Cancel any still-in-flight search before starting a new one, so a
      // slow earlier response can't overwrite results from a later query.
      cancelTokenRef.current?.cancel();
      const cancelToken = createCancelToken();
      cancelTokenRef.current = cancelToken;

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchGlobal(searchQuery, filters, cancelToken);
        setResults(response.results);
        setSuggestions(response.suggestions);
        setTotal(response.total);
        saveRecentSearch(searchQuery);
        const recent = await getRecentSearches();
        setRecentSearches(recent);
      } catch (err) {
        // A cancelled request (superseded by a newer search, or the
        // component unmounted) isn't a real error.
        if (cancelToken.signal.aborted) return;

        if (err instanceof Error) {
          setError(err);
          setResults([]);
          setSuggestions([]);
          setTotal(0);
        }
      } finally {
        if (!cancelToken.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [filters]
  );

  const debouncedSearch = useRef(
    debounce((searchQuery: string) => {
      performSearch(searchQuery);
    }, debounceDelay)
  ).current;

  const search = useCallback(
    (searchQuery: string) => {
      debouncedSearch(searchQuery);
    },
    [debouncedSearch]
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

  // Cancel any in-flight search when the component unmounts, so a slow
  // response can't resolve into state after there's nothing left to show it.
  useEffect(() => {
    return () => {
      cancelTokenRef.current?.cancel();
    };
  }, []);

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
