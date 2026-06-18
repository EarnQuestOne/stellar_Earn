use crate::errors::Error;
use crate::escrow;
use crate::storage;
use soroban_sdk::{token, Address, Env, Symbol};

/// Transfer rewards from the contract escrow to the user (gas-optimized).
///
/// This function handles the low-level token transfer and ensures
/// the contract has sufficient balance.
///
/// # Gas Optimization
/// * Caches contract address to avoid redundant retrieval
/// * Uses try_transfer for efficient error handling
/// * Minimizes storage reads by checking balance once
pub fn transfer_reward(
    env: &Env,
    reward_asset: &Address,
    to: &Address,
    amount: i128,
) -> Result<(), Error> {
    // Asset validation (basic check that it's a valid addresses is handled by SDK type)
    // Additional validation could be checking against a whitelist if required.

    if amount <= 0 {
        return Err(Error::InvalidRewardAmount);
    }

    // Optimized: Cache contract address and token client
    let contract_address = env.current_contract_address();
    let token_client = token::Client::new(env, reward_asset);

    // Optimized: Single balance check before transfer
    let balance = token_client.balance(&contract_address);
    if balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // Transfer logic - contract authorizes this transfer as it owns the funds
    let transfer_result = token_client.try_transfer(&contract_address, to, &amount);

    // Error Handling
    match transfer_result {
        Ok(Ok(_)) => Ok(()),
        Ok(Err(_)) => Err(Error::TransferFailed), // Token logic error
        Err(_) => Err(Error::TransferFailed),     // Cross-contract call error
    }
}

// ═══════════════════════════════════════════════════════════════
// ADD below the existing transfer_reward function
// ═══════════════════════════════════════════════════════════════

/// Transfer reward with escrow tracking.
///
/// If the quest has escrow:
///   1. Validate escrow has enough funds
///   2. Transfer tokens (existing logic)
///   3. Record the deduction in escrow tracking
///
/// If the quest has no escrow:
///   Falls back to existing transfer_reward behavior.
///   (backward compatible with quests created before escrow feature)
pub fn transfer_reward_from_escrow(
    env: &Env,
    quest_id: &Symbol,
    reward_asset: &Address,
    to: &Address,
    amount: i128,
) -> Result<(), Error> {
    let has_escrow = storage::has_escrow(env, quest_id);

    // CEI ordering: validate AND debit the escrow accounting before issuing
    // the external token transfer. If the transfer fails the entire
    // transaction reverts and the accounting write is rolled back; if a
    // re-entrant call lands during the transfer it sees the post-debit
    // balance and cannot drain the same funds twice.
    if has_escrow {
        escrow::validate_sufficient(env, quest_id, amount)?;
        escrow::record_payout(env, quest_id, to, reward_asset, amount)?;
    }

    transfer_reward(env, reward_asset, to, amount)
}

// ═══════════════════════════════════════════════════════════════
// 2-of-2 SuperAdmin Clawback
// ═══════════════════════════════════════════════════════════════

/// First SuperAdmin flags a post-payout payment for clawback.
///
/// The initiator records the clawback intent.  A *different* SuperAdmin
/// must call `execute_clawback` to complete the transfer back to escrow.
pub fn initiate_clawback(
    env: &Env,
    caller: &Address,
    quest_id: &Symbol,
    recipient: &Address,
    asset: &Address,
    amount: i128,
) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    if amount <= 0 {
        return Err(Error::InvalidRewardAmount);
    }
    // Disallow any further initiation once a pending record exists.
    if storage::has_clawback(env, quest_id, recipient) {
        return Err(Error::ClawbackAlreadySigned);
    }

    storage::set_clawback(
        env,
        quest_id,
        recipient,
        &storage::ClawbackPending {
            initiator: caller.clone(),
            asset: asset.clone(),
            amount,
        },
    );

    crate::events::clawback_initiated(
        env,
        quest_id.clone(),
        caller.clone(),
        recipient.clone(),
        asset.clone(),
        amount,
    );
    Ok(())
}

/// Second SuperAdmin co-signs and pulls funds from the recipient back to the
/// contract's escrow/treasury address (current contract).
///
/// The caller must be a *different* SuperAdmin from the initiator.
/// On success the pending record is cleared and `ClawbackExecuted` is emitted.
pub fn execute_clawback(
    env: &Env,
    caller: &Address,
    quest_id: &Symbol,
    recipient: &Address,
) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    let pending = storage::get_clawback(env, quest_id, recipient)?;

    if pending.initiator == *caller {
        return Err(Error::ClawbackAlreadySigned);
    }

    // Recipient must have authorised the transfer back (Soroban auth model).
    recipient.require_auth();

    let token_client = token::Client::new(env, &pending.asset);
    let contract_address = env.current_contract_address();

    // Pull funds from the recipient back to this contract (escrow).
    let result = token_client.try_transfer(recipient, &contract_address, &pending.amount);
    match result {
        Ok(Ok(_)) => {}
        _ => return Err(Error::TransferFailed),
    }

    storage::delete_clawback(env, quest_id, recipient);

    crate::events::clawback_executed(
        env,
        quest_id.clone(),
        caller.clone(),
        recipient.clone(),
        pending.asset,
        pending.amount,
    );
    Ok(())
}
