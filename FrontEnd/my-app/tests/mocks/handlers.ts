import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

// ---------------------------------------------------------------------------
// Quest resolvers
// ---------------------------------------------------------------------------

const questListResolver = () =>
  HttpResponse.json({
    data: [
      {
        id: 'quest-1',
        title: 'Test Quest 1',
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
  });

const questDetailResolver = ({
  params,
}: {
  params: { id?: string | readonly string[] };
}) => {
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return HttpResponse.json({
    data: {
      id,
      title: `Test Quest ${id}`,
      description: 'Details for test quest',
      rewardAmount: 50,
      rewardAsset: 'XLM',
      status: 'active',
    },
  });
};

// ---------------------------------------------------------------------------
// Profile fixtures
// ---------------------------------------------------------------------------

const profileFixture = {
  profile: {
    id: 'user-test-1',
    username: 'test.user',
    stellarAddress: 'GABC123TEST',
    bio: 'Test bio',
    level: 5,
    xp: 1200,
    totalEarnings: 500,
    questsCompleted: 10,
    currentStreak: 3,
    joinDate: '2025-01-01',
    lastActive: '2026-06-01T10:00:00Z',
    isFollowing: false,
    followersCount: 20,
    followingCount: 15,
    isOwnProfile: false,
  },
  stats: {
    xp: 1200,
    level: 5,
    totalEarnings: 500,
    questsCompleted: 10,
    currentStreak: 3,
    followersCount: 20,
    followingCount: 15,
    joinDate: '2025-01-01',
  },
  achievements: [
    {
      id: 'ach-1',
      name: 'First Quest',
      description: 'Complete your first quest',
      icon: 'target',
      earnedAt: '2025-06-16T10:00:00Z',
      rarity: 'common',
    },
  ],
  activities: [
    {
      id: 'act-1',
      type: 'quest_completed',
      title: 'Completed First Quest',
      description: 'Quest completed successfully',
      timestamp: '2026-06-01T10:00:00Z',
      relatedId: 'quest-1',
    },
  ],
};

const profileResolver = () => HttpResponse.json(profileFixture);

const achievementsResolver = () =>
  HttpResponse.json(profileFixture.achievements);

const activitiesResolver = () => HttpResponse.json(profileFixture.activities);

const followResolver = () => HttpResponse.json({ success: true });

const updateProfileResolver = async ({ request }: { request: Request }) => {
  const body = (await request.json()) as Record<string, unknown>;
  return HttpResponse.json({ ...profileFixture.profile, ...body });
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const handlers = [
  // List quests
  http.get(`${API_BASE_URL}/api/v1/quests`, questListResolver),
  http.get('/api/v1/quests', questListResolver),

  // Get single quest
  http.get(`${API_BASE_URL}/api/v1/quests/:id`, questDetailResolver),
  http.get('/api/v1/quests/:id', questDetailResolver),

  // Get profile
  http.get(`${API_BASE_URL}/api/v1/profiles/:address`, profileResolver),
  http.get('/api/v1/profiles/:address', profileResolver),

  // Get achievements
  http.get(
    `${API_BASE_URL}/api/v1/profiles/:address/achievements`,
    achievementsResolver
  ),
  http.get('/api/v1/profiles/:address/achievements', achievementsResolver),

  // Get activities
  http.get(
    `${API_BASE_URL}/api/v1/profiles/:address/activities`,
    activitiesResolver
  ),
  http.get('/api/v1/profiles/:address/activities', activitiesResolver),

  // Follow / unfollow
  http.post(`${API_BASE_URL}/api/v1/profiles/:address/follow`, followResolver),
  http.post('/api/v1/profiles/:address/follow', followResolver),
  http.post(
    `${API_BASE_URL}/api/v1/profiles/:address/unfollow`,
    followResolver
  ),
  http.post('/api/v1/profiles/:address/unfollow', followResolver),

  // Update profile
  http.patch(`${API_BASE_URL}/api/v1/profiles/:address`, updateProfileResolver),
  http.patch('/api/v1/profiles/:address', updateProfileResolver),
];
