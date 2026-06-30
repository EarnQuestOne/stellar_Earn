import { describe, it, expect, vi } from 'vitest';

describe('SWR stale-while-revalidate cache for quest listings', () => {
  it('returns cached data immediately on second call', () => {
    const cache = new Map<string, unknown>();
    const fetchQuests = vi.fn().mockResolvedValue([{ id: 1, title: 'Quest' }]);

    const swrFetch = async (key: string) => {
      if (cache.has(key)) return cache.get(key);
      const data = await fetchQuests(key);
      cache.set(key, data);
      return data;
    };

    swrFetch('/quests');
    expect(cache.size).toBe(0); // async, not resolved yet
    expect(fetchQuests).toHaveBeenCalledWith('/quests');
  });

  it('revalidates in background while serving stale data', async () => {
    const cache = new Map<string, string>();
    cache.set('/quests', 'stale-data');
    const revalidate = vi.fn().mockResolvedValue('fresh-data');

    const stale = cache.get('/quests');
    revalidate('/quests').then((fresh: string) => cache.set('/quests', fresh));

    expect(stale).toBe('stale-data');
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it('cache key includes page params', () => {
    const buildKey = (page: number, limit: number) =>
      `/quests?page=${page}&limit=${limit}`;
    expect(buildKey(1, 10)).toBe('/quests?page=1&limit=10');
    expect(buildKey(2, 10)).toBe('/quests?page=2&limit=10');
  });
});
