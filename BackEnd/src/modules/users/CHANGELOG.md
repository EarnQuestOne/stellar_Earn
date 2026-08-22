# users module changelog

All notable changes to the `users` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- `findById()` now reads through the unified cache-aside layer (`CacheService.getOrSet`) tagged per user, and `update()` calls `invalidateTag(CacheTags.user(id))` so a write drops the user's cached reads (#2159).

- Applied code-style formatting to `users.service.ts` (no logic change).

### Added

- Partial indexes (`WHERE "deletedAt" IS NULL`) on `User` for the `role` column to speed up active-user role-based queries (#2000).
- `findByGithubId(githubId)` method for GitHub OAuth user lookup.
- `findByEmail(email)` method for email-based user lookup.
- `create(dto)` method for creating new users via repository, used by the OAuth login flow in `AuthService`.
