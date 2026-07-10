# jobs module changelog

All notable changes to the `jobs` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Per-job-type retry and backoff policies via `JobRetryPolicy` map (`job-retry-policy.ts`). Every `JobType` enum value now has an explicit policy (attempts, backoff type/delay, non-retryable error patterns, Redis retention limits).
- `addJob()` accepts an optional `jobType` parameter. When provided, the per-type `JobRetryPolicy` is resolved and merged into BullMQ options before any caller-supplied overrides. Precedence: caller opts > per-type policy > `DEFAULT_JOB_OPTIONS`.
- Non-retryable error detection in the worker `failed` handler: errors matching a job type's `nonRetryableErrors` patterns bypass remaining retries and are forwarded to the dead-letter queue immediately.
- `__jobType` is embedded in job data by `addJob()` so the worker can resolve the correct policy at failure time.
- `DEFAULT_JOB_OPTIONS` is now derived from `DEFAULT_RETRY_POLICY` (5 attempts, exponential backoff starting at 5 s) to keep defaults consistent.
- `job-scheduler.service.ts`: `startSchedule()` and `triggerScheduleNow()` embed `__jobType` and apply the per-type policy when enqueuing.

### Changed
- `DependencyFreshnessService` now uses `PooledHttpClientService` (keep-alive connection pool, 15 s `long` timeout budget) instead of a raw `axios` call for GitHub API requests. `HttpClientModule` added to `JobsModule` imports.
- `addJob()` signature extended: `addJob(name, data, opts?, jobType?)` — fully backward-compatible; callers that omit `jobType` continue to use `DEFAULT_JOB_OPTIONS`.
