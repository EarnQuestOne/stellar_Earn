# analytics module changelog

All notable changes to the `analytics` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Consolidated the platform-stats submission aggregates (total, approved, and distinct active users) into a single grouped query in `platform-analytics.service.ts`, replacing three separate COUNT scans over the same window and reducing database round-trips per dashboard load (#2146).
- Added short-TTL (30s) caching of the aggregated platform-stats result via `CacheService.wrap`, so bursts of dashboard requests for the same window reuse one computation (#2146).
- Applied code-style formatting to `quest-aggregator.ts`, `platform-analytics.service.ts`, and `quest-analytics.service.ts` (no logic change).

### Changed

- Replaced offset-based chunking with true database streaming cursors (`.stream()`) for data exports.
- Implemented network backpressure in stream exports (CSV, JSON, JSONL) to prevent memory spikes on large quests.

### Added

- Background platform analytics computation via scheduled cron job (every 5 minutes)
- Snapshot-based serving: `getPlatformStats()` reads pre-computed `AnalyticsSnapshot` data instead of running heavy synchronous queries
- Automatic fallback to live computation when no fresh snapshot exists
- `computeAndStorePlatformStats()` persists computed stats to `analytics_snapshots` table
- Metrics tracking: `analytics_computation_total` (source: snapshot|live) and `analytics_computation_duration_seconds` histogram
- Background cron job `computePlatformAnalytics()` on `EVERY_5_MINUTES` schedule
