import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Quest, QuestStatus, QuestDifficulty } from '@/lib/types/quest';

export type FilterTab = 'Trending' | 'High Reward' | 'New' | 'Ending Soon';

/**
 * Default delay (ms) used to coalesce rapid filter changes before the filtered
 * list is recomputed. Kept in sync with `QuestListFilters` so the two sides of
 * the quest list agree on the debounce window.
 */
export const DEFAULT_FILTER_DEBOUNCE_MS = 300;

/** The mutable set of criteria a user can apply to a quest list. */
export interface QuestFilterCriteria {
  status?: QuestStatus;
  difficulty?: QuestDifficulty;
  category?: string;
  minReward?: number;
  maxReward?: number;
}

interface UseQuestFilterOptions {
  /** Debounce window in milliseconds. Defaults to `DEFAULT_FILTER_DEBOUNCE_MS`. */
  debounceMs?: number;
}

/** Parses a reward that may arrive as a string (from the API) or a number. */
function parseReward(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Returns true when a quest satisfies every criterion in `criteria`. */
export function matchesFilterCriteria(
  quest: Quest,
  criteria: QuestFilterCriteria
): boolean {
  if (criteria.status && quest.status !== criteria.status) {
    return false;
  }

  if (criteria.difficulty && quest.difficulty !== criteria.difficulty) {
    return false;
  }

  if (criteria.category && quest.category !== criteria.category) {
    return false;
  }

  const reward = parseReward(quest.rewardAmount);
  if (criteria.minReward !== undefined) {
    if (reward === null || reward < criteria.minReward) {
      return false;
    }
  }
  if (criteria.maxReward !== undefined) {
    if (reward === null || reward > criteria.maxReward) {
      return false;
    }
  }

  return true;
}

/**
 * Applies quest filters while coalescing rapid changes.
 *
 * The criteria a user is editing (`criteria`) update immediately, but the
 * criteria actually used to filter (`debouncedCriteria`) only update once the
 * user pauses for `debounceMs`. That way a burst of changes — typing a reward
 * range, or flipping several selects in quick succession — produces a single
 * recomputation (and, in callers, a single fetch) instead of one per keystroke.
 *
 * The legacy `activeFilter` tab state is preserved for callers that only need
 * the trending/high-reward navigation.
 */
export function useQuestFilter(
  quests: Quest[],
  options?: UseQuestFilterOptions
) {
  const debounceMs = options?.debounceMs ?? DEFAULT_FILTER_DEBOUNCE_MS;
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Trending');
  const [criteria, setCriteriaState] = useState<QuestFilterCriteria>({});
  const [debouncedCriteria, setDebouncedCriteria] =
    useState<QuestFilterCriteria>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coalesce rapid criteria changes into a single applied value.
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedCriteria(criteria);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [criteria, debounceMs]);

  const setFilter = useCallback(
    <K extends keyof QuestFilterCriteria>(
      key: K,
      value: QuestFilterCriteria[K]
    ) => {
      setCriteriaState((previous) => ({ ...previous, [key]: value }));
    },
    []
  );

  const setCriteria = useCallback((next: QuestFilterCriteria) => {
    setCriteriaState(next);
  }, []);

  const clearFilters = useCallback(() => {
    setCriteriaState({});
  }, []);

  const filtered = useMemo(
    () =>
      quests.filter((quest) => matchesFilterCriteria(quest, debouncedCriteria)),
    [quests, debouncedCriteria]
  );

  return {
    filtered,
    activeFilter,
    setActiveFilter,
    criteria,
    debouncedCriteria,
    setFilter,
    setCriteria,
    clearFilters,
  };
}
