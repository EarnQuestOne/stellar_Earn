# EarnQuest Contract API Documentation

## Overview
This document provides comprehensive documentation for all public functions in the EarnQuest contract codebase. Each function includes a description, arguments, return types, and example usage where applicable.

## Table of Contents
- [initialize](#initialize)
- [authorize_upgrade](#authorize_upgrade)
- [get_version](#get_version)
- [get_admin](#get_admin)
- [get_config](#get_config)
- [add_admin](#add_admin)
- [remove_admin](#remove_admin)
- [grant_role](#grant_role)
- [revoke_role](#revoke_role)
- [has_role](#has_role)
- [is_admin](#is_admin)
- [register_quest](#register_quest)
- [register_quest_with_metadata](#register_quest_with_metadata)
- [register_quests_batch](#register_quests_batch)
- [pause_quest](#pause_quest)
- [resume_quest](#resume_quest)
- [commit_submission](#commit_submission)
- [reveal_submission](#reveal_submission)
- [submit_proof](#submit_proof)
- [approve_submission](#approve_submission)
- [approve_submissions_batch](#approve_submissions_batch)
- [claim_reward](#claim_reward)
- [get_user_stats](#get_user_stats)
- [get_user_badges](#get_user_badges)
- [grant_badge](#grant_badge)
- [open_dispute](#open_dispute)
- [resolve_dispute](#resolve_dispute)
- [appeal_dispute](#appeal_dispute)
- [withdraw_dispute](#withdraw_dispute)
- [get_dispute](#get_dispute)
- [emergency_pause](#emergency_pause)
- [emergency_approve_unpause](#emergency_approve_unpause)
- [emergency_unpause](#emergency_unpause)
- [emergency_withdraw](#emergency_withdraw)
- [deposit_escrow](#deposit_escrow)
- [cancel_quest](#cancel_quest)
- [withdraw_unclaimed](#withdraw_unclaimed)
- [expire_quest](#expire_quest)
- [update_quest_metadata](#update_quest_metadata)
- [get_quest_metadata](#get_quest_metadata)
- [has_quest_metadata](#has_quest_metadata)
- [get_escrow_balance](#get_escrow_balance)
- [get_escrow_info](#get_escrow_info)
- [get_quest](#get_quest)
- [get_submission](#get_submission)
- [set_unpause_threshold](#set_unpause_threshold)
- [set_unpause_timelock](#set_unpause_timelock)
- [get_quests_by_status](#get_quests_by_status)
- [get_quests_by_creator](#get_quests_by_creator)
- [get_active_quests](#get_active_quests)
- [get_quests_by_reward_range](#get_quests_by_reward_range)
- [get_platform_stats](#get_platform_stats)
- [get_creator_stats](#get_creator_stats)
- [reset_platform_stats](#reset_platform_stats)
- [add_oracle](#add_oracle)
- [remove_oracle](#remove_oracle)
- [update_oracle](#update_oracle)
- [get_price](#get_price)
- [get_price_from_oracle](#get_price_from_oracle)
- [get_oracle_configs](#get_oracle_configs)
- [get_active_oracle_configs](#get_active_oracle_configs)
- [convert_reward_amount](#convert_reward_amount)
- [validate_reward_with_oracle](#validate_reward_with_oracle)

---

### initialize
```rust
pub fn initialize(env: Env, admin: Address)
```
**Description:** Initializes the contract with the initial administrator and grants all core roles to the admin.
**Arguments:**
- `env`: Contract environment.
- `admin`: Address of the contract administrator.

---

### authorize_upgrade
```rust
pub fn authorize_upgrade(env: Env, caller: Address) -> Result<(), Error>
```
**Description:** Allows a SuperAdmin to authorize a contract upgrade.
**Security:** Checks that `caller` has `SuperAdmin` role.

---

### get_version
```rust
pub fn get_version(env: Env) -> u32
```
Returns the current contract version.
**Example:**
```rust
let version = client.get_version();
```

---

### get_admin
```rust
pub fn get_admin(env: Env) -> Address
```
Retrieves the contract administrator address.
**Example:**
```rust
let admin = client.get_admin();
```

---

### get_config
```rust
pub fn get_config(env: Env) -> Vec<(String, String)>
```
Returns global configuration key‑value pairs.

---

### add_admin
```rust
pub fn add_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), Error>
```
Adds a new administrator; only callable by a SuperAdmin.

---

### remove_admin
```rust
pub fn remove_admin(env: Env, caller: Address, admin_to_remove: Address) -> Result<(), Error>
```
Removes an administrator; only callable by a SuperAdmin.

---

### grant_role
```rust
pub fn grant_role(env: Env, caller: Address, address: Address, role: Role) -> Result<(), Error>
```
Grants a specific role to an address. Caller must be SuperAdmin.

---

### revoke_role
```rust
pub fn revoke_role(env: Env, caller: Address, address: Address, role: Role) -> Result<(), Error>
```
Revokes a role; caller must be SuperAdmin.

---

### has_role
```rust
pub fn has_role(env: Env, address: Address, role: Role) -> bool
```
Checks if an address holds a given role.
**Example:**
```rust
let has_role = client.has_role(&user, &Role::Admin);
```

---

### is_admin
```rust
pub fn is_admin(env: Env, address: Address) -> bool
```
Returns true if the address is an admin or SuperAdmin.

---

### register_quest
```rust
pub fn register_quest(env: Env, id: Symbol, creator: Address, reward_asset: Address, reward_amount: i128, verifier: Address, deadline: u64) -> Result<(), Error>
```
Creates a new quest with basic parameters.
**Example:**
```rust
client.register_quest(&id, &creator, &token, 1000, &verifier, 1700000000);
```

---

### register_quest_with_metadata
```rust
pub fn register_quest_with_metadata(env: Env, id: Symbol, creator: Address, reward_asset: Address, reward_amount: i128, verifier: Address, deadline: u64, metadata: QuestMetadata) -> Result<(), Error>
```
Registers a quest along with rich metadata (title, description, tags).

---

### register_quests_batch
```rust
pub fn register_quests_batch(env: Env, creator: Address, quests: Vec<BatchQuestInput>) -> Result<(), Error>
```
Batch registration of multiple quests.

---

### pause_quest
```rust
pub fn pause_quest(env: Env, caller: Address, quest_id: Symbol) -> Result<(), Error>
```
Pauses an individual quest; caller must have `Admin` role.

---

### resume_quest
```rust
pub fn resume_quest(env: Env, caller: Address, quest_id: Symbol) -> Result<(), Error>
```
Resumes a paused quest; caller must have `Admin` role.

---

### commit_submission
```rust
pub fn commit_submission(env: Env, quest_id: Symbol, submitter: Address, commitment_hash: BytesN<32>) -> Result<(), Error>
```
Commit‑reveal step to prevent front‑running.

---

### reveal_submission
```rust
pub fn reveal_submission(env: Env, quest_id: Symbol, submitter: Address, proof_hash: BytesN<32>, salt: BytesN<32>) -> Result<(), Error>
```
Reveals the commitment; validates proof against stored hash.

---

### submit_proof
```rust
pub fn submit_proof(env: Env, quest_id: Symbol, submitter: Address, proof_hash: BytesN<32>) -> Result<(), Error>
```
Direct proof submission without commit‑reveal.

---

### approve_submission
```rust
pub fn approve_submission(env: Env, quest_id: Symbol, submitter: Address, verifier: Address) -> Result<(), Error>
```
Verifier marks a submission as approved.

---

### approve_submissions_batch
```rust
pub fn approve_submissions_batch(env: Env, verifier: Address, submissions: Vec<BatchApprovalInput>) -> Result<(), Error>
```
Batch approval for efficiency.

---

### claim_reward
```rust
pub fn claim_reward(env: Env, quest_id: Symbol, submitter: Address) -> Result<(), Error>
```
Claims the reward for an approved submission. Implements non‑reentrancy and CEI patterns.

---

### get_user_stats
```rust
pub fn get_user_stats(env: Env, user: Address) -> UserCore
```
Retrieves XP, level, and quest statistics for a user.
**Example:**
```rust
let stats = client.get_user_stats(&user);
```

---

### get_user_badges
```rust
pub fn get_user_badges(env: Env, user: Address) -> UserBadges
```
Returns the collection of badges earned by a user.
**Example:**
```rust
let badges = client.get_user_badges(&user);
```

---

### grant_badge
```rust
pub fn grant_badge(env: Env, admin: Address, user: Address, badge: Badge) -> Result<(), Error>
```
Badge admin can grant a badge to a user.

---

### open_dispute
```rust
pub fn open_dispute(env: Env, quest_id: Symbol, initiator: Address, arbitrator: Address) -> Result<Dispute, Error>
```
Submitter can open a dispute.

---

### resolve_dispute
```rust
pub fn resolve_dispute(env: Env, quest_id: Symbol, initiator: Address, arbitrator: Address) -> Result<(), Error>
```
Arbitrator resolves an open dispute.

---

### appeal_dispute
```rust
pub fn appeal_dispute(env: Env, quest_id: Symbol, initiator: Address, new_arbitrator: Address) -> Result<(), Error>
```
Initiator can appeal a dispute.

---

### withdraw_dispute
```rust
pub fn withdraw_dispute(env: Env, quest_id: Symbol, initiator: Address) -> Result<(), Error>
```
Initiator withdraws a dispute.

---

### get_dispute
```rust
pub fn get_dispute(env: Env, quest_id: Symbol, initiator: Address) -> Result<Dispute, Error>
```
Fetches dispute details.
**Example:**
```rust
let dispute = client.get_dispute(&quest_id, &user)?;
```

---

### emergency_pause
```rust
pub fn emergency_pause(env: Env, caller: Address) -> Result<(), Error>
```
Pauses all contract activity.
**Example:**
```rust
client.emergency_pause(&pauser)?;
```

---

### emergency_approve_unpause
```rust
pub fn emergency_approve_unpause(env: Env, caller: Address) -> Result<(), Error>
```
Admin approves contract unpause.

---

### emergency_unpause
```rust
pub fn emergency_unpause(env: Env, caller: Address) -> Result<(), Error>
```
Unpauses contract after sufficient approvals.

---

### emergency_withdraw
```rust
pub fn emergency_withdraw(env: Env, caller: Address, asset: Address, to: Address, amount: i128) -> Result<(), Error>
```
SuperAdmin can withdraw funds in emergencies.

---

### deposit_escrow
```rust
pub fn deposit_escrow(env: Env, quest_id: Symbol, depositor: Address, token: Address, amount: i128) -> Result<(), Error>
```
Creator deposits reward tokens into escrow.

---

### cancel_quest
```rust
pub fn cancel_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error>
```
Cancels a quest and refunds remaining escrow.

---

### withdraw_unclaimed
```rust
pub fn withdraw_unclaimed(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error>
```
Creator withdraws any unclaimed escrow after quest termination.

---

### expire_quest
```rust
pub fn expire_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error>
```
Expires a quest after its deadline and refunds remaining escrow.

---

### update_quest_metadata
```rust
pub fn update_quest_metadata(env: Env, quest_id: Symbol, updater: Address, metadata: QuestMetadata) -> Result<(), Error>
```
Updates stored metadata; only the creator can call.

---

### get_quest_metadata
```rust
pub fn get_quest_metadata(env: Env, quest_id: Symbol) -> Result<QuestMetadata, Error>
```
Retrieves quest metadata.
**Example:**
```rust
let metadata = client.get_quest_metadata(&quest_id)?;
```

---

### has_quest_metadata
```rust
pub fn has_quest_metadata(env: Env, quest_id: Symbol) -> bool
```
Checks if a quest has metadata attached.

---

### get_escrow_balance
```rust
pub fn get_escrow_balance(env: Env, quest_id: Symbol) -> Result<i128, Error>
```
Returns the current escrow balance for a quest.

---

### get_escrow_info
```rust
pub fn get_escrow_info(env: Env, quest_id: Symbol) -> Result<EscrowInfo, Error>
```
Provides detailed escrow information.

---

### get_quest
```rust
pub fn get_quest(env: Env, quest_id: Symbol) -> Result<Quest, Error>
```
Fetches full quest data.

---

### get_submission
```rust
pub fn get_submission(env: Env, quest_id: Symbol, submitter: Address) -> Result<Submission, Error>
```
Retrieves a specific submission.

---

### set_unpause_threshold
```rust
pub fn set_unpause_threshold(env: Env, caller: Address, threshold: u32) -> Result<(), Error>
```
Admin sets required approvals for unpausing.

---

### set_unpause_timelock
```rust
pub fn set_unpause_timelock(env: Env, caller: Address, seconds: u64) -> Result<(), Error>
```
Admin sets the timelock duration for unpause.

---

### get_quests_by_status
```rust
pub fn get_quests_by_status(env: Env, status: QuestStatus, offset: u32, limit: u32) -> Vec<Quest>
```
Paginated query for quests filtered by status.

---

### get_quests_by_creator
```rust
pub fn get_quests_by_creator(env: Env, creator: Address, offset: u32, limit: u32) -> Vec<Quest>
```
Paginated query for quests created by a specific address.

---

### get_active_quests
```rust
pub fn get_active_quests(env: Env, offset: u32, limit: u32) -> Vec<Quest> {
```
Returns currently active quests.

---

### get_quests_by_reward_range
```rust
pub fn get_quests_by_reward_range(env: Env, min_reward: i128, max_reward: i128, offset: u32, limit: u32) -> Vec<Quest>
```
Filters quests within a reward range.

---

### get_platform_stats
```rust
pub fn get_platform_stats(env: Env) -> PlatformStats
```
Aggregated statistics for the platform.

---

### get_creator_stats
```rust
pub fn get_creator_stats(env: Env, creator: Address) -> CreatorStats
```
Statistics for a specific quest creator.

---

### reset_platform_stats
```rust
pub fn reset_platform_stats(env: Env, caller: Address) -> Result<(), Error>
```
Resets platform‑wide statistics.

---

### add_oracle
```rust
pub fn add_oracle(env: Env, caller: Address, oracle_config: OracleConfig) -> Result<(), Error>
```
Adds a new price oracle configuration.

---

### remove_oracle
```rust
pub fn remove_oracle(env: Env, caller: Address, oracle_address: Address) -> Result<(), Error>
```
Removes a price oracle.

---

### update_oracle
```rust
pub fn update_oracle(env: Env, caller: Address, oracle_config: OracleConfig) -> Result<(), Error>
```
Updates an oracle configuration.

---

### get_price
```rust
pub fn get_price(env: Env, base_asset: Address, quote_asset: Address, max_age_seconds: u64) -> Result<AggregatedPrice, Error>
```
Aggregates price data from active oracles.

---

### get_price_from_oracle
```rust
pub fn get_price_from_oracle(env: Env, oracle_address: Address, base_asset: Address, quote_asset: Address, max_age_seconds: u64) -> Result<PriceData, Error>
```
Fetches price from a specific oracle.

---

### get_oracle_configs
```rust
pub fn get_oracle_configs(env: Env) -> Vec<OracleConfig>
```
Returns all registered oracle configurations.

---

### get_active_oracle_configs
```rust
pub fn get_active_oracle_configs(env: Env) -> Vec<OracleConfig>
```
Returns only active oracle configurations.

---

### convert_reward_amount
```rust
pub fn convert_reward_amount(env: Env, from_asset: Address, to_asset: Address, amount: i128) -> Result<i128, Error>
```
Converts a reward amount between assets.

---

### validate_reward_with_oracle
```rust
pub fn validate_reward_with_oracle(env: Env, reward_asset: Address, reward_amount: i128, reference_asset: Address, max_deviation_percent: u32) -> Result<(), Error>
```
Validates reward amount deviation against oracle price.

---

*Generated by Antigravity AI.*
