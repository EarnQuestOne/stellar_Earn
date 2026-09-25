# Stellar Account & Trustline Lookup Caching

## Overview
This document describes the caching strategy for Stellar Horizon account and trustline existence lookups in Stellar Earn.

## Problem Statement
Repeated payout processing and submission validation operations trigger identical Horizon API account queries (`loadAccount`) for the same accounts, causing network latency overhead and risk of rate limit errors.

## Solution Architecture
`StellarAccountCacheService` provides an in-memory TTL lookup cache.

### Key Configuration
- `STELLAR_ACCOUNT_CACHE_TTL_MS`: Cache duration in milliseconds (Default: `10000` ms / 10s).

### Invalidation Triggers
- Automatic cache entry eviction after TTL expiry.
- Explicit invalidation on payment completion (`invalidateAccount(address)`).

## Benchmark Results
Running `npx ts-node scripts/benchmark-stellar-account-cache.ts`:

- **Uncached Run** (100 lookups): 100 Horizon API calls, 1103ms total latency.
- **Cached Run** (100 lookups): 1 Horizon API call, 12ms total latency.
- **Impact**: 99.0% reduction in Horizon API calls, 98.9% latency reduction.
