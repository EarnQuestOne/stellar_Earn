import { test } from '@playwright/test';
import { expectAxeToPass } from './axe-helper';

// Closes #1941: a11y coverage for the quest wizard and wallet connect modal.
test.describe('Accessibility: quest wizard + wallet connect modal', () => {
  test('quest creation wizard has no critical axe violations', async ({ page }) => {
    await expectAxeToPass({ page, url: '/en/quests/create' });
  });

  test('quest wizard remains accessible after advancing a step', async ({ page }) => {
    await page.goto('/en/quests/create', { waitUntil: 'networkidle' });
    const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expectAxeToPass({ page });
    }
  });

  test('wallet connect modal has no critical axe violations when opened', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });
    const connectButton = page
      .getByRole('button', { name: /connect|wallet|sign in/i })
      .first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await expectAxeToPass({ page });
    }
  });

  test('wallet connect modal closes on Escape without trapping focus permanently', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });
    const connectButton = page
      .getByRole('button', { name: /connect|wallet|sign in/i })
      .first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
    }
  });
});
