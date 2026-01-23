'use client';

interface EmptyQuestStateProps {
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function EmptyQuestState({
  hasActiveFilters = false,
  onClearFilters,
}: EmptyQuestStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        No quests found
      </h3>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {hasActiveFilters
          ? 'Try adjusting your search or filter criteria to find more quests.'
          : "There are no quests available at the moment. Check back later!"}
      </p>
      {hasActiveFilters && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 rounded-lg bg-[#089ec3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0ab8d4] focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:bg-[#089ec3] dark:hover:bg-[#0ab8d4]"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
