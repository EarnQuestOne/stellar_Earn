# Unreleased

- Added shared Soroban invocation helpers for opening, appealing, and resolving disputes.

# stellar module changelog

All notable changes to the `stellar` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `StellarFeeService`: precomputes and caches the Stellar network base fee from Horizon `/fee_stats` with a short TTL (`STELLAR_FEE_CACHE_TTL_MS`, default 30s) and background refresh, exposing hit/miss/fetch-duration metrics and falling back to `STELLAR_BASE_FEE` when the network is unavailable. `StellarService`, `StellarPaymentService`, and `StellarSubmissionService` now build transactions with the cached estimate, removing the per-transaction fee network round-trip from the payout hot path. Closes #1980.
- Short-TTL in-memory cache for idempotent Soroban contract reads in `SorobanQuestReaderService` (`get_quest` / `get_user_stats`), keyed by contract + args (`SOROBAN_READ_CACHE_TTL_MS`, default 15s), with hit/miss/entry metrics, `invalidateQuest`/`invalidateContract` invalidation (wired into `approveSubmission`), and a benchmark script (`npm run benchmark:soroban-read-cache`). Closes #1975.

### Fixed

- Repaired `StellarService` and `StellarModule` damaged by a merge conflict resolution: removed a duplicate constructor and duplicated imports, restored the `eventReorgBufferLedgers`/`eventInitialLookbackLedgers` properties and contract-event helper methods, and deduplicated `StellarModule` providers/exports.

### Changed

- **Refactored `StellarService` (588 lines) into focused services** following the pattern established by `SorobanQuestReaderService`.
  - `StellarService` is now a slim infrastructure provider exposing `getHorizon()`, `getRpc()`, and `getNetworkPassphrase()`.
  - `StellarSubmissionService` — Soroban contract submission (`approveSubmission`, `signAndSubmit`, `_signAndSubmitContract`).
  - `StellarPaymentService` — native XLM/asset payment transfers via Horizon (`sendPayment`).
  - `StellarEventIngestionService` — cron-based Soroban event ingestion with deduplication (`ingestContractEvents`).
  - All services are registered and exported from `StellarModule`.
  - Consumers updated: `SubmissionsService` → `StellarSubmissionService`, `PayoutProcessor` → `StellarPaymentService`.
  - Closes #1912.

### Added

- `sendPayment(recipientAddress, amount, asset?)` public method on `StellarPaymentService` for disbursing XLM (or other Stellar assets) via Horizon. Loads the configured admin keypair from `SOROBAN_SECRET_KEY` / `STELLAR_ADMIN_SECRET`, builds a payment operation with `TransactionBuilder` and `Operation.payment`, signs, and submits. Returns `{ transactionHash, ledger }`.
- `sendPayment(recipientAddress, amount, asset?)` public method on `StellarService` for disbursing XLM (or other Stellar assets) via Horizon. Loads the configured admin keypair from `SOROBAN_SECRET_KEY` / `STELLAR_ADMIN_SECRET`, builds a payment operation with `TransactionBuilder` and `Operation.payment`, signs, and submits. Returns `{ transactionHash, ledger }`.
- `StellarAccountCacheService`: In-memory TTL caching service (`STELLAR_ACCOUNT_CACHE_TTL_MS`) for Horizon account lookups and trustline checks, with auto-invalidation upon transaction submission (#1979).
- `SorobanRpcClientPoolService`: Singleton HTTP keep-alive connection pooling for `rpc.Server` and Horizon `Server` instances with configurable `SOROBAN_RPC_MAX_SOCKETS` and `SOROBAN_RPC_TIMEOUT_MS` (#1976).
- `SorobanQuestReaderService.getQuestsBatch`: Bounded concurrency batch contract reader for fetching multiple quest states in parallel (`SOROBAN_BATCH_READ_CONCURRENCY`) (#1977).
