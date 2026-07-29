import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useSubmissions } from './useSubmissions';

const { mockFetchSubmissions } = vi.hoisted(() => ({
  mockFetchSubmissions: vi.fn(),
}));

vi.mock('@/lib/api/submissions', () => ({
  fetchSubmissions: (...args: any[]) => mockFetchSubmissions(...args),
}));

const mockSubmissionsResponse = {
  data: [
    { id: 'sub-1', questId: 'q-1', status: 'pending', createdAt: '2026-01-01' },
    {
      id: 'sub-2',
      questId: 'q-2',
      status: 'approved',
      createdAt: '2026-01-02',
    },
  ],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasMore: false },
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
}

describe('useSubmissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns submissions with pagination metadata', async () => {
    mockFetchSubmissions.mockResolvedValue(mockSubmissionsResponse);

    const { result } = renderHook(() => useSubmissions(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.submissions).toEqual(mockSubmissionsResponse.data);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.error).toBeNull();
    expect(mockFetchSubmissions).toHaveBeenCalledTimes(1);
  });

  it('applies optimistic updates to the cached submission list without a refetch', async () => {
    mockFetchSubmissions.mockResolvedValue(mockSubmissionsResponse);

    const { result } = renderHook(() => useSubmissions(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = mockFetchSubmissions.mock.calls.length;

    act(() => {
      result.current.optimisticallyUpdateSubmission('sub-1', {
        status: 'approved',
      });
    });

    await waitFor(() => {
      expect(result.current.submissions[0].status).toBe('approved');
    });

    // The optimistic update must not trigger a network request.
    expect(mockFetchSubmissions).toHaveBeenCalledTimes(callsBefore);
  });
});
