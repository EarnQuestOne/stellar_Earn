# moderation module changelog

All notable changes to the `moderation` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Moderation thresholds, blocklists, and external API settings are now loaded into one immutable in-memory snapshot and reused across checks. Runtime updates through `ModerationConfigCacheService.updateConfig()` invalidate and reload the snapshot.
- Added source-load, cache-invalidation, and load-duration metrics plus a reproducible moderation config benchmark.
- `ExternalModerationApiService` now uses `PooledHttpClientService` (keep-alive connection pool, 8 s `medium` timeout budget) instead of a raw `axios` call. `HttpClientModule` added to `ModerationModule` imports.
- `getDashboardStats` now runs pending review and pending appeals count queries in parallel.

### Fixed

- `listPending`/`listAppealsPending` now clamp `page`/`limit` server-side (limit capped at 100) as defense in depth, independent of the existing DTO-level `@Max(100)` validation at the controller boundary.
