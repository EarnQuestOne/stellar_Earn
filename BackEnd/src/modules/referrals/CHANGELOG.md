# referrals module changelog

All notable changes to the `referrals` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial referral & invitation program (#2357):
  - `ReferralCode`, `Referral`, and `ReferralReward` entities plus a migration.
  - `ReferralsService`: generates a stable, unique per-user code; resolves a code
    to its owner; records signup attribution with anti-abuse checks
    (self-referral, unknown code, duplicate attribution, and circular
    attribution are all rejected); a qualifying-milestone hook that moves a
    referral to `qualified` and enqueues reward crediting; and queries for a
    user's referrals and reward ledger.
  - `ReferralsController`: authenticated endpoints for the caller's referral
    code/link, their referrals and statuses, and credited rewards.
  - `ReferralRewardProcessor` (in `jobs/processors/`): idempotent reward
    crediting keyed by the unique `ReferralReward.referralId`; self-referrals
    are rejected at credit time.
  - Integrated into signup (`AuthService`) and approval (`SubmissionsService`)
    flows.

## Program rules

- Each user has one stable referral code (`GET /referrals/me/code`, which also
  returns a shareable `link`).
- A new user may be attributed to at most one referrer (enforced by a unique
  constraint on `Referral.referredUserId`).
- Rejected attributions: self-referral, unknown code, already-attributed user,
  and circular attribution (A refers B while B already referred A).
- A referral qualifies on the referred user's **first approved submission** and
  is then rewarded **exactly once** (unique `ReferralReward.referralId`).
- Reward amount is configurable via `REFERRAL_REWARD_STROOPS` (default
  `100000000`, i.e. 10 XLM).
