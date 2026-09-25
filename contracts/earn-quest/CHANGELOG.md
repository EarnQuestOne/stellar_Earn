# Changelog

All notable changes to the EarnQuest smart contract will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) adapted for contract storage, events, and public interfaces as defined in the [Changelog Discipline Policy](docs/CHANGELOG_DISCIPLINE.md).

---

## [Unreleased]

### Fixed
- Quest registration now increments platform stats counters (`total_quests_created`, `total_rewards_distributed`).
- Centralized shared quest registration validation across the public registration entrypoints (#2234).
- Resolved appealed disputes no longer call `require_auth` twice on the admin arbitrator, which caused `Auth(ExistingValue)` failures.
- `get_admin` no longer panics with `.expect("Contract not initialized")` when the contract has not been initialized; it now returns `Error::NotInitialized` (code 93).

### Added

- Quest expiry bounds: per-quest grace periods and the global default grace period are now capped at `MAX_GRACE_PERIOD_SECONDS` (30 days) via `validate_grace_period`, so the effective quest expiry (`deadline + grace_period_seconds`) stays bounded even when the deadline itself is within `MAX_DEADLINE_DURATION`. Exceeding the cap returns `Error::GracePeriodTooLarge` (code 96) at quest registration and when admins update the default.
- Registered oracle configurations are now capped at `MAX_ORACLE_CONFIGS` (10) in `oracle.rs`/`storage.rs`, preventing unbounded instance storage growth and unbounded aggregation gas. Registering beyond the cap returns `Error::OracleLimitReached` (code 108); updating an existing oracle at the cap remains allowed.
- Property-based quest lifecycle invariant tests in `tests/property_tests.rs`: escrow balance, payout bounds, and cancel acyclicity are fuzzed via QuickCheck (1000 sequences) and proptest against the live Soroban client (50 sequences).
- 2-of-2 SuperAdmin clawback: `initiate_clawback` and `execute_clawback` entry points in `payout.rs` allow two distinct SuperAdmins to collaboratively recover funds sent to a fraudulent recipient. Emits `ClawbackInitiated` and `ClawbackExecuted` events. Adds `ClawbackPending` storage key, `ClawbackNotFound` (150) and `ClawbackAlreadySigned` (151) error variants.
- Added 	est_double_claim.rs: verifies that a second claim on the same submission is rejected, preventing double-claim under concurrent attempts.
- Added the [Changelog Discipline Policy](docs/CHANGELOG_DISCIPLINE.md) to define how contract-breaking changes, migrations, and version bumps must be documented.
- Added CI validation for contract changelog updates and breaking-change metadata so contract interface changes cannot merge without matching release notes.
- Initialized this changelog so future contract releases have a single source of truth.
- Added `gas_budget.rs` module defining explicit instruction-count ceilings per entrypoint (`init`, `reg_qst`, `sub_prf`, `appr_sub`, `clm_rwd`) and a `within_budget` helper for regression checks.
- Minimum creator level requirement and creator whitelist. Admin can set a level threshold (default 0 = disabled); quest creation fails if the creator's XP level is below it. Whitelisted addresses bypass the check.

### Breaking Changes

#### Events - `DisputeResolved` now carries the resolution outcome
- **Impact**: Indexers decoding the `disp_res` event will now find a `(upheld: bool, slash_bps: u32)` data payload instead of an empty payload. The topics (quest_id, initiator, arbitrator) are unchanged.
- **Affected Files**: [events.rs](contracts/earn-quest/src/events.rs), [dispute.rs](contracts/earn-quest/src/dispute.rs)
- **Migration Required**: No on-chain storage migration. Indexer schemas should be updated to decode the new payload fields.

#### Contract - `get_admin` returns `Result<Address, Error>` instead of panicking
- **Impact**: The public `get_admin` entrypoint now returns `Result<Address, Error>` (via `ok_or(Error::NotInitialized)`) instead of a bare `Address`. Clients and contracts that invoke `get_admin` on an uninitialized contract previously triggered a panic; they now receive a graceful `Error::NotInitialized` (code 93).
- **Affected Files**: [storage.rs](contracts/earn-quest/src/storage.rs), [lib.rs](contracts/earn-quest/src/lib.rs), [init.rs](contracts/earn-quest/src/init.rs)
- **Migration Required**: No storage migration required. Integrations reading the admin address should switch to the `try_get_admin` client method (or otherwise handle the `Result`) and treat `Error::NotInitialized` as the uninitialized-state error.

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