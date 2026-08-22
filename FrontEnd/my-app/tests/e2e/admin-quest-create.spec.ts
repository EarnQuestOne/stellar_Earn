import { expect, test } from '@playwright/test';

/**
 * Both quest-creation entry points are backed by the same `QuestWizard`
 * component (issue #1919). These tests pin that contract: the admin route must
 * render the shared wizard with its admin-only settings, and the user route
 * must not expose those settings.
 */
test.describe('Quest creation entry points share one implementation', () => {
  test('admin route renders the shared quest wizard', async ({ page }) => {
    await page.goto('/admin/quests/new');

    await expect(page.getByTestId('quest-wizard')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Create New Quest' })
    ).toBeVisible();
  });

  test('user route renders the same wizard without admin settings', async ({
    page,
  }) => {
    await page.goto('/quests/create');

    await expect(page.getByTestId('quest-wizard')).toBeVisible();

    // Advance to the reward step, where the admin panel would appear.
    await page
      .getByPlaceholder('Ex: Build an Open Source Stellar Explorer')
      .fill('Community Docs Refresh');
    await page
      .getByPlaceholder('One-line summary for quest cards')
      .fill('Refresh the contributor documentation.');
    await page
      .getByTestId('quest-description-editor')
      .fill('Rewrite the onboarding guide and add examples.');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByPlaceholder('Skill 1').fill('Technical writing');
    await page
      .getByPlaceholder('What should the contributor submit?')
      .first()
      .fill('Docs pull request');
    await page
      .getByPlaceholder('Success criteria')
      .first()
      .fill('Merged into main');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByTestId('admin-settings-panel')).toHaveCount(0);
  });

  test('admin can set difficulty, participant cap and tags on the reward step', async ({
    page,
  }) => {
    await page.goto('/admin/quests/new');
    await expect(page.getByTestId('quest-wizard')).toBeVisible();

    await page
      .getByPlaceholder('Ex: Build an Open Source Stellar Explorer')
      .fill('Admin Created Quest');
    await page
      .getByPlaceholder('One-line summary for quest cards')
      .fill('Created from the admin console.');
    await page
      .getByTestId('quest-description-editor')
      .fill('Detailed scope for the admin created quest.');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByPlaceholder('Skill 1').fill('Rust');
    await page
      .getByPlaceholder('What should the contributor submit?')
      .first()
      .fill('Contract diff');
    await page
      .getByPlaceholder('Success criteria')
      .first()
      .fill('Tests passing');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Reward step also carries the admin-only settings.
    const adminPanel = page.getByTestId('admin-settings-panel');
    await expect(adminPanel).toBeVisible();

    await page.getByLabel('Difficulty').selectOption('advanced');
    await page.getByLabel('Max participants').fill('25');
    await page.getByLabel('Tags').fill('soroban');
    await page.getByLabel('Tags').press('Enter');

    await expect(adminPanel.getByText('soroban')).toBeVisible();
    await expect(page.getByLabel('Difficulty')).toHaveValue('advanced');
    await expect(page.getByLabel('Max participants')).toHaveValue('25');
  });

  test('admin flow validates the participant cap', async ({ page }) => {
    await page.goto('/admin/quests/new');
    await expect(page.getByTestId('quest-wizard')).toBeVisible();

    await page
      .getByPlaceholder('Ex: Build an Open Source Stellar Explorer')
      .fill('Cap Validation Quest');
    await page
      .getByPlaceholder('One-line summary for quest cards')
      .fill('Checks the participant cap rule.');
    await page
      .getByTestId('quest-description-editor')
      .fill('Ensures an invalid cap blocks progress.');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByPlaceholder('Skill 1').fill('QA');
    await page
      .getByPlaceholder('What should the contributor submit?')
      .first()
      .fill('Report');
    await page.getByPlaceholder('Success criteria').first().fill('Reviewed');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Max participants').fill('0');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.getByText('Max participants must be at least 1.')
    ).toBeVisible();
  });

  test('admin does not need a connected wallet to reach publish', async ({
    page,
  }) => {
    await page.goto('/admin/quests/new');
    await expect(page.getByTestId('quest-wizard')).toBeVisible();

    await page
      .getByPlaceholder('Ex: Build an Open Source Stellar Explorer')
      .fill('No Wallet Admin Quest');
    await page
      .getByPlaceholder('One-line summary for quest cards')
      .fill('Admin quests resolve the verifier server-side.');
    await page
      .getByTestId('quest-description-editor')
      .fill('The admin endpoint assigns the verifier, so no wallet is needed.');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByPlaceholder('Skill 1').fill('Ops');
    await page
      .getByPlaceholder('What should the contributor submit?')
      .first()
      .fill('Checklist');
    await page.getByPlaceholder('Success criteria').first().fill('Complete');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    await page.getByLabel('Deadline').fill(tomorrow);
    await page.getByRole('button', { name: 'Continue' }).click();

    await page
      .getByPlaceholder(
        'Explain how submissions are reviewed and what evidence is required.'
      )
      .fill('Reviewed by the admin team.');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Reaching the review step without a wallet proves the verifier gate is
    // scoped to the user-facing flow.
    await expect(page.getByTestId('step-preview')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Publish quest' })
    ).toBeEnabled();
  });
});
