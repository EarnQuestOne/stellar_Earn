# jobs module changelog

All notable changes to the `jobs` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- `DependencyFreshnessService` now uses `PooledHttpClientService` (keep-alive connection pool, 15 s `long` timeout budget) instead of a raw `axios` call for GitHub API requests. `HttpClientModule` added to `JobsModule` imports.
