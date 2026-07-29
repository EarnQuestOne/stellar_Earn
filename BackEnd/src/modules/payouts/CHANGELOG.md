# payouts module changelog

All notable changes to the `payouts` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Partial indexes (`WHERE "deletedAt" IS NULL`) on `Payout` for `status` and `[type, status]` columns to speed up active-payout queries (#2000).
- Redis-backed payout status polling cache via `JobResultStatusCacheService` to avoid Postgres reads on repeated `GET /payouts/:id` polls (#1983).

### Changed
- Code formatting and improved readability in PayoutsService error handling
- `FraudRiskRulesService.getRiskStatistics` now runs all aggregate queries in parallel.
- `FraudRiskRulesService.analyzeRecentPayouts` now analyzes all payouts in parallel via `Promise.allSettled`.
- `PayoutsService.confirmPendingSettlements` now confirms settlement finality in parallel via `Promise.allSettled`.
