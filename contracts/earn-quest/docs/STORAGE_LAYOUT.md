# EarnQuest Contract Storage Layout

This document maps every on-chain storage key used by the earn-quest contract. It is the authoritative reference for upgrade safety: developers **must** consult this file before adding, renaming, or reusing any `DataKey` variant.

**Source of truth:** `src/storage.rs` (`DataKey` enum)

**Related policy:** [BACKWARD_COMPATIBILITY_POLICY.md](./BACKWARD_COMPATIBILITY_POLICY.md)

---

## Storage tier and TTL

All keys use **instance storage** (`env.storage().instance()`). Instance storage is tied to the contract deployment and has **no explicit TTL** — entries persist for the lifetime of the contract instance on the ledger.

| Tier | API | TTL |
|------|-----|-----|
| Instance | `env.storage().instance()` | None (contract-scoped, persistent) |

Persistent and temporary storage APIs are **not** used in this contract.

---

## Naming conventions

When adding a new `DataKey` variant, follow these rules:

1. **PascalCase variant names** that describe the stored entity or flag (e.g. `QuestMetadata`, `UnpauseThreshold`).
2. **Append-only enum evolution** — add new variants at the **end** of the `DataKey` enum. Never insert in the middle (discriminant order is part of the on-chain serialization contract).
3. **Never rename or reuse** an existing variant. A retired key must remain in the enum (document as reserved) until a formal migration removes ledger data.
4. **Parameterized keys** use typed tuple components in the variant:
   - `Symbol` — quest or badge identifier
   - `Address` — user, oracle, or token account
   - `(Role, Address)` — role membership
   - `(Symbol, Address)` — per-quest per-user records (submission, dispute, commitment, stake)
   - `(u32, Address)` — unpause approval scoped to a round
   - `(Address, Address)` — token allowance (owner, spender)
5. **Hot / cold split** — high-frequency fields use the base name; large or rare fields use a suffix:
   - `QuestMetadata` + `QuestMetadataExt`
   - `Escrow` + `EscrowMeta`
   - `UserStats` + `UserBadges`
6. **Boolean presence flags** — many flags are stored as `bool` (`true` when set); absence means `false` or unset (e.g. `Paused`, `ReentrancyGuard`, `CreatorWhitelist`).
7. **Platform counters** — use individual scalar keys (`PlatformQuestsCreated`, etc.) instead of a monolithic struct for atomic updates. `PlatformStats` is a **reserved legacy** variant; counters are written to the split keys only.
8. **Update this document** and the `VARIANT_NAMES` / `all_data_keys()` audit list in `storage.rs` whenever the enum changes.

> **Note:** `src/unified_keys.rs` defines a separate, unused `DataKey` enum. It is **not** wired into the contract. All live storage goes through `storage.rs`.

---

## `DataKey` layout map

| # | Variant | Key parameters | Value type | TTL | Purpose |
|---|---------|----------------|------------|-----|---------|
| 0 | `Quest` | `quest_id: Symbol` | `Quest` | Instance | Core quest state (creator, reward, status, claims) |
| 1 | `QuestMetadata` | `quest_id: Symbol` | `QuestMetadataCore` | Instance | Hot-path metadata (title, description, category) |
| 2 | `QuestMetadataExt` | `quest_id: Symbol` | `QuestMetadataExtended` | Instance | Cold-path metadata (requirements, tags) |
| 3 | `Submission` | `quest_id: Symbol`, `submitter: Address` | `Submission` | Instance | Per-user quest submission and claim status |
| 4 | `UserStats` | `user: Address` | `UserCore` | Instance | Hot-path user XP, level, quests completed |
| 5 | `UserBadges` | `user: Address` | `UserBadges` | Instance | Cold-path user badge collection |
| 6 | `Admin` | `address: Address` | `bool` | Instance | Legacy admin flag (also mirrored via `Role`) |
| 7 | `Role` | `role: Role`, `address: Address` | `bool` | Instance | Role membership (SuperAdmin, Admin, Pauser, etc.) |
| 8 | `ContractAdmin` | — | `Address` | Instance | Primary contract administrator address |
| 9 | `ContractVersion` | — | `u32` | Instance | Contract version for upgrade tracking |
| 10 | `ContractConfig` | — | `Vec<(String, String)>` | Instance | Arbitrary key-value configuration |
| 11 | `Initialized` | — | `bool` | Instance | One-time initialization guard |
| 12 | `Paused` | — | `bool` | Instance | Global emergency pause flag (absent = not paused) |
| 13 | `UnpauseApproval` | `round: u32`, `admin: Address` | `bool` | Instance | Admin approval to unpause in a given round |
| 14 | `UnpauseThreshold` | — | `u32` | Instance | Number of admin approvals required to unpause |
| 15 | `UnpauseRound` | — | `u32` | Instance | Current unpause approval round ID |
| 16 | `UnpauseApprovalCount` | — | `u32` | Instance | Approvals recorded in the current round |
| 17 | `UnpauseTimelockSeconds` | — | `u64` | Instance | Timelock delay after approvals before unpause |
| 18 | `ScheduledUnpauseTime` | — | `u64` | Instance | Ledger timestamp when unpause may execute |
| 19 | `Escrow` | `quest_id: Symbol` | `EscrowBalances` | Instance | Hot-path escrow balances and activity counters |
| 20 | `EscrowMeta` | `quest_id: Symbol` | `EscrowMeta` | Instance | Cold-path escrow depositor, token, created_at |
| 21 | `QuestIds` | — | `Vec<Symbol>` | Instance | Index of all registered quest IDs |
| 22 | `PlatformStats` | — | *(reserved)* | Instance | **Legacy — not written.** Use split counter keys below |
| 23 | `PlatformQuestsCreated` | — | `u64` | Instance | Atomic platform quest-created counter |
| 24 | `PlatformSubmissions` | — | `u64` | Instance | Atomic platform submission counter |
| 25 | `PlatformRewardsDistributed` | — | `u128` | Instance | Atomic total rewards distributed |
| 26 | `PlatformActiveUsers` | — | `u64` | Instance | Atomic active-user counter |
| 27 | `PlatformRewardsClaimed` | — | `u64` | Instance | Atomic rewards-claimed counter |
| 28 | `CreatorStats` | `creator: Address` | `CreatorStats` | Instance | Per-creator reputation and activity stats |
| 29 | `OracleConfig` | `oracle: Address` | `OracleConfig` | Instance | Per-oracle price feed configuration |
| 30 | `OracleAddresses` | — | `Vec<Address>` | Instance | Registry of all oracle addresses |
| 31 | `ReentrancyGuard` | — | `bool` | Instance | Transient mutex for non-reentrant entry points |
| 32 | `Dispute` | `quest_id: Symbol`, `initiator: Address` | `Dispute` | Instance | Dispute record for a rejected submission |
| 33 | `Commitment` | `quest_id: Symbol`, `submitter: Address` | `Commitment` | Instance | Commit-reveal submission commitment |
| 34 | `VerifierStake` | `quest_id: Symbol`, `verifier: Address` | `VerifierStake` | Instance | Verifier stake deposited for a quest |
| 35 | `Balance` | `account: Address` | `i128` | Instance | SEP-41 token balance |
| 36 | `Allowance` | `owner: Address`, `spender: Address` | `i128` | Instance | SEP-41 token allowance |
| 37 | `TokenName` | — | `String` | Instance | SEP-41 token name |
| 38 | `TokenSymbol` | — | `String` | Instance | SEP-41 token symbol |
| 39 | `TokenDecimals` | — | `u32` | Instance | SEP-41 token decimals |
| 40 | `BadgeType` | `badge_id: Symbol` | `BadgeType` | Instance | Registered badge type definition |
| 41 | `BadgeTypeIds` | — | `Vec<Symbol>` | Instance | Index of all badge type IDs |
| 42 | `MinCreatorLevel` | — | `u32` | Instance | Minimum user level to create quests (0 = disabled) |
| 43 | `CreatorWhitelist` | `address: Address` | `bool` | Instance | Bypass min creator level for this address |
| 44 | `ClawbackPending` | `quest_id: Symbol`, `recipient: Address` | `ClawbackPending` | Instance | Pending 2-of-2 SuperAdmin clawback approval |
| 45 | `QuestCategory` | `category: u32` | `Vec<Symbol>` | Instance | Index of quest IDs by numeric category |

**Total variants:** 46

---

## Value type reference

| Type | Fields (summary) |
|------|------------------|
| `Quest` | `id`, `creator`, `reward_asset`, `reward_amount`, `verifier`, `deadline`, `category`, `status`, `total_claims` |
| `QuestMetadataCore` | `title`, `description`, `category` |
| `QuestMetadataExtended` | `requirements`, `tags` |
| `Submission` | `quest_id`, `submitter`, `proof_hash`, `status`, `claimed_amount`, `timestamp` |
| `UserCore` | `xp`, `level`, `quests_completed` |
| `UserBadges` | `badges: Vec<Badge>` |
| `EscrowBalances` | `total_deposited`, `total_paid_out`, `total_refunded`, `is_active`, `deposit_count` |
| `EscrowMeta` | `depositor`, `token`, `created_at` |
| `CreatorStats` | `quests_created`, `total_rewards_posted`, `total_submissions_received`, `total_claims_paid`, `reputation_score` |
| `OracleConfig` | `oracle_address`, `oracle_type`, `max_age_seconds`, `min_confidence`, `is_active` |
| `Dispute` | `quest_id`, `initiator`, `arbitrator`, `status`, `filed_at` |
| `Commitment` | `hash`, `timestamp` |
| `VerifierStake` | `token`, `amount`, `is_active` |
| `BadgeType` | `id`, `name`, `description`, `xp_reward` |
| `ClawbackPending` | `initiator`, `asset`, `amount` |
| `PlatformStats` | `total_quests_created`, `total_submissions`, `total_rewards_distributed`, `total_active_users`, `total_rewards_claimed` (assembled on read from split keys) |

Full struct definitions: `src/types.rs`.

---

## Duplicate key detection

The `#[cfg(test)]` module `layout_tests` in `storage.rs` enforces:

- Every `DataKey` variant has a **unique Rust discriminant** (no accidental duplicate enum arms).
- The canonical `VARIANT_NAMES` list has **no duplicate strings**.
- The live variant count matches the documented count (46).

Run:

```bash
cargo test -p earn_quest --lib layout_tests
```

---

## Checklist for new storage keys

- [ ] Add variant at the **end** of `DataKey` in `storage.rs`
- [ ] Add accessor functions in `storage.rs` (or the owning module)
- [ ] Update `VARIANT_NAMES` and `all_data_keys()` in `layout_tests`
- [ ] Add a row to the layout table in this document
- [ ] Confirm no collision with existing parameterized key shapes
- [ ] Document migration path if replacing a retired key
