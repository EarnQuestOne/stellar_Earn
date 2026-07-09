# Backend performance benchmarks

This folder contains k6-based benchmark profiles for the backend's critical HTTP endpoints.

## Available profiles

- `critical-endpoints.k6.ts` — covers health, auth, quest listing/detail, and submission listing flows.
- `quest-submissions.k6.ts` — legacy quest submission scenario kept for regression comparison.

## Running locally

```bash
k6 run BackEnd/load-tests/critical-endpoints.k6.ts \
  -e BASE_URL=http://localhost:3000 \
  -e JWT_TOKEN=<token> \
  -e QUEST_ID=<quest-id>
```

## Notes

- The suite uses the same route shape as the NestJS API prefix (`/api`).
- Thresholds are tuned around the reliability roadmap targets for p95 latency and error rate.
- The benchmark config is also covered by a Jest spec in `test/load-tests/benchmark-config.spec.ts`.
