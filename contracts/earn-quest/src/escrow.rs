//! Escrow module — manages per-quest token deposits, payouts, and refunds.
//!
//! Uses split storage (EscrowBalances hot-path + EscrowMeta cold-path) to
//! minimise gas on the frequent deposit/payout/validate path.
//!
//! MONEY FLOW:
//!   deposit_escrow:    Creator wallet  →  Contract  (tokens locked)
//!   record_payout:     Update EscrowBalances after payout::transfer_reward
//!   refund_remaining:  Contract  →  Creator wallet  (leftover returned)

use soroban_sdk::{token, Address, Env, Symbol};

use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{EscrowBalances, EscrowInfo, EscrowMeta, QuestStatus};
use crate::validation;

fn available_balance(balances: &EscrowBalances) -> i128 {
    balances.total_deposited - balances.total_paid_out - balances.total_refunded
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
    if *token_address != quest.reward_asset {
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
        storage::set_escrow_meta(
            env,
            quest_id,
            &EscrowMeta {
                depositor: depositor.clone(),
                token: token_address.clone(),
                created_at: env.ledger().timestamp(),
            },
        );
        EscrowBalances {
            total_deposited: 0,
            total_paid_out: 0,
            total_refunded: 0,
            is_active: true,
            deposit_count: 0,
        }
    };

    balances.total_deposited += amount;
    balances.deposit_count += 1;
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
pub fn validate_sufficient(env: &Env, quest_id: &Symbol, amount: i128) -> Result<(), Error> {
    let b = storage::get_escrow_balances(env, quest_id)?;
    require_active_escrow(&b)?;

    let available = available_balance(&b);
    if available < amount {
        return Err(Error::InsufficientEscrow);
    }
    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// RECORD PAYOUT: Update hot-path balances after a reward transfer
// ═══════════════════════════════════════════════════════════════

pub fn record_payout(
    env: &Env,
    quest_id: &Symbol,
    recipient: &Address,
    token_address: &Address,
    amount: i128,
) -> Result<(), Error> {
    let mut b = storage::get_escrow_balances(env, quest_id)?;

    require_active_escrow(&b)?;

    let available = available_balance(&b);
    if available < amount {
        return Err(Error::InsufficientEscrow);
    }

    b.total_paid_out += amount;
    storage::set_escrow_balances(env, quest_id, &b);

    let remaining = available_balance(&b);
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

    let available = available_balance(&b);
    let depositor = meta.depositor.clone();
    let token = meta.token.clone();

    // CEI ordering: mark the escrow refunded and inactive FIRST so a
    // re-entrant call during the transfer below cannot trigger a second
    // refund (it would see is_active=false). On transfer failure the
    // transaction reverts and the storage write is rolled back atomically.
    b.total_refunded += available;
    b.is_active = false;
    storage::set_escrow_balances(env, quest_id, &b);

    if available > 0 {
        let token_client = token::Client::new(env, &token);
        let transfer_result = token_client.try_transfer(
            &env.current_contract_address(),
            &depositor,
            &available,
        );

        match transfer_result {
            Ok(Ok(_)) => {}
            _ => return Err(Error::TransferFailed),
        }

        events::escrow_refunded(env, quest_id.clone(), depositor, token, available);
    }

    Ok(available)
}

// ═══════════════════════════════════════════════════════════════
// CANCEL / EXPIRE / WITHDRAW
// ═══════════════════════════════════════════════════════════════

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

    // Refund escrow if it exists (uses a single read inside refund_remaining)
    let refunded = if storage::has_escrow(env, quest_id) {
        refund_remaining(env, quest_id)?
    } else {
        0
    };

    events::quest_cancelled(env, quest_id.clone(), caller.clone(), refunded);
    Ok(refunded)
}

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

    let refunded = if storage::has_escrow(env, quest_id) {
        refund_remaining(env, quest_id)?
    } else {
        0
    };

    Ok(refunded)
}

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
