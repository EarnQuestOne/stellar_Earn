use soroban_sdk::{contracttype, Env, Symbol, Address, Vec};
use crate::types::{Quest, Submission, UserStats, QuestStatus, SubmissionStatus};
use crate::errors::Error;

/// Storage key definitions for the contract's persistent data.
///
/// This enum defines all possible keys used to store data in the contract's instance storage.
/// Each variant represents a different type of data with its associated key structure.
#[contracttype]
pub enum DataKey {
    /// Stores individual Quest data, keyed by quest ID (Symbol)
    Quest(Symbol),
    /// Stores individual Submission data, keyed by quest ID and submitter address
    Submission(Symbol, Address),
    /// Stores UserStats data, keyed by user address
    UserStats(Address),
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
    env.storage().instance().set(&DataKey::Quest(id.clone()), quest);
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
pub fn get_submission(env: &Env, quest_id: &Symbol, submitter: &Address) -> Result<Submission, Error> {
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
    env.storage()
        .instance()
        .set(&DataKey::Submission(quest_id.clone(), submitter.clone()), submission);
}

//================================================================================
// UserStats Storage Functions
//================================================================================

/// Checks if user stats exist for a specific user.
///
/// # Arguments
/// * `env` - The contract environment
/// * `user` - The user's address
///
/// # Returns
/// * `true` if the user has stats stored, `false` otherwise
///
/// # Storage Access
/// * Reads from: Instance storage (existence check only)
/// * Gas Cost: Low
pub fn has_user_stats(env: &Env, user: &Address) -> bool {
    env.storage().instance().has(&DataKey::UserStats(user.clone()))
}

/// Retrieves user stats from storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `user` - The user's address
///
/// # Returns
/// * `Ok(UserStats)` - The user's stats if found
/// * `Err(Error::UserStatsNotFound)` - If the user has no stats
///
/// # Storage Access
/// * Reads from: Instance storage
/// * Gas Cost: Moderate
///
/// # Notes
/// * For new users who may not have stats, consider using `get_user_stats_or_default()`
pub fn get_user_stats(env: &Env, user: &Address) -> Result<UserStats, Error> {
    env.storage()
        .instance()
        .get(&DataKey::UserStats(user.clone()))
        .ok_or(Error::UserStatsNotFound)
}

/// Stores or updates user stats in storage.
///
/// # Arguments
/// * `env` - The contract environment
/// * `user` - The user's address
/// * `stats` - The user stats to store
///
/// # Storage Access
/// * Writes to: Instance storage
/// * Gas Cost: High
///
/// # Notes
/// * For XP updates only, consider using `add_user_xp()` for atomic updates
pub fn set_user_stats(env: &Env, user: &Address, stats: &UserStats) {
    env.storage()
        .instance()
        .set(&DataKey::UserStats(user.clone()), stats);
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
    env.storage().instance().remove(&DataKey::UserStats(user.clone()));
}

//================================================================================
// Partial Update Helpers (Gas Optimization)
//================================================================================

/// Updates only the status field of a quest.
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

/// Atomically increments the total_claims counter for a quest.
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

/// Updates only the status field of a submission.
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

/// Atomically adds XP to a user's stats and recalculates level.
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
pub fn add_user_xp(env: &Env, user: &Address, xp_delta: u64) -> Result<UserStats, Error> {
    let mut stats = get_user_stats(env, user)?;
    stats.xp = stats.xp.saturating_add(xp_delta);

    // Recalculate level based on XP thresholds
    stats.level = if stats.xp >= 1500 {
        5
    } else if stats.xp >= 1000 {
        4
    } else if stats.xp >= 600 {
        3
    } else if stats.xp >= 300 {
        2
    } else {
        1
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
pub fn get_user_stats_or_default(env: &Env, user: &Address) -> UserStats {
    get_user_stats(env, user).unwrap_or_else(|_| UserStats {
        xp: 0,
        level: 1,
        quests_completed: 0,
        badges: Vec::new(env),
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
