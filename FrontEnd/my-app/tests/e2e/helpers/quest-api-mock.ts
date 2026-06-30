import type { Page, Route } from '@playwright/test';
import type { QuestResponse } from '@/lib/types/api.types';

export const MOCK_PUBLIC_QUEST: QuestResponse = {
  id: 'quest-public-1',
  contractQuestId: '1',
  title: 'Documentation Quest',
  description: 'Write documentation for the StellarEarn platform.',
  category: 'Docs',
  difficulty: 'beginner',
  rewardAmount: '100',
  rewardAsset: 'XLM',
  xpReward: 50,
  status: 'Active',
  deadline: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  verifierAddress:
    'GCFX7M4YVQQ2TESTVERIFYADDRESS7XQK3Q2J7W3R6CQJ6H3TL5E3QWIZARD',
  requirements: ['Submit a pull request URL'],
  maxParticipants: 10,
  currentParticipants: 0,
  totalClaims: 0,
  totalSubmissions: 0,
  approvedSubmissions: 0,
  rejectedSubmissions: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function buildQuestListPayload(
  quests: QuestResponse[] = [MOCK_PUBLIC_QUEST]
) {
  return {
    quests,
    total: quests.length,
    page: 1,
    limit: 12,
    totalPages: 1,
  };
}

function isQuestListRequest(url: string, method: string): boolean {
  if (method !== 'GET') return false;

  const { pathname } = new URL(url);
  return /\/api\/v1\/quests$/.test(pathname);
}

type MockQuestListOptions = {
  status?: number;
  body?: ReturnType<typeof buildQuestListPayload>;
  errorBody?: object;
};

/**
 * Intercepts public quest list requests so unauthenticated E2E tests do not
 * depend on a running backend or seeded database.
 */
export async function mockQuestListApi(
  page: Page,
  options: MockQuestListOptions = {}
) {
  await page.route('**/api/v1/quests**', async (route: Route) => {
    const request = route.request();

    if (!isQuestListRequest(request.url(), request.method())) {
      await route.fallback();
      return;
    }

    const status = options.status ?? 200;

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(
        status >= 400
          ? (options.errorBody ?? { message: 'Internal server error' })
          : (options.body ?? buildQuestListPayload())
      ),
    });
  });
}
