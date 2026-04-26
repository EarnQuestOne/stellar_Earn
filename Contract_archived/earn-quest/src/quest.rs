use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;
use crate::types::{Quest, QuestStatus};

/// Create and register a new quest
#[allow(clippy::too_many_arguments)]
pub fn create_quest(
    env: &Env,
    id: Symbol,
    creator: Address,
    reward_asset: Address,
    reward_amount: i128,
    verifier: Address,
    deadline: u64,
    max_participants: u32,
) -> Result<(), Error> {
    // Verify creator authorization
    creator.require_auth();

    // Validate inputs
    if reward_amount <= 0 {
        return Err(Error::InvalidRewardAmount);
    }

    if max_participants == 0 {
        return Err(Error::InvalidParticipantLimit);
    }

    // Validate deadline is in the future
    let current_time = env.ledger().timestamp();
    if deadline <= current_time {
        return Err(Error::InvalidDeadline);
    }

    // Check quest doesn't already exist
    if storage::has_quest(env, &id) {
        return Err(Error::QuestAlreadyExists);
    }

    // Create quest
    let quest = Quest {
        id: id.clone(),
        creator,
        reward_asset,
        reward_amount,
        verifier,
        deadline,
        status: QuestStatus::Active,
        max_participants,
        total_claims: 0,
    };

    // Store quest
    storage::set_quest(env, &quest);

    // Emit event
    env.events()
        .publish((Symbol::new(env, "quest_reg"), id), quest);

    Ok(())
}

/// Check if a quest has reached its participant limit
pub fn is_quest_full(quest: &Quest) -> bool {
    quest.total_claims >= quest.max_participants
}

/// Update quest status (admin only)
pub fn update_quest_status(
    env: &Env,
    quest_id: &Symbol,
    caller: &Address,
    new_status: QuestStatus,
) -> Result<(), Error> {
    // Verify caller authorization
    caller.require_auth();

    // Get quest
    let mut quest = storage::get_quest(env, quest_id).ok_or(Error::QuestNotFound)?;

    // Verify caller is the creator
    if quest.creator != *caller {
        return Err(Error::Unauthorized);
    }

    // Validate status transition - can't change from terminal states
    if quest.status == QuestStatus::Completed
        || quest.status == QuestStatus::Expired
        || quest.status == QuestStatus::Cancelled
    {
        return Err(Error::InvalidStatusTransition);
    }

    // Update status
    quest.status = new_status;
    storage::set_quest(env, &quest);

    // Emit event
    env.events()
        .publish((Symbol::new(env, "status_upd"), quest_id.clone()), quest);

    Ok(())
}

/// Automatically complete quest when participant limit is reached
pub fn auto_complete_quest_if_full(env: &Env, quest: &mut Quest) {
    if is_quest_full(quest) && quest.status == QuestStatus::Active {
        quest.status = QuestStatus::Completed;
        storage::set_quest(env, quest);

        // Emit event
        env.events().publish(
            (Symbol::new(env, "quest_full"), quest.id.clone()),
            quest.clone(),
        );
    }
}

/// Validate that a quest is active and accepting submissions
pub fn validate_quest_active(env: &Env, quest: &Quest) -> Result<(), Error> {
    // Check if quest is active
    if quest.status != QuestStatus::Active {
        return Err(Error::QuestNotActive);
    }

    // Check if quest has expired
    let current_time = env.ledger().timestamp();
    if current_time > quest.deadline {
        return Err(Error::QuestExpired);
    }

    // Check if quest is full
    if is_quest_full(quest) {
        return Err(Error::QuestFull);
    }

    Ok(())
}

/// Check if a quest has expired based on its deadline
pub fn check_expired(env: &Env, quest: &Quest) -> bool {
    let current_time = env.ledger().timestamp();
    current_time > quest.deadline
}

/// Manually expire a quest (admin/creator only)
pub fn expire_quest(env: &Env, quest_id: &Symbol, caller: &Address) -> Result<(), Error> {
    // Verify caller authorization
    caller.require_auth();

    // Get quest
    let mut quest = storage::get_quest(env, quest_id).ok_or(Error::QuestNotFound)?;

    // Verify caller is the creator
    if quest.creator != *caller {
        return Err(Error::Unauthorized);
    }

    // Check if quest is already expired or completed
    if quest.status == QuestStatus::Expired {
        return Err(Error::InvalidStatusTransition);
    }

    if quest.status == QuestStatus::Completed {
        return Err(Error::InvalidStatusTransition);
    }

    // Update status to Expired
    quest.status = QuestStatus::Expired;
    storage::set_quest(env, &quest);

    // Emit event
    env.events()
        .publish((Symbol::new(env, "quest_exp"), quest_id.clone()), quest);

    Ok(())
}

/// Automatically expire quest if deadline has passed
pub fn auto_expire_quest_if_deadline_passed(env: &Env, quest: &mut Quest) {
    if check_expired(env, quest) && quest.status == QuestStatus::Active {
        quest.status = QuestStatus::Expired;
        storage::set_quest(env, quest);

        // Emit event
        env.events().publish(
            (Symbol::new(env, "auto_exp"), quest.id.clone()),
            quest.clone(),
        );
    }
}

/// Cancel a quest (creator only). Allows withdrawal of remaining escrow funds.
pub fn cancel_quest(env: &Env, quest_id: &Symbol, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    let mut quest = storage::get_quest(env, quest_id).ok_or(Error::QuestNotFound)?;

    if quest.creator != *caller {
        return Err(Error::Unauthorized);
    }

    if quest.status == QuestStatus::Completed
        || quest.status == QuestStatus::Expired
        || quest.status == QuestStatus::Cancelled
    {
        return Err(Error::InvalidStatusTransition);
    }

    quest.status = QuestStatus::Cancelled;
    storage::set_quest(env, &quest);

    env.events()
        .publish((Symbol::new(env, "quest_can"), quest_id.clone()), quest);

    Ok(())
}
