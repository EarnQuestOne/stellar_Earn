# BullMQ Payout Queue Concurrency & Rate Limit Tuning

## Overview
This document describes the tuning and configuration options for the BullMQ `payouts` worker queue in Stellar Earn.

## Problem Statement
Default job concurrency in background queue processors can be:
- **Too low**: creating throughput bottlenecks during high payout volume.
- **Too high**: triggering network RPC / Horizon rate limit errors (`429 Too Many Requests`).

## Configuration & Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PAYOUT_QUEUE_CONCURRENCY` | Worker concurrency for payout jobs | `10` |
| `PAYOUT_QUEUE_MAX_JOBS` | Maximum payout jobs per duration window | `25` |
| `PAYOUT_QUEUE_DURATION_MS` | Rate limit duration window in milliseconds | `1000` |

Alternative generic keys (`QUEUE_PAYOUTS_CONCURRENCY`, `QUEUE_PAYOUTS_MAX_JOBS`, `QUEUE_PAYOUTS_DURATION_MS`) are also supported.

## Performance Benchmark Results

Running `npx ts-node scripts/benchmark-payout-queue.ts`:

- **Default Config**: 10 workers, max 25 jobs/1000ms $\rightarrow$ 25 jobs/sec.
- **Tuned Config**: 25 workers, max 100 jobs/1000ms $\rightarrow$ 100 jobs/sec (+300.0% throughput gain).
