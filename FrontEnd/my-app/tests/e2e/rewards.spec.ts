import { test, expect } from "@playwright/test";

/**
 * Rewards / claim flow E2E tests.
 *
 * Covers the critical user paths on /rewards:
 *   - Page header, sidebar copy, and pending-rewards list
 *   - The pending list reflects mock submissions whose status is Approved
 *   - Successful claim path → success modal → transaction hash → "Done"
 *     closes the modal, the pending list empties, and Claim History gains a
 *     row
 *   - Failed claim path → error modal with "Try Again"
 *
 * `claimReward` in `lib/stellar/claim.ts` calls `Math.random()` to pick
 * between fake-success and fake-error responses. We override `Math.random`
 * *just before* the click (rather than via `addInitScript`) because patching
 * it before React hydrates breaks `useId` and other hashing inside React 19.
 */
test.describe("Rewards Claim Flow", () => {
  // Suppress the analytics consent banner so it cannot intercept clicks on
  // the page-level "Claim All Rewards" button.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "stellar_earn_analytics_consent",
        JSON.stringify({ status: "denied", version: "1" })
      );
    });
  });

  test("renders the rewards header and informational sidebar", async ({
    page,
  }) => {
    await page.goto("/rewards");

    await expect(
      page.getByRole("heading", { name: "Rewards", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByText(
        /claim your earned rewards and track your transaction history/i
      )
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /stellar rewards/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /claim history/i })
    ).toBeVisible();
  });

  test("lists at least one pending reward and exposes the Claim All button", async ({
    page,
  }) => {
    await page.goto("/rewards");

    await expect(
      page.getByRole("heading", { name: /claimable rewards/i })
    ).toBeVisible();

    const claimBtn = page.getByRole("button", { name: /claim all rewards/i });
    await expect(claimBtn).toBeVisible();
    await expect(claimBtn).toBeEnabled();

    // Claim history is empty until the user actually claims.
    await expect(
      page.getByText(/you haven't claimed any rewards yet/i)
    ).toBeVisible();
  });

  test("a successful claim opens the modal, shows the tx hash, and clears the pending list", async ({
    page,
  }) => {
    await page.goto("/rewards");

    const claimBtn = page.getByRole("button", { name: /claim all rewards/i });
    await expect(claimBtn).toBeEnabled({ timeout: 10_000 });

    // Force the success branch (claimReward checks Math.random() > 0.05).
    await page.evaluate(() => {
      Math.random = () => 0.5;
    });
    await claimBtn.click();

    const dialog = page.getByRole("dialog", { name: /claim transaction/i });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /claim successful/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText(/transaction hash/i)).toBeVisible();
    await expect(dialog.locator("code")).toBeVisible();

    await dialog.getByRole("button", { name: /^Done$/ }).click();
    await expect(dialog).toBeHidden();

    // The pending list is now empty, and a row has been recorded in Claim
    // History (rendered with the "Success" status pill).
    await expect(page.getByText(/no pending rewards to claim/i)).toBeVisible();
    await expect(
      page.getByText(/you haven't claimed any rewards yet/i)
    ).toBeHidden();
    await expect(page.getByRole("cell", { name: /^Success$/ })).toBeVisible();
  });

  test("a failed claim shows the error modal with a Try Again action", async ({
    page,
  }) => {
    await page.goto("/rewards");

    const claimBtn = page.getByRole("button", { name: /claim all rewards/i });
    await expect(claimBtn).toBeEnabled({ timeout: 10_000 });

    // Force the failure branch (Math.random() <= 0.05).
    await page.evaluate(() => {
      Math.random = () => 0;
    });
    await claimBtn.click();

    const dialog = page.getByRole("dialog", { name: /claim transaction/i });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /transaction failed/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      dialog.getByRole("button", { name: /try again/i })
    ).toBeVisible();

    await dialog.getByRole("button", { name: /try again/i }).click();
    await expect(dialog).toBeHidden();

    // After the error, the pending list still has rewards available.
    await expect(
      page.getByRole("heading", { name: /claimable rewards/i })
    ).toBeVisible();
  });
});
