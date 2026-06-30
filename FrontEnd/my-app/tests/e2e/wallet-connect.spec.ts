import { expect, test } from '@playwright/test';
import { mockWalletAndApi } from './helpers/mock-wallet';

test.describe('Wallet connect journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletAndApi(page);
  });

  test('connects a wallet and completes the signed authentication step', async ({ page }) => {
    await page.goto('/');

    await page.locator('button[aria-label="Connect wallet"]').first().click();
    await expect(page.getByRole('heading', { name: /connect wallet/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /freighter/i }).click();
    await page.getByRole('button', { name: /^connect wallet$/i }).last().click();

    await expect(page.getByRole('heading', { name: /verify ownership/i })).toBeVisible();
    await page.getByRole('button', { name: /sign & verify/i }).click();

    await expect(page.getByText(/GCLN3QY2X7V4R5J6K8M9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8J9K/i)).toBeVisible();
  });
});
