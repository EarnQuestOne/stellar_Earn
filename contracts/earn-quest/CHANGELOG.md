# Changelog

All notable changes to the EarnQuest smart contract will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) adapted for contract storage, events, and custom interfaces as defined in the [Changelog Discipline Policy](docs/CHANGELOG_DISCIPLINE.md).

---

## [Unreleased]

### Added
- Added the [Changelog Discipline Policy](docs/CHANGELOG_DISCIPLINE.md) to define how contract-breaking changes, migrations, and version bumps must be documented.
- Added CI validation for contract changelog updates and breaking-change metadata so contract interface changes cannot merge without matching release notes.
- Initialized this changelog so future contract releases have a single source of truth.
- Added `gas_regression.rs` module with per-entrypoint baseline instruction counts and configurable delta thresholds; `check_regression` returns the overage amount on failure for use in CI assertions.

---

## [1.0.0] - 2025-04-27

Initial stable release of the EarnQuest smart contract.

### Added
- Core quest registration system supporting deadlines, rewards, and designated verifiers.
- Escrow contract integration to secure token funds during quest execution.
- User reputation module containing XP awarding, user levels, and badge grants.
- Multi-admin role system and emergency circuit breaker (pause/unpause operations).
- Basic unit and integration test suite.