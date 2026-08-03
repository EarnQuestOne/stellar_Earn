# Soroban RPC & Horizon Connection Pooling Optimization

## Overview
This document describes the connection pooling architecture implemented via `SorobanRpcClientPoolService`.

## Problem Statement
Constructing new `rpc.Server` or `StellarSdk.Horizon.Server` instances per request causes repeated socket allocation and HTTP connection setup overhead.

## Solution Architecture
`SorobanRpcClientPoolService` acts as a singleton connection provider registered in `StellarModule`.

### Environment Configuration
- `SOROBAN_RPC_TIMEOUT_MS`: Connection keep-alive and request timeout (Default: `15000` ms).
- `SOROBAN_RPC_MAX_SOCKETS`: Maximum concurrent HTTP/HTTPS sockets per host (Default: `50`).

## Benchmark Results
Running `npx ts-node scripts/benchmark-soroban-client-pool.ts`:

- Replaces redundant per-request instantiation with zero-overhead singleton reference access.
- Eliminates repeated socket allocations across `StellarService` and `SorobanQuestReaderService`.
