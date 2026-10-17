import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

import { get } from './client';
import { fetchProfileOverview } from './profile';

const mockedGet = vi.mocked(get);

describe('fetchProfileOverview', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('batches profile, achievements, and activities into one combined result', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url.endsWith('/achievements')) {
        return Promise.resolve([{ id: 'a1' }]);
      }
      if (url.endsWith('/activities')) {
        return Promise.resolve([{ id: 'act1' }]);
      }
      return Promise.resolve({ stellarAddress: 'GABC', xp: 10 });
    });

    const overview = await fetchProfileOverview('GABC');

    expect(overview.profile).toEqual({ stellarAddress: 'GABC', xp: 10 });
    expect(overview.achievements).toEqual([{ id: 'a1' }]);
    expect(overview.activities).toEqual([{ id: 'act1' }]);
    expect(mockedGet).toHaveBeenCalledTimes(3);
    expect(mockedGet).toHaveBeenCalledWith('/profiles/GABC');
    expect(mockedGet).toHaveBeenCalledWith('/profiles/GABC/achievements');
    expect(mockedGet).toHaveBeenCalledWith('/profiles/GABC/activities');
  });

  it('issues the reads concurrently rather than sequentially', async () => {
    let resolveProfile: (value: unknown) => void = () => {};
    const profilePromise = new Promise((resolve) => {
      resolveProfile = resolve;
    });

    mockedGet.mockImplementation((url: string) => {
      if (url === '/profiles/GABC') {
        return profilePromise as Promise<never>;
      }
      return Promise.resolve([]);
    });

    const overviewPromise = fetchProfileOverview('GABC');

    // All three requests are dispatched before the first one resolves.
    expect(mockedGet).toHaveBeenCalledTimes(3);

    resolveProfile({ stellarAddress: 'GABC' });
    await overviewPromise;
  });
});
