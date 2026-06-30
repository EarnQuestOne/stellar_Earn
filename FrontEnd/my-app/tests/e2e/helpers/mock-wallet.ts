import type { Page, Route } from '@playwright/test';

const DEFAULT_ADDRESS = 'GCLN3QY2X7V4R5J6K8M9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8J9K';
const DEFAULT_CHALLENGE = 'playwright-e2e-challenge';

const MOCK_QUEST = {
  id: 'quest-1',
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
  verifierAddress: 'GCFX7M4YVQQ2TESTVERIFYADDRESS7XQK3Q2J7W3R6CQJ6H3TL5E3QWIZARD',
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

const MOCK_PROFILE = {
  id: 'user-1',
  stellarAddress: DEFAULT_ADDRESS,
  username: 'playwright-user',
  email: 'playwright@example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function mockWalletAndApi(page: Page) {
  await page.addInitScript(
    ({ address, challenge }) => {
      localStorage.setItem(
        'stellar_earn_analytics_consent',
        JSON.stringify({ status: 'denied', version: '1' })
      );
      localStorage.removeItem('stellar_earn_access_token');
      localStorage.removeItem('stellar_earn_refresh_token');
      (window as typeof window & {
        __PLAYWRIGHT_MOCK_WALLET__?: string;
        __PLAYWRIGHT_MOCK_WALLET_ADDRESS__?: string;
        __PLAYWRIGHT_MOCK_CHALLENGE__?: string;
      }).__PLAYWRIGHT_MOCK_WALLET__ = 'true';
      (window as typeof window & {
        __PLAYWRIGHT_MOCK_WALLET__?: string;
        __PLAYWRIGHT_MOCK_WALLET_ADDRESS__?: string;
        __PLAYWRIGHT_MOCK_CHALLENGE__?: string;
      }).__PLAYWRIGHT_MOCK_WALLET_ADDRESS__ = address;
      (window as typeof window & {
        __PLAYWRIGHT_MOCK_WALLET__?: string;
        __PLAYWRIGHT_MOCK_WALLET_ADDRESS__?: string;
        __PLAYWRIGHT_MOCK_CHALLENGE__?: string;
      }).__PLAYWRIGHT_MOCK_CHALLENGE__ = challenge;
    },
    { address: DEFAULT_ADDRESS, challenge: DEFAULT_CHALLENGE }
  );

  await page.route('**/api/v1/auth/challenge', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        challenge: DEFAULT_CHALLENGE,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    });
  });

  await page.route('**/api/v1/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }),
    });
  });

  await page.route('**/api/v1/auth/profile', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PROFILE),
    });
  });

  await page.route('**/api/v1/auth/logout', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out' }),
    });
  });

  await page.route('**/api/v1/quests**', async (route: Route) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      await route.fallback();
      return;
    }

    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/v1/quests') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          quests: [MOCK_QUEST],
          total: 1,
          page: 1,
          limit: 12,
          totalPages: 1,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_QUEST),
    });
  });

  await page.route('**/api/v1/submissions**', async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === 'GET' && pathname === '/api/v1/submissions') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          submissions: [
            {
              id: 'SUB-1001',
              questId: 'quest-1',
              questTitle: 'Documentation Quest',
              status: 'Pending',
              proofUrl: 'https://example.com/proof.txt',
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        }),
      });
      return;
    }

    if (request.method() === 'POST' && pathname === '/api/v1/submissions') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'SUB-1002',
          questId: 'quest-1',
          questTitle: 'Documentation Quest',
          status: 'Pending',
          proofUrl: 'https://example.com/proof.txt',
          createdAt: new Date().toISOString(),
        }),
      });
      return;
    }

    if (request.method() === 'POST' && pathname === '/api/v1/submissions/upload') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'upload-1', url: 'https://example.com/proof.txt' }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/v1/rewards**', async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === 'GET' && pathname === '/api/v1/rewards') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rewards: [
            {
              id: 'reward-1',
              questTitle: 'Documentation Quest',
              amount: '100',
              asset: 'XLM',
              status: 'Pending',
            },
          ],
          total: 1,
        }),
      });
      return;
    }

    if (request.method() === 'POST' && pathname === '/api/v1/rewards/claim') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transactionHash: '0xmocktxhash',
          status: 'Success',
        }),
      });
      return;
    }

    await route.fallback();
  });
}
