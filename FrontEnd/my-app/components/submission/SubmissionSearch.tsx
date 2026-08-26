'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EmptyState } from '@/components/common/EmptyState';

interface SubmissionSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  resultCount?: number | null;
  isLoading?: boolean;
  noResultsTitle?: string;
  noResultsDescription?: string;
}

export function SubmissionSearch({
  onSearch,
  placeholder = 'Search by quest or submission ID...',
  debounceMs = 300,
  resultCount = null,
  isLoading = false,
  noResultsTitle = 'No submissions found',
  noResultsDescription = 'Try adjusting your search or filter criteria.',
}: SubmissionSearchProps) {
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Fix #2214: debounce the onSearch callback so it only fires after the user
   * has stopped typing for `debounceMs` ms, preventing excessive API calls.
   */
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(query), debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, onSearch]);

  const showNoResults =
    query.trim().length > 0 && resultCount === 0 && !isLoading;

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(query);
        }}
      >
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
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
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search submissions"
            className="block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400"
          />
        </div>
      </form>
      {showNoResults && (
        <EmptyState
          title={noResultsTitle}
          description={noResultsDescription}
          icon={
            <svg
              className="h-12 w-12 text-zinc-400 dark:text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />
      )}
    </div>
  );
}
