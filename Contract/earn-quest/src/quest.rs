use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;
use crate::types::{Quest, QuestStatus};

/// Create and register a new quest
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
    env.events().publish((Symbol::new(env, "quest_reg"), id), quest);

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
