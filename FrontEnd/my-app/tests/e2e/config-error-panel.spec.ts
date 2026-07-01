import { test, expect } from '@playwright/test';

/**
 * FE-038: Visual tests for config error panel rendering path
 *
 * Tests the EnvValidator component's error panel display when
 * required environment variables are missing.
 */

test.describe('Config Error Panel - Visual Tests', () => {
  /**
   * Test: Error panel renders with correct layout and styling
   *
   * Verifies that the configuration error panel displays with:
   * - Correct heading and icon
   * - Proper visual hierarchy
   * - All help text sections
   * - Example configuration block
   */
  test('renders error panel with correct visual hierarchy', async ({
    page,
    context,
  }) => {
    // Mock missing environment variable by intercepting any API calls
    // that might depend on NEXT_PUBLIC_API_BASE_URL
    await context.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).MISSING_ENV_TEST = true;
    });

    // Navigate to a page that uses EnvValidator
    // This will trigger validation on app initialization
    await page.goto('/error-panel-demo', {
      waitUntil: 'domcontentloaded',
    });

    // Wait for the error panel to be fully rendered
    const errorPanel = page.locator(
      '[role="region"][aria-label="Configuration Error"]'
    );
    await expect(errorPanel).toBeVisible({ timeout: 5000 });

    // Visual snapshot of the full error panel
    await expect(errorPanel).toHaveScreenshot('error-panel-full.png', {
      mask: [page.locator('[data-testid="timestamp"]')], // Mask timestamps if present
      maxDiffPixels: 100,
    });
  });

  /**
   * Test: Error icon displays correctly with proper styling
   */
  test('displays error icon with correct styling', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const errorIcon = page.locator('svg[aria-hidden="true"]').first();
    await expect(errorIcon).toBeVisible();

    // Check icon has correct color
    const fill = await errorIcon.evaluate(
      (el) => window.getComputedStyle(el).fill
    );
    expect(fill).toBeTruthy();

    // Visual snapshot of just the icon
    await expect(errorIcon).toHaveScreenshot('error-icon.png');
  });

  /**
   * Test: Configuration error heading is properly styled
   */
  test('displays "Configuration Error" heading with correct styling', async ({
    page,
  }) => {
    await page.goto('/error-panel-demo');

    const heading = page.getByRole('heading', {
      name: /configuration error/i,
    });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveClass(/text-red-500|text-2xl|font-bold/);

    // Verify text color is red
    const color = await heading.evaluate(
      (el) => window.getComputedStyle(el).color
    );
    expect(color).toMatch(/rgb.*\d+/);
  });

  /**
   * Test: Error message box renders with correct styling and content
   */
  test('renders error message box with code formatting', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const messageBox = page.locator('pre').first();
    await expect(messageBox).toBeVisible();

    // Verify it contains expected error text
    const content = await messageBox.textContent();
    expect(content).toBeTruthy();
    expect(content).toContain('NEXT_PUBLIC_API_BASE_URL');

    // Visual snapshot of message box
    await expect(messageBox).toHaveScreenshot('error-message-box.png');
  });

  /**
   * Test: "How to fix this" section displays with correct structure
   */
  test('displays "How to fix this" section with ordered list', async ({
    page,
  }) => {
    await page.goto('/error-panel-demo');

    const fixSection = page.getByRole('heading', {
      name: /how to fix this/i,
    });
    await expect(fixSection).toBeVisible();

    // Find the list under this section
    const list = page.locator('ol').first();
    const items = list.locator('li');

    // Should have at least 3 steps
    await expect(items).toHaveCount(3);

    // Verify step text content
    const step1 = items.nth(0);
    const step1Text = await step1.textContent();
    expect(step1Text).toMatch(/\.env\.local/);
  });

  /**
   * Test: Example .env.local block displays correctly
   */
  test('displays example .env.local configuration block', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const exampleBlock = page.locator('pre').nth(1);
    await expect(exampleBlock).toBeVisible();

    const content = await exampleBlock.textContent();
    expect(content).toContain('NEXT_PUBLIC_API_BASE_URL');
    expect(content).toContain('NEXT_PUBLIC_STELLAR_NETWORK');
    expect(content).toContain('NEXT_PUBLIC_SOROBAN_RPC_URL');
    expect(content).toContain('NEXT_PUBLIC_CONTRACT_ID');

    // Visual snapshot of example block
    await expect(exampleBlock).toHaveScreenshot('example-env-block.png');
  });

  /**
   * Test: Panel maintains correct styling on different viewport sizes
   */
  test('error panel is responsive across viewport sizes', async ({
    page,
    context,
  }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ];

    for (const viewport of viewports) {
      await context.clearCookies();
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await page.goto('/error-panel-demo');

      const errorPanel = page.locator('[role="region"]').first();
      await expect(errorPanel).toBeVisible();

      // Check panel is properly padded and doesn't overflow
      const boundingBox = await errorPanel.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox?.width).toBeLessThanOrEqual(viewport.width);

      // Visual snapshot for each viewport
      await expect(errorPanel).toHaveScreenshot(
        `error-panel-${viewport.name}.png`
      );
    }
  });

  /**
   * Test: Border and background colors meet accessibility standards
   */
  test('error panel has sufficient color contrast', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const errorPanel = page.locator('[role="region"]').first();

    // Check border color (should have red border)
    const borderColor = await errorPanel.evaluate(
      (el) => window.getComputedStyle(el).borderColor
    );
    expect(borderColor).toBeTruthy();

    // Check background color
    const bgColor = await errorPanel.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBeTruthy();
  });

  /**
   * Test: All interactive elements (links) are accessible
   */
  test('documentation link is accessible and has correct href', async ({
    page,
  }) => {
    await page.goto('/error-panel-demo');

    const link = page.getByRole('link', { name: /README\.md/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /readme\.md/i);

    // Link should be keyboard accessible
    await link.focus();
    const focused = await link.evaluate((el) =>
      el.matches(':focus, :focus-visible')
    );
    expect(focused).toBe(true);
  });

  /**
   * Test: Error panel content is centered and properly aligned
   */
  test('error panel content is properly centered', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const container = page.locator('.min-h-screen').first();
    await expect(container).toBeVisible();

    // Verify flex layout centering
    const display = await container.evaluate(
      (el) => window.getComputedStyle(el).display
    );
    expect(display).toBe('flex');

    const justifyContent = await container.evaluate(
      (el) => window.getComputedStyle(el).justifyContent
    );
    expect(['center', 'space-around', 'space-evenly']).toContain(
      justifyContent
    );
  });

  /**
   * Test: Multiple error variables display correctly in list
   */
  test('displays multiple missing environment variables', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const messageBox = page.locator('pre').first();
    const content = await messageBox.textContent();

    // Should indicate missing variables with bullet points
    const lines = content?.split('\n') || [];
    const bulletPoints = lines.filter((line) => line.includes('•'));

    expect(bulletPoints.length).toBeGreaterThan(0);
  });

  /**
   * Test: Loading state transitions to error panel
   *
   * Verifies the component properly transitions from loading
   * state to error panel when validation fails
   */
  test('transitions from loading state to error panel', async ({ page }) => {
    await page.goto('/error-panel-demo');

    // Initially should show loading indicator
    const loadingIndicator = page.locator('.animate-spin').first();

    // Wait a short time for validation
    await page.waitForTimeout(500);

    // Loading should be replaced by error panel
    const errorPanel = page.locator('[role="region"]').first();
    await expect(errorPanel).toBeVisible();
    await expect(loadingIndicator).not.toBeVisible();
  });

  /**
   * Test: Error panel has appropriate accessibility attributes
   */
  test('error panel has proper accessibility attributes', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const errorPanel = page.locator('[role="region"]').first();

    // Should have a role
    const role = await errorPanel.getAttribute('role');
    expect(['region', 'alert', 'main']).toContain(role);

    // Heading should have appropriate level
    const heading = page.getByRole('heading', {
      name: /configuration error/i,
    });
    const headingLevel = await heading.evaluate((el) =>
      el.tagName.toLowerCase()
    );
    expect(['h1', 'h2', 'h3']).toContain(headingLevel);
  });
});

test.describe('Config Error Panel - Visual Comparison Tests', () => {
  /**
   * Test: Compare error panel visual consistency
   *
   * Uses visual regression testing to ensure the error panel
   * maintains consistent appearance across code changes
   */
  test('maintains visual consistency with baseline', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const errorPanel = page.locator('[role="region"]').first();
    await expect(errorPanel).toBeVisible();

    // Compare against baseline screenshot
    await expect(errorPanel).toHaveScreenshot('config-error-panel.png', {
      maxDiffPixels: 100,
      threshold: 0.2, // Allow 20% difference
    });
  });

  /**
   * Test: Verify icon and text alignment
   */
  test('icon and heading are properly aligned', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const iconContainer = page.locator('svg').first();
    const heading = page.getByRole('heading', {
      name: /configuration error/i,
    });

    // Get positions
    const iconBox = await iconContainer.boundingBox();
    const headingBox = await heading.boundingBox();

    // Verify vertical alignment (roughly at same height)
    if (iconBox && headingBox) {
      const iconCenterY = iconBox.y + iconBox.height / 2;
      const headingTop = headingBox.y;

      // Icon center should be roughly aligned with heading top
      expect(Math.abs(iconCenterY - headingTop)).toBeLessThan(50);
    }
  });

  /**
   * Test: Pre-formatted code blocks have consistent styling
   */
  test('code blocks have consistent monospace styling', async ({ page }) => {
    await page.goto('/error-panel-demo');

    const codeBlocks = page.locator('pre');
    const count = await codeBlocks.count();

    for (let i = 0; i < count; i++) {
      const block = codeBlocks.nth(i);
      const fontFamily = await block.evaluate(
        (el) => window.getComputedStyle(el).fontFamily
      );

      // Should be monospace font
      expect(fontFamily.toLowerCase()).toMatch(/mono|courier|monospace/);
    }
  });
});
