import { createElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import { server } from '../../tests/mocks/server';
import { useReputation } from './useReputation';

const mockReputation = {
  userId: 'user-1',
  score: 850,
  tier: 'gold',
  badges: ['early-adopter'],
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
}

describe('useReputation', () => {
  it('is disabled and returns null when no userId is provided', () => {
    const { result } = renderHook(() => useReputation(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.reputation).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches and returns reputation data for a given userId', async () => {
    server.use(
      http.get('/api/reputation/:userId', () =>
        HttpResponse.json(mockReputation)
      )
    );

    const { result } = renderHook(() => useReputation('user-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reputation).toEqual(mockReputation);
    expect(result.current.error).toBeNull();
  });

  it('exposes an error when the reputation endpoint returns a non-ok response', async () => {
    server.use(
      http.get(
        '/api/reputation/:userId',
        () => new HttpResponse(null, { status: 500 })
      )
    );

    const { result } = renderHook(() => useReputation('user-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

    expect(result.current.reputation).toBeNull();
    expect(result.current.error?.message).toBe('Failed to fetch reputation');
  });

  it('deduplicates concurrent calls for the same userId', async () => {
    let callCount = 0;
    server.use(
      http.get('/api/reputation/:userId', () => {
        callCount++;
        return HttpResponse.json(mockReputation);
      })
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    renderHook(() => useReputation('user-1'), { wrapper: Wrapper });
    renderHook(() => useReputation('user-1'), { wrapper: Wrapper });

    await waitFor(() => expect(callCount).toBe(1));
  });
});
