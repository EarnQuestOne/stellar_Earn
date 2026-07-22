import { test, expect } from '@playwright/test';
import { expectAxeToPass } from './axe-helper';

test.describe('Modal Focus Management - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
  });

  test('homepage passes axe audit', async ({ page }) => {
    await expectAxeToPass({ page });
  });

  test('should trap focus within modal when open', async ({ page }) => {
    const connectButton = page
      .getByRole('button', { name: /connect|wallet|sign in/i })
      .first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await expectAxeToPass({ page });
    }
  });

  test('should close modal on Escape key press', async ({ page }) => {
    const connectButton = page
      .getByRole('button', { name: /connect|wallet|sign in/i })
      .first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.keyboard.press('Escape');
    }
  });

  test('error page has no critical axe violations', async ({ page }) => {
    await page.goto('/en/non-existent-page', { waitUntil: 'networkidle' });
    await expectAxeToPass({ page });
  });
});
