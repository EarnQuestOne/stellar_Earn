# Moderation Config Cache

The moderation module loads its runtime settings into one immutable in-memory
snapshot. A moderation check reads that snapshot once and shares it across
keyword filtering, score thresholds, image checks, and the optional external
moderation APIs.

## Cached Settings

- `blockOnHighSeverity`
- `highThreshold`
- `mediumThreshold`
- external text and image API URLs and keys
- blocked keywords
- blocked image hosts

The first check loads and normalizes the `moderation` configuration namespace.
Later checks reuse the same object without repeating source lookups.

## Invalidation

Runtime settings writers must use
`ModerationConfigCacheService.updateConfig(update)`. The method updates Nest's
configuration source, invalidates the existing snapshot, and eagerly returns
the newly loaded snapshot. `invalidate()` is also available when another
configuration writer owns persistence.

Each application process owns its cache. A future database-backed or
multi-process settings writer must broadcast an invalidation event to every
process after a successful update.

## Metrics

The existing metrics endpoint exports:

- `moderation_config_source_loads_total`
- `moderation_config_cache_invalidations_total`
- `moderation_config_cache_load_duration_ms`

These metrics make source reloads and invalidations visible without adding work
to the cache-hit path or introducing high-cardinality values.

## Benchmark

Run the deterministic microbenchmark from `BackEnd`:

```bash
npm run benchmark:moderation-config
```

Override the default one million iterations when needed:

```bash
MODERATION_CONFIG_BENCHMARK_ITERATIONS=2000000 \
  npm run benchmark:moderation-config
```

The benchmark compares the previous three `ConfigService.get()` threshold
reads per moderation decision with one cached snapshot lookup. It reports
elapsed time, throughput, and source-read counts as JSON.

### Recorded Baseline

Measured on July 27, 2026 with Node.js `v24.16.0`, using the default 1,000,000
iterations and the median of five interleaved runs:

| Measurement         |              Before |                 After |          Change |
| ------------------- | ------------------: | --------------------: | --------------: |
| Elapsed time        |         4,021.48 ms |             140.90 ms |    96.50% lower |
| Throughput          | 248,665 decisions/s | 7,097,408 decisions/s |          28.54x |
| Config source reads |           3,000,000 |                     1 | 99.99997% lower |

This microbenchmark uses the current Nest `ConfigService` source. A
database-backed source would retain the same one-load cache behavior while
avoiding the additional database round-trip cost.
