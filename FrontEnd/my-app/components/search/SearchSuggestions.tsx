'use client';

interface SearchSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  highlightedIndex: number;
}

export function SearchSuggestions({
  suggestions,
  onSelect,
  highlightedIndex,
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
      <span className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Suggestions
      </span>
      <div className="space-y-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            id={`search-item-${index}`}
            onClick={() => onSelect(suggestion)}
            className={`block w-full rounded px-2 py-1 text-left text-sm ${
              highlightedIndex === index
                ? 'bg-[#089ec3]/10 text-[#089ec3] dark:bg-[#089ec3]/20'
                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-zinc-400"
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
              {suggestion}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
