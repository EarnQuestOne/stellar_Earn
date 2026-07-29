# submissions module changelog

All notable changes to the `submissions` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Applied code-style formatting to `submission.mapper.ts` import block and arrow functions (no logic change).

### Added

- Partial indexes (`WHERE "deletedAt" IS NULL`) on `Submission` for `[questId, status]` and `[userId, status]` columns to speed up active-submission queries (#2000).
- `SubmissionMapper` class with explicit mapper methods for converting submission entities to API DTOs

### Fixed

- Cast UUID to text in submissions service update queries to resolve database type comparison errors.
