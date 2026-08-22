import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSearch } from './useSearch';

const { mockSearchGlobal, mockGetRecentSearches, mockSaveRecentSearch } =
  vi.hoisted(() => ({
    mockSearchGlobal: vi.fn(),
    mockGetRecentSearches: vi.fn().mockResolvedValue([]),
    mockSaveRecentSearch: vi.fn(),
  }));

vi.mock('@/lib/api/search', () => ({
  searchGlobal: (...args: any[]) => mockSearchGlobal(...args),
  getRecentSearches: (...args: any[]) => mockGetRecentSearches(...args),
  saveRecentSearch: (...args: any[]) => mockSaveRecentSearch(...args),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const emptyResults = { results: [], suggestions: [], total: 0 };

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecentSearches.mockResolvedValue([]);
  });

  it('passes a cancel token through to searchGlobal', async () => {
    mockSearchGlobal.mockResolvedValue(emptyResults);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.search('stellar');
      // debounce delay defaults to 300ms
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(mockSearchGlobal).toHaveBeenCalledTimes(1);
    });
    const [, , cancelToken] = mockSearchGlobal.mock.calls[0];
    expect(cancelToken).toBeDefined();
    expect(cancelToken.signal).toBeInstanceOf(AbortSignal);
  });

  it('cancels the in-flight search when the component unmounts', async () => {
    const pending = deferred<typeof emptyResults>();
    mockSearchGlobal.mockReturnValue(pending.promise);

    const { result, unmount } = renderHook(() => useSearch());

    act(() => {
      result.current.search('stellar');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(mockSearchGlobal).toHaveBeenCalledTimes(1);
    });
    const [, , cancelToken] = mockSearchGlobal.mock.calls[0];
    expect(cancelToken.signal.aborted).toBe(false);

    unmount();

    expect(cancelToken.signal.aborted).toBe(true);
  });

  it('aborts a previous search when a newer one starts', async () => {
    const first = deferred<typeof emptyResults>();
    mockSearchGlobal.mockReturnValueOnce(first.promise);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      result.current.search('stel');
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(mockSearchGlobal).toHaveBeenCalledTimes(1);
    });
    const firstToken = mockSearchGlobal.mock.calls[0][2];
    expect(firstToken.signal.aborted).toBe(false);

    mockSearchGlobal.mockResolvedValueOnce(emptyResults);

    await act(async () => {
      result.current.search('stellar');
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(mockSearchGlobal).toHaveBeenCalledTimes(2);
    });
    expect(firstToken.signal.aborted).toBe(true);
  });
});
