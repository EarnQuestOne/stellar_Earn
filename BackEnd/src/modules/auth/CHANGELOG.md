# auth module changelog

All notable changes to the `auth` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- `AuthService.validate()` no longer returns a hardcoded stub identity for every request; it now resolves the real user (and their current role) from the verified JWT payload via `validateUser`, and `JwtStrategy` passes the full decoded payload instead of just the Stellar address. Closes #1888.

### Added

- `POST /auth/challenge` endpoint that issues a time-boxed (5 min), single-use Stellar authentication challenge for a given address using `generateChallengeMessage` from `utils/signature`.
- Complete `AuthService` implementation: `generateChallenge`, `login` (Stellar signature verification via `verifyStellarSignature`), `generateTokens` (JWT + SHA-256-hashed refresh token), `refreshTokens` (rotation with old token revocation), `revokeToken` (single session or all-sessions), `validateUser` (UUID or Stellar address lookup), and `loginOAuthUser` (Google / GitHub OAuth upsert flow).
- `POST /auth/refresh` endpoint wiring up the previously-implemented `AuthService.refreshTokens` rotation flow: accepts a `RefreshTokenDto`, returns a rotated `TokenResponseDto` (new access token, new refresh token, `expiresIn`, user), and revokes the presented refresh token in the same operation.

### Changed

- `AuthService.refreshTokens` now also returns `expiresIn` for the newly issued access token, matching the `TokenResponseDto` contract.

### Changed

- `POST /auth/login` now requires a Stellar wallet signature (`signature` field) verified against the challenge issued by `POST /auth/challenge`; bare address-only tokens are no longer accepted.
- Migrated JWT signing to RS256 with key rotation support via `getJwtPrivateKey`.
- `AuthModule` imports `UsersModule` to support user lookup and OAuth user creation.
