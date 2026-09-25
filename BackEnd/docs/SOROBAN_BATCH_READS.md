# Soroban Batch Contract Reads Optimization

## Overview
This document describes the batch contract read optimization implemented in `SorobanQuestReaderService`.

## Problem Statement
Sequential Soroban RPC calls for multiple on-chain entities (e.g. fetching status for 20 quests) accumulate network round-trip latency linearly ($O(N)$), creating heavy user-facing response delays.

## Solution Architecture
`SorobanQuestReaderService.getQuestsBatch(contractId, questIds, options)` executes contract simulation reads concurrently with bounded concurrency chunking.

### Environment Configuration
- `SOROBAN_BATCH_READ_CONCURRENCY`: Default concurrency limit per batch (Default: `10`).

## Benchmark Results
Running `npx ts-node scripts/benchmark-soroban-batch-reads.ts`:

- **Sequential Reads** (20 quests): 423ms total duration (21.15ms per quest).
- **Batched Reads** (20 quests, concurrency=10): 43ms total duration (2.15ms per quest).
- **Impact**: 89.8% latency reduction, **9.84x speedup factor**.
