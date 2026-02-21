use soroban_sdk::{token, Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;
use crate::types::QuestStatus;

/// Deposit funds into escrow for a quest.
/// The creator transfers tokens to the contract, which holds them until payout or withdrawal.
pub fn deposit_escrow(
    env: &Env,
    quest_id: &Symbol,
    depositor: &Address,
    amount: i128,
) -> Result<(), Error> {
    depositor.require_auth();

    if amount <= 0 {
        return Err(Error::InvalidEscrowAmount);
    }

    let quest = storage::get_quest(env, quest_id).ok_or(Error::QuestNotFound)?;

    if quest.creator != *depositor {
        return Err(Error::Unauthorized);
    }

    if quest.status != QuestStatus::Active && quest.status != QuestStatus::Paused {
        return Err(Error::QuestNotActive);
    }

    let token_client = token::Client::new(env, &quest.reward_asset);
    let contract_address = env.current_contract_address();
    token_client.transfer(depositor, &contract_address, &amount);

    let current_balance = storage::get_escrow_balance(env, quest_id);
    storage::set_escrow_balance(env, quest_id, current_balance + amount);

    env.events()
        .publish((Symbol::new(env, "escrow_dep"), quest_id.clone()), amount);

    Ok(())
}

/// Validate that sufficient escrow exists for a payout amount
pub fn validate_escrow_sufficient(
    env: &Env,
    quest_id: &Symbol,
    required_amount: i128,
) -> Result<(), Error> {
    let balance = storage::get_escrow_balance(env, quest_id);
    if balance < required_amount {
        return Err(Error::InsufficientEscrow);
    }
    Ok(())
}

/// Deduct from escrow and transfer reward to the submitter
pub fn process_payout(env: &Env, quest_id: &Symbol, recipient: &Address) -> Result<(), Error> {
    let quest = storage::get_quest(env, quest_id).ok_or(Error::QuestNotFound)?;

    validate_escrow_sufficient(env, quest_id, quest.reward_amount)?;

    let current_balance = storage::get_escrow_balance(env, quest_id);
    storage::set_escrow_balance(env, quest_id, current_balance - quest.reward_amount);

    let token_client = token::Client::new(env, &quest.reward_asset);
    let contract_address = env.current_contract_address();
    token_client.transfer(&contract_address, recipient, &quest.reward_amount);

    env.events().publish(
        (Symbol::new(env, "escrow_pay"), quest_id.clone()),
        recipient.clone(),
    );

    Ok(())
}

/// Withdraw unclaimed escrow funds back to the quest creator.
/// Only allowed after the quest is Completed, Expired, or Cancelled.
pub fn withdraw_unclaimed(env: &Env, quest_id: &Symbol, creator: &Address) -> Result<i128, Error> {
    creator.require_auth();

    let quest = storage::get_quest(env, quest_id).ok_or(Error::QuestNotFound)?;

    if quest.creator != *creator {
        return Err(Error::Unauthorized);
    }

    match quest.status {
        QuestStatus::Completed | QuestStatus::Expired | QuestStatus::Cancelled => {}
        _ => return Err(Error::QuestStillActive),
    }

    let balance = storage::get_escrow_balance(env, quest_id);
    if balance <= 0 {
        return Err(Error::NoEscrowBalance);
    }

    let token_client = token::Client::new(env, &quest.reward_asset);
    let contract_address = env.current_contract_address();
    token_client.transfer(&contract_address, creator, &balance);

    storage::set_escrow_balance(env, quest_id, 0);

    env.events()
        .publish((Symbol::new(env, "escrow_wd"), quest_id.clone()), balance);

    Ok(balance)
}

/// Get the current escrow balance for a quest
pub fn get_escrow_balance(env: &Env, quest_id: &Symbol) -> i128 {
    storage::get_escrow_balance(env, quest_id)
}
