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
        className="h-36 w-36 text-zinc-400 dark:text-zinc-600"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="emptyQuestAura" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Backdrop ring */}
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="url(#emptyQuestAura)"
          stroke="currentColor"
          strokeOpacity="0.2"
        />
        <circle
          cx="100"
          cy="100"
          r="96"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeDasharray="4 8"
        />

        {/* Pegs behind the scroll */}
        <circle
          cx="58"
          cy="72"
          r="6"
          fill="currentColor"
          fillOpacity="0.5"
        />
        <circle
          cx="142"
          cy="72"
          r="6"
          fill="currentColor"
          fillOpacity="0.5"
        />

        {/* Scroll body */}
        <rect
          x="42"
          y="72"
          width="116"
          height="66"
          rx="10"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="3"
        />

        {/* Scroll lines */}
        <path
          d="M58 96h70M58 110h48"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.45"
        />

        {/* Magnifying glass */}
        <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
          <circle cx="128" cy="102" r="16" fill="currentColor" fillOpacity="0.14" />
          <path d="M140 114l14 14" />
        </g>

        {/* Sparkles */}
        <path
          d="M48 146l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"
          fill="currentColor"
          fillOpacity="0.6"
        />
        <circle cx="158" cy="64" r="3" fill="currentColor" fillOpacity="0.5" />
        <path
          d="M38 58l1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9-3.9-1.6 3.9-1.6z"
          fill="currentColor"
          fillOpacity="0.35"
        />
      </svg>

      <h3 className="mt-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        No quests found
      </h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        {hasActiveFilters
          ? 'Try adjusting your search or filter criteria to find more quests.'
          : 'There are no quests available at the moment. Check back later!'}
      </p>
      {hasActiveFilters && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-primary dark:hover:bg-primary"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}