# submissions module changelog

All notable changes to the `submissions` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Optimistic-concurrency `@VersionColumn` (`version`) on the `Submission` entity plus a backfilling migration, so concurrent submission writes (e.g. a status transition racing with an edit) are rejected on stale-version saves instead of causing a lost update (#2157).

### Fixed

- Converted `submissions/index.ts` from a corrupted UTF-16 encoding to UTF-8 and removed a duplicated export line.

### Changed
- Applied code-style formatting to `submission.mapper.ts` import block and arrow functions (no logic change).

### Added

- Partial indexes (`WHERE "deletedAt" IS NULL`) on `Submission` for `[questId, status]` and `[userId, status]` columns to speed up active-submission queries (#2000).
- `SubmissionMapper` class with explicit mapper methods for converting submission entities to API DTOs

### Changed

- `SubmissionsService` now depends on `StellarSubmissionService` (was `StellarService`) — aligns with the stellar module refactor that split the monolithic service into focused services (#1912).
### Fixed

- Cast UUID to text in submissions service update queries to resolve database type comparison errors.
