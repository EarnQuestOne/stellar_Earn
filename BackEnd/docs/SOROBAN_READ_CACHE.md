# Soroban Contract Read Caching

## Overview
This document describes the short-TTL cache added for idempotent Soroban contract reads (`get_quest` / `get_user_stats`) in `SorobanQuestReaderService`.

## Problem Statement
Every UI request that needs on-chain quest or user state triggered a fresh Soroban RPC simulation. RPC reads are slow (network round-trips) and subject to rate limits, so repeated reads for the same quest/user — e.g. the hourly quest-state reconciliation job or page loads that re-query the same quest — paid the full cost every time.

## Solution Architecture
`SorobanQuestReaderService` now caches read results in memory with a short TTL:

- **Key**: `contractId:questId` for `get_quest`, `contractId:user:<address>` for `get_user_stats`.
- **TTL**: `SOROBAN_READ_CACHE_TTL_MS` (default `15000` ms / 15s) bounds how stale a served value can be.
- **Null results are cached too**, so repeated reads of a missing quest do not keep hitting the RPC.
- **Cache misses** perform the normal traced RPC simulation and then store the result.
- **Invalidation**:
  - `invalidateQuest(contractId, questId)` — called after `approve_submission` succeeds (the approval bumps the quest's on-chain `total_claims`).
  - `invalidateContract(contractId)` — drops all entries for a contract.
  - `clearCache()` — clears everything.

`getQuestsBatch` benefits automatically: each per-quest `getQuest` call consults the cache, so a warm batch performs zero RPC simulations.

### Key Configuration
- `SOROBAN_READ_CACHE_TTL_MS`: Cache duration in milliseconds (Default: `15000` ms / 15s).

### Metrics
| Metric | Type | Meaning |
| ------ | ---- | ------- |
| `stellar_contract_read_cache_hits_total` | counter | Reads served from the cache |
| `stellar_contract_read_cache_misses_total` | counter | Reads that required an RPC simulation |
| `stellar_contract_read_cache_entries` | gauge | Number of cached entries |

## Benchmark Results
Run `npm run benchmark:soroban-read-cache` (simulates a 50ms Soroban RPC round-trip, 1000 reads):

- **Uncached Run** (RPC per read): ~50ms per read, ~20 ops/sec.
- **Cached Run** (in-memory read): <0.01ms per read, ~100,000+ ops/sec.
- **Impact**: the RPC round-trip is removed from repeated reads; the cache hit ratio approaches 100% within the TTL window while `approve_submission` keeps the affected quest's entry fresh.

## Verification
- Unit tests: `npx jest src/modules/stellar/soroban-quest-reader.service.spec.ts`
- Regression: `npx jest src/modules/stellar --silent`
