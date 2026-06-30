import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { getQuests, getQuestById } from './quests';
import { cacheManager } from '@/lib/utils/cache';
import { server } from '@/tests/mocks/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

function questListResponse(version: number) {
  return {
    data: [
      {
        id: `quest-${version}`,
        title: `Test Quest ${version}`,
        description: 'This is a test quest',
        rewardAmount: 100,
        rewardAsset: 'XLM',
        status: 'active',
      },
    ],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
    },
  };
}

beforeEach(() => {
  cacheManager.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Quests API Integration Tests', () => {
  it('should fetch quests successfully with mock data', async () => {
    const response = await getQuests();

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].id).toBe('quest-1');
    expect(response.data[0].title).toBe('Test Quest 1');
    expect(response.total).toBe(1);
  });

  it('should fetch a single quest by ID successfully', async () => {
    const response = await getQuestById('quest-123');

    expect(response).toBeDefined();
    expect(response.id).toBe('quest-123');
    expect(response.title).toBe('Test Quest quest-123');
    expect(response.rewardAmount).toBe(50);
  });

  it('should reuse fresh cached quest listings without another request', async () => {
    let requestCount = 0;
    server.use(
      http.get(`${API_BASE_URL}/api/v1/quests`, () => {
        requestCount += 1;
        return HttpResponse.json(questListResponse(requestCount));
      })
    );

    const first = await getQuests({ limit: 10 });
    const second = await getQuests({ limit: 10 });

    expect(requestCount).toBe(1);
    expect(first.data[0].id).toBe('quest-1');
    expect(second.data[0].id).toBe('quest-1');
  });

  it('should return stale quest listings while revalidating in the background', async () => {
    let now = 0;
    let requestCount = 0;
    const onRevalidate = vi.fn();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    server.use(
      http.get(`${API_BASE_URL}/api/v1/quests`, () => {
        requestCount += 1;
        return HttpResponse.json(questListResponse(requestCount));
      })
    );

    const fresh = await getQuests();
    now = 3 * 60 * 1000 + 1;
    const stale = await getQuests(undefined, undefined, undefined, {
      onRevalidate,
    });

    expect(stale.data[0].id).toBe(fresh.data[0].id);
    expect(stale.data[0].id).toBe('quest-1');

    await vi.waitFor(() => {
      expect(requestCount).toBe(2);
      expect(onRevalidate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ id: 'quest-2' })],
        })
      );
    });
  });

  it('should refetch quest listings after the stale window expires', async () => {
    let now = 0;
    let requestCount = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    server.use(
      http.get(`${API_BASE_URL}/api/v1/quests`, () => {
        requestCount += 1;
        return HttpResponse.json(questListResponse(requestCount));
      })
    );

    const first = await getQuests();
    now = 13 * 60 * 1000 + 1;
    const second = await getQuests();

    expect(requestCount).toBe(2);
    expect(first.data[0].id).toBe('quest-1');
    expect(second.data[0].id).toBe('quest-2');
  });
});
