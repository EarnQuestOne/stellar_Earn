# Unreleased

- Submission details now expose the dispute lifecycle for rejected submissions.

# submissions module changelog

All notable changes to the `submissions` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Submission lookups now throw typed `SubmissionNotFoundException` / `QuestNotFoundException` instead of generic `NotFoundException`, producing clean 404 responses via `AppExceptionFilter` instead of falling through as 500s.
- `getQuestWithVerifiers` now throws `QuestNotFoundException` when the quest does not exist instead of silently returning empty data.

### Added

- `anonymizeForErasure(userId, manager?)` — detaches submitter PII and proof references from a user's submissions while preserving quest integrity and reviewer decisions, used by the right-to-erasure pipeline; runs inside the caller's transaction when a manager is supplied (#2337).

### Added

- Optimistic-concurrency `@VersionColumn` (`version`) on the `Submission` entity plus a backfilling migration, so concurrent submission writes (e.g. a status transition racing with an edit) are rejected on stale-version saves instead of causing a lost update (#2157).

### Fixed

- Submission list query parameters now reject malformed UUID filters and invalid pagination, status, sort, and order values at the DTO boundary (#2252).
- Converted `submissions/index.ts` from a corrupted UTF-16 encoding to UTF-8 and removed a duplicated export line.

### Changed
- Applied code-style formatting to `submission.mapper.ts` import block and arrow functions (no logic change).

### Added

- Composite index `(userId, createdAt, id)` on `submissions` (migration `1820000000200`) backing the user submission-history keyset query.
- Keyset (cursor) pagination in `SubmissionsService.findByQuest` using a composite row comparison `(sortBy, id) < (:cv, :idv)` so deep pages cost O(limit) instead of scanning and skipping `OFFSET n` rows. Returns an opaque `nextCursor`.
- Cursor predicate now respects `sortBy` (`createdAt`/`updatedAt`) and `order` (`ASC`/`DESC`); legacy `{ createdAt, id }` cursors remain supported.
- Benchmark script `scripts/benchmark-submission-pagination.ts` (see `docs/SUBMISSION_KEYSET_PAGINATION.md` for before/after numbers) and regression tests for the keyset behavior.
- Partial indexes (`WHERE "deletedAt" IS NULL`) on `Submission` for `[questId, status]` and `[userId, status]` columns to speed up active-submission queries (#2000).
- `SubmissionMapper` class with explicit mapper methods for converting submission entities to API DTOs

### Changed

- `SubmissionsService` now depends on `StellarSubmissionService` (was `StellarService`) — aligns with the stellar module refactor that split the monolithic service into focused services (#1912).
### Fixed

- Cast UUID to text in submissions service update queries to resolve database type comparison errors.
