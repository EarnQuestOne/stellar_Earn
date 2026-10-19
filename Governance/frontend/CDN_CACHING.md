# Frontend CDN and Caching-Header Policy

This policy defines how the StellarEarn frontend is cached at the CDN and browser
layers, which headers each response class must send, and how caches are
invalidated on deploy. It applies to the Next.js application in `FrontEnd/my-app`
and to every static asset served through the project's CDN.

- **Owner:** Frontend maintainers, with the platform/infrastructure team as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Build reproducibility](BUILD_REPRODUCIBILITY.md), [PWA policy](PWA_POLICY.md), [Data fetching](DATA_FETCHING.md)

## Cache classes

| Response | Header baseline | Rationale |
|----------|-----------------|-----------|
| Content-hashed build assets (`/_next/static/*`, fonts, compiled CSS) | `Cache-Control: public, max-age=31536000, immutable` | The filename changes when the content changes |
| Versioned images and media | `Cache-Control: public, max-age=2592000, stale-while-revalidate=86400` | Rarely change; revalidate in the background |
| Public marketing HTML | `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600` | Short shared cache with fast revalidation |
| Authenticated application HTML | `Cache-Control: private, no-store` | Must never be stored by a shared cache |
| API responses containing account data | `Cache-Control: private, no-store` | Prevents cross-user leakage |
| Health, readiness, and auth callbacks | `Cache-Control: no-store` | Must always reflect current state |
| Service worker and web manifest | `Cache-Control: no-cache` | Updates must be observed promptly |

`Vary` must include `Accept-Encoding` for compressible responses and
`Authorization` or `Cookie` wherever the response depends on them. Do not use
`public` on any response that varies by user identity.

## Rules

- Only content-hashed assets may be marked `immutable`.
- HTML must not be cached for longer than five minutes at the shared layer, and
  never at the browser layer for authenticated routes.
- Responses must not be cached if they set or depend on a session cookie.
- CDN configuration must strip or normalize hop-by-hop headers and must not
  forward internal tracing headers to clients.
- Compression is enabled for text responses; already-compressed media is not
  re-compressed.
- Security headers (HSTS, `X-Content-Type-Options`, frame policy, and the
  project's Content-Security-Policy) are applied at the edge and must survive
  caching.

## Invalidation on deploy

- A deploy publishes a new content hash for every changed build asset. Old
  hashed assets remain available for at least 7 days so that sessions open
  across a deploy continue to load.
- The deployment pipeline purges cached HTML, the web manifest, and the service
  worker in one operation. It must not purge hashed static assets.
- Each deploy exposes a build identifier in a response header and in the
  application health endpoint so that operators can confirm which version is
  being served.
- A rollback purges the same HTML and manifest paths and restores the previous
  build. CDN rollback is part of the release runbook, not an ad-hoc action.

## Verification

- After each production deploy, the pipeline checks that HTML returns the new
  build identifier and that a sample hashed asset returns `immutable`.
- Automated checks fail the release if an authenticated route returns a
  `public` or long-lived cache header.
- Cache hit ratio, origin error rate, and purge failures are monitored. A purge
  failure is treated as a deployment failure until resolved.

## Ownership and review

The frontend maintainers own the response-header rules; the platform team owns
CDN configuration and purge automation. The policy is reviewed every six months
and whenever the hosting provider, Next.js caching model, or authentication
model changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
