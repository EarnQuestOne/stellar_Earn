import { describe, it, expect, vi } from 'vitest';

describe('Request deduplication for homepage quest fetches', () => {
  it('deduplicates concurrent requests for the same key', async () => {
    const fetchFn = vi.fn().mockResolvedValue([]);
    const inFlight = new Map<string, Promise<unknown>>();

    const dedupedFetch = (key: string) => {
      if (inFlight.has(key)) return inFlight.get(key)!;
      const p = fetchFn(key).finally(() => inFlight.delete(key));
      inFlight.set(key, p);
      return p;
    };

    dedupedFetch('/quests/home');
    dedupedFetch('/quests/home');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('allows new request after previous completes', async () => {
    const fetchFn = vi.fn().mockResolvedValue([]);
    const inFlight = new Map<string, Promise<unknown>>();

    const dedupedFetch = (key: string) => {
      if (inFlight.has(key)) return inFlight.get(key)!;
      const p = fetchFn(key).finally(() => inFlight.delete(key));
      inFlight.set(key, p);
      return p;
    };

    await dedupedFetch('/quests/home');
    await dedupedFetch('/quests/home');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
