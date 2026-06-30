import { expect, test } from '@playwright/test';
import { mockWalletAndApi } from './helpers/mock-wallet';

test.describe('Critical quest journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletAndApi(page);
  });

  test('discovers a quest and opens its detail view', async ({ page }) => {
    await page.goto('/quests');

    await expect(page.getByRole('heading', { name: 'Quest Board', level: 1 })).toBeVisible();

    const questCard = page.locator('[role="button"][aria-label^="View quest:"]').first();
    await expect(questCard).toBeVisible();
    await questCard.click();

    await expect(page).toHaveURL(/\/quests\/[^/]+$/);
    await expect(page.getByRole('heading', { name: /documentation quest/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to quests/i })).toBeVisible();
  });

  test('creates a submission and shows it in the submissions list', async ({ page }) => {
    await page.goto('/submissions');

    await page.getByRole('button', { name: /new submission/i }).click();

    const dialog = page.getByRole('dialog', { name: /submission details|submit proof/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /start quest/i }).click();

    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'proof.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('proof of work'),
    });

    await dialog.getByRole('button', { name: /submit work for quest/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.getByRole('row', { name: /SUB-1002/i })).toBeVisible();
  });

  test('claims a reward after the wallet-backed submission flow', async ({ page }) => {
    await page.goto('/rewards');

    await page.evaluate(() => {
      Math.random = () => 0.5;
    });

    await page.getByRole('button', { name: /claim all rewards/i }).click();

    const dialog = page.getByRole('dialog', { name: /claim transaction/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /claim successful/i })).toBeVisible({ timeout: 10_000 });

    await dialog.getByRole('button', { name: /^Done$/ }).click();
    await expect(page.getByRole('cell', { name: /^Success$/ })).toBeVisible();
  });
});
