use crate::errors::Error;
use crate::types::{Quest, QuestStatus, Submission, SubmissionStatus, UserStats, EscrowInfo, QuestMetadata, PlatformStats, CreatorStats, OracleConfig};
use crate::validation;
use soroban_sdk::{contracttype, Address, Env, Symbol, Vec, String};

/// Storage key definitions for the contract's persistent data.
///
/// This enum defines all possible keys used to store data in the contract's instance storage.
/// Each variant represents a different type of data with its associated key structure.
#[contracttype]
pub enum DataKey {
    /// Stores individual Quest data, keyed by quest ID (Symbol)
    Quest(Symbol),
    /// Stores quest metadata core (title, description, category) — hot path
    QuestMetadata(Symbol),
    /// Stores quest metadata extended (requirements, tags) — cold path
    QuestMetadataExt(Symbol),
    /// Stores individual Submission data, keyed by quest ID and submitter address
    Submission(Symbol, Address),
    /// Stores UserCore data (xp, level, quests_completed) — hot path
    UserStats(Address),
    /// Stores UserBadges (badge Vec) — cold path, loaded only for badge ops
    UserBadges(Address),
    /// Stores admin status, keyed by admin address
    Admin(Address),
    /// Stores contract admin (single)
    ContractAdmin,
    /// Stores contract version
    ContractVersion,
    /// Stores contract config params
    ContractConfig,
    /// Tracks initialization
    Initialized,
    /// Global paused flag
    Paused,
    /// Stores per-admin approval for unpause in a specific round
    UnpauseApproval(u32, Address),
    /// Number of approvals required to unpause
    UnpauseThreshold,
    /// Current unpause cycle/round ID
    UnpauseRound,
    /// Count of approvals recorded in current round
    UnpauseApprovalCount,
    /// Timelock seconds to wait after approvals before unpause can be executed
    UnpauseTimelockSeconds,
    /// Scheduled unpause ledger timestamp
    ScheduledUnpauseTime,
    /// Escrow hot-path balances (total_deposited, total_paid_out, total_refunded, is_active, deposit_count)
    Escrow(Symbol),
    /// Escrow cold-path metadata (depositor, token, created_at)
    EscrowMeta(Symbol),
    QuestIds,
    /// Platform-wide stats assembled from individual counters on read
    PlatformStats,
    /// Individual platform counter keys for atomic single-counter updates
    PlatformQuestsCreated,
    PlatformSubmissions,
    PlatformRewardsDistributed,
    PlatformActiveUsers,
    PlatformRewardsClaimed,
    CreatorStats(Address),
    /// Oracle configuration, keyed by oracle address
    OracleConfig(Address),
    /// List of all oracle addresses
    OracleAddresses,
    /// Mutex flag set while a non-reentrant entry point is executing.
    ReentrancyGuard,
    /// Dispute record keyed by (quest_id, initiator)
    Dispute(Symbol, Address),
}

//================================================================================
// Quest Storage Functions
//================================================================================

/// Checks if a quest exists in storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `id` - The unique quest identifier
///
/// # Returns
/// * `true` if the quest exists, `false` otherwise
///
/// # Storage Access
/// * Reads from: Instance storage (existence check only)
/// * Gas Cost: Low (existence check is cheaper than full read)
pub fn has_quest(env: &Env, id: &Symbol) -> bool {
    env.storage().instance().has(&DataKey::Quest(id.clone()))
}

/// Retrieves a quest by its ID from storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `id` - The unique quest identifier
///
/// # Returns
/// * `Ok(Quest)` - The quest data if found
/// * `Err(Error::QuestNotFound)` - If the quest doesn't exist
///
/// # Storage Access
/// * Reads from: Instance storage
/// * Gas Cost: Moderate (full struct read)
pub fn get_quest(env: &Env, id: &Symbol) -> Result<Quest, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Quest(id.clone()))
        .ok_or(Error::QuestNotFound)
}

/// Stores or updates a quest in storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `id` - The unique quest identifier
/// * `quest` - The quest data to store
///
/// # Storage Access
/// * Writes to: Instance storage
/// * Gas Cost: High (full struct write)
///
/// # Notes
/// * Overwrites existing quest data if the ID already exists
/// * For partial updates, consider using specialized functions like `update_quest_status()`
pub fn set_quest(env: &Env, id: &Symbol, quest: &Quest) {
    env.storage()
        .instance()
        .set(&DataKey::Quest(id.clone()), quest);
}

/// Checks if metadata exists for a quest.
pub fn has_quest_metadata(env: &Env, id: &Symbol) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::QuestMetadata(id.clone()))
}

/// Gets full metadata for a quest (assembled from Core + Extended).
pub fn get_quest_metadata(env: &Env, id: &Symbol) -> Result<QuestMetadata, Error> {
    let core: QuestMetadataCore = env
        .storage()
        .instance()
        .get(&DataKey::QuestMetadata(id.clone()))
        .ok_or(Error::MetadataNotFound)?;
    let ext: QuestMetadataExtended = env
        .storage()
        .instance()
        .get(&DataKey::QuestMetadataExt(id.clone()))
        .unwrap_or_else(|| QuestMetadataExtended {
            requirements: Vec::new(env),
            tags: Vec::new(env),
        });
    Ok(QuestMetadata {
        title: core.title,
        description: core.description,
        category: core.category,
        requirements: ext.requirements,
        tags: ext.tags,
    })
}

/// Gets only the core metadata (title, description, category) — hot path.
pub fn get_quest_metadata_core(env: &Env, id: &Symbol) -> Result<QuestMetadataCore, Error> {
    env.storage()
        .instance()
        .get(&DataKey::QuestMetadata(id.clone()))
        .ok_or(Error::MetadataNotFound)
}

/// Stores metadata split into Core + Extended entries.
pub fn set_quest_metadata(env: &Env, id: &Symbol, metadata: &QuestMetadata) {
    let core = QuestMetadataCore {
        title: metadata.title.clone(),
        description: metadata.description.clone(),
        category: metadata.category.clone(),
    };
    let ext = QuestMetadataExtended {
        requirements: metadata.requirements.clone(),
        tags: metadata.tags.clone(),
    };
    env.storage()
        .instance()
        .set(&DataKey::QuestMetadata(id.clone()), &core);
    env.storage()
        .instance()
        .set(&DataKey::QuestMetadataExt(id.clone()), &ext);
}

//================================================================================
// Submission Storage Functions
//================================================================================

/// Checks if a submission exists for a specific quest and submitter.
///
/// # Arguments
/// * `env` - The contract environment
/// * `quest_id` - The quest identifier
/// * `submitter` - The address of the user who submitted
///
/// # Returns
/// * `true` if the submission exists, `false` otherwise
///
/// # Storage Access
/// * Reads from: Instance storage (existence check only)
/// * Gas Cost: Low
pub fn has_submission(env: &Env, quest_id: &Symbol, submitter: &Address) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::Submission(quest_id.clone(), submitter.clone()))
}

/// Retrieves a submission for a specific quest and submitter.
///
/// # Arguments
/// * `env` - The contract environment
/// * `quest_id` - The quest identifier
/// * `submitter` - The address of the user who submitted
///
/// # Returns
/// * `Ok(Submission)` - The submission data if found
/// * `Err(Error::SubmissionNotFound)` - If the submission doesn't exist
///
/// # Storage Access
/// * Reads from: Instance storage
/// * Gas Cost: Moderate
pub fn get_submission(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
) -> Result<Submission, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Submission(quest_id.clone(), submitter.clone()))
        .ok_or(Error::SubmissionNotFound)
}

/// Stores or updates a submission in storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `quest_id` - The quest identifier
/// * `submitter` - The address of the user submitting
/// * `submission` - The submission data to store
///
/// # Storage Access
/// * Writes to: Instance storage
/// * Gas Cost: High
///
/// # Notes
/// * Overwrites existing submission data if it already exists
/// * For status updates only, consider using `update_submission_status()`
pub fn set_submission(env: &Env, quest_id: &Symbol, submitter: &Address, submission: &Submission) {
    env.storage().instance().set(
        &DataKey::Submission(quest_id.clone(), submitter.clone()),
        submission,
    );
}

//================================================================================
// UserStats Storage Functions (split: UserCore hot-path + UserBadges cold-path)
//================================================================================

/// Checks if user core stats exist for a specific user.
pub fn has_user_stats(env: &Env, user: &Address) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::UserStats(user.clone()))
}

/// Retrieves user core stats (xp, level, quests_completed) — hot path.
pub fn get_user_stats(env: &Env, user: &Address) -> Result<UserCore, Error> {
    env.storage()
        .instance()
        .get(&DataKey::UserStats(user.clone()))
        .ok_or(Error::UserStatsNotFound)
}

/// Stores user core stats — hot path.
pub fn set_user_stats(env: &Env, user: &Address, stats: &UserCore) {
    env.storage()
        .instance()
        .set(&DataKey::UserStats(user.clone()), stats);
}

/// Retrieves user badges — cold path (loaded only for badge operations).
pub fn get_user_badges(env: &Env, user: &Address) -> UserBadges {
    env.storage()
        .instance()
        .get(&DataKey::UserBadges(user.clone()))
        .unwrap_or_else(|| UserBadges {
            badges: Vec::new(env),
        })
}

/// Stores user badges — cold path.
pub fn set_user_badges(env: &Env, user: &Address, badges: &UserBadges) {
    env.storage()
        .instance()
        .set(&DataKey::UserBadges(user.clone()), badges);
}

//================================================================================
// Deletion Utilities
//================================================================================

/// Safely deletes a quest from storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `id` - The quest identifier to delete
///
/// # Returns
/// * `Ok(())` - If the quest was successfully deleted
/// * `Err(Error::QuestNotFound)` - If the quest doesn't exist
/// * `Err(Error::QuestStillActive)` - If the quest is still active or paused
///
/// # Storage Access
/// * Reads from: Instance storage (to check status)
/// * Writes to: Instance storage (removal)
/// * Gas Cost: Moderate (read + delete)
///
/// # Safety
/// * Only allows deletion of Completed or Expired quests
/// * Prevents accidental deletion of active quests
/// * Does not cascade delete submissions (handle separately if needed)
pub fn delete_quest(env: &Env, id: &Symbol) -> Result<(), Error> {
    let quest = get_quest(env, id)?;

    // Safety check: only allow deletion of completed/expired quests
    if quest.status == QuestStatus::Active || quest.status == QuestStatus::Paused {
        return Err(Error::QuestStillActive);
    }

    env.storage().instance().remove(&DataKey::Quest(id.clone()));
    env.storage()
        .instance()
        .remove(&DataKey::QuestMetadata(id.clone()));
    Ok(())
}

/// Deletes a submission from storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `quest_id` - The quest identifier
/// * `submitter` - The submitter's address
///
/// # Storage Access
/// * Writes to: Instance storage (removal)
/// * Gas Cost: Low (delete only, no validation)
///
/// # Notes
/// * Does not check if submission exists (safe to call on non-existent submissions)
/// * Use after reward payout to clean up storage
pub fn delete_submission(env: &Env, quest_id: &Symbol, submitter: &Address) {
    env.storage()
        .instance()
        .remove(&DataKey::Submission(quest_id.clone(), submitter.clone()));
}

/// Deletes user stats from storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `user` - The user's address
///
/// # Storage Access
/// * Writes to: Instance storage (removal)
/// * Gas Cost: Low
///
/// # Notes
/// * Does not check if stats exist (safe to call on non-existent users)
/// * Use with caution - this permanently removes all user reputation data
pub fn delete_user_stats(env: &Env, user: &Address) {
    env.storage()
        .instance()
        .remove(&DataKey::UserStats(user.clone()));
}

//================================================================================
// Partial Update Helpers (Gas Optimization)
//================================================================================

/// Updates only the status field of a quest (gas-optimized).
///
/// # Arguments
/// * `env` - The contract environment
/// * `id` - The quest identifier
/// * `status` - The new status to set
///
/// # Returns
/// * `Ok(())` - If the update was successful
/// * `Err(Error::QuestNotFound)` - If the quest doesn't exist
///
/// # Storage Access
/// * Reads from: Instance storage (full quest read)
/// * Writes to: Instance storage (full quest write)
/// * Gas Cost: High (read + write, but clearer intent than manual update)
///
/// # Benefits
/// * Clearer intent than manual read-modify-write
/// * Single source of truth for status updates
/// * Easier to add validation logic in the future
pub fn update_quest_status(env: &Env, id: &Symbol, status: QuestStatus) -> Result<(), Error> {
    let mut quest = get_quest(env, id)?;
    quest.status = status;
    set_quest(env, id, &quest);
    Ok(())
}

/// Atomically increments the total_claims counter for a quest (gas-optimized).
///
/// # Arguments
/// * `env` - The contract environment
/// * `id` - The quest identifier
///
/// # Returns
/// * `Ok(())` - If the increment was successful
/// * `Err(Error::QuestNotFound)` - If the quest doesn't exist
///
/// # Storage Access
/// * Reads from: Instance storage (full quest read)
/// * Writes to: Instance storage (full quest write)
/// * Gas Cost: High
///
/// # Benefits
/// * Prevents accidentally modifying other quest fields
/// * Clearer intent for claim counting
/// * Type-safe increment operation
pub fn increment_quest_claims(env: &Env, id: &Symbol) -> Result<(), Error> {
    let mut quest = get_quest(env, id)?;
    quest.total_claims += 1;
    set_quest(env, id, &quest);
    Ok(())
}

/// Updates only the status field of a submission (gas-optimized).
///
/// # Arguments
/// * `env` - The contract environment
/// * `quest_id` - The quest identifier
/// * `submitter` - The submitter's address
/// * `status` - The new status to set
///
/// # Returns
/// * `Ok(())` - If the update was successful
/// * `Err(Error::SubmissionNotFound)` - If the submission doesn't exist
///
/// # Storage Access
/// * Reads from: Instance storage
/// * Writes to: Instance storage
/// * Gas Cost: High
///
/// # Benefits
/// * Clearer intent for status transitions (Pending -> Approved -> Paid)
/// * Prevents accidentally modifying proof_hash or timestamp
pub fn update_submission_status(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
    status: SubmissionStatus,
) -> Result<(), Error> {
    let mut submission = get_submission(env, quest_id, submitter)?;
    submission.status = status;
    set_submission(env, quest_id, submitter, &submission);
    Ok(())
}

/// Atomically adds XP to a user's stats and recalculates level (gas-optimized).
///
/// # Arguments
/// * `env` - The contract environment
/// * `user` - The user's address
/// * `xp_delta` - The amount of XP to add
///
/// # Returns
/// * `Ok(UserStats)` - The updated user stats
/// * `Err(Error::UserStatsNotFound)` - If the user has no stats
///
/// # Storage Access
/// * Reads from: Instance storage
/// * Writes to: Instance storage
/// * Gas Cost: High
///
/// # Level Calculation
/// * Level 1: 0-299 XP
/// * Level 2: 300-599 XP
/// * Level 3: 600-999 XP
/// * Level 4: 1000-1499 XP
/// * Level 5: 1500+ XP
///
/// # Benefits
/// * Automatic level recalculation
/// * Atomic XP update operation
/// * Prevents overflow (saturating add)
pub fn add_user_xp(env: &Env, user: &Address, xp_delta: u64) -> Result<UserCore, Error> {
    let mut stats = get_user_stats(env, user)?;
    stats.xp = stats.xp.saturating_add(xp_delta);

    stats.level = match stats.xp {
        x if x >= 1500 => 5,
        x if x >= 1000 => 4,
        x if x >= 600 => 3,
        x if x >= 300 => 2,
        _ => 1,
    };

    set_user_stats(env, user, &stats);
    Ok(stats)
}

//================================================================================
// Convenience Helpers
//================================================================================

/// Retrieves user stats or returns default stats for new users.
///
/// # Arguments
/// * `env` - The contract environment
/// * `user` - The user's address
///
/// # Returns
/// * `UserStats` - Existing stats if found, or default stats for new users
///
/// # Default Stats
/// * XP: 0
/// * Level: 1
/// * Quests Completed: 0
/// * Badges: Empty vector
///
/// # Storage Access
/// * Reads from: Instance storage (if exists)
/// * Gas Cost: Low (if exists) or None (if new user)
///
/// # Use Cases
/// * Displaying user profiles for new users
/// * Initializing stats before first quest completion
/// * Avoiding error handling for optional stats queries
pub fn get_user_stats_or_default(env: &Env, user: &Address) -> UserCore {
    get_user_stats(env, user).unwrap_or_else(|_| UserCore {
        xp: 0,
        level: 1,
        quests_completed: 0,
    })
}

/// Retrieves a submission as an Option instead of Result.
///
/// # Arguments
/// * `env` - The contract environment
/// * `quest_id` - The quest identifier
/// * `submitter` - The submitter's address
///
/// # Returns
/// * `Some(Submission)` - If the submission exists
/// * `None` - If the submission doesn't exist
///
/// # Storage Access
/// * Reads from: Instance storage (if exists)
/// * Gas Cost: Low (existence check) or Moderate (if exists)
///
/// # Use Cases
/// * When submission absence is a valid state (not an error)
/// * Optional data retrieval without error handling
/// * Checking for duplicate submissions
pub fn get_submission_if_exists(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
) -> Option<Submission> {
    get_submission(env, quest_id, submitter).ok()
}

//================================================================================
// Admin Storage Functions
//================================================================================

/// Checks if an address is an admin.
///
/// # Arguments
/// * `env` - The contract environment
/// * `address` - The address to check
///
/// # Returns
/// * `true` if the address is an admin, `false` otherwise
pub fn is_admin(env: &Env, address: &Address) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::Admin(address.clone()))
}

/// Sets an address as an admin.
///
/// # Arguments
/// * `env` - The contract environment
/// * `address` - The address to set as admin
pub fn set_admin(env: &Env, address: &Address) {
    env.storage()
        .instance()
        .set(&DataKey::Admin(address.clone()), &true);
}

/// Removes admin status from an address.
///
/// # Arguments
/// * `env` - The contract environment
/// * `address` - The address to remove admin status from
pub fn remove_admin(env: &Env, address: &Address) {
    env.storage()
        .instance()
        .remove(&DataKey::Admin(address.clone()));
}

//================================================================================
// Emergency / Security Storage Helpers
//================================================================================

/// Set global paused flag
pub fn set_paused(env: &Env, paused: bool) {
    if paused {
        env.storage().instance().set(&DataKey::Paused, &true);
    } else {
        env.storage().instance().remove(&DataKey::Paused);
    }
}

/// Get paused flag
pub fn is_paused(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Paused)
}

//================================================================================
// Reentrancy Guard Storage Helpers
//================================================================================

/// Returns true while a non-reentrant entry point is executing in the
/// current invocation. Reads from instance storage so the flag is rolled
/// back automatically if the transaction reverts.
pub fn is_reentrancy_locked(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::ReentrancyGuard)
}

/// Acquire the reentrancy lock. Caller must check `is_reentrancy_locked`
/// first; this function unconditionally writes the flag.
pub fn set_reentrancy_lock(env: &Env) {
    env.storage()
        .instance()
        .set(&DataKey::ReentrancyGuard, &true);
}

/// Release the reentrancy lock. Idempotent: safe to call when the lock
/// is not currently held.
pub fn clear_reentrancy_lock(env: &Env) {
    env.storage().instance().remove(&DataKey::ReentrancyGuard);
}

/// Approve or revoke unpause by admin for the current round
pub fn set_unpause_approval(env: &Env, admin: &Address, approved: bool) {
    let round = get_unpause_round(env);
    if approved {
        // If not already approved in this round, set and increment counter
        if !has_unpause_approval(env, admin) {
            env.storage()
                .instance()
                .set(&DataKey::UnpauseApproval(round, admin.clone()), &true);
            inc_unpause_approval_count(env);
        }
    } else {
        if has_unpause_approval(env, admin) {
            env.storage()
                .instance()
                .remove(&DataKey::UnpauseApproval(round, admin.clone()));
            dec_unpause_approval_count(env);
        }
    }
}

pub fn has_unpause_approval(env: &Env, admin: &Address) -> bool {
    let round = get_unpause_round(env);
    env.storage()
        .instance()
        .has(&DataKey::UnpauseApproval(round, admin.clone()))
}

pub fn get_unpause_round(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::UnpauseRound)
        .unwrap_or(0u32)
}

pub fn inc_unpause_round(env: &Env) {
    let cur = get_unpause_round(env);
    env.storage()
        .instance()
        .set(&DataKey::UnpauseRound, &cur.saturating_add(1));
}

pub fn count_unpause_approvals(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::UnpauseApprovalCount)
        .unwrap_or(0u32)
}

pub fn set_unpause_threshold(env: &Env, threshold: u32) {
    env.storage()
        .instance()
        .set(&DataKey::UnpauseThreshold, &threshold);
}

pub fn get_unpause_threshold(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::UnpauseThreshold)
        .unwrap_or(2u32)
}

pub fn set_unpause_timelock_seconds(env: &Env, seconds: u64) {
    env.storage()
        .instance()
        .set(&DataKey::UnpauseTimelockSeconds, &seconds);
}

pub fn get_unpause_timelock_seconds(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::UnpauseTimelockSeconds)
        .unwrap_or(0u64)
}

pub fn set_scheduled_unpause_time(env: &Env, ts: u64) {
    env.storage()
        .instance()
        .set(&DataKey::ScheduledUnpauseTime, &ts);
}

pub fn get_scheduled_unpause_time(env: &Env) -> Option<u64> {
    env.storage().instance().get(&DataKey::ScheduledUnpauseTime)
}

pub fn clear_unpause_approvals(env: &Env) {
    // Increment the round ID so previous approvals are effectively cleared/invalidated
    inc_unpause_round(env);
    // Reset the count for the new round
    env.storage()
        .instance()
        .set(&DataKey::UnpauseApprovalCount, &0u32);
    // Remove scheduled time
    env.storage()
        .instance()
        .remove(&DataKey::ScheduledUnpauseTime);
}

fn inc_unpause_approval_count(env: &Env) {
    let mut cur: u32 = env
        .storage()
        .instance()
        .get(&DataKey::UnpauseApprovalCount)
        .unwrap_or(0u32);
    cur = cur.saturating_add(1);
    env.storage()
        .instance()
        .set(&DataKey::UnpauseApprovalCount, &cur);
}

fn dec_unpause_approval_count(env: &Env) {
    let mut cur: u32 = env
        .storage()
        .instance()
        .get(&DataKey::UnpauseApprovalCount)
        .unwrap_or(0u32);
    cur = cur.saturating_sub(1);
    env.storage()
        .instance()
        .set(&DataKey::UnpauseApprovalCount, &cur);
}

//================================================================================
// Escrow Storage Functions (split: EscrowBalances hot-path + EscrowMeta cold-path)
//================================================================================

/// Check if escrow exists for a quest
pub fn has_escrow(env: &Env, quest_id: &Symbol) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::Escrow(quest_id.clone()))
}

/// Get escrow hot-path balances (total_deposited, total_paid_out, total_refunded,
/// is_active, deposit_count).  Used on every deposit, payout, and balance check.
pub fn get_escrow_balances(env: &Env, quest_id: &Symbol) -> Result<EscrowBalances, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Escrow(quest_id.clone()))
        .ok_or(Error::EscrowNotFound)
}

/// Save escrow hot-path balances.
pub fn set_escrow_balances(env: &Env, quest_id: &Symbol, balances: &EscrowBalances) {
    env.storage()
        .instance()
        .set(&DataKey::Escrow(quest_id.clone()), balances);
}

/// Get escrow cold-path metadata (depositor, token, created_at).
/// Loaded only for refunds and display queries.
pub fn get_escrow_meta(env: &Env, quest_id: &Symbol) -> Result<EscrowMeta, Error> {
    env.storage()
        .instance()
        .get(&DataKey::EscrowMeta(quest_id.clone()))
        .ok_or(Error::EscrowNotFound)
}

/// Save escrow cold-path metadata.
pub fn set_escrow_meta(env: &Env, quest_id: &Symbol, meta: &EscrowMeta) {
    env.storage()
        .instance()
        .set(&DataKey::EscrowMeta(quest_id.clone()), meta);
}

/// Assemble full EscrowInfo view from the two split entries.
/// Used only by the public `get_escrow_info()` query.
pub fn get_escrow(env: &Env, quest_id: &Symbol) -> Result<EscrowInfo, Error> {
    let balances = get_escrow_balances(env, quest_id)?;
    let meta = get_escrow_meta(env, quest_id)?;
    Ok(EscrowInfo {
        quest_id: quest_id.clone(),
        depositor: meta.depositor,
        token: meta.token,
        total_deposited: balances.total_deposited,
        total_paid_out: balances.total_paid_out,
        total_refunded: balances.total_refunded,
        is_active: balances.is_active,
        created_at: meta.created_at,
        deposit_count: balances.deposit_count,
    })
}

/// Delete both escrow entries for a quest (cleanup after terminal state)
pub fn delete_escrow(env: &Env, quest_id: &Symbol) {
    env.storage()
        .instance()
        .remove(&DataKey::Escrow(quest_id.clone()));
    env.storage()
        .instance()
        .remove(&DataKey::EscrowMeta(quest_id.clone()));
}

//================================================================================
// Contract Initialization Storage
//================================================================================

pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Initialized)
}

pub fn mark_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::ContractAdmin)
        .expect("Contract not initialized")
}

pub fn set_contract_admin(env: &Env, address: &Address) {
    env.storage()
        .instance()
        .set(&DataKey::ContractAdmin, address);
}

pub fn get_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::ContractVersion)
        .unwrap_or(0u32)
}

pub fn set_version(env: &Env, version: u32) {
    env.storage()
        .instance()
        .set(&DataKey::ContractVersion, &version);
}

pub fn get_config(env: &Env) -> Vec<(String, String)> {
    env.storage()
        .instance()
        .get(&DataKey::ContractConfig)
        .unwrap_or_else(|| Vec::new(env))
}

pub fn set_config(env: &Env, config: &Vec<(String, String)>) {
    env.storage()
        .instance()
        .set(&DataKey::ContractConfig, config);
}

//================================================================================
// Quest Index (for query/filtering support)
//================================================================================

pub fn get_quest_ids(env: &Env) -> Vec<Symbol> {
    env.storage()
        .instance()
        .get(&DataKey::QuestIds)
        .unwrap_or_else(|| Vec::new(env))
}

pub fn add_quest_id(env: &Env, id: &Symbol) -> Result<(), Error> {
    let mut ids = get_quest_ids(env);
    validation::validate_max_quests(ids.len())?;
    ids.push_back(id.clone());
    env.storage().instance().set(&DataKey::QuestIds, &ids);
    Ok(())
}

//================================================================================
// Platform & Creator Stats Storage
// PlatformStats is split into individual counters for atomic single-field updates.
// The full PlatformStats struct is assembled on read only.
//================================================================================

pub fn get_platform_stats(env: &Env) -> PlatformStats {
    PlatformStats {
        total_quests_created: env
            .storage().instance()
            .get(&DataKey::PlatformQuestsCreated)
            .unwrap_or(0u64),
        total_submissions: env
            .storage().instance()
            .get(&DataKey::PlatformSubmissions)
            .unwrap_or(0u64),
        total_rewards_distributed: env
            .storage().instance()
            .get(&DataKey::PlatformRewardsDistributed)
            .unwrap_or(0u128),
        total_active_users: env
            .storage().instance()
            .get(&DataKey::PlatformActiveUsers)
            .unwrap_or(0u64),
        total_rewards_claimed: env
            .storage().instance()
            .get(&DataKey::PlatformRewardsClaimed)
            .unwrap_or(0u64),
    }
}

/// Write all counters at once (used by reset_platform_stats and migration).
pub fn set_platform_stats(env: &Env, stats: &PlatformStats) {
    env.storage().instance().set(&DataKey::PlatformQuestsCreated,     &stats.total_quests_created);
    env.storage().instance().set(&DataKey::PlatformSubmissions,       &stats.total_submissions);
    env.storage().instance().set(&DataKey::PlatformRewardsDistributed,&stats.total_rewards_distributed);
    env.storage().instance().set(&DataKey::PlatformActiveUsers,       &stats.total_active_users);
    env.storage().instance().set(&DataKey::PlatformRewardsClaimed,    &stats.total_rewards_claimed);
}

/// Increment only the quests-created counter (1 read + 1 write instead of 5+5).
pub fn inc_platform_quests_created(env: &Env) {
    let v: u64 = env.storage().instance().get(&DataKey::PlatformQuestsCreated).unwrap_or(0);
    env.storage().instance().set(&DataKey::PlatformQuestsCreated, &v.saturating_add(1));
}

/// Increment only the submissions counter.
pub fn inc_platform_submissions(env: &Env) {
    let v: u64 = env.storage().instance().get(&DataKey::PlatformSubmissions).unwrap_or(0);
    env.storage().instance().set(&DataKey::PlatformSubmissions, &v.saturating_add(1));
}

/// Increment only the rewards-claimed counter.
pub fn inc_platform_rewards_claimed(env: &Env) {
    let v: u64 = env.storage().instance().get(&DataKey::PlatformRewardsClaimed).unwrap_or(0);
    env.storage().instance().set(&DataKey::PlatformRewardsClaimed, &v.saturating_add(1));
}

/// Add to the rewards-distributed counter.
pub fn add_platform_rewards_distributed(env: &Env, amount: u128) {
    let v: u128 = env.storage().instance().get(&DataKey::PlatformRewardsDistributed).unwrap_or(0);
    env.storage().instance().set(&DataKey::PlatformRewardsDistributed, &v.saturating_add(amount));
}

pub fn get_creator_stats(env: &Env, creator: &Address) -> CreatorStats {
    env.storage()
        .instance()
        .get(&DataKey::CreatorStats(creator.clone()))
        .unwrap_or(CreatorStats {
            quests_created: 0,
            total_rewards_posted: 0,
            total_submissions_received: 0,
            total_claims_paid: 0,
        })
}

pub fn set_creator_stats(env: &Env, creator: &Address, stats: &CreatorStats) {
    env.storage()
        .instance()
        .set(&DataKey::CreatorStats(creator.clone()), stats);
}

//================================================================================
// Dispute Storage Functions
//================================================================================

/// Checks if a dispute exists for a specific quest and initiator.
pub fn has_dispute(env: &Env, quest_id: &Symbol, initiator: &Address) -> bool {
    env.storage()
        .instance()
        .has(&DataKey::Dispute(quest_id.clone(), initiator.clone()))
}

/// Retrieves a dispute by quest_id and initiator.
pub fn get_dispute(env: &Env, quest_id: &Symbol, initiator: &Address) -> Result<crate::types::Dispute, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Dispute(quest_id.clone(), initiator.clone()))
        .ok_or(Error::DisputeNotFound)
}

/// Stores or updates a dispute record.
pub fn set_dispute(env: &Env, quest_id: &Symbol, initiator: &Address, dispute: &crate::types::Dispute) {
    env.storage()
        .instance()
        .set(&DataKey::Dispute(quest_id.clone(), initiator.clone()), dispute);
}

/// Deletes a dispute record.
pub fn delete_dispute(env: &Env, quest_id: &Symbol, initiator: &Address) {
    env.storage()
        .instance()
        .remove(&DataKey::Dispute(quest_id.clone(), initiator.clone()));
}
