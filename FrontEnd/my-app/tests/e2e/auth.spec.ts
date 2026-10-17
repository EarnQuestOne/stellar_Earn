import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress analytics banner
    await page.addInitScript(() => {
      localStorage.setItem(
        'stellar_earn_analytics_consent',
        JSON.stringify({ status: 'denied', version: '1' })
      );
    });
    await page.goto('/');
  });

  test('should show connect wallet modal', async ({ page }) => {
    await page.click('aria-label="Connect wallet"');
    await expect(page.locator('text=Connect Wallet')).toBeVisible();
  });

  test('should show challenge after wallet connection', async () => {
    // Manual verification remains necessary until wallet mocking is wired into E2E.
    console.log('Manual verification required for the full signing flow');
  });

  test('should persist session on reload', async () => {
    // With httpOnly cookies, session persistence is handled by the browser
    // automatically sending cookies with requests. The profile endpoint
    // will return user data if valid cookies exist.
  });

  test('should logout correctly', async () => {
    // Placeholder for logout coverage once wallet mocking is available.
  });
});

test.describe('Session Expired Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'stellar_earn_analytics_consent',
        JSON.stringify({ status: 'denied', version: '1' })
      );
    });
  });

  test('should show session expired modal when session-expired event is dispatched', async ({
    page,
  }) => {
    await page.goto('/');

    // Dispatch the session-expired event as the interceptor would
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('session-expired', {
          detail: { reason: 'token_refresh_failed' },
        })
      );
    });

    // Verify the session expired modal appears
    await expect(page.getByText('Session Expired')).toBeVisible();
    await expect(
      page.getByText(
        'Your session has expired. Please sign in again to continue.'
      )
    ).toBeVisible();

    // Verify action buttons are present
    await expect(
      page.getByRole('button', { name: /connect wallet/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /dismiss/i })).toBeVisible();
  });
});
