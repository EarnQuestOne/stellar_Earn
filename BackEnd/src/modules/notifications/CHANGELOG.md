# notifications module changelog

All notable changes to the `notifications` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- `WebhookChannel` now uses `PooledHttpClientService` (keep-alive connection pool, 8 s `medium` timeout budget) instead of an unbounded raw `axios` call for webhook delivery.
