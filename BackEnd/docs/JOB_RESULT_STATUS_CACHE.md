# Job result / payout status cache

Frontend clients poll `GET /payouts/:id` while a payout job is processing. Without
a cache, every poll issues a Postgres read. This layer stores terminal and
in-progress status snapshots in Redis (via `CacheService`) so repeated polls are
served from memory/Redis instead.

## Components

- `JobResultStatusCacheService` (`src/modules/jobs/services/job-result-status-cache.service.ts`)
  - Payout poll entries: `stellar_earn:v1:payout_poll:{payoutId}:{viewerScope}`
  - Job status entries: `stellar_earn:v1:job_status:{jobId}` (written when job logs update)
- `PayoutsService.getPayoutById` — cache-aside read path for pollers
- `PayoutsService.persistPayout` — invalidates payout poll keys after mutations
- `JobLogService` — write-through job status/result snapshots on lifecycle updates

## TTL

| State | Default TTL | Env override |
| --- | --- | --- |
| In progress (`processing`, `pending`, `retry_scheduled`, …) | 5 s | `PAYOUT_STATUS_CACHE_TTL_IN_PROGRESS_SEC` |
| Terminal (`completed`, `failed`, `dead_letter`, …) | 30 s | `PAYOUT_STATUS_CACHE_TTL_TERMINAL_SEC` |

Invalidation on payout writes keeps polls fresh when status changes; TTL bounds
staleness if invalidation is skipped.

## Metrics

Prometheus-style counters (via `MetricsService`):

- `payout_status_poll_cache_hits_total`
- `payout_status_poll_cache_misses_total`

In-process poll counters are exposed through `JobResultStatusCacheService.getPollMetrics()`
for benchmarks.

## Benchmark

From `BackEnd`:

```bash
npm run benchmark:job-result-status-cache
```

Optional poll volume:

```bash
PAYOUT_STATUS_BENCHMARK_POLLS=20000 npm run benchmark:job-result-status-cache
```

The script compares synthetic polling with and without cache hits and prints
JSON including estimated database read reduction.

## Regression tests

- `test/jobs/job-result-status-cache.service.spec.ts`
- `test/payouts/payout-status-cache.spec.ts`
