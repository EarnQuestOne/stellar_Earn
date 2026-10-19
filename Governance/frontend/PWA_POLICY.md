# Frontend Offline and PWA Support Policy

This policy defines what StellarEarn's progressive web app may do offline, how
the service worker is updated, and which data must never be cached. It applies to
the Next.js application in `FrontEnd/my-app`, its web manifest, and every service
worker or offline fallback shipped with the frontend.

- **Owner:** Frontend maintainers, with the platform team as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [State UX](STATE_UX.md), [Release policy](../RELEASE_POLICY.md), [Hotfix policy](../HOTFIX_POLICY.md), [CI/CD policy](../CICD_POLICY.md)

## Offline expectations

- The application remains installable and can show a cached shell, a clear
  offline notice, and navigation to previously visited public pages.
- Read-only, non-sensitive data may be shown from cache with a visible indication
  that it may be stale.
- Authenticated pages, wallet balances, payout status, and any account-specific
  response must not be served from a shared cache. Cached account data is
  cleared on logout.
- Transactions, submissions, wallet signatures, and settings changes are not
  performed offline. The UI disables them and explains that a connection is
  required. Silent queuing of financial actions is prohibited.
- The app detects connectivity changes and exits offline mode without requiring
  a manual reload where practical. Failed requests retry only with user action
  or a bounded backoff; they do not loop.
- Offline behaviour must not misrepresent stale data as current.

## Service-worker update rules

- Hashed static assets use a cache-first strategy. Navigations use a
  network-first strategy with an offline fallback. API requests are never cached
  by the service worker unless the endpoint is explicitly public and
  non-personal.
- Caches are versioned by build identifier. On activation, the worker deletes
  caches from previous versions and leaves the current hashed assets intact.
- A new service worker waits until the user accepts an update prompt, except for
  security-critical fixes, which may activate immediately with a reload notice.
- Users see an update-available notice with an action to reload. The application
  must not reload a page with unsaved input without warning.
- The worker is served with `Cache-Control: no-cache` so that updates are
  detected promptly.
- A kill switch allows the team to unregister the worker or disable offline
  behaviour through a remote configuration flag without shipping a new build.

## Manifest and installation

- The web manifest declares the application name, start URL, scope, display
  mode, theme colors, and icons at the required sizes.
- The install prompt is offered only after the user has had a chance to use the
  application, and declining it is respected.
- Installed and browser experiences share the same authentication and privacy
  rules. Installation must not create a separate data store.
- The service worker scope is limited to the application origin and does not
  intercept third-party requests.

## Privacy and security

- Cached responses are treated as untrusted input and are validated before use.
- Clearing site data removes all cached content. Logout clears user-specific
  caches even if the browser retains the service worker.
- The service worker does not cache authentication tokens, API responses with
  personal data, or anything served with `Cache-Control: private` or `no-store`.
- Security headers apply to service-worker responses as they do to normal
  responses.

## Verification and monitoring

- Automated tests cover first load, offline reload, update activation, cache
  cleanup, and logout cache clearing.
- Release checks confirm that a new build invalidates the previous cache and that
  the offline fallback is served when the network is unavailable.
- Errors from service-worker registration and activation are reported through
  the monitored error pipeline, without user identifiers.
- A failed update must leave the previous working version available.

## Ownership and review

The frontend maintainers own the offline experience; the platform team owns CDN
and header configuration. The security and privacy owners review changes to
cached data classes. The policy is reviewed every six months and whenever the
framework, hosting, or authentication model changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
