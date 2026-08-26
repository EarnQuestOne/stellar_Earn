# notifications module changelog

All notable changes to the `notifications` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Partial indexes (`WHERE "deletedAt" IS NULL`) on `Notification` for `userId` and `[userId, read]` columns to speed up active-notification queries (#2000).
- **Notification deduplication** — identical notifications (same `recipient + type + entity`) arriving within a 30-second window are collapsed into a single database row and single dispatch, eliminating duplicate rows and redundant provider sends. Key changes:
  - New `entityId` column on `Notification` entity with composite dedup index.
  - In-memory dedup map with lazy TTL cleanup (no external dependency).
  - `notification_dedup_suppressed_total` and `notification_sent_total` metrics for observability.
  - `send()`, `sendSubmissionApproved()`, `sendSubmissionRejected()` methods on `NotificationsService`.
  - Notifications without an `entityId` are never deduplicated.
- 19 unit tests covering dedup behavior, window expiry, per-user/type isolation, and `markAllAsRead` batch UPDATE.

### Changed

- `NotificationsService` now injects `JobsService`, `NotificationTemplateService`, `MetricsService`, and repositories for `NotificationPreference` and `NotificationLog`.
- `NotificationsModule` imports `JobsModule` and registers all required TypeORM entities.
- `WebhookChannel` now uses `PooledHttpClientService` (keep-alive connection pool, 8 s `medium` timeout budget) instead of an unbounded raw `axios` call for webhook delivery.
