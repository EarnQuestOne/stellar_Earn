# stellar module changelog

All notable changes to the `stellar` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `sendPayment(recipientAddress, amount, asset?)` public method on `StellarService` for disbursing XLM (or other Stellar assets) via Horizon. Loads the configured admin keypair from `SOROBAN_SECRET_KEY` / `STELLAR_ADMIN_SECRET`, builds a payment operation with `TransactionBuilder` and `Operation.payment`, signs, and submits. Returns `{ transactionHash, ledger }`.
- `StellarAccountCacheService`: In-memory TTL caching service (`STELLAR_ACCOUNT_CACHE_TTL_MS`) for Horizon account lookups and trustline checks, with auto-invalidation upon transaction submission (#1979).
- `SorobanRpcClientPoolService`: Singleton HTTP keep-alive connection pooling for `rpc.Server` and Horizon `Server` instances with configurable `SOROBAN_RPC_MAX_SOCKETS` and `SOROBAN_RPC_TIMEOUT_MS` (#1976).
- `SorobanQuestReaderService.getQuestsBatch`: Bounded concurrency batch contract reader for fetching multiple quest states in parallel (`SOROBAN_BATCH_READ_CONCURRENCY`) (#1977).
