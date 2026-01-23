use crate::errors::Error;
use crate::storage;
use crate::types::{Quest, QuestStatus};
use soroban_sdk::{Address, Env, Symbol};

/// Register a new quest
/// Only the creator can register a quest and must authorize the transaction
pub fn register_quest(
    env: &Env,
    id: Symbol,
    creator: Address,
    reward_asset: Address,
    reward_amount: i128,
    verifier: Address,
    deadline: u64,
) -> Result<(), Error> {
    // Require authorization from the creator (skipped in tests)
    #[cfg(not(test))]
    creator.require_auth();

    // Check if quest already exists
    if storage::quest_exists(env, &id) {
        return Err(Error::QuestAlreadyExists);
    }

    // Validate reward amount
    if reward_amount <= 0 {
        return Err(Error::InvalidRewardAmount);
    }

    // Validate deadline is in the future
    let current_time = env.ledger().timestamp();
    if deadline <= current_time {
        return Err(Error::QuestExpired);
    }

    let quest = Quest {
        id: id.clone(),
        creator,
        reward_asset,
        reward_amount,
        verifier,
        deadline,
        status: QuestStatus::Active,
        total_claims: 0,
    };

    storage::store_quest(env, &quest)?;

    // Emit event for quest registration
    env.events()
        .publish((Symbol::new(env, "quest_registered"),), id);

    Ok(())
}

/// Get quest details by ID
pub fn get_quest(env: &Env, quest_id: Symbol) -> Result<Quest, Error> {
    storage::get_quest(env, &quest_id)
}

/// Update quest status
/// Only the quest creator can update the status
pub fn update_quest_status(
    env: &Env,
    quest_id: Symbol,
    caller: Address,
    new_status: QuestStatus,
) -> Result<(), Error> {
    // Require authorization from the caller (skipped in tests)
    #[cfg(not(test))]
    caller.require_auth();

    // Get the quest
    let mut quest = storage::get_quest(env, &quest_id)?;

    // Only creator can update status
    if quest.creator != caller {
        return Err(Error::Unauthorized);
    }

    // Validate status transition
    if !is_valid_status_transition(&quest.status, &new_status) {
        return Err(Error::InvalidStatusTransition);
    }

    // Update the status
    quest.status = new_status.clone();
    storage::store_quest(env, &quest)?;

    // Emit event for status update
    env.events().publish(
        (Symbol::new(env, "quest_status_updated"),),
        (quest_id, new_status),
    );

    Ok(())
}

/// Check if a status transition is valid
fn is_valid_status_transition(current: &QuestStatus, new: &QuestStatus) -> bool {
    match (current, new) {
        // Active can go to Paused, Completed, or Expired
        (QuestStatus::Active, QuestStatus::Paused) => true,
        (QuestStatus::Active, QuestStatus::Completed) => true,
        (QuestStatus::Active, QuestStatus::Expired) => true,
        // Paused can go back to Active or be Expired
        (QuestStatus::Paused, QuestStatus::Active) => true,
        (QuestStatus::Paused, QuestStatus::Expired) => true,
        // Completed and Expired are terminal states
        (QuestStatus::Completed, _) => false,
        (QuestStatus::Expired, _) => false,
        // Same status is not a valid transition
        _ => false,
    }
}

/// Pause a quest (convenience function)
pub fn pause_quest(env: &Env, quest_id: Symbol, caller: Address) -> Result<(), Error> {
    update_quest_status(env, quest_id, caller, QuestStatus::Paused)
}

/// Resume a paused quest (convenience function)
pub fn resume_quest(env: &Env, quest_id: Symbol, caller: Address) -> Result<(), Error> {
    update_quest_status(env, quest_id, caller, QuestStatus::Active)
}

/// Complete a quest (convenience function)
pub fn complete_quest(env: &Env, quest_id: Symbol, caller: Address) -> Result<(), Error> {
    update_quest_status(env, quest_id, caller, QuestStatus::Completed)
}

/// Check if quest exists
pub fn quest_exists(env: &Env, quest_id: &Symbol) -> bool {
    storage::quest_exists(env, quest_id)
}

/// Check if quest is active and not expired
pub fn is_quest_active(env: &Env, quest_id: &Symbol) -> Result<bool, Error> {
    let quest = storage::get_quest(env, quest_id)?;
    let current_time = env.ledger().timestamp();

    Ok(quest.status == QuestStatus::Active && quest.deadline > current_time)
}

// Unit tests require contract context - integration tests should be used
// See tests/ directory for integration tests
