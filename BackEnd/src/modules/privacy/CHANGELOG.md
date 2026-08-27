# privacy module changelog

All notable changes to the `privacy` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Right-to-erasure pipeline (`ErasureService`) with a full request lifecycle: submit → cancellable grace period → execute → completed, plus idempotent, transactional cross-module PII anonymization (#2337).
- `ErasureController` endpoints — request erasure, cancel within the grace window, check status (auth-guarded to the requesting user), and admin-initiated erasure (`POST /privacy/erasure/admin/requests`) (#2337).
- `ErasureRequest` entity (`erasure_requests` table) persisting subject id, status, requested/scheduled/executed timestamps and scope, with a TypeORM migration (#2337).
- `erasure.service.spec.ts` unit tests covering the request lifecycle, grace-window cancellation, and cross-module anonymization (#2337).

### Changed

- On erasure execution, PII across users/submissions/notifications/payouts/moderation is anonymized or deleted inside a single transaction; legally-required payout and audit records are retained but de-identified with a per-subject tombstone (#2337).
