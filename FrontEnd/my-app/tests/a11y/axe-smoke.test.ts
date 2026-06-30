import { test } from '@playwright/test';
import { expectAxeToPass } from './axe-helper';

test.describe('Accessibility smoke tests', () => {
  test('homepage has no critical axe violations', async ({ page }) => {
    await expectAxeToPass({ page, url: '/en' });
  });

  test('quests page has no critical axe violations', async ({ page }) => {
    await expectAxeToPass({ page, url: '/en/quests' });
  });

  test('rewards page has no critical axe violations', async ({ page }) => {
    await expectAxeToPass({ page, url: '/en/rewards' });
  });

  test('submissions page has no critical axe violations', async ({ page }) => {
    await expectAxeToPass({ page, url: '/en/submissions' });
  });

  test('dashboard page has no critical axe violations', async ({ page }) => {
    await expectAxeToPass({ page, url: '/en/dashboard' });
  });

  test('profile page has no critical axe violations', async ({ page }) => {
    await expectAxeToPass({ page, url: '/en/profile' });
  });
});
