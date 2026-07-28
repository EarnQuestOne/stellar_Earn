# payouts module changelog

All notable changes to the `payouts` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Code formatting and improved readability in PayoutsService error handling
- `FraudRiskRulesService.getRiskStatistics` now runs all aggregate queries in parallel.
- `FraudRiskRulesService.analyzeRecentPayouts` now analyzes all payouts in parallel via `Promise.allSettled`.
- `PayoutsService.confirmPendingSettlements` now confirms settlement finality in parallel via `Promise.allSettled`.
