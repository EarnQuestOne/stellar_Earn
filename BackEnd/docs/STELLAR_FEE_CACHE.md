# Stellar Transaction Fee Estimate Caching

## Overview
This document describes the precomputed, cached Stellar network fee estimation added to the backend (`StellarFeeService`).

## Problem Statement
Every transaction builder previously hardcoded the base fee or would need to query Horizon's `/fee_stats` endpoint to learn the current network base fee. Doing that per transaction adds a network round-trip (typically tens of milliseconds) to the payout hot path and increases the chance of Horizon rate-limit errors under load.

## Solution Architecture
`StellarFeeService` precomputes the network base fee from Horizon `/fee_stats` and serves it from an in-memory cache:

- **Warm-up**: the estimate is fetched once in the background on module init, so the first payout never waits on the network.
- **Background refresh**: a cron job refreshes the estimate every 30 seconds.
- **Short TTL**: `STELLAR_FEE_CACHE_TTL_MS` (default `30000` ms / 30s) bounds how stale the served value can be.
- **Stale-while-revalidate**: if a caller reads a slightly stale value, it is served immediately while a background refresh is triggered — the hot path never blocks on the network.
- **Resilience**: failed fetches keep serving the last known value; the configured `STELLAR_BASE_FEE` (default `100` stroops) is used only before the first successful fetch.
- **Single-flight**: concurrent callers share one in-flight fetch instead of stampeding Horizon.

`StellarService`, `StellarPaymentService`, and `StellarSubmissionService` now build their transactions with `getBaseFeeInStroops()` from this service.

### Key Configuration
- `STELLAR_FEE_CACHE_TTL_MS`: Cache duration in milliseconds (Default: `30000` ms / 30s).
- `STELLAR_BASE_FEE`: Fallback fee in stroops when the network is unreachable (Default: `100`).

### Metrics
The service records the following metrics (Prometheus text format via `MetricsService`):

| Metric | Type | Meaning |
| ------ | ---- | ------- |
| `stellar_fee_estimate_stroops` | gauge | Currently served base fee |
| `stellar_fee_cache_age_ms` | gauge | Age of the cached estimate |
| `stellar_fee_fetch_duration_ms` | gauge | Duration of the last `/fee_stats` fetch |
| `stellar_fee_cache_hits_total` | counter | Reads served from cache |
| `stellar_fee_cache_misses_total` | counter | Reads that triggered a refresh |
| `stellar_fee_fetch_failures_total` | counter | Failed `/fee_stats` fetches |

## Benchmark Results
Run `npm run benchmark:stellar-fee-cache` (simulates a 50ms Horizon round-trip, 1000 iterations):

- **Uncached Run** (network fetch per call): ~50ms per fee estimate, ~20 ops/sec.
- **Cached Run** (in-memory read): <0.01ms per fee estimate, ~100,000+ ops/sec.
- **Impact**: the network round-trip is removed from the payout hot path entirely; cache hit ratio is ~100% while the background refresh keeps the estimate fresh.

## Verification
- Unit tests: `npx jest src/modules/stellar/stellar-fee.service.spec.ts`
- Regression: `npx jest src/modules/stellar --silent`
