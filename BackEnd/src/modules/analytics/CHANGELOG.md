# analytics module changelog

All notable changes to the `analytics` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
