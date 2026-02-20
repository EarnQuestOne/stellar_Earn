use crate::errors::Error;
use crate::events;
use crate::storage;
use soroban_sdk::{Address, Env, token};

/// Is contract paused?
pub fn is_paused(env: &Env) -> bool {
    storage::is_paused(env)
}

pub fn require_not_paused(env: &Env) -> Result<(), Error> {
    if is_paused(env) {
        return Err(Error::Paused);
    }
    Ok(())
}

/// Pause the contract immediately (admin only)
pub fn emergency_pause(env: &Env, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    storage::set_paused(env, true);
    events::emergency_paused(env, caller.clone());
    Ok(())
}

/// Approve an unpause. When approvals meet threshold a timelock is scheduled.
pub fn emergency_approve_unpause(env: &Env, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    if storage::has_unpause_approval(env, caller) {
        return Err(Error::AlreadyApproved);
    }

    storage::set_unpause_approval(env, caller, true);
    events::unpause_approved(env, caller.clone());

    let approvals = storage::count_unpause_approvals(env);
    let threshold = storage::get_unpause_threshold(env);
    if approvals >= threshold {
        let now = env.ledger().timestamp();
        let tl = storage::get_unpause_timelock_seconds(env);
        let scheduled = now + tl;
        storage::set_scheduled_unpause_time(env, scheduled);
        events::timelock_scheduled(env, scheduled);
    }

    Ok(())
}

/// Execute unpause once timelock has expired and approvals met.
pub fn emergency_unpause(env: &Env, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    let scheduled = storage::get_scheduled_unpause_time(env);
    if scheduled.is_none() {
        return Err(Error::InsufficientApprovals);
    }

    let now = env.ledger().timestamp();
    let ts = scheduled.unwrap();
    if now < ts {
        return Err(Error::TimelockNotExpired);
    }

    storage::set_paused(env, false);
    storage::clear_unpause_approvals(env);
    events::emergency_unpaused(env, caller.clone());
    Ok(())
}

/// Emergency withdrawal when paused (admin only)
pub fn emergency_withdraw(
    env: &Env,
    caller: &Address,
    asset: &Address,
    to: &Address,
    amount: i128,
) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    if !is_paused(env) {
        return Err(Error::Paused);
    }

    if amount <= 0 {
        return Err(Error::InvalidRewardAmount);
    }

    let token_client = token::Client::new(env, asset);
    let contract_address = env.current_contract_address();

    let balance = token_client.balance(&contract_address);
    if balance < amount {
        return Err(Error::InsufficientBalance);
    }

    let transfer_result = token_client.try_transfer(&contract_address, to, &amount);

    match transfer_result {
        Ok(Ok(_)) => {
            events::emergency_withdrawn(env, caller.clone(), asset.clone(), to.clone(), amount);
            Ok(())
        }
        _ => Err(Error::TransferFailed),
    }
}

/// Admins can configure the required approvals threshold
pub fn set_unpause_threshold(env: &Env, caller: &Address, threshold: u32) -> Result<(), Error> {
    caller.require_auth();
    if !storage::is_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    storage::set_unpause_threshold(env, threshold);
    Ok(())
}

/// Admins can configure timelock seconds for unpause scheduling
pub fn set_unpause_timelock(env: &Env, caller: &Address, seconds: u64) -> Result<(), Error> {
    caller.require_auth();
    if !storage::is_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    storage::set_unpause_timelock_seconds(env, seconds);
    Ok(())
}
