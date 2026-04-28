import { expect, test } from '@playwright/test';
import type { CreateQuestRequest } from '@/lib/types/api.types';

test.describe('Quest Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'inheritx_wallet_address',
        'GCFX7M4YVQQ2TESTVERIFYADDRESS7XQK3Q2J7W3R6CQJ6H3TL5E3QWIZARD'
      );
      localStorage.setItem('inheritx_wallet_id', 'freighter');
    });
  });

  test('completes all 7 steps, previews the data, and posts the real quest payload', async ({
    page,
  }) => {
    let capturedPayload: CreateQuestRequest | null = null;

    await page.route('**/api/v1/quests', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      capturedPayload = route.request().postDataJSON() as CreateQuestRequest;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'quest-174',
          contractQuestId: 'contract-174',
          title: capturedPayload.title,
          description: capturedPayload.description,
          category: capturedPayload.category,
          difficulty: capturedPayload.difficulty,
          rewardAsset: capturedPayload.rewardAsset,
          rewardAmount: capturedPayload.rewardAmount,
          xpReward: capturedPayload.xpReward,
          verifierAddress: capturedPayload.verifierAddress,
          deadline: capturedPayload.deadline,
          status: 'Active',
          totalClaims: 0,
          totalSubmissions: 0,
          approvedSubmissions: 0,
          rejectedSubmissions: 0,
          maxParticipants: capturedPayload.maxParticipants,
          currentParticipants: 0,
          requirements: capturedPayload.requirements,
          tags: capturedPayload.tags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/quests/create');

    await expect(page.getByTestId('quest-wizard')).toBeVisible();

    // Step 1: Basics
    await page
      .getByPlaceholder('Ex: Build an Open Source Stellar Explorer')
      .fill('Build Explorer Enhancements');
    await page
      .getByPlaceholder('One-line summary for quest cards')
      .fill('Improve discoverability and filters.');
    await page
      .getByTestId('quest-description-editor')
      .fill('Scope Ship search upgrades and pagination improvements.');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Requirements
    await page.getByPlaceholder('Skill 1').fill('React');
    await page
      .getByPlaceholder('What should the contributor submit?')
      .first()
      .fill('Pull request URL');
    await page
      .getByPlaceholder('Success criteria')
      .first()
      .fill('Merged into main');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Reward
    await page
      .getByRole('button', { name: 'USDC USD Coin Centre / Circle' })
      .click();
    await page.getByLabel('Reward Amount').fill('250');
    await page.getByLabel('XP Reward').fill('120');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 4: Timeline
    const tomorrow = new Date(Date.now() + 86400000);
    const dateLocal = tomorrow.toISOString().slice(0, 16);
    const milestoneLocal = new Date(Date.now() + 43200000)
      .toISOString()
      .slice(0, 16);
    await page.getByLabel('Deadline').fill(dateLocal);
    await page.getByPlaceholder('Milestone 1').fill('Prototype review');
    await page
      .locator('input[type="datetime-local"]')
      .nth(1)
      .fill(milestoneLocal);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 5: Verification
    await page.getByRole('button', { name: /Auto Verification/i }).click();
    await page
      .getByPlaceholder(
        'Explain how submissions are reviewed and what evidence is required.'
      )
      .fill('Reviewer checks scope match and code quality.');
    await page
      .getByPlaceholder(
        'Example: submission must include GitHub PR URL and all required labels'
      )
      .fill('Submission must include a GitHub PR URL and passing checks.');
    await expect(
      page.getByText(
        'GCFX7M4YVQQ2TESTVERIFYADDRESS7XQK3Q2J7W3R6CQJ6H3TL5E3QWIZARD'
      )
    ).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 6: Preview and publish
    await expect(page.getByTestId('step-preview')).toBeVisible();
    await expect(page.getByText('Prototype review')).toBeVisible();
    await expect(page.getByText('Automation Criteria')).toBeVisible();
    await expect(page.getByText('USDC')).toBeVisible();
    await page.getByRole('button', { name: 'Publish Quest' }).click();

    // Step 7: Confirmation
    await expect(page.getByTestId('step-confirmation')).toBeVisible();
    await expect(page.getByText('Quest created successfully')).toBeVisible();
    if (!capturedPayload) {
      throw new Error('Expected quest creation payload to be captured.');
    }
    const payload: CreateQuestRequest = capturedPayload;
    expect(payload.rewardAsset).toBe('USDC');
    expect(payload.rewardAmount).toBe(250);
    expect(payload.verifierAddress).toBe(
      'GCFX7M4YVQQ2TESTVERIFYADDRESS7XQK3Q2J7W3R6CQJ6H3TL5E3QWIZARD'
    );
    expect(payload.requirements).toEqual(
      expect.arrayContaining([
        'Skill: React',
        'Deliverable: Pull request URL (Merged into main) [required]',
      ])
    );
  });

  test('blocks navigation when required fields are missing', async ({
    page,
  }) => {
    await page.goto('/quests/create');

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Quest title is required.')).toBeVisible();
    await expect(page.getByTestId('step-basics')).toBeVisible();
  });

  test('saves and reloads a draft', async ({ page }) => {
    await page.goto('/quests/create');

    await page
      .getByPlaceholder('Ex: Build an Open Source Stellar Explorer')
      .fill('Drafted Quest Title');
    await page.getByRole('button', { name: 'Save Draft' }).click();

    await page.reload();
    await page.getByRole('button', { name: 'Load Draft' }).click();

    await expect(
      page.getByPlaceholder('Ex: Build an Open Source Stellar Explorer')
    ).toHaveValue('Drafted Quest Title');
  });
});
