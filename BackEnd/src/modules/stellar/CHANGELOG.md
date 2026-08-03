# stellar module changelog

All notable changes to the `stellar` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
<<<<<<< HEAD
- Short-TTL cache for Soroban idempotent reads (`get_quest` / `get_task`, `get_user_stats`) via `SorobanContractReadCacheService`, with invalidation on writes and quest/user contract events. See `SOROBAN_READ_CACHE.md` and `npm run benchmark:soroban-read-cache`.
=======
- `StellarAccountCacheService`: In-memory TTL caching service (`STELLAR_ACCOUNT_CACHE_TTL_MS`) for Horizon account lookups and trustline checks, with auto-invalidation upon transaction submission (#1979).
- `SorobanRpcClientPoolService`: Singleton HTTP keep-alive connection pooling for `rpc.Server` and Horizon `Server` instances with configurable `SOROBAN_RPC_MAX_SOCKETS` and `SOROBAN_RPC_TIMEOUT_MS` (#1976).
- `SorobanQuestReaderService.getQuestsBatch`: Bounded concurrency batch contract reader for fetching multiple quest states in parallel (`SOROBAN_BATCH_READ_CONCURRENCY`) (#1977).
>>>>>>> origin/main
