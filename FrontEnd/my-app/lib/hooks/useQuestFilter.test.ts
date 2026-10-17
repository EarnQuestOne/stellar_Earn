import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_FILTER_DEBOUNCE_MS,
  matchesFilterCriteria,
  useQuestFilter,
} from './useQuestFilter';
import { QuestDifficulty, QuestStatus, type Quest } from '@/lib/types/quest';

function makeQuest(overrides: Partial<Quest>): Quest {
  return {
    id: 'quest',
    contractQuestId: 'contract-quest',
    title: 'Quest',
    description: 'Description',
    category: 'Security',
    difficulty: QuestDifficulty.EASY,
    rewardAsset: 'XLM',
    rewardAmount: '100',
    xpReward: 50,
    verifierAddress: 'GTEST000000000000000000000000000000000000',
    deadline: '2026-01-01T00:00:00.000Z',
    status: QuestStatus.ACTIVE,
    totalClaims: 0,
    totalSubmissions: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
    maxParticipants: 5,
    currentParticipants: 1,
    requirements: [],
    tags: [],
    creator: { id: 'creator', name: 'Creator' },
    skills: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const quests: Quest[] = [
  makeQuest({
    id: '1',
    status: QuestStatus.ACTIVE,
    difficulty: QuestDifficulty.EASY,
    category: 'Security',
    rewardAmount: '50',
  }),
  makeQuest({
    id: '2',
    status: QuestStatus.COMPLETED,
    difficulty: QuestDifficulty.HARD,
    category: 'Frontend',
    rewardAmount: '500',
  }),
  makeQuest({
    id: '3',
    status: QuestStatus.ACTIVE,
    difficulty: QuestDifficulty.MEDIUM,
    category: 'Frontend',
    rewardAmount: '250',
  }),
];

function advanceDebounce() {
  act(() => {
    vi.advanceTimersByTime(DEFAULT_FILTER_DEBOUNCE_MS + 1);
  });
}

describe('matchesFilterCriteria', () => {
  it('returns true when no criteria are provided', () => {
    expect(matchesFilterCriteria(quests[0], {})).toBe(true);
  });

  it('matches by status, difficulty, and category', () => {
    expect(
      matchesFilterCriteria(quests[0], { status: QuestStatus.ACTIVE })
    ).toBe(true);
    expect(
      matchesFilterCriteria(quests[0], { difficulty: QuestDifficulty.HARD })
    ).toBe(false);
    expect(matchesFilterCriteria(quests[0], { category: 'Frontend' })).toBe(
      false
    );
  });

  it('matches by reward bounds using the string reward amount', () => {
    expect(matchesFilterCriteria(quests[1], { minReward: 400 })).toBe(true);
    expect(matchesFilterCriteria(quests[1], { maxReward: 400 })).toBe(false);
  });
});

describe('useQuestFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all quests before any criteria are applied', () => {
    const { result } = renderHook(() => useQuestFilter(quests));

    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.activeFilter).toBe('Trending');
  });

  it('applies a status filter only after the debounce window', () => {
    const { result } = renderHook(() => useQuestFilter(quests));

    act(() => {
      result.current.setFilter('status', QuestStatus.ACTIVE);
    });

    // Criteria updated immediately, but the filtered list has not changed yet.
    expect(result.current.criteria.status).toBe(QuestStatus.ACTIVE);
    expect(result.current.filtered).toHaveLength(3);

    advanceDebounce();

    expect(result.current.debouncedCriteria.status).toBe(QuestStatus.ACTIVE);
    expect(result.current.filtered.map((q) => q.id)).toEqual(['1', '3']);
  });

  it('coalesces rapid criteria changes into a single application', () => {
    const { result } = renderHook(() => useQuestFilter(quests));

    act(() => {
      result.current.setFilter('category', 'S');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setFilter('category', 'Se');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setFilter('category', 'Security');
    });

    expect(result.current.filtered).toHaveLength(3);

    advanceDebounce();

    expect(result.current.debouncedCriteria.category).toBe('Security');
    expect(result.current.filtered.map((q) => q.id)).toEqual(['1']);
  });

  it('filters by reward range', () => {
    const { result } = renderHook(() => useQuestFilter(quests));

    act(() => {
      result.current.setFilter('minReward', 100);
      result.current.setFilter('maxReward', 300);
    });
    advanceDebounce();

    expect(result.current.filtered.map((q) => q.id)).toEqual(['3']);
  });

  it('clears all criteria', () => {
    const { result } = renderHook(() => useQuestFilter(quests));

    act(() => {
      result.current.setFilter('status', QuestStatus.COMPLETED);
    });
    advanceDebounce();
    expect(result.current.filtered.map((q) => q.id)).toEqual(['2']);

    act(() => {
      result.current.clearFilters();
    });
    advanceDebounce();

    expect(result.current.criteria).toEqual({});
    expect(result.current.filtered).toHaveLength(3);
  });

  it('respects a custom debounce delay', () => {
    const { result } = renderHook(() =>
      useQuestFilter(quests, { debounceMs: 500 })
    );

    act(() => {
      result.current.setFilter('status', QuestStatus.ACTIVE);
    });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.filtered).toHaveLength(3);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.filtered.map((q) => q.id)).toEqual(['1', '3']);
  });
});
