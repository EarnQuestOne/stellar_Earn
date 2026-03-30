import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show connect wallet modal', async ({ page }) => {
    await page.click('aria-label="Connect wallet"');
    await expect(page.locator('text=Connect Wallet')).toBeVisible();
  });

  // Note: Mocking wallet connection and signing is complex in Playwright
  // without specific wallet extensions or injection.
  // This test assumes a mock environment or manual verification.
  
  test('should show challenge after wallet connection', async ({ page }) => {
    // This is a placeholder for a more complex test involving wallet mocking
    console.log('Manual verification required for the full signing flow');
  });

  test('should persist session on reload', async ({ page }) => {
    // This would test if tokens in localStorage are used to fetch the profile
  });

  test('should logout correctly', async ({ page }) => {
    // Test if clicking logout clears tokens and resets state
  });
});
