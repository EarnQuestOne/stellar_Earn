//! Escrow module — manages per-quest token deposits, payouts, and refunds.
//!
//! Uses split storage (EscrowBalances hot-path + EscrowMeta cold-path) to
//! minimise gas on the frequent deposit/payout/validate path.
//!
//! MONEY FLOW:
//!   deposit_escrow:    Creator wallet  →  Contract  (tokens locked)
//!   record_payout:     Update EscrowBalances after payout::transfer_reward
//!   refund_remaining:  Contract  →  Creator wallet  (leftover returned)

use soroban_sdk::{token, Address, Env, Symbol, Vec};

use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{
    EscrowBalances, EscrowInfo, EscrowMeta, EscrowTokenBalance, QuestStatus, VerifierStake,
};
use crate::validation;

fn available_balance(balances: &EscrowBalances) -> i128 {
    balances.total_deposited - balances.total_paid_out - balances.total_refunded
}

fn find_token_balance_index(balances: &EscrowBalances, token: &Address) -> Option<u32> {
    for index in 0..balances.token_balances.len() {
        let balance = balances.token_balances.get(index).unwrap();
        if balance.token == *token {
            return Some(index);
        }
    }
    None
}

fn set_token_balance(balances: &mut EscrowBalances, index: u32, value: &EscrowTokenBalance) {
    balances.token_balances.set(index, value.clone());
}

fn require_active_escrow(balances: &EscrowBalances) -> Result<(), Error> {
    if !balances.is_active {
        return Err(Error::EscrowInactive);
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// DEPOSIT: Creator locks tokens for a quest
// ═══════════════════════════════════════════════════════════════

/// Deposits tokens into a quest's escrow account.
///
/// This function locks the specified amount of tokens from the creator's wallet
/// into the contract. These tokens will be used to pay out rewards for the quest.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest.
/// * `depositor` - The address of the account making the deposit (must be the quest creator).
/// * `token_address` - The address of the token asset being deposited.
/// * `amount` - The amount of tokens to deposit.
///
/// # Returns
///
/// * `Ok(())` if the deposit is successful.
/// * `Err(Error::Unauthorized)` if the depositor is not the quest creator.
/// * `Err(Error::QuestNotActive)` if the quest is already in a terminal state.
/// * `Err(Error::TokenMismatch)` if the token address doesn't match the quest's reward asset.
/// * `Err(Error::TransferFailed)` if the token transfer from the depositor fails.
pub fn deposit(
    env: &Env,
    quest_id: &Symbol,
    depositor: &Address,
    token_address: &Address,
    amount: i128,
) -> Result<(), Error> {
    validation::validate_reward_amount(amount)?;

    let quest = storage::get_quest(env, quest_id)?;

    if *depositor != quest.creator {
        return Err(Error::Unauthorized);
    }
    if validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotActive);
    }

    let mut is_allowed = false;
    if quest.reward_allocations.len() > 0 {
        for index in 0..quest.reward_allocations.len() {
            let allocation = quest.reward_allocations.get(index).unwrap();
            if allocation.asset == *token_address {
                is_allowed = true;
                break;
            }
        }
    } else if *token_address == quest.reward_asset {
        is_allowed = true;
    }
    if !is_allowed {
        return Err(Error::TokenMismatch);
    }

    // CEI ordering: load and update the escrow record FIRST, then perform
    // the external token transfer last. If the transfer fails the entire
    // transaction reverts and the storage write is rolled back, but a
    // re-entrant call during the transfer will see a fully-updated record
    // and cannot inflate the deposit total a second time.
    let mut balances = if storage::has_escrow(env, quest_id) {
        let existing = storage::get_escrow_balances(env, quest_id)?;
        require_active_escrow(&existing)?;
        existing
    } else {
        // First deposit — also write cold-path metadata (once only)
        let mut tokens = Vec::new(env);
        for index in 0..quest.reward_allocations.len() {
            let allocation = quest.reward_allocations.get(index).unwrap();
            tokens.push_back(allocation.asset.clone());
        }
        if tokens.is_empty() {
            tokens.push_back(token_address.clone());
        }

        storage::set_escrow_meta(
            env,
            quest_id,
            &EscrowMeta {
                depositor: depositor.clone(),
                token: token_address.clone(),
                tokens: tokens.clone(),
                created_at: env.ledger().timestamp(),
            },
        );
        EscrowBalances {
            total_deposited: 0,
            total_paid_out: 0,
            total_refunded: 0,
            is_active: true,
            deposit_count: 0,
            token_balances: Vec::new(env),
        }
    };

    balances.total_deposited += amount;
    balances.deposit_count += 1;
    if let Some(index) = find_token_balance_index(&balances, token_address) {
        let mut token_balance = balances.token_balances.get(index).unwrap();
        token_balance.total_deposited += amount;
        set_token_balance(&mut balances, index, &token_balance);
    } else {
        let token_balance = EscrowTokenBalance {
            token: token_address.clone(),
            total_deposited: amount,
            total_paid_out: 0,
            total_refunded: 0,
        };
        balances.token_balances.push_back(token_balance);
    }
    storage::set_escrow_balances(env, quest_id, &balances);

    let available = available_balance(&balances);
    events::escrow_deposited(
        env,
        quest_id.clone(),
        depositor.clone(),
        token_address.clone(),
        amount,
        available,
    );

    // Transfer tokens: creator → contract (external call, kept last)
    let token_client = token::Client::new(env, token_address);
    let transfer_result =
        token_client.try_transfer(depositor, &env.current_contract_address(), &amount);

    match transfer_result {
        Ok(Ok(_)) => Ok(()),
        _ => Err(Error::TransferFailed),
    }
}

// ═══════════════════════════════════════════════════════════════
// VALIDATE: Check if enough escrow exists for a payout (hot path)
// ═══════════════════════════════════════════════════════════════

/// Returns Ok if the quest's escrow can cover the given amount.
/// Only reads EscrowBalances (hot-path entry) — no Address deserialization.
pub fn validate_sufficient(
    env: &Env,
    quest_id: &Symbol,
    token_address: &Address,
    amount: i128,
) -> Result<(), Error> {
    let b = storage::get_escrow_balances(env, quest_id)?;
    require_active_escrow(&b)?;

    let Some(index) = find_token_balance_index(&b, token_address) else {
        return Err(Error::InsufficientEscrow);
    };
    let balance = b.token_balances.get(index).unwrap();
    let available = balance.total_deposited - balance.total_paid_out - balance.total_refunded;
    if available < amount {
        return Err(Error::InsufficientEscrow);
    }
    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// RECORD PAYOUT: Update hot-path balances after a reward transfer
// ═══════════════════════════════════════════════════════════════

/// Records a payout from a quest's escrow.
///
/// This function updates the escrow balances to reflect a reward payout.
/// It must be called after a successful token transfer to a submitter.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest.
/// * `recipient` - The address of the reward recipient.
/// * `token_address` - The address of the reward asset token.
/// * `amount` - The amount paid out.
///
/// # Returns
///
/// * `Ok(())` if the payout is successfully recorded.
/// * `Err(Error::EscrowNotFound)` if no escrow exists for the quest.
/// * `Err(Error::InsufficientEscrow)` if the escrow doesn't have enough funds.
pub fn record_payout(
    env: &Env,
    quest_id: &Symbol,
    recipient: &Address,
    token_address: &Address,
    amount: i128,
) -> Result<(), Error> {
    let mut b = storage::get_escrow_balances(env, quest_id)?;

    require_active_escrow(&b)?;

    let Some(index) = find_token_balance_index(&b, token_address) else {
        return Err(Error::InsufficientEscrow);
    };

    let mut balance = b.token_balances.get(index).unwrap();
    let available = balance.total_deposited - balance.total_paid_out - balance.total_refunded;
    if available < amount {
        return Err(Error::InsufficientEscrow);
    }

    b.total_paid_out += amount;
    balance.total_paid_out += amount;
    set_token_balance(&mut b, index, &balance);
    storage::set_escrow_balances(env, quest_id, &b);

    let remaining = balance.total_deposited - balance.total_paid_out - balance.total_refunded;
    events::escrow_payout(
        env,
        quest_id.clone(),
        recipient.clone(),
        token_address.clone(),
        amount,
        remaining,
    );

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// REFUND: Return remaining tokens to creator (cold path)
// ═══════════════════════════════════════════════════════════════

/// Refund all remaining escrow balance to the depositor.
/// Loads EscrowMeta (cold path) only here, where the depositor address is needed.
fn refund_remaining(env: &Env, quest_id: &Symbol) -> Result<i128, Error> {
    let mut b = storage::get_escrow_balances(env, quest_id)?;
    let meta = storage::get_escrow_meta(env, quest_id)?;

    let depositor = meta.depositor.clone();
    let mut refunded_total = 0i128;

    for index in 0..b.token_balances.len() {
        let mut balance = b.token_balances.get(index).unwrap();
        let available = balance.total_deposited - balance.total_paid_out - balance.total_refunded;
        if available <= 0 {
            continue;
        }

        refunded_total += available;
        balance.total_refunded += available;
        set_token_balance(&mut b, index, &balance);

        let token = balance.token.clone();
        let token_client = token::Client::new(env, &token);
        let transfer_result =
            token_client.try_transfer(&env.current_contract_address(), &depositor, &available);

        match transfer_result {
            Ok(Ok(_)) => {}
            _ => return Err(Error::TransferFailed),
        }

        events::escrow_refunded(env, quest_id.clone(), depositor.clone(), token, available);
    }

    b.total_refunded += refunded_total;
    b.is_active = false;
    storage::set_escrow_balances(env, quest_id, &b);

    Ok(refunded_total)
}

// ═══════════════════════════════════════════════════════════════
// CANCEL / EXPIRE / WITHDRAW
// ═══════════════════════════════════════════════════════════════

/// Cancels a quest and refunds any remaining escrow balance to the creator.
///
/// A quest can only be cancelled if it's currently active or paused.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest to cancel.
/// * `caller` - The address of the account performing the action (must be the creator).
///
/// # Returns
///
/// * `Ok(i128)` containing the amount of tokens refunded.
/// * `Err(Error::Unauthorized)` if the caller is not the creator.
/// * `Err(Error::QuestNotActive)` if the quest is already in a terminal state.
pub fn cancel_quest(env: &Env, quest_id: &Symbol, caller: &Address) -> Result<i128, Error> {
    let quest = storage::get_quest(env, quest_id)?;

    if *caller != quest.creator {
        return Err(Error::Unauthorized);
    }
    if validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotActive);
    }
    validation::validate_quest_status_transition(&quest.status, &QuestStatus::Cancelled)?;

    // Update quest status directly to avoid extra read
    let mut quest = quest;
    quest.status = QuestStatus::Cancelled;
    storage::set_quest(env, quest_id, &quest);
    storage::remove_quest_from_category_index(env, quest.category, quest_id);

    // Refund escrow if it exists (uses a single read inside refund_remaining)
    let refunded = if storage::has_escrow(env, quest_id) {
        refund_remaining(env, quest_id)?
    } else {
        0
    };

    events::quest_cancelled(env, quest_id.clone(), caller.clone(), refunded);
    Ok(refunded)
}

/// Expires a quest and refunds any remaining escrow balance to the creator.
///
/// This can only be called after the quest's deadline has passed.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest to expire.
/// * `caller` - The address of the account performing the action (must be the creator).
///
/// # Returns
///
/// * `Ok(i128)` containing the amount of tokens refunded.
/// * `Err(Error::Unauthorized)` if the caller is not the creator.
/// * `Err(Error::QuestNotActive)` if the quest has not yet reached its deadline.
pub fn expire_quest(env: &Env, quest_id: &Symbol, caller: &Address) -> Result<i128, Error> {
    let quest = storage::get_quest(env, quest_id)?;

    if *caller != quest.creator {
        return Err(Error::Unauthorized);
    }
    if validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotActive);
    }

    // Quest deadline must have passed (with expiry buffer to absorb clock drift)
    if !validation::is_quest_expired(env, quest.deadline) {
        return Err(Error::QuestNotActive); // Not yet definitively expired
    }
    validation::validate_quest_status_transition(&quest.status, &QuestStatus::Expired)?;

    // Update quest status directly to avoid extra read
    let mut quest = quest;
    quest.status = QuestStatus::Expired;
    storage::set_quest(env, quest_id, &quest);
    storage::remove_quest_from_category_index(env, quest.category, quest_id);

    let refunded = if storage::has_escrow(env, quest_id) {
        refund_remaining(env, quest_id)?
    } else {
        0
    };

    Ok(refunded)
}

/// Withdraws any remaining unclaimed funds from a terminal (Completed/Expired/Cancelled) quest.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest.
/// * `caller` - The address of the account performing the action (must be the creator).
///
/// # Returns
///
/// * `Ok(i128)` containing the amount of tokens withdrawn.
/// * `Err(Error::Unauthorized)` if the caller is not the creator.
/// * `Err(Error::QuestNotTerminal)` if the quest is still active.
/// * `Err(Error::NoFundsToWithdraw)` if there are no remaining funds.
pub fn withdraw_unclaimed(env: &Env, quest_id: &Symbol, caller: &Address) -> Result<i128, Error> {
    let quest = storage::get_quest(env, quest_id)?;

    if *caller != quest.creator {
        return Err(Error::Unauthorized);
    }
    if !validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotTerminal);
    }

    let balances = storage::get_escrow_balances(env, quest_id)?;
    let available = available_balance(&balances);
    if available <= 0 {
        return Err(Error::NoFundsToWithdraw);
    }

    // Continue with refund; refund_remaining will re-read escrow (required for mutability)
    refund_remaining(env, quest_id)
}

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

/// Get available balance — reads only EscrowBalances (hot path).
pub fn get_balance(env: &Env, quest_id: &Symbol) -> Result<i128, Error> {
    let b = storage::get_escrow_balances(env, quest_id)?;
    Ok(available_balance(&b))
}

/// Get full EscrowInfo view — assembles from both split entries.
pub fn get_info(env: &Env, quest_id: &Symbol) -> Result<EscrowInfo, Error> {
    storage::get_escrow(env, quest_id)
}

// ═══════════════════════════════════════════════════════════════
// VERIFIER STAKE: Deposit stake before verifying; return if no dispute
// ═══════════════════════════════════════════════════════════════

/// Deposits a verifier stake for a quest.
///
/// The verifier must call this before approving any submission.
/// Stake is held in the contract until the quest completes (returned) or
/// a dispute resolves against the verifier (slashed).
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The quest being staked on.
/// * `verifier` - The verifier depositing the stake.
/// * `token_address` - Token to stake (must match quest reward_asset).
/// * `amount` - Amount to stake (u128; must be > 0).
pub fn deposit_verifier_stake(
    env: &Env,
    quest_id: &Symbol,
    verifier: &Address,
    token_address: &Address,
    amount: u128,
) -> Result<(), Error> {
    if amount == 0 {
        return Err(Error::InvalidRewardAmount);
    }

    let quest = storage::get_quest(env, quest_id)?;
    if *token_address != quest.reward_asset {
        return Err(Error::TokenMismatch);
    }
    if validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotActive);
    }

    // CEI: write stake record before external token transfer
    let stake = VerifierStake {
        token: token_address.clone(),
        amount,
        is_active: true,
    };
    storage::set_verifier_stake(env, quest_id, verifier, &stake);

    events::verifier_stake_deposited(env, quest_id.clone(), verifier.clone(), amount);

    let signed_amount = amount as i128;
    let token_client = token::Client::new(env, token_address);
    match token_client.try_transfer(verifier, &env.current_contract_address(), &signed_amount) {
        Ok(Ok(_)) => Ok(()),
        _ => Err(Error::TransferFailed),
    }
}

/// Returns a verifier's stake back to them (called when quest completes without dispute).
///
/// Sends the full staked amount back to the verifier and marks the stake inactive.
pub fn return_verifier_stake(
    env: &Env,
    quest_id: &Symbol,
    verifier: &Address,
) -> Result<(), Error> {
    let mut stake = storage::get_verifier_stake(env, quest_id, verifier)?;
    if !stake.is_active {
        return Err(Error::VerifierStakeInactive);
    }

    let amount = stake.amount as i128;
    stake.is_active = false;
    storage::set_verifier_stake(env, quest_id, verifier, &stake);

    if amount > 0 {
        let token_client = token::Client::new(env, &stake.token);
        match token_client.try_transfer(&env.current_contract_address(), verifier, &amount) {
            Ok(Ok(_)) => Ok(()),
            _ => Err(Error::TransferFailed),
        }
    } else {
        Ok(())
    }
}

/// Slashes a verifier's stake proportionally.
///
/// Called from the dispute resolution path when the dispute resolves against
/// the verifier's decision. `slash_bps` is the slash proportion in basis points
/// (e.g. 10_000 = 100%, 5_000 = 50%).
///
/// Returns the amount slashed (transferred to `slash_recipient`).
pub fn slash_verifier_stake(
    env: &Env,
    quest_id: &Symbol,
    verifier: &Address,
    slash_bps: u32, // 0–10_000
    slash_recipient: &Address,
) -> Result<u128, Error> {
    let mut stake = storage::get_verifier_stake(env, quest_id, verifier)?;
    if !stake.is_active {
        return Err(Error::VerifierStakeInactive);
    }

    let slash_amount = (stake.amount * slash_bps as u128) / 10_000;
    let remainder = stake.amount - slash_amount;

    stake.amount = 0;
    stake.is_active = false;
    storage::set_verifier_stake(env, quest_id, verifier, &stake);

    let token_client = token::Client::new(env, &stake.token);

    // Transfer slashed portion to recipient
    if slash_amount > 0 {
        match token_client.try_transfer(
            &env.current_contract_address(),
            slash_recipient,
            &(slash_amount as i128),
        ) {
            Ok(Ok(_)) => {}
            _ => return Err(Error::TransferFailed),
        }
    }

    // Return remainder to verifier
    if remainder > 0 {
        match token_client.try_transfer(
            &env.current_contract_address(),
            verifier,
            &(remainder as i128),
        ) {
            Ok(Ok(_)) => {}
            _ => return Err(Error::TransferFailed),
        }
    }

    events::verifier_stake_slashed(env, quest_id.clone(), verifier.clone(), slash_amount);

    Ok(slash_amount)
}
