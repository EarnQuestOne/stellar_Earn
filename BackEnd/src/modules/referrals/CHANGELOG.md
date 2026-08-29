# referrals module changelog

All notable changes to the `referrals` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Created `referrals` backend module with `ReferralsService`, `ReferralsController`, and `ReferralsModule`.
- Implemented stable, unique referral code generation per user (`generateReferralCode` and `getReferralCode`).
- Implemented referral attribution during signup with full anti-abuse protection (rejection of self-referral, duplicate attributions, and circular chains of any depth).
- Added `Referral` entity tracking `referrerId`, `referredUserId`, `code`, `status` (`PENDING`, `QUALIFIED`, `REWARDED`, `REJECTED`), `rejectionReason`, `qualifiedAt`, and `rewardedAt`.
- Added `ReferralReward` ledger entity storing idempotent reward disbursements (`CREDITED`, `FAILED`, `REJECTED`, `PENDING`).
- Added database migration `1870000000000-add-referrals.ts` defining PostgreSQL tables, enums, and optimized indexes.
- Added API endpoints: `GET /referrals/code`, `GET /referrals`, `GET /referrals/rewards`, `GET /referrals/stats`, and `POST /referrals/attribute`.
- Implemented milestone qualification hook `handleQualifyingSubmission` transitioning pending referrals to `QUALIFIED` on first approved submission and enqueuing reward jobs.
- Implemented idempotent reward crediting in `creditReward` with idempotency keys.
- Comprehensive unit and integration test coverage (`referrals.service.spec.ts`, `referrals.controller.spec.ts`, `referrals.integration.spec.ts`).
