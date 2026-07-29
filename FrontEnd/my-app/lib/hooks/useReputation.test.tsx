import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReputation } from './useReputation';

// Closes #1935: confirms useReputation fetches from the real API endpoint
// (GET /api/reputation/:userId) rather than the historical stub.
const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useReputation', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('fetches reputation from /api/reputation/:userId', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ score: 42 }) });
    const { result } = renderHook(() => useReputation('user-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith('/api/reputation/user-1');
    expect(result.current.reputation).toEqual({ score: 42 });
  });

  it('surfaces an error when the API responds with a non-OK status', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useReputation('user-2'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('stays disabled with no reputation fetched when userId is omitted', () => {
    const { result } = renderHook(() => useReputation(undefined), { wrapper });
    expect(result.current.reputation).toBeNull();
  });
});
