# feature-flags module changelog

All notable changes to the `feature-flags` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Cache invalidation via tag-based `CacheService.invalidateTag` on flag create, update, and delete operations, clearing both per-flag (`ff:<key>`) and global (`ff:all`) cache entries.
- Per-request flag evaluation cache using `AsyncLocalStorage` to avoid redundant Redis lookups within the same request lifecycle.
- Audit logging for all flag mutations (`CREATED`, `ACTIVATED`, `DEACTIVATED`, `UPDATED`, `ROLLOUT_CHANGED`, `USER_LIST_CHANGED`, `SEGMENT_CHANGED`, `DELETED`) with `performedBy`, `ipAddress`, and `reason` fields; audit failures are logged but do not surface to callers.
- `FeatureFlagCacheTags` helper for consistent cache tag naming across the module.
