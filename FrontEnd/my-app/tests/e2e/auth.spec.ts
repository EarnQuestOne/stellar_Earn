import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should show connect wallet modal", async ({ page }) => {
    await page.click('aria-label="Connect wallet"');
    await expect(page.locator("text=Connect Wallet")).toBeVisible();
  });

  test("should show challenge after wallet connection", async () => {
    // Manual verification remains necessary until wallet mocking is wired into E2E.
    console.log("Manual verification required for the full signing flow");
  });

  test("should persist session on reload", async () => {
    // Placeholder for session persistence coverage once wallet mocking is available.
  });

  test("should logout correctly", async () => {
    // Placeholder for logout coverage once wallet mocking is available.
  });
});