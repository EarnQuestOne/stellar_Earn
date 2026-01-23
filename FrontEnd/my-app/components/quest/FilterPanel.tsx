'use client';

import { QuestStatus, QuestDifficulty } from '@/lib/types/quest';

interface FilterPanelProps {
  selectedStatus?: QuestStatus;
  selectedDifficulty?: QuestDifficulty;
  selectedCategory?: string;
  onStatusChange: (status: QuestStatus | undefined) => void;
  onDifficultyChange: (difficulty: QuestDifficulty | undefined) => void;
  onCategoryChange: (category: string | undefined) => void;
  onClearFilters: () => void;
}

const statusOptions = [
  { value: QuestStatus.ACTIVE, label: 'Active' },
  { value: QuestStatus.COMPLETED, label: 'Completed' },
  { value: QuestStatus.EXPIRED, label: 'Expired' },
];

const difficultyOptions = [
  { value: QuestDifficulty.EASY, label: 'Easy' },
  { value: QuestDifficulty.MEDIUM, label: 'Medium' },
  { value: QuestDifficulty.HARD, label: 'Hard' },
];

const categoryOptions = [
  'Security',
  'Frontend',
  'Backend',
  'Docs',
  'Testing',
  'Community',
];

export function FilterPanel({
  selectedStatus,
  selectedDifficulty,
  selectedCategory,
  onStatusChange,
  onDifficultyChange,
  onCategoryChange,
  onClearFilters,
}: FilterPanelProps) {
  const hasActiveFilters = selectedStatus || selectedDifficulty || selectedCategory;

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <svg
            className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Category:
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange(undefined)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#089ec3] ${
              !selectedCategory
                ? 'border-[#089ec3] bg-[#089ec3] text-white'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          {categoryOptions.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => onCategoryChange(isSelected ? undefined : category)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#089ec3] ${
                  isSelected
                    ? 'border-[#089ec3] bg-[#089ec3] text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
      {/* Difficulty Filter */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Difficulty:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onDifficultyChange(undefined)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#089ec3] ${
              !selectedDifficulty
                ? 'border-[#089ec3] bg-[#089ec3] text-white'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          {difficultyOptions.map((option) => {
            const isSelected = selectedDifficulty === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onDifficultyChange(isSelected ? undefined : option.value)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#089ec3] ${
                  isSelected
                    ? 'border-[#089ec3] bg-[#089ec3] text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>



      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div>
          <button
            onClick={onClearFilters}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
