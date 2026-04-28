import { test, expect } from '@playwright/test';

/**
 * Quest browsing flow E2E tests.
 *
 * Covers the critical user paths on /quests:
 *   - Listing the catalog
 *   - Filtering by status, difficulty, and category (URL-driven)
 *   - Searching by title
 *   - The empty / "no results" state
 *   - Clearing filters
 *   - Navigating to the create-quest wizard
 *   - Drilling into a quest detail page
 */
test.describe('Quest Browsing Flow', () => {
  // Suppress the analytics consent banner so it cannot intercept clicks on
  // bottom-of-viewport elements when running against narrow viewports.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'stellar_earn_analytics_consent',
        JSON.stringify({ status: 'denied', version: '1' })
      );
    });
  });

  test('renders the quest board with header and create CTA', async ({
    page,
  }) => {
    await page.goto('/quests');

    await expect(
      page.getByRole('heading', { name: 'Quest Board', level: 1 })
    ).toBeVisible();
    await expect(
      page.getByText(/browse available quests and start earning rewards/i)
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /create quest/i })
    ).toHaveAttribute('href', '/quests/create');
  });

  test('lists at least one quest card by default', async ({ page }) => {
    await page.goto('/quests');

    const firstCard = page
      .locator('[role="button"][aria-label^="View quest:"]')
      .first();
    await expect(firstCard).toBeVisible();
  });

  test('filters quests by difficulty via the difficulty pill', async ({
    page,
  }) => {
    await page.goto('/quests');

    await page.getByRole('button', { name: /^Easy$/ }).click();

    await expect(page).toHaveURL(/difficulty=beginner/);

    // Each remaining card should advertise the easy difficulty label.
    const cards = page.locator('[role="button"][aria-label^="View quest:"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText(/beginner/i);
    }
  });

  test('filters quests by category and resets pagination', async ({ page }) => {
    await page.goto('/quests?page=2');

    await page.getByRole('button', { name: /^Security$/ }).click();

    await expect(page).toHaveURL(/category=Security/);
    await expect(page).toHaveURL(/page=1/);

    const cards = page.locator('[role="button"][aria-label^="View quest:"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText(/security/i);
    }
  });

  test('searching for a title narrows the list', async ({ page }) => {
    await page.goto('/quests');

    await page
      .getByRole('textbox', { name: /search quests/i })
      .fill('Documentation');

    const firstCard = page
      .locator('[role="button"][aria-label^="View quest:"]')
      .first();
    await expect(firstCard).toContainText(/documentation/i);
  });

  test('shows the empty state for a query that matches no quests', async ({
    page,
  }) => {
    await page.goto('/quests');

    await page
      .getByRole('textbox', { name: /search quests/i })
      .fill('zzz-no-such-quest-xyz');

    await expect(page.getByText(/no quests found/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /clear filters/i })
    ).toBeVisible();
  });

  test('clear filters returns the catalog to the default view', async ({
    page,
  }) => {
    await page.goto('/quests?status=Active&difficulty=beginner');

    await expect(
      page.getByRole('button', { name: /clear all filters/i })
    ).toBeVisible();
    await page.getByRole('button', { name: /clear all filters/i }).click();

    await expect(page).toHaveURL(/\/quests$/);
  });

  test('clicking a quest card navigates to its detail page', async ({
    page,
  }) => {
    // The detail page fetches the quest via the backend API; intercept the
    // request so the test is deterministic and does not depend on a running
    // backend.
    await page.route('**/api/v1/quests/**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'quest-1',
          contractQuestId: '1',
          title: 'Smart Contract Security Review',
          description:
            'Review and audit a smart contract for security vulnerabilities.',
          category: 'Security',
          difficulty: 'advanced',
          rewardAmount: '500',
          rewardAsset: 'XLM',
          xpReward: 300,
          status: 'Active',
          deadline: new Date(Date.now() + 7 * 86_400_000).toISOString(),
          verifierAddress: 'GDX7...456',
          requirements: ['Review the smart contract code'],
          maxParticipants: 5,
          currentParticipants: 2,
          totalClaims: 0,
          totalSubmissions: 0,
          approvedSubmissions: 0,
          rejectedSubmissions: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/quests');

    const firstCard = page
      .locator('[role="button"][aria-label^="View quest:"]')
      .first();
    await firstCard.click();

    await expect(page).toHaveURL(/\/quests\/[^/]+$/);
    await expect(
      page.getByRole('link', { name: /back to quests/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /smart contract security review/i })
    ).toBeVisible();
  });

  test('create quest CTA links to the wizard', async ({ page }) => {
    await page.goto('/quests');

    await page.getByRole('link', { name: /create quest/i }).click();
    await expect(page).toHaveURL(/\/quests\/create$/);
  });
});
