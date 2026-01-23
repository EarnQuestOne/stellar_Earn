'use client';

import type { SearchResult } from '@/lib/api/search';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  highlightedIndex: number;
  onResultClick: () => void;
}

export function SearchResults({
  results,
  isLoading,
  error,
  total,
  highlightedIndex,
  onResultClick,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="border-t border-zinc-200 p-8 dark:border-zinc-700">
        <div className="flex items-center justify-center gap-2 text-zinc-500">
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">Searching...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-zinc-200 p-8 dark:border-zinc-700">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">Search Error</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="border-t border-zinc-200 p-8 dark:border-zinc-700">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-zinc-400"
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
          <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">No results found</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Try adjusting your search or filters
          </p>
        </div>
      </div>
    );
  }

  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quest':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case 'user':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
      case 'submission':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  let globalIndex = 0;

  return (
    <div className="max-h-96 overflow-y-auto border-t border-zinc-200 dark:border-zinc-700">
      <div className="p-3">
        <span className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {total} {total === 1 ? 'result' : 'results'}
        </span>

        {Object.entries(groupedResults).map(([type, typeResults]) => (
          <div key={type} className="mb-4 last:mb-0">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400">
              {type}s
            </h3>
            <div className="space-y-1">
              {typeResults.map((result) => {
                const currentIndex = globalIndex;
                globalIndex++;
                return (
                  <button
                    key={result.id}
                    id={`search-item-${currentIndex}`}
                    onClick={onResultClick}
                    className={`block w-full rounded px-2 py-2 text-left ${
                      highlightedIndex === currentIndex
                        ? 'bg-[#089ec3]/10 dark:bg-[#089ec3]/20'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 ${
                          highlightedIndex === currentIndex
                            ? 'text-[#089ec3]'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                          {result.title}
                        </p>
                        {result.description && (
                          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
