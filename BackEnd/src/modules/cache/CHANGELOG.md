# cache module changelog

All notable changes to the `cache` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `wrapSWR()` stale-while-revalidate caching method in `CacheService` with dual-TTL (soft + hard).
- In-flight deduplication prevents duplicate background revalidations for the same key.
- `CacheKeys.payoutPoll` and `CacheKeys.jobStatus` Redis key factories for payout status polling and job result snapshots (#1983).
