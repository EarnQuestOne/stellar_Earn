import { createElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuests } from './useQuests';

vi.mock('@/lib/api/quests', () => ({
  getQuests: vi.fn(),
}));

// Import after mock so vi.mocked picks up the mock.
const { getQuests } = await import('@/lib/api/quests');
const mockGetQuests = vi.mocked(getQuests);

const makeResponse = (overrides = {}) => ({
  quests: [
    { id: 'q-1', title: 'Quest 1', status: 'Active' },
    { id: 'q-2', title: 'Quest 2', status: 'Active' },
  ],
  page: 1,
  limit: 12,
  total: 2,
  totalPages: 1,
  ...overrides,
});

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
}

describe('useQuests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts loading and returns quests after a successful fetch', async () => {
    mockGetQuests.mockResolvedValue(makeResponse() as any);

    const { result } = renderHook(() => useQuests(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.quests).toHaveLength(2);
    expect(result.current.quests[0].id).toBe('q-1');
    expect(mockGetQuests).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent calls with the same key using the shared cache', async () => {
    mockGetQuests.mockResolvedValue(makeResponse() as any);

    // Share one QueryClient across both hooks to test deduplication.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    renderHook(() => useQuests(), { wrapper: Wrapper });
    renderHook(() => useQuests(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGetQuests).toHaveBeenCalledTimes(1));
  });

  it('exposes the error and returns an empty list on fetch failure', async () => {
    mockGetQuests.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useQuests(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.quests).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('derives pagination metadata from the API response', async () => {
    mockGetQuests.mockResolvedValue(
      makeResponse({ page: 2, totalPages: 5, total: 60 }) as any
    );

    const { result } = renderHook(() => useQuests(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pagination?.page).toBe(2);
    expect(result.current.pagination?.totalPages).toBe(5);
    expect(result.current.pagination?.hasMore).toBe(true);
  });

  it('uses a separate cache key for different filter values', async () => {
    mockGetQuests.mockResolvedValue(makeResponse() as any);

    // Share one client — two different filter objects should each trigger a fetch.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    renderHook(() => useQuests({ status: 'Active' }), { wrapper: Wrapper });
    renderHook(() => useQuests({ status: 'Paused' }), { wrapper: Wrapper });

    await waitFor(() => expect(mockGetQuests).toHaveBeenCalledTimes(2));
  });
});
