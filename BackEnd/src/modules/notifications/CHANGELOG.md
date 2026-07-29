# notifications module changelog

All notable changes to the `notifications` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Partial indexes (`WHERE "deletedAt" IS NULL`) on `Notification` for `userId` and `[userId, read]` columns to speed up active-notification queries (#2000).

### Changed
- `WebhookChannel` now uses `PooledHttpClientService` (keep-alive connection pool, 8 s `medium` timeout budget) instead of an unbounded raw `axios` call for webhook delivery.
