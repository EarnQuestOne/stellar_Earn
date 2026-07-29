# quests module changelog

All notable changes to the `quests` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Partial indexes (`WHERE "deletedAt" IS NULL`) on `Quest` for `status` and `createdBy` columns to speed up active-quest queries (#2000).
- `QuestMapper` class with `toDto`, `toDtoArray` static methods for explicit DTO mapping
- Unit tests for `QuestMapper` covering entity-to-DTO transformation

### Changed
- Refactored `QuestsService` to use `QuestMapper` instead of `QuestResponseDto.fromEntity` for all response mappings (`create`, `findAll`, `findOne`, `update`)
- Cache invalidation in `update` and `delete` now runs `deletePattern` and `delete` calls in parallel.
