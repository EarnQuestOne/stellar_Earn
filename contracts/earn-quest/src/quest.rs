use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{Quest, QuestStatus};
use crate::validation;
use soroban_sdk::{Address, Env, Symbol};

/// Register a new quest with full input validation.
///
/// Validates:
/// - Quest does not already exist
/// - Reward amount is within valid range (> 0 and <= MAX)
/// - Deadline is in the future
/// - Creator and verifier are distinct addresses
pub fn register_quest(
    env: &Env,
    id: &Symbol,
    creator: &Address,
    reward_asset: &Address,
    reward_amount: i128,
    verifier: &Address,
    deadline: u64,
) -> Result<(), Error> {
    // Validate quest ID symbol length
    validation::validate_symbol_length(id)?;

    // Check quest doesn't already exist
    if storage::has_quest(env, id) {
        return Err(Error::QuestAlreadyExists);
    }

    // Validate reward amount range (min/max)
    validation::validate_reward_amount(reward_amount)?;

    // Validate deadline is in the future
    validation::validate_deadline(env, deadline)?;

    // Validate creator and verifier are different addresses
    validation::validate_addresses_distinct(creator, verifier)?;

    let quest = Quest {
        id: id.clone(),
        creator: creator.clone(),
        reward_asset: reward_asset.clone(),
        reward_amount,
        verifier: verifier.clone(),
        deadline,
        status: QuestStatus::Active,
        total_claims: 0,
    };

    storage::set_quest(env, id, &quest);

    // EMIT EVENT: QuestRegistered
    events::quest_registered(
        env,
        id.clone(),
        creator.clone(),
        reward_asset.clone(),
        reward_amount,
        verifier.clone(),
        deadline,
    );

    Ok(())
}
