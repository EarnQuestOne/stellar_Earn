# Backend Documentation Index

This is the canonical index for all backend documentation. Everything related to the `BackEnd/` package lives here (or in `BackEnd/README.md`); the root of `BackEnd/` is reserved for source code, configuration, and the README.

> **Note for contributors:** do **not** add ad-hoc report/status markdown files to the root of `BackEnd/`. New documentation belongs under `BackEnd/docs/` (create a topic-appropriate file, or extend an existing one). One-off status reports should not be committed at all — if a change needs documenting, update the relevant doc or module `CHANGELOG.md` instead.

## Architecture & Design

| Doc | Purpose |
|-----|---------|
| [CIRCULAR_DEPENDENCIES.md](./CIRCULAR_DEPENDENCIES.md) | Circular-dependency resolution (event-driven decoupling of UsersModule ↔ JobsModule) |
| [CACHING_STRATEGY.md](./CACHING_STRATEGY.md) | General caching strategy and configuration |
| [DATABASE_INDEXES.md](./DATABASE_INDEXES.md) | Complete per-table index reference, migration/verification steps, and performance expectations |
| [DATABASE_POOL_MONITORING.md](./DATABASE_POOL_MONITORING.md) | DB connection-pool monitoring metrics, alerts, and dashboards |
| [QUEUE_RETRY_POLICY.md](./QUEUE_RETRY_POLICY.md) | BullMQ/Redis queue retry and backoff policy |
| [BULLMQ_PAYOUT_TUNING.md](./BULLMQ_PAYOUT_TUNING.md) | Payout queue tuning |
| [STARTUP_LAZY_LOADING.md](./STARTUP_LAZY_LOADING.md) | Lazy-loading of heavy modules at startup |

## Stellar Integration

| Doc | Purpose |
|-----|---------|
| [STELLAR_ACCOUNT_CACHE.md](./STELLAR_ACCOUNT_CACHE.md) | Horizon account/trustline lookup caching |
| [SOROBAN_BATCH_READS.md](./SOROBAN_BATCH_READS.md) | Bounded-concurrency batch contract reads |
| [SOROBAN_CLIENT_POOLING.md](./SOROBAN_CLIENT_POOLING.md) | Soroban RPC / Horizon client connection pooling |

## Security

| Doc | Purpose |
|-----|---------|
| [STACK_TRACE_SECURITY.md](./STACK_TRACE_SECURITY.md) | Stack-trace leak prevention and error-response hardening |
| [FRAUD_RISK_RULES.md](./FRAUD_RISK_RULES.md) | Fraud-risk scoring rules |

## Rate Limiting & Quotas

| Doc | Purpose |
|-----|---------|
| [RATE_LIMITING.md](./RATE_LIMITING.md) | Per-user rate limiting (tiers, tracking, configuration, testing) |

## Data Access & Migrations

| Doc | Purpose |
|-----|---------|
| [TWO_STEP_MIGRATION_GUIDE.md](./TWO_STEP_MIGRATION_GUIDE.md) | Two-step migration workflow |
| [SOFT_DELETE.md](./SOFT_DELETE.md) | Soft-delete implementation |
| [SUBMISSION_KEYSET_PAGINATION.md](./SUBMISSION_KEYSET_PAGINATION.md) | Keyset pagination for submission lists |

## Caching Patterns (module-specific)

| Doc | Purpose |
|-----|---------|
| [JOB_RESULT_STATUS_CACHE.md](./JOB_RESULT_STATUS_CACHE.md) | Job result/status caching |
| [MODERATION_CONFIG_CACHE.md](./MODERATION_CONFIG_CACHE.md) | Moderation config caching |
| [VERIFICATION_DEDUP.md](./VERIFICATION_DEDUP.md) | Verification deduplication |

## Testing

| Doc | Purpose |
|-----|---------|
| [TEST_SETUP.md](./TEST_SETUP.md) | Backend test environment setup |
| [UNIT_TESTING_GUIDE.md](./UNIT_TESTING_GUIDE.md) | Unit-testing conventions and guide |
| [E2E_TESTING.md](./E2E_TESTING.md) | E2E flakiness fixes and best practices |

## Tooling

| Doc | Purpose |
|-----|---------|
| [LINT_SCRIPTS.md](./LINT_SCRIPTS.md) | Lint scripts and generated-output handling |
| [DEPENDENCY_FRESHNESS.md](./DEPENDENCY_FRESHNESS.md) | Dependency freshness policy |
