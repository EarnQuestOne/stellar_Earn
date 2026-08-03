# payouts module changelog

All notable changes to the `payouts` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Partial indexes (`WHERE "deletedAt" IS NULL`) on `Payout` for `status` and `[type, status]` columns to speed up active-payout queries (#2000).
- `processBatchPayouts()` method that groups PENDING/RETRY_SCHEDULED payouts by asset and submits them in batches of up to 100 operations per Stellar transaction via `StellarService.sendBatchPayments()` (#1981).
- `processPendingBatch()` cron job (`EVERY_30_SECONDS`) that drives the batch payout processing loop (#1981).
- `claimPayout` now sets status to `PENDING` instead of `PROCESSING` so the batch cron picks up the payout (#1981).
- `executeStellarPayment` now delegates to `stellarService.sendPayment()` for production payments instead of throwing (#1981).
- `StellarModule` imported into `PayoutsModule` so `StellarService` is available for injection (#1981).
- Batch payout metrics (`batch_payout_total`, `batch_payout_operations`, `batch_payout_size`) recorded via `MetricsService` (#1981).
- Redis-backed payout status polling cache via `JobResultStatusCacheService` to avoid Postgres reads on repeated `GET /payouts/:id` polls (#1983).

### Changed
- Code formatting and improved readability in PayoutsService error handling
- `FraudRiskRulesService.getRiskStatistics` now runs all aggregate queries in parallel.
- `FraudRiskRulesService.analyzeRecentPayouts` now analyzes all payouts in parallel via `Promise.allSettled`.
- `PayoutsService.confirmPendingSettlements` now confirms settlement finality in parallel via `Promise.allSettled`.
