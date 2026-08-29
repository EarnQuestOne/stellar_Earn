# cache module changelog

All notable changes to the `cache` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Migrated distributed lock random value generator to native `crypto.randomUUID()` for reliable module loading.

### Added

- Unified cache-aside primitives on `CacheService`: `getOrSet(key, ttl, tags, loader)` and `invalidateTag(tag)`, backed by the existing tag registry, giving consistent tag-based invalidation across the hot read paths (#2159).
- `cache-tags.ts` defining namespaced key + tag conventions (`CacheKeys`, `CacheTags`, `CacheTtl`) shared by the quest, user, and platform-analytics read paths (#2159).
- `CacheableInterceptor` + `@Cacheable()` decorator (`src/common/interceptors/cacheable.interceptor.ts`) so read endpoints can opt into the cache-aside layer declaratively; registered and exported from `CacheModule` (#2159).

- `wrapSWR()` stale-while-revalidate caching method in `CacheService` with dual-TTL (soft + hard).
- In-flight deduplication prevents duplicate background revalidations for the same key.
- `CacheKeys.payoutPoll` and `CacheKeys.jobStatus` Redis key factories for payout status polling and job result snapshots (#1983).
