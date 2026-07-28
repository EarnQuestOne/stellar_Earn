# users module changelog

All notable changes to the `users` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `findByGithubId(githubId)` method for GitHub OAuth user lookup.
- `findByEmail(email)` method for email-based user lookup.
- `create(dto)` method for creating new users via repository, used by the OAuth login flow in `AuthService`.
