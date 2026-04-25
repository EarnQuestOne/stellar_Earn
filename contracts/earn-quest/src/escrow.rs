//! Escrow module — manages per-quest token deposits, payouts, and refunds.
//!
//! MONEY FLOW:
//!
//!   deposit_escrow:    Creator wallet  →  Contract  (tokens locked)
//!   record_payout:     Update tracking after payout::transfer_reward sends tokens
//!   refund_remaining:  Contract  →  Creator wallet  (leftover returned)

use soroban_sdk::{token, Address, Env, Symbol};

use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{EscrowInfo, QuestStatus};
use crate::validation;

// ═══════════════════════════════════════════════════════════════
// DEPOSIT: Creator locks tokens for a quest
// ═══════════════════════════════════════════════════════════════

/// Deposit tokens into escrow for a specific quest.
///
/// Called by the quest creator to fund rewards. Can be called multiple
/// times to top up. Tokens are transferred from the creator's wallet
/// to the contract.
///
/// # Flow
/// ```text
/// Creator's wallet  ──(amount)──►  Contract address
///                                  EscrowInfo.total_deposited += amount
/// ```
pub fn deposit(
    env: &Env,
    quest_id: &Symbol,
    depositor: &Address,
    token_address: &Address,
    amount: i128,
) -> Result<(), Error> {
    // Validate amount
    validation::validate_reward_amount(amount)?;

    // Load quest — must exist
    let quest = storage::get_quest(env, quest_id)?;

    // Only the quest creator can deposit
    if *depositor != quest.creator {
        return Err(Error::Unauthorized);
    }

    // Quest must be active or paused (not terminal)
    if validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotActive);
    }

    // Token must match quest's reward asset
    if *token_address != quest.reward_asset {
        return Err(Error::TokenMismatch);
    }

    // CEI ordering: load and update the escrow record FIRST, then perform
    // the external token transfer last. If the transfer fails the entire
    // transaction reverts and the storage write is rolled back, but a
    // re-entrant call during the transfer will see a fully-updated record
    // and cannot inflate the deposit total a second time.
    let mut escrow = if storage::has_escrow(env, quest_id) {
        let existing = storage::get_escrow(env, quest_id)?;
        if !existing.is_active {
            return Err(Error::EscrowInactive);
        }
        existing
    } else {
        // First deposit — create new escrow record
        EscrowInfo {
            quest_id: quest_id.clone(),
            depositor: depositor.clone(),
            token: token_address.clone(),
            total_deposited: 0,
            total_paid_out: 0,
            total_refunded: 0,
            is_active: true,
            created_at: env.ledger().timestamp(),
            deposit_count: 0,
        }
    };

    escrow.total_deposited += amount;
    escrow.deposit_count += 1;
    storage::set_escrow(env, quest_id, &escrow);

    // Emit event
    let available = escrow.total_deposited - escrow.total_paid_out - escrow.total_refunded;
    events::escrow_deposited(env, quest_id.clone(), depositor.clone(), amount, available);

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
// VALIDATE: Check if enough escrow exists for a payout
// ═══════════════════════════════════════════════════════════════

/// Returns Ok if the quest's escrow can cover the given amount.
/// Returns Err(EscrowNotFound) if no escrow exists.
/// Returns Err(InsufficientEscrow) if balance is too low.
pub fn validate_sufficient(env: &Env, quest_id: &Symbol, amount: i128) -> Result<(), Error> {
    let escrow = storage::get_escrow(env, quest_id)?;

    if !escrow.is_active {
        return Err(Error::EscrowInactive);
    }

    let available = escrow.total_deposited - escrow.total_paid_out - escrow.total_refunded;

    if available < amount {
        return Err(Error::InsufficientEscrow);
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// RECORD PAYOUT: Update tracking after a reward transfer
// ═══════════════════════════════════════════════════════════════

/// Deduct an amount from escrow tracking after a successful payout.
///
/// Called AFTER payout::transfer_reward() succeeds.
/// Does NOT transfer tokens — that's payout.rs's job.
/// This just updates the accounting.
///
/// # Flow
/// ```text
/// EscrowInfo.total_paid_out += amount
/// ```
pub fn record_payout(
    env: &Env,
    quest_id: &Symbol,
    recipient: &Address,
    amount: i128,
) -> Result<(), Error> {
    let mut escrow = storage::get_escrow(env, quest_id)?;

    if !escrow.is_active {
        return Err(Error::EscrowInactive);
    }

    let available = escrow.total_deposited - escrow.total_paid_out - escrow.total_refunded;
    if available < amount {
        return Err(Error::InsufficientEscrow);
    }

    escrow.total_paid_out += amount;
    storage::set_escrow(env, quest_id, &escrow);

    let remaining = escrow.total_deposited - escrow.total_paid_out - escrow.total_refunded;
    events::escrow_payout(env, quest_id.clone(), recipient.clone(), amount, remaining);

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// REFUND: Return remaining tokens to creator
// ═══════════════════════════════════════════════════════════════

/// Refund all remaining escrow balance to the depositor.
///
/// Called internally by cancel_quest() and withdraw_unclaimed().
/// Transfers tokens from contract back to creator and deactivates escrow.
///
/// # Flow
/// ```text
/// Contract  ──(remaining)──►  Creator's wallet
/// EscrowInfo.total_refunded += remaining
/// EscrowInfo.is_active = false
/// ```
///
/// Returns the amount refunded (0 if nothing was left).
fn refund_remaining(env: &Env, quest_id: &Symbol) -> Result<i128, Error> {
    let mut escrow = storage::get_escrow(env, quest_id)?;

    let available = escrow.total_deposited - escrow.total_paid_out - escrow.total_refunded;
    let depositor = escrow.depositor.clone();
    let token = escrow.token.clone();

    // CEI ordering: mark the escrow refunded and inactive FIRST so a
    // re-entrant call during the transfer below cannot trigger a second
    // refund (it would see is_active=false). On transfer failure the
    // transaction reverts and the storage write is rolled back atomically.
    escrow.total_refunded += available;
    escrow.is_active = false;
    storage::set_escrow(env, quest_id, &escrow);

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

        events::escrow_refunded(env, quest_id.clone(), depositor, available);
    }

    Ok(available)
}

// ═══════════════════════════════════════════════════════════════
// CANCEL QUEST: Creator cancels + refund
// ═══════════════════════════════════════════════════════════════

/// Cancel a quest and refund remaining escrow to the creator.
///
/// # Requirements
/// - Caller must be the quest creator
/// - Quest must be Active or Paused (not already terminal)
///
/// # Flow
/// ```text
/// Quest.status = Cancelled
/// Remaining escrow → Creator's wallet
/// ```
pub fn cancel_quest(env: &Env, quest_id: &Symbol, caller: &Address) -> Result<i128, Error> {
    let quest = storage::get_quest(env, quest_id)?;

    // Only creator can cancel
    if *caller != quest.creator {
        return Err(Error::Unauthorized);
    }

    // Must not already be terminal
    if validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotActive);
    }

    // Validate the status transition
    validation::validate_quest_status_transition(&quest.status, &QuestStatus::Cancelled)?;

    // Update quest status
    storage::update_quest_status(env, quest_id, QuestStatus::Cancelled)?;

    // Refund escrow if it exists
    let refunded = if storage::has_escrow(env, quest_id) {
        refund_remaining(env, quest_id)?
    } else {
        0
    };

    events::quest_cancelled(env, quest_id.clone(), caller.clone(), refunded);

    Ok(refunded)
}

// ═══════════════════════════════════════════════════════════════
// EXPIRE QUEST: Mark expired + refund
// ═══════════════════════════════════════════════════════════════

/// Mark a quest as expired and refund remaining escrow to the creator.
///
/// # Requirements
/// - Caller must be the quest creator or admin
/// - Quest must be Active or Paused
/// - Quest deadline must have passed
///
/// # Flow
/// ```text
/// Quest.status = Expired
/// Remaining escrow → Creator's wallet
/// ```
pub fn expire_quest(env: &Env, quest_id: &Symbol, caller: &Address) -> Result<i128, Error> {
    let quest = storage::get_quest(env, quest_id)?;

    // Only creator can expire
    if *caller != quest.creator {
        return Err(Error::Unauthorized);
    }

    // Must not already be terminal
    if validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotActive);
    }

    // Quest deadline must have passed
    let current_time = env.ledger().timestamp();
    if current_time < quest.deadline {
        return Err(Error::QuestNotActive); // Not yet expired
    }

    // Validate the status transition
    validation::validate_quest_status_transition(&quest.status, &QuestStatus::Expired)?;

    // Update quest status
    storage::update_quest_status(env, quest_id, QuestStatus::Expired)?;

    // Refund escrow if it exists
    let refunded = if storage::has_escrow(env, quest_id) {
        refund_remaining(env, quest_id)?
    } else {
        0
    };

    Ok(refunded)
}

// ═══════════════════════════════════════════════════════════════
// WITHDRAW UNCLAIMED: Reclaim leftover after quest ends
// ═══════════════════════════════════════════════════════════════

/// Withdraw remaining escrow from a terminal quest.
///
/// # Requirements
/// - Caller must be the quest creator
/// - Quest must be Completed, Expired, or Cancelled
/// - Escrow must exist and have remaining balance
///
/// # Flow
/// ```text
/// Remaining escrow → Creator's wallet
/// ```
pub fn withdraw_unclaimed(env: &Env, quest_id: &Symbol, caller: &Address) -> Result<i128, Error> {
    let quest = storage::get_quest(env, quest_id)?;

    // Only creator can withdraw
    if *caller != quest.creator {
        return Err(Error::Unauthorized);
    }

    // Quest must be in a terminal state
    if !validation::is_quest_terminal(&quest.status) {
        return Err(Error::QuestNotTerminal);
    }

    // Must have escrow
    if !storage::has_escrow(env, quest_id) {
        return Err(Error::EscrowNotFound);
    }

    let escrow = storage::get_escrow(env, quest_id)?;
    let available = escrow.total_deposited - escrow.total_paid_out - escrow.total_refunded;

    if available <= 0 {
        return Err(Error::NoFundsToWithdraw);
    }

    refund_remaining(env, quest_id)
}

// ═══════════════════════════════════════════════════════════════
// QUERIES: Read escrow state
// ═══════════════════════════════════════════════════════════════

/// Get the available (unspent, unrefunded) escrow balance for a quest.
pub fn get_balance(env: &Env, quest_id: &Symbol) -> Result<i128, Error> {
    let escrow = storage::get_escrow(env, quest_id)?;
    Ok(escrow.total_deposited - escrow.total_paid_out - escrow.total_refunded)
}

/// Get the full escrow info for a quest.
pub fn get_info(env: &Env, quest_id: &Symbol) -> Result<EscrowInfo, Error> {
    storage::get_escrow(env, quest_id)
}
