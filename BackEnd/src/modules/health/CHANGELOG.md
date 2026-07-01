# health module changelog

All notable changes to the `health` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- `ExternalHealthService` now uses `PooledHttpClientService` (keep-alive connection pool, 3 s `short` timeout budget) instead of ad-hoc `axios` calls for Stellar Horizon and SendGrid health checks. `HttpClientModule` added to `HealthModule` imports.
