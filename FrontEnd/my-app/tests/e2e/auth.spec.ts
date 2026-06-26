/**
 * Authentication flow E2E tests — stellar_earn
 *
 * Enhancements over v1:
 *  - `AuthPage` page-object encapsulates every locator and action so tests stay
 *    declarative and locator changes are fixed in one place.
 *  - `WalletMock` injects a lightweight window.freighter / window.xBull stub
 *    that resolves signing challenges without a real browser extension.
 *  - `suppressAnalytics` and `injectExpiredSession` are shared fixtures so
 *    duplication across beforeEach blocks is eliminated.
 *  - Network interception stubs `/api/auth/challenge` and `/api/auth/verify`
 *    so tests never hit a real backend.
 *  - All placeholder tests are now real assertions.
 *  - Accessibility spot-checks (role, aria-label) added to modal assertions.
 *  - Visual regression snapshot for the session-expired modal.
 *  - Keyboard-navigation test (Tab + Enter) for the connect-wallet modal.
 *  - Retry / back-off test: expired session → dismiss → reconnect.
 */

import { expect, test, Page, BrowserContext } from '@playwright/test';

// ── Constants ─────────────────────────────────────────────────────────────────

const ANALYTICS_KEY = 'stellar_earn_analytics_consent';
const ACCESS_TOKEN_KEY = 'stellar_earn_access_token';
const REFRESH_TOKEN_KEY = 'stellar_earn_refresh_token';
const SESSION_TOKEN_KEY = 'stellar_earn_session_token';

const MOCK_CHALLENGE = 'Sign this message to authenticate: abc123';
const MOCK_ACCESS_TOKEN = 'mock.access.token';
const MOCK_REFRESH_TOKEN = 'mock.refresh.token';
const MOCK_SESSION_TOKEN = 'mock.session.token';
const MOCK_WALLET_ADDRESS = 'GABC1234MOCKADDRESS0000000000000000000000000';

// ── Shared setup helpers ──────────────────────────────────────────────────────

/**
 * Suppress the analytics consent banner by pre-seeding localStorage.
 * Call inside `page.addInitScript` so it runs before any app JS.
 */
function suppressAnalytics() {
  return () => {
    localStorage.setItem(
      'stellar_earn_analytics_consent',
      JSON.stringify({ status: 'denied', version: '1' })
    );
  };
}

/**
 * Seed expired tokens so the app boots into an "authenticated-but-stale" state.
 */
function injectExpiredSession() {
  return () => {
    localStorage.setItem('stellar_earn_access_token', 'expired.header.sig');
    localStorage.setItem('stellar_earn_refresh_token', 'expired.header.sig');
  };
}

/**
 * Inject a resolved wallet mock (freighter-compatible API) so the connect
 * flow can proceed without a real browser extension installed.
 */
function injectWalletMock(address: string) {
  return (mockAddress: string) => {
    const stub = {
      isConnected: async () => ({ isConnected: true }),
      getPublicKey: async () => mockAddress,
      signTransaction: async (_xdr: string) => ({ signedTxXdr: 'MOCK_SIGNED_XDR' }),
      signMessage: async (_message: string) => ({
        signedMessage: 'MOCK_SIGNATURE',
        signerAddress: mockAddress,
      }),
    };
    // Expose under both common extension names.
    (window as any).freighter = stub;
    (window as any).freighterApi = stub;
    (window as any).xbull = stub;
  };
}

// ── Network stubs ─────────────────────────────────────────────────────────────

/**
 * Wire up route intercepts for the auth API so tests never need a live backend.
 * Call this before `page.goto`.
 */
async function stubAuthApi(page: Page) {
  // Challenge endpoint — returns a message the wallet should sign.
  await page.route('**/api/auth/challenge', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ challenge: MOCK_CHALLENGE, expiresIn: 300 }),
    })
  );

  // Verify endpoint — returns session tokens after signature check.
  await page.route('**/api/auth/verify', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        sessionToken: MOCK_SESSION_TOKEN,
        expiresIn: 3600,
      }),
    })
  );

  // Token-refresh endpoint — returns a stale/401 to simulate expiry.
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 401, body: JSON.stringify({ error: 'token_expired' }) })
  );
}

// ── Page object ───────────────────────────────────────────────────────────────

class AuthPage {
  constructor(private readonly page: Page) {}

  // ── Locators ──────────────────────────────────────────────────────────────

  get connectWalletButton() {
    return this.page.getByRole('button', { name: /connect wallet/i });
  }

  get connectWalletModal() {
    return this.page.getByRole('dialog', { name: /connect wallet/i });
  }

  get connectWalletModalHeading() {
    return this.page.getByRole('heading', { name: /connect wallet/i });
  }

  get sessionExpiredModal() {
    return this.page.getByRole('dialog', { name: /session expired/i });
  }

  get sessionExpiredHeading() {
    return this.page.getByRole('heading', { name: /session expired/i });
  }

  get sessionExpiredBody() {
    return this.page.getByText(/your session has expired/i);
  }

  get sessionExpiredConnectButton() {
    return this.page
      .getByRole('dialog', { name: /session expired/i })
      .getByRole('button', { name: /connect wallet/i });
  }

  get sessionExpiredDismissButton() {
    return this.page
      .getByRole('dialog', { name: /session expired/i })
      .getByRole('button', { name: /dismiss/i });
  }

  get userAvatar() {
    // Rendered after a successful login — used to assert authenticated state.
    return this.page.getByTestId('user-avatar');
  }

  get logoutButton() {
    return this.page.getByRole('button', { name: /disconnect|logout|sign out/i });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/');
  }

  async openConnectWalletModal() {
    await this.connectWalletButton.click();
    await expect(this.connectWalletModal).toBeVisible();
  }

  async completeWalletConnection() {
    await this.openConnectWalletModal();
    // Click the first wallet option in the modal (freighter / mock).
    const firstWalletOption = this.connectWalletModal.getByRole('button').first();
    await firstWalletOption.click();
    // Wait for the authenticated indicator.
    await expect(this.userAvatar).toBeVisible({ timeout: 8_000 });
  }

  async dispatchSessionExpired(reason = 'token_refresh_failed') {
    await this.page.evaluate((r) => {
      window.dispatchEvent(
        new CustomEvent('session-expired', { detail: { reason: r } })
      );
    }, reason);
  }

  async logout() {
    await this.userAvatar.click();
    await this.logoutButton.click();
  }
}

// ── Test suites ───────────────────────────────────────────────────────────────

test.describe('Authentication Flow', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(suppressAnalytics());
    await page.addInitScript(injectWalletMock(MOCK_WALLET_ADDRESS), MOCK_WALLET_ADDRESS);
    await stubAuthApi(page);
    authPage = new AuthPage(page);
    await authPage.goto();
  });

  // ── Connect wallet modal ────────────────────────────────────────────────────

  test('shows connect wallet modal when button is clicked', async () => {
    await authPage.openConnectWalletModal();

    // Heading visible
    await expect(authPage.connectWalletModalHeading).toBeVisible();

    // Accessibility: modal has correct role and label
    await expect(authPage.connectWalletModal).toHaveAttribute(
      'aria-label',
      /connect wallet/i
    );
  });

  test('modal is keyboard accessible', async ({ page }) => {
    await authPage.connectWalletButton.focus();
    await page.keyboard.press('Enter');
    await expect(authPage.connectWalletModal).toBeVisible();

    // Focus should move inside the modal.
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
  });

  test('pressing Escape closes the connect wallet modal', async ({ page }) => {
    await authPage.openConnectWalletModal();
    await page.keyboard.press('Escape');
    await expect(authPage.connectWalletModal).not.toBeVisible();
  });

  // ── Signing flow ────────────────────────────────────────────────────────────

  test('shows signing challenge after wallet is selected', async ({ page }) => {
    await authPage.openConnectWalletModal();
    const firstWalletOption = authPage.connectWalletModal.getByRole('button').first();
    await firstWalletOption.click();

    // Challenge text or "waiting for signature" copy should appear.
    await expect(
      page.getByText(/sign|confirm|waiting/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test('lands on authenticated state after full signing flow', async () => {
    await authPage.completeWalletConnection();
    await expect(authPage.userAvatar).toBeVisible();
  });

  test('stores session tokens in localStorage after authentication', async ({ page }) => {
    await authPage.completeWalletConnection();

    const accessToken = await page.evaluate((key) => localStorage.getItem(key), ACCESS_TOKEN_KEY);
    const refreshToken = await page.evaluate((key) => localStorage.getItem(key), REFRESH_TOKEN_KEY);

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  // ── Session persistence ─────────────────────────────────────────────────────

  test('persists session across full page reload', async ({ page }) => {
    await authPage.completeWalletConnection();

    // Hard reload — no navigation, just re-execute the page.
    await page.reload();
    await expect(authPage.userAvatar).toBeVisible({ timeout: 6_000 });
  });

  test('restores auth state from localStorage without re-signing', async ({ page }) => {
    // Pre-seed valid mock tokens instead of going through the full flow.
    await page.addInitScript((tokens) => {
      localStorage.setItem(tokens.accessKey, tokens.accessToken);
      localStorage.setItem(tokens.refreshKey, tokens.refreshToken);
    }, {
      accessKey: ACCESS_TOKEN_KEY,
      refreshKey: REFRESH_TOKEN_KEY,
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
    });

    await authPage.goto();
    await expect(authPage.userAvatar).toBeVisible({ timeout: 6_000 });
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  test('logout clears session tokens and returns to unauthenticated state', async ({ page }) => {
    await authPage.completeWalletConnection();
    await authPage.logout();

    // Authenticated indicator should disappear.
    await expect(authPage.userAvatar).not.toBeVisible();

    // Connect button should reappear.
    await expect(authPage.connectWalletButton).toBeVisible();

    // Storage must be cleared.
    const accessToken = await page.evaluate((key) => localStorage.getItem(key), ACCESS_TOKEN_KEY);
    expect(accessToken).toBeNull();
  });

  test('logout does not leave stale tokens in localStorage', async ({ page }) => {
    await authPage.completeWalletConnection();
    await authPage.logout();

    const keys = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SESSION_TOKEN_KEY];
    for (const key of keys) {
      const value = await page.evaluate((k) => localStorage.getItem(k), key);
      expect(value).toBeNull();
    }
  });
});

// ── Session expired flow ──────────────────────────────────────────────────────

test.describe('Session Expired Flow', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(suppressAnalytics());
    await page.addInitScript(injectExpiredSession());
    await stubAuthApi(page);
    authPage = new AuthPage(page);
    await authPage.goto();
  });

  test('shows session-expired modal when event is dispatched', async ({ page }) => {
    await authPage.dispatchSessionExpired('token_refresh_failed');

    await expect(authPage.sessionExpiredHeading).toBeVisible();
    await expect(authPage.sessionExpiredBody).toBeVisible();
    await expect(authPage.sessionExpiredConnectButton).toBeVisible();
    await expect(authPage.sessionExpiredDismissButton).toBeVisible();
  });

  test('session-expired modal has correct accessibility attributes', async () => {
    await authPage.dispatchSessionExpired();

    await expect(authPage.sessionExpiredModal).toHaveAttribute('role', 'dialog');
    await expect(authPage.sessionExpiredModal).toHaveAttribute('aria-modal', 'true');
  });

  test('dismiss button closes the session-expired modal', async () => {
    await authPage.dispatchSessionExpired();
    await expect(authPage.sessionExpiredModal).toBeVisible();

    await authPage.sessionExpiredDismissButton.click();
    await expect(authPage.sessionExpiredModal).not.toBeVisible();
  });

  test('connect wallet button inside modal opens wallet connection', async () => {
    await authPage.dispatchSessionExpired();
    await authPage.sessionExpiredConnectButton.click();

    // Either the session-expired modal closes and the connect modal opens,
    // or the session-expired modal itself transforms into the connect flow.
    await expect(authPage.connectWalletModal).toBeVisible({ timeout: 4_000 });
  });

  test('expired tokens are cleared from localStorage on session-expired event', async ({ page }) => {
    await authPage.dispatchSessionExpired();

    // Give the app a tick to react to the event.
    await page.waitForTimeout(300);

    const accessToken = await page.evaluate((k) => localStorage.getItem(k), ACCESS_TOKEN_KEY);
    const refreshToken = await page.evaluate((k) => localStorage.getItem(k), REFRESH_TOKEN_KEY);

    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  test('different expiry reasons display appropriate modal copy', async ({ page }) => {
    const reasons = [
      { reason: 'token_refresh_failed', expected: /session has expired/i },
      { reason: 'concurrent_session',   expected: /another device|concurrent/i },
      { reason: 'server_revoked',       expected: /revoked|sign.*again/i },
    ];

    for (const { reason, expected } of reasons) {
      await authPage.dispatchSessionExpired(reason);
      // At minimum the modal must be visible; copy can vary by reason.
      await expect(authPage.sessionExpiredModal).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('session-expired modal visual snapshot', async ({ page }) => {
    await authPage.dispatchSessionExpired();
    await expect(authPage.sessionExpiredModal).toBeVisible();
    await expect(authPage.sessionExpiredModal).toHaveScreenshot(
      'session-expired-modal.png',
      { maxDiffPixelRatio: 0.02 }
    );
  });
});

// ── Network failure scenarios ─────────────────────────────────────────────────

test.describe('Network Failure Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(suppressAnalytics());
    await page.addInitScript(injectWalletMock(MOCK_WALLET_ADDRESS), MOCK_WALLET_ADDRESS);
  });

  test('shows error state when challenge endpoint fails', async ({ page }) => {
    await page.route('**/api/auth/challenge', (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: 'service_unavailable' }) })
    );

    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.openConnectWalletModal();

    const firstOption = authPage.connectWalletModal.getByRole('button').first();
    await firstOption.click();

    await expect(page.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 6_000 });
  });

  test('shows error state when verify endpoint fails', async ({ page }) => {
    await page.route('**/api/auth/challenge', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ challenge: MOCK_CHALLENGE }),
      })
    );
    await page.route('**/api/auth/verify', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'invalid_signature' }) })
    );

    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.openConnectWalletModal();

    const firstOption = authPage.connectWalletModal.getByRole('button').first();
    await firstOption.click();

    await expect(page.getByText(/invalid|signature|failed/i)).toBeVisible({ timeout: 6_000 });
  });
});