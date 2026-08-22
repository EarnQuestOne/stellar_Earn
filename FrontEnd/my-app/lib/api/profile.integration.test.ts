import { describe, it, expect, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  fetchUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  fetchUserAchievements,
  fetchUserActivities,
} from './profile';
import { server } from '@/tests/mocks/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
const TEST_ADDRESS = 'GABC123TEST';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Profile API Integration Tests', () => {
  it('fetches a user profile successfully', async () => {
    const result = await fetchUserProfile(TEST_ADDRESS);

    expect(result.profile.stellarAddress).toBe(TEST_ADDRESS);
    expect(result.profile.level).toBe(5);
    expect(result.stats.xp).toBe(1200);
    expect(result.achievements).toHaveLength(1);
    expect(result.activities).toHaveLength(1);
  });

  it('propagates a server error when profile fetch fails', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/v1/profiles/:address`, () => {
        return HttpResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        );
      })
    );

    await expect(fetchUserProfile(TEST_ADDRESS)).rejects.toThrow();
  });

  it('fetches user achievements successfully', async () => {
    const result = await fetchUserAchievements(TEST_ADDRESS);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ach-1');
    expect(result[0].name).toBe('First Quest');
    expect(result[0].rarity).toBe('common');
  });

  it('fetches user activities successfully', async () => {
    const result = await fetchUserActivities(TEST_ADDRESS);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('act-1');
    expect(result[0].type).toBe('quest_completed');
  });

  it('updates a user profile and returns the patched record', async () => {
    const updates = { username: 'new.name', bio: 'Updated bio' };

    const result = await updateProfile(TEST_ADDRESS, updates);

    expect(result.username).toBe('new.name');
    expect(result.bio).toBe('Updated bio');
    expect(result.stellarAddress).toBe(TEST_ADDRESS);
  });

  it('follows a user without error', async () => {
    await followUser(TEST_ADDRESS);
  });

  it('unfollows a user without error', async () => {
    await unfollowUser(TEST_ADDRESS);
  });
});
