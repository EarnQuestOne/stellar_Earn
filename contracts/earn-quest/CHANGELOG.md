# Changelog

All notable changes to the EarnQuest smart contract will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) adapted for contract storage, events, and public interfaces as defined in the [Changelog Discipline Policy](docs/CHANGELOG_DISCIPLINE.md).

---

## [Unreleased]

### Added
- 2-of-2 SuperAdmin clawback: `initiate_clawback` and `execute_clawback` entry points in `payout.rs` allow two distinct SuperAdmins to collaboratively recover funds sent to a fraudulent recipient. Emits `ClawbackInitiated` and `ClawbackExecuted` events. Adds `ClawbackPending` storage key, `ClawbackNotFound` (150) and `ClawbackAlreadySigned` (151) error variants.
- Added 	est_double_claim.rs: verifies that a second claim on the same submission is rejected, preventing double-claim under concurrent attempts.
- Added the [Changelog Discipline Policy](docs/CHANGELOG_DISCIPLINE.md) to define how contract-breaking changes, migrations, and version bumps must be documented.
- Added CI validation for contract changelog updates and breaking-change metadata so contract interface changes cannot merge without matching release notes.
- Initialized this changelog so future contract releases have a single source of truth.
- Added `gas_budget.rs` module defining explicit instruction-count ceilings per entrypoint (`init`, `reg_qst`, `sub_prf`, `appr_sub`, `clm_rwd`) and a `within_budget` helper for regression checks.
- Minimum creator level requirement and creator whitelist. Admin can set a level threshold (default 0 = disabled); quest creation fails if the creator's XP level is below it. Whitelisted addresses bypass the check.

---

## [1.0.0] - 2025-04-27

Initial stable release of the EarnQuest smart contract.

### Added
- Added 	est_double_claim.rs: verifies that a second claim on the same submission is rejected, preventing double-claim under concurrent attempts.
- Core quest registration system supporting deadlines, rewards, and designated verifiers.
- Escrow contract integration to secure token funds during quest execution.
- User reputation module containing XP awarding, user levels, and badge grants.
- Multi-admin role system and emergency circuit breaker (pause/unpause operations).
- Basic unit and integration test suite.