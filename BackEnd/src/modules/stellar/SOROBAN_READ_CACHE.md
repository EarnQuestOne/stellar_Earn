# Soroban contract read cache

Short-TTL cache for idempotent earn-quest contract simulations (`get_quest` /
legacy `get_task`, and `get_user_stats`) keyed by `contractId + function + args`.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `SOROBAN_READ_CACHE_ENABLED` | `true` | Set to `false` to bypass cache and always hit Soroban RPC |
| `SOROBAN_READ_CACHE_TTL_SECONDS` | `15` | Entry TTL (seconds) |

## Invalidation

- After successful `approve_submission` writes (quest + submitter user stats).
- When new on-chain contract events are ingested (`ingestContractEvents`) for
  quest/user-affecting topics (e.g. `sub_appr`, `xp_award`, `q_pause`).

## Metrics

- `soroban_contract_read_cache_hits_total{function}`
- `soroban_contract_read_cache_misses_total{function}`
- `soroban_contract_read_cache_invalidations_total{reason}`
- `soroban_contract_read_rpc_calls_total{function}`

## Benchmark

Compare repeated reads with vs without cache (simulated RPC counter):

```bash
cd BackEnd
npm run benchmark:soroban-read-cache
```

Environment overrides: `SOROBAN_READ_CACHE_BENCHMARK_ITERATIONS`,
`SOROBAN_READ_CACHE_BENCHMARK_RUNS`.

## Tests

```bash
npm run test -- soroban-contract-read-cache.service.spec.ts
npm run test -- soroban-quest-reader.service.spec.ts
```
