# Backend Reliability Roadmap

**Status:** Active | **Owner:** Backend maintainers | **Applies to:** `BackEnd/` (NestJS 11 + TypeORM/Postgres)

This document defines the milestones used to track and gate backend reliability. Each milestone has a concrete acceptance condition so that progress can be verified in CI without ambiguity.

---

## Milestone 1 — Green CI

**Goal:** Every pull request targeting `main` must pass a dedicated backend CI pipeline before merge.

### Acceptance conditions

| Check                  | Condition                                                                   |
| ---------------------- | --------------------------------------------------------------------------- |
| TypeScript compilation | `nest build` exits 0 with zero type errors                                  |
| Unit tests             | `npm test` exits 0; all `.spec.ts` files under `BackEnd/src/` pass          |
| E2E tests              | `npm run test:e2e` exits 0 against a live Postgres + Redis test environment |
| Integration tests      | `npm run test:integration` exits 0                                          |
| Lint                   | `npm run lint` exits 0 with zero ESLint errors (warnings are allowed)       |
| Format                 | `prettier --check` exits 0 for all `src/**/*.ts` and `test/**/*.ts` files   |

### Definition of "green"

CI is considered green when all six checks above pass in the same pipeline run. A pipeline that skips or soft-fails any check does not count as green.

### Workflow

A dedicated workflow `.github/workflows/backend-ci.yml` is the authoritative gate. It runs on every push and pull request to `main`. See that file for the exact steps.

---

## Milestone 2 — Test Quality

**Goal:** The test suite provides high confidence that regressions are caught before they reach production.

### Coverage targets

Coverage is measured by `npm run test:cov` (Jest + `--coverage`). The thresholds below are enforced in `BackEnd/jest.config.ts` (or the `jest` key in `package.json`) so that Jest fails if any target is missed.

| Metric     | Target |
| ---------- | ------ |
| Statements | ≥ 80 % |
| Branches   | ≥ 75 % |
| Functions  | ≥ 80 % |
| Lines      | ≥ 80 % |

### Test-type requirements

| Test type         | Requirement                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Unit (`.spec.ts`) | Every service and controller exported from a module must have a corresponding unit test file                                 |
| Integration       | Each cross-module interaction listed in [Data Flow & Diagrams](./data-flow.md) must have at least one integration test       |
| E2E               | Every public HTTP endpoint documented in [Module API Reference](./module-apis.md) must be exercised by at least one E2E spec |
| Security          | Auth bypass and input-injection cases must be covered in `test/security/`                                                    |

### Flaky-test policy

A test is flaky when it fails on a retry without a code change. Flaky tests must be resolved within one sprint of discovery. Until resolved they must be quarantined (skipped with a `// TODO: flaky — <issue link>` annotation) so they do not block CI.

### Naming convention

Test files must follow the pattern `<subject>.<type>.ts` where `<type>` is one of `spec`, `e2e-spec`, or `integration-spec`. This matches the regex patterns in `jest-e2e.json` and `jest-integration.json`.

---

## Milestone 3 — Performance Targets

**Goal:** The backend meets latency and throughput SLOs under both steady-state and spike traffic conditions.

### HTTP response-time SLOs (p95, production traffic)

| Endpoint group                                | p95 target |
| --------------------------------------------- | ---------- |
| Quest listing (`GET /api/v1/quests`)          | < 500 ms   |
| Quest detail (`GET /api/v1/quests/:id`)       | < 300 ms   |
| Quest submission (`POST /api/v1/submissions`) | < 800 ms   |
| Auth (login / token refresh)                  | < 400 ms   |
| Health probe (`GET /api/v1/health`)           | < 100 ms   |

These targets align with the thresholds already defined in the k6 load-test profile at `BackEnd/load-tests/quest-submissions.k6.ts`.

### Throughput and error-rate SLOs

| Metric                | Target                       |
| --------------------- | ---------------------------- |
| HTTP error rate (5xx) | < 1 % under sustained load   |
| HTTP error rate (5xx) | < 2 % during spike (150 VUs) |
| Quest-list throughput | ≥ 100 req/s at 50 VUs        |
| Submission throughput | ≥ 30 req/s at 50 VUs         |

### Load-test gate

The k6 profile at `BackEnd/load-tests/quest-submissions.k6.ts` is the reference test. Stages:

| Stage           | VUs      | Duration |
| --------------- | -------- | -------- |
| Ramp-up         | 0 → 50   | 1 min    |
| Sustained       | 50       | 3 min    |
| Spike           | 50 → 150 | 30 s     |
| Sustained spike | 150      | 1 min    |
| Ramp-down       | 150 → 0  | 1 min    |

A load-test run is considered passing when all `thresholds` defined in the k6 options block exit green.

### Database query targets

| Metric                     | Target                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Slow queries (> 500 ms)    | Zero in steady state                                                                                            |
| Index coverage             | All foreign-key columns and columns used in `WHERE` / `ORDER BY` clauses on high-traffic tables must be indexed |
| Connection pool exhaustion | Zero occurrences in production logs                                                                             |

The Grafana dashboard at `BackEnd/monitoring/grafana/dashboards/database-pool-dashboard.json` is the reference for pool-exhaustion monitoring.

---

## Milestone tracking

| Milestone                | Status      |
| ------------------------ | ----------- |
| M1 — Green CI            | In progress |
| M2 — Test quality        | In progress |
| M3 — Performance targets | In progress |

Milestone status is updated here as conditions are met. A milestone moves to **Done** only when every acceptance condition in its section is satisfied in the `main` branch.
