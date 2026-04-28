import { test, expect } from '@playwright/test';

test.describe('Homepage Hero Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── Visibility ────────────────────────────────────────────

  test('renders the hero section', async ({ page }) => {
    await expect(page.getByRole('region', { name: 'Hero' })).toBeVisible();
  });

  test('shows Built on Stellar & Soroban badge', async ({ page }) => {
    await expect(page.getByText(/built on stellar & soroban/i)).toBeVisible();
  });

  test('shows the main headline', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /turn work into/i
    );
  });

  test('shows the subtext description', async ({ page }) => {
    await expect(
      page.getByText(/complete quests, earn rewards/i)
    ).toBeVisible();
  });

  // ── Rotating headline ─────────────────────────────────────

  test('headline contains an animated word', async ({ page }) => {
    const hero = page.getByRole('region', { name: 'Hero' });
    const animated = hero.locator("[aria-live='polite']");
    await expect(animated).toBeVisible();
    const firstWord = await animated.textContent();
    expect(firstWord?.trim().length).toBeGreaterThan(0);
  });

  // ── CTA Buttons ───────────────────────────────────────────

  test('Explore Quests button is visible and clickable', async ({ page }) => {
    // Match by aria-label set on the link
    const btn = page.getByRole('link', {
      name: /explore all available quests/i,
    });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', '/quests');
  });

  test('Connect Wallet button is visible and clickable', async ({ page }) => {
    // Match by aria-label set on the link
    const btn = page.getByRole('link', {
      name: /connect your wallet/i,
    });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('href', '/dashboard');
  });

  test('CTA buttons are keyboard focusable', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  // ── Stats ─────────────────────────────────────────────────

  test('stats region is present', async ({ page }) => {
    await expect(
      page.getByRole('region', { name: /platform statistics/i })
    ).toBeVisible();
  });

  test('shows XLM Distributed stat label', async ({ page }) => {
    await expect(page.getByText(/xlm distributed/i)).toBeVisible();
  });

  test('shows Quests Completed stat label', async ({ page }) => {
    await expect(page.getByText(/quests completed/i)).toBeVisible();
  });

  test('shows Active Quests stat label', async ({ page }) => {
    await expect(page.getByText(/active quests/i)).toBeVisible();
  });

  // ── Trust Indicators ──────────────────────────────────────

  test('shows trust indicators', async ({ page }) => {
    await expect(page.getByText(/5-second settlement/i)).toBeVisible();
    await expect(page.getByText(/on-chain verification/i)).toBeVisible();
    await expect(page.getByText(/earn xp & badges/i)).toBeVisible();
  });

  // ── Responsive ────────────────────────────────────────────

  test('hero looks correct on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /explore all available quests/i })
    ).toBeVisible();
  });

  test('hero looks correct on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('region', { name: 'Hero' })).toBeVisible();
  });

  // ── Accessibility ─────────────────────────────────────────

  test('hero section has correct aria-label', async ({ page }) => {
    await expect(page.locator("section[aria-label='Hero']")).toBeVisible();
  });

  test('stats region has aria-label', async ({ page }) => {
    await expect(
      page.locator("[aria-label='Platform statistics']")
    ).toBeVisible();
  });

  test('trust indicators have aria-label', async ({ page }) => {
    await expect(page.locator("[aria-label='Trust indicators']")).toBeVisible();
  });
});
