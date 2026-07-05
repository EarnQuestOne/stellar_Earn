# http-client changelog

All notable changes to the `http-client` common module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `PooledHttpClientService` — a global NestJS service backed by keep-alive `http`/`https` agents (`maxSockets=50`, `maxFreeSockets=10`) that vends pre-configured Axios instances for three named timeout budgets:
  - `short` (3 s) — health checks and fast lookups
  - `medium` (8 s) — moderation APIs and webhook delivery
  - `long` (15 s) — GitHub API and other slow third-party calls
- `HttpClientModule` — `@Global()` NestJS module that exports `PooledHttpClientService`; also imported explicitly by `JobsModule`, `HealthModule`, and `ModerationModule` for isolated test contexts.
- 12 unit tests covering timeout values, agent reuse across budget instances, and graceful teardown via `onModuleDestroy`.
