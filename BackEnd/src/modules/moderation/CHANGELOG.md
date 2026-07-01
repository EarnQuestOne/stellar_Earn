# moderation module changelog

All notable changes to the `moderation` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- `ExternalModerationApiService` now uses `PooledHttpClientService` (keep-alive connection pool, 8 s `medium` timeout budget) instead of a raw `axios` call. `HttpClientModule` added to `ModerationModule` imports.
