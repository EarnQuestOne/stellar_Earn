import { defineConfig, devices } from '@playwright/test';

/**
 * StellarEarn – Optimised Playwright configuration
 * Issue #399 | Close #399
 *
 * Key improvements over the default config:
 *  1. Parallelisation – workers scaled to available CPU cores.
 *  2. Faster timeouts – reasonable limits prevent slow tests from stalling CI.
 *  3. Retries only in CI – local runs fail fast for quick feedback.
 *  4. Single browser in CI (Chromium) – add more in matrix if needed.
 *  5. Reuse server between workers – avoids spawning Next.js once per worker.
 *  6. Sharding-ready – pass --shard=1/4 etc. from CI without config changes.
 */

export default defineConfig({
  /* ─── Test Discovery ─────────────────────────────────────────── */
  testDir: './tests',
  testMatch: '**/*.{spec,test}.{ts,tsx}',

  /* ─── Parallelisation ────────────────────────────────────────── */
  // Run all test files in parallel; each file gets its own worker.
  fullyParallel: true,
  // Use all available CPU cores in CI; limit to 50 % locally so the
  // dev machine stays responsive.
  workers: process.env.CI ? '100%' : '50%',

  /* ─── Retries ────────────────────────────────────────────────── */
  // Retry flaky tests twice in CI; never retry locally (fail fast).
  retries: process.env.CI ? 2 : 0,

  /* ─── Timeouts ───────────────────────────────────────────────── */
  // Per-test timeout (ms).  Default is 30 000; we tighten it slightly.
  timeout: 25_000,
  // Timeout for each expect() assertion.
  expect: {
    timeout: 5_000,
  },

  /* ─── Reporting ──────────────────────────────────────────────── */
  reporter: process.env.CI
    ? [
        ['github'],            // Annotates failed tests directly in the PR
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
      ]
    : [
        ['list'],              // Concise per-test output in the terminal
        ['html', { open: 'on-failure', outputFolder: 'playwright-report' }],
      ],

  /* ─── Shared browser settings ────────────────────────────────── */
  use: {
    /* Base URL – populated from env or falls back to the local dev server. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',

    /* Capture evidence only on failure to keep runs lean. */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    /* Network & navigation */
    navigationTimeout: 15_000,
    actionTimeout: 8_000,

    /* Disable animations for deterministic visual state. */
    launchOptions: {
      args: ['--disable-animations'],
    },
  },

  /* ─── Browser projects ───────────────────────────────────────── */
  projects: process.env.CI
    ? [
        // CI: Chromium only – fast, reliable, cheapest on runners.
        // Extend to webkit / firefox in a separate scheduled matrix if needed.
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'mobile-chrome',
          use: { ...devices['Pixel 5'] },
        },
      ]
    : [
        // Local: all three engines so developers catch cross-browser issues early.
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ],

  /* ─── Output ─────────────────────────────────────────────────── */
  outputDir: 'test-results',

  /* ─── Dev-server management ──────────────────────────────────── */
  // Playwright starts the Next.js dev server once and shares it across
  // all workers – dramatically faster than each worker starting its own.
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    // Reuse an already-running server in local dev; always start fresh in CI.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});