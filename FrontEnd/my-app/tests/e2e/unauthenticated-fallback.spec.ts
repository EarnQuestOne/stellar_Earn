import { test, expect } from '@playwright/test';
import { MOCK_PUBLIC_QUEST, mockQuestListApi } from './helpers/quest-api-mock';

/**
 * FE-039 / Issue #828: End-to-end tests for unauthenticated homepage
 * and quest listing fallback.
 *
 * Verifies that visitors without a wallet session can browse the public
 * homepage and quest catalog, and that quest listing error states render
 * gracefully when the quests API is unavailable.
 */
test.describe('Unauthenticated Homepage and Quest Listing Fallback', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('stellar_earn_access_token');
      localStorage.removeItem('stellar_earn_refresh_token');
      localStorage.removeItem('inheritx_wallet_address');
      localStorage.removeItem('inheritx_wallet_id');
      localStorage.setItem(
        'stellar_earn_analytics_consent',
        JSON.stringify({ status: 'denied', version: '1' })
      );
    });
  });

  test('homepage renders correctly for unauthenticated users', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByRole('region', { name: 'Hero' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /explore all available quests/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /connect your wallet/i })
    ).toBeVisible();
  });

  test('homepage featured quests load without authentication', async ({
    page,
  }) => {
    await mockQuestListApi(page);

    await page.goto('/');

    const featuredHeading = page.getByRole('heading', {
      name: 'Top Quests Right Now',
    });
    await featuredHeading.scrollIntoViewIfNeeded();
    await expect(featuredHeading).toBeVisible();

    await expect(
      page.getByRole('button', { name: new RegExp(MOCK_PUBLIC_QUEST.title) })
    ).toBeVisible();
  });

  test('quest listing renders for unauthenticated users', async ({ page }) => {
    await mockQuestListApi(page);

    await page.goto('/quests');

    await expect(
      page.getByRole('heading', { name: 'Quest Board', level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: /1 quest found/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(MOCK_PUBLIC_QUEST.title) })
    ).toBeVisible();
  });

  test('quest listing shows error fallback when the quests API fails', async ({
    page,
  }) => {
    await mockQuestListApi(page, { status: 500 });

    await page.goto('/quests');

    await expect(
      page.getByRole('heading', { name: 'Quest Board', level: 1 })
    ).toBeVisible();
    await expect(page.getByText(/error loading quests/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /try again/i })
    ).toBeVisible();
  });

  test('explore quests CTA routes unauthenticated users to the quest board', async ({
    page,
  }) => {
    await mockQuestListApi(page);

    await page.goto('/');

    await page
      .getByRole('link', { name: /explore all available quests/i })
      .click();

    await expect(page).toHaveURL(/\/quests$/);
    await expect(
      page.getByRole('heading', { name: 'Quest Board', level: 1 })
    ).toBeVisible();
  });
});
