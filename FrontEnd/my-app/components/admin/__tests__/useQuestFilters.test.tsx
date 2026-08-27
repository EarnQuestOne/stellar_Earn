import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useQuestFilters, DEFAULT_DEBOUNCE_MS } from '../useQuestFilters';
import type { Quest } from '@/lib/types/admin';

const mockQuests: Quest[] = [
  {
    id: '1',
    title: 'Alpha Quest',
    description: 'First quest description',
    shortDescription: 'Short desc',
    category: 'Development',
    difficulty: 'beginner',
    status: 'active',
    reward: 100,
    xpReward: 50,
    deadline: '2025-12-31T23:59:59Z',
    maxParticipants: 100,
    currentParticipants: 50,
    requirements: ['req1'],
    tags: ['tag1'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin',
  },
  {
    id: '2',
    title: 'Beta Quest',
    description: 'Second quest description',
    shortDescription: 'Short desc 2',
    category: 'Blockchain',
    difficulty: 'intermediate',
    status: 'draft',
    reward: 200,
    xpReward: 100,
    deadline: '2025-11-30T23:59:59Z',
    maxParticipants: 50,
    currentParticipants: 25,
    requirements: ['req2'],
    tags: ['tag2'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    createdBy: 'admin',
  },
  {
    id: '3',
    title: 'Gamma Quest',
    description: 'Third quest description',
    shortDescription: 'Short desc 3',
    category: 'Development',
    difficulty: 'advanced',
    status: 'active',
    reward: 150,
    xpReward: 75,
    deadline: '2025-10-15T23:59:59Z',
    maxParticipants: 200,
    currentParticipants: 100,
    requirements: ['req3'],
    tags: ['tag3'],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    createdBy: 'admin',
  },
];

/** Advances past the debounce window so pending filter changes are applied. */
function advanceDebounce() {
  act(() => {
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 1);
  });
}

describe('useQuestFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns default state', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    expect(result.current.searchQuery).toBe('');
    expect(result.current.debouncedSearchQuery).toBe('');
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.sortField).toBe('deadline');
    expect(result.current.sortOrder).toBe('asc');
  });

  it('returns all quests when no filters applied', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    expect(result.current.filteredAndSortedQuests).toHaveLength(3);
  });

  it('filters by search query (title match)', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.setSearchQuery('Alpha');
    });
    advanceDebounce();

    expect(result.current.filteredAndSortedQuests).toHaveLength(1);
    expect(result.current.filteredAndSortedQuests[0].id).toBe('1');
  });

  it('filters by search query (description match)', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.setSearchQuery('second quest');
    });
    advanceDebounce();

    expect(result.current.filteredAndSortedQuests).toHaveLength(1);
    expect(result.current.filteredAndSortedQuests[0].id).toBe('2');
  });

  it('filters by search query (category match)', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.setSearchQuery('blockchain');
    });
    advanceDebounce();

    expect(result.current.filteredAndSortedQuests).toHaveLength(1);
    expect(result.current.filteredAndSortedQuests[0].id).toBe('2');
  });

  it('filters by status', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.setStatusFilter('active');
    });

    const filtered = result.current.filteredAndSortedQuests;
    expect(filtered).toHaveLength(2);
    expect(filtered.every((q) => q.status === 'active')).toBe(true);
  });

  it('returns empty array when no quests match status filter', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.setStatusFilter('paused');
    });

    expect(result.current.filteredAndSortedQuests).toHaveLength(0);
  });

  it('handles sort field change', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.handleSort('title');
    });

    expect(result.current.sortField).toBe('title');
    expect(result.current.sortOrder).toBe('asc');

    const sorted = result.current.filteredAndSortedQuests;
    expect(sorted[0].title).toBe('Alpha Quest');
    expect(sorted[2].title).toBe('Gamma Quest');
  });

  it('toggles sort order when same field is clicked', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.handleSort('title');
    });

    expect(result.current.sortOrder).toBe('asc');

    act(() => {
      result.current.handleSort('title');
    });

    expect(result.current.sortOrder).toBe('desc');

    const sorted = result.current.filteredAndSortedQuests;
    expect(sorted[0].title).toBe('Gamma Quest');
    expect(sorted[2].title).toBe('Alpha Quest');
  });

  it('sorts by reward ascending', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.handleSort('reward');
    });

    const sorted = result.current.filteredAndSortedQuests;
    expect(sorted[0].reward).toBe(100);
    expect(sorted[2].reward).toBe(200);
  });

  it('sorts by participants ascending', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.handleSort('participants');
    });

    const sorted = result.current.filteredAndSortedQuests;
    expect(sorted[0].currentParticipants).toBe(25);
    expect(sorted[2].currentParticipants).toBe(100);
  });

  it('combines search and status filters', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.setSearchQuery('Development');
    });
    advanceDebounce();

    act(() => {
      result.current.setStatusFilter('draft');
    });

    expect(result.current.filteredAndSortedQuests).toHaveLength(0);

    act(() => {
      result.current.setStatusFilter('active');
    });

    const filtered = result.current.filteredAndSortedQuests;
    expect(filtered).toHaveLength(2);
    expect(filtered.every((q) => q.status === 'active')).toBe(true);
  });

  it('keeps the input value immediate while filtering waits for the debounce', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    act(() => {
      result.current.setSearchQuery('Alpha');
    });

    // The input value updates instantly, but the filter has not run yet.
    expect(result.current.searchQuery).toBe('Alpha');
    expect(result.current.debouncedSearchQuery).toBe('');
    expect(result.current.filteredAndSortedQuests).toHaveLength(3);

    advanceDebounce();

    expect(result.current.debouncedSearchQuery).toBe('Alpha');
    expect(result.current.filteredAndSortedQuests).toHaveLength(1);
  });

  it('coalesces rapid keystrokes into a single filter application', () => {
    const { result } = renderHook(() => useQuestFilters(mockQuests));

    // Several keystrokes inside the debounce window: only the last one applies.
    act(() => {
      result.current.setSearchQuery('A');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setSearchQuery('Al');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setSearchQuery('Alp');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setSearchQuery('Alpha');
    });

    // Not yet applied — the trailing debounce window is still open.
    expect(result.current.debouncedSearchQuery).toBe('');
    expect(result.current.filteredAndSortedQuests).toHaveLength(3);

    advanceDebounce();

    expect(result.current.debouncedSearchQuery).toBe('Alpha');
    expect(result.current.filteredAndSortedQuests).toHaveLength(1);
    expect(result.current.filteredAndSortedQuests[0].id).toBe('1');
  });

  it('respects a custom debounce delay', () => {
    const { result } = renderHook(() =>
      useQuestFilters(mockQuests, { debounceMs: 500 })
    );

    act(() => {
      result.current.setSearchQuery('Alpha');
    });
    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(result.current.debouncedSearchQuery).toBe('');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.debouncedSearchQuery).toBe('Alpha');
    expect(result.current.filteredAndSortedQuests).toHaveLength(1);
  });
});
