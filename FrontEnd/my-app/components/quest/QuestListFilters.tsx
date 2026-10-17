'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { QuestStatus, QuestDifficulty } from '@/lib/types/quest';
import { debounce } from '@/lib/utils/debounce';
import { DEFAULT_FILTER_DEBOUNCE_MS } from '@/lib/hooks/useQuestFilter';

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
  /**
   * Debounce window (ms) applied before a change is propagated to the parent.
   * The parent turns these callbacks into URL updates, and every URL update
   * triggers a quest fetch, so coalescing rapid changes avoids redundant
   * requests. Defaults to `DEFAULT_FILTER_DEBOUNCE_MS`.
   */
  debounceMs?: number;
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
  debounceMs = DEFAULT_FILTER_DEBOUNCE_MS,
}: QuestListFiltersProps) {
  const hasActiveFilters = !!(
    selectedStatus ||
    selectedDifficulty ||
    selectedCategory ||
    minReward !== undefined ||
    maxReward !== undefined
  );

  // Keep the latest callbacks and current selection in refs so the debounced
  // wrappers below can stay referentially stable without capturing stale
  // props. The refs are updated after every render.
  const latest = useRef({
    onStatusChange,
    onDifficultyChange,
    onCategoryChange,
    onRewardRangeChange,
    minReward,
    maxReward,
  });

  useEffect(() => {
    latest.current = {
      onStatusChange,
      onDifficultyChange,
      onCategoryChange,
      onRewardRangeChange,
      minReward,
      maxReward,
    };
  }, [
    onStatusChange,
    onDifficultyChange,
    onCategoryChange,
    onRewardRangeChange,
    minReward,
    maxReward,
  ]);

  const emit = useMemo(
    () => ({
      // Debounce each control independently so that, e.g., typing into the
      // reward inputs does not delay or cancel a status selection.
      status: debounce((status: QuestStatus | undefined) => {
        latest.current.onStatusChange(status);
      }, debounceMs),
      difficulty: debounce((difficulty: QuestDifficulty | undefined) => {
        latest.current.onDifficultyChange(difficulty);
      }, debounceMs),
      category: debounce((category: string | undefined) => {
        latest.current.onCategoryChange(category);
      }, debounceMs),
      rewardRange: debounce(
        (min: number | undefined, max: number | undefined) => {
          latest.current.onRewardRangeChange(min, max);
        },
        debounceMs
      ),
    }),
    [debounceMs]
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
            emit.status(
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
            emit.difficulty(
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
          onChange={(e) => emit.category(e.target.value || undefined)}
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
              emit.rewardRange(
                e.target.value ? Number(e.target.value) : undefined,
                latest.current.maxReward
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
              emit.rewardRange(
                latest.current.minReward,
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
