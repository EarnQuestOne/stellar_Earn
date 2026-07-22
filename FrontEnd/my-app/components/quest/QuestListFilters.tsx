'use client';

import { QuestStatus, QuestDifficulty } from '@/lib/types/quest';

const CATEGORIES = [
  'Security',
  'Frontend',
  'Backend',
  'Docs',
  'Testing',
  'Community',
];

interface QuestListFiltersProps {
  selectedStatus?: QuestStatus;
  selectedDifficulty?: QuestDifficulty;
  selectedCategory?: string;
  minReward?: number;
  maxReward?: number;
  onStatusChange: (status: QuestStatus | undefined) => void;
  onDifficultyChange: (difficulty: QuestDifficulty | undefined) => void;
  onCategoryChange: (category: string | undefined) => void;
  onRewardRangeChange: (
    min: number | undefined,
    max: number | undefined
  ) => void;
  onClearFilters: () => void;
}

export function QuestListFilters({
  selectedStatus,
  selectedDifficulty,
  selectedCategory,
  minReward,
  maxReward,
  onStatusChange,
  onDifficultyChange,
  onCategoryChange,
  onRewardRangeChange,
  onClearFilters,
}: QuestListFiltersProps) {
  const hasActiveFilters = !!(
    selectedStatus ||
    selectedDifficulty ||
    selectedCategory ||
    minReward !== undefined ||
    maxReward !== undefined
  );

  return (
    <div
      className="flex flex-wrap items-end gap-3"
      role="group"
      aria-label="Quest filters"
    >
      {/* Status */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-status"
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
        >
          Status
        </label>
        <select
          id="filter-status"
          value={selectedStatus ?? ''}
          onChange={(e) =>
            onStatusChange(
              e.target.value ? (e.target.value as QuestStatus) : undefined
            )
          }
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">All Statuses</option>
          {Object.values(QuestStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Difficulty */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-difficulty"
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
        >
          Difficulty
        </label>
        <select
          id="filter-difficulty"
          value={selectedDifficulty ?? ''}
          onChange={(e) =>
            onDifficultyChange(
              e.target.value ? (e.target.value as QuestDifficulty) : undefined
            )
          }
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">All Difficulties</option>
          {Object.values(QuestDifficulty).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-category"
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
        >
          Category
        </label>
        <select
          id="filter-category"
          value={selectedCategory ?? ''}
          onChange={(e) => onCategoryChange(e.target.value || undefined)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Reward range */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Reward Range (XLM)
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minReward ?? ''}
            min={0}
            aria-label="Minimum reward in XLM"
            onChange={(e) =>
              onRewardRangeChange(
                e.target.value ? Number(e.target.value) : undefined,
                maxReward
              )
            }
            className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <span className="text-sm text-zinc-400" aria-hidden="true">
            &ndash;
          </span>
          <input
            type="number"
            placeholder="Max"
            value={maxReward ?? ''}
            min={0}
            aria-label="Maximum reward in XLM"
            onChange={(e) =>
              onRewardRangeChange(
                minReward,
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="self-end rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
