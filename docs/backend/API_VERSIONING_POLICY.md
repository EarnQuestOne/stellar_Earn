# API Versioning Policy — Semantic Versioning for Consumers

**Status:** Active  
**Owner:** Backend maintainers  
**Applies to:** StellarEarn REST API (`BackEnd/`, served under `/api`)  
**Related:** [Backend README](./README.md) · [OpenAPI / Swagger](http://localhost:3001/api/docs) · [Module API Reference](./module-apis.md)

---

## 1. Why This Policy Exists

The StellarEarn API is consumed by:

- The first-party web frontend (`FrontEnd/my-app/lib/api/*`)
- Future mobile clients, partner integrations, and automation scripts

Without a clear versioning policy, breaking HTTP contract changes can:

- Break clients silently after a deploy
- Leave integrators without a migration path
- Make deprecation and sunset timelines unpredictable

**This policy guarantees that API consumers can pin a version, detect deprecations, and plan upgrades using familiar SemVer rules.**

---

## 2. Version Format

The API uses **integer major versions** in URLs and headers. Each major version maps to a [Semantic Versioning](https://semver.org/) release family:

| API version | SemVer family | Example release | Status |
| ----------- | ------------- | --------------- | ------ |
| `v1`        | `1.x.x`       | `1.0.0` (current) | Active |

- **Major API version** (`1`, `2`, …): incremented only for **breaking** HTTP contract changes. Exposed as `/api/v1/...` or header `X-API-Version: 1`.
- **Minor / patch** (`1.1.0`, `1.0.1`): non-breaking additions and fixes within the same major version. Documented in release notes; no new URL prefix required.

Only **one major version is active** at a time unless a migration window is explicitly announced.

---

## 3. How to Specify a Version

Consumers **must** pin a major version using one or both of:

### 3.1 Path versioning (preferred)

```
GET /api/v1/quests
POST /api/v1/auth/login
```

### 3.2 Header versioning (alternative)

Send any of these headers (first match wins):

| Header            | Example value |
| ----------------- | ------------- |
| `X-API-Version`   | `1` or `v1`   |
| `Accept-Version`  | `1`           |
| `API-Version`     | `1`           |

Path and header may be combined; **path takes precedence** when both are present.

If no version is specified, the server defaults to **v1**.

---

## 4. Response Headers

Every HTTP response includes version metadata:

| Header          | When set | Consumer action |
| --------------- | -------- | --------------- |
| `X-API-Version` | Always   | Log or assert the resolved major version matches your pin |
| `Vary`          | Always   | `Accept, X-API-Version` — caches must vary on these |
| `Deprecation`   | Deprecated version or route | Plan migration; do not ignore |
| `Sunset`        | Deprecated version with known end date | ISO 8601 date after which the version may be removed |
| `Link`          | Deprecated version | `rel="sunset"` URL with migration documentation |
| `Warning`       | Deprecated version | RFC 7234 human-readable deprecation notice |

**Recommended client behaviour:**

1. Send `X-API-Version` on every request (in addition to path prefix).
2. In non-production, log `Deprecation` / `Warning` headers.
3. In production, emit metrics or alerts when deprecation headers appear.

---

## 5. Breaking vs Non-Breaking Changes

### 5.1 Breaking changes (require new major version)

| Change | Example |
| ------ | ------- |
| Removing or renaming a response field | `rewardAmount` removed |
| Changing a field's type or format | `id: number` → `id: string` |
| Making an optional request field required | `cursor` becomes mandatory |
| Changing HTTP status codes for the same input | `200` → `404` for missing resource |
| Removing or renaming an endpoint | `GET /quests/active` removed |
| Changing authentication requirements | Public route now requires JWT |

Breaking changes **must** ship under a new major version (e.g. `v2`) with a documented migration guide.

### 5.2 Non-breaking changes (same major version)

| Change | Example |
| ------ | ------- |
| Adding optional response fields | New `metadata` object |
| Adding new endpoints | `GET /quests/trending` |
| Adding optional query parameters | `?sort=createdAt` |
| Bug fixes that restore documented behaviour | Fix incorrect status code |

Non-breaking changes are released as minor (`1.1.0`) or patch (`1.0.1`) SemVer bumps within the `1.x.x` family.

---

## 6. Deprecation Lifecycle

When a major version or individual route is deprecated:

1. **Announce** in release notes and set `Deprecation: true` response headers.
2. **Set `Sunset`** to a date at least **6 months** in the future.
3. **Publish a migration guide** (linked via `Link: rel="sunset"`).
4. **Monitor** client traffic on the deprecated version.
5. **Remove** only after the sunset date and after confirming low/no traffic.

Deprecated versions remain **fully functional** until sunset unless a critical security issue requires earlier removal (with advance notice).

---

## 7. Unsupported Versions

Requests specifying an unsupported major version receive:

```
HTTP 400 Bad Request
{ "message": "API version '2' is not supported", "statusCode": 400 }
```

Check `X-API-Version` in successful responses to confirm the server resolved your intended version.

---

## 8. Consumer Checklist

- [ ] Pin major version in URL path (`/api/v1/...`)
- [ ] Send `X-API-Version: 1` header on all requests
- [ ] Read release notes before upgrading
- [ ] Monitor `Deprecation` and `Sunset` response headers
- [ ] Treat OpenAPI/Swagger (`/api/docs`) as the authoritative schema reference for your pinned version

---

## 9. Migration Guide Template (future major versions)

When `v2` is introduced, a migration document will include:

1. **Summary** — what changed and why
2. **Timeline** — deprecation and sunset dates for `v1`
3. **Endpoint mapping** — `v1` path → `v2` path
4. **Field mapping** — renamed/removed/added fields per endpoint
5. **Code examples** — before/after request and response samples
6. **Rollback** — how to revert if issues arise during migration

---

## 10. Changelog Discipline

API changes within a major version follow [Keep a Changelog](https://keepachangelog.com/) conventions:

- **Added** — new endpoints or optional fields
- **Changed** — non-breaking behaviour adjustments
- **Deprecated** — features scheduled for removal
- **Removed** — only in a new major version after sunset
- **Fixed** — bug fixes
- **Security** — vulnerability patches

Breaking changes require a `### Breaking Changes` section and a new major API version.
