use crate::errors::Error;
use crate::storage;
use soroban_sdk::{Address, Env, Symbol, Vec};

/// Represents the pause state with timelock and multi-sig tracking
#[soroban_sdk::contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PauseState {
    /// Whether the contract is currently paused
    pub is_paused: bool,
    /// Timestamp when pause was activated (for timelock)
    pub pause_timestamp: u64,
    /// Timelock delay in seconds before pause becomes effective
    pub timelock_delay: u64,
    /// Addresses that have signed to pause (for multi-sig)
    pub pause_signers: Vec<Address>,
    /// Number of signatures required to execute pause
    pub required_signatures: u32,
    /// Timestamp of last pause event for grace period
    pub last_pause_time: u64,
    /// Grace period in seconds for emergency withdrawals
    pub grace_period: u64,
    /// Optional emergency pause reason
    pub pause_reason: Option<Symbol>,
}

/// Default pause state
impl Default for PauseState {
    fn default() -> Self {
        PauseState {
            is_paused: false,
            pause_timestamp: 0,
            timelock_delay: 0,
            pause_signers: Vec::new(&Env::default()),
            required_signatures: 0,
            last_pause_time: 0,
            grace_period: 7200, // 2 hours default
            pause_reason: None,
        }
    }
}

/// Initialize the pause state with configuration
pub fn initialize_pause_state(
    env: &Env,
    timelock_delay: u64,
    required_signatures: u32,
    grace_period: u64,
) -> Result<(), Error> {
    let pause_state = PauseState {
        is_paused: false,
        pause_timestamp: 0,
        timelock_delay,
        pause_signers: Vec::new(env),
        required_signatures,
        last_pause_time: 0,
        grace_period,
        pause_reason: None,
    };

    storage::set_pause_state(env, &pause_state);
    Ok(())
}

/// Get current pause state
pub fn get_pause_state(env: &Env) -> Result<PauseState, Error> {
    storage::get_pause_state(env).ok_or(Error::NotInitialized)
}

/// Check if contract is currently paused (respecting timelock)
pub fn is_contract_paused(env: &Env) -> Result<bool, Error> {
    let pause_state = get_pause_state(env)?;

    // If not marked as paused, return false
    if !pause_state.is_paused {
        return Ok(false);
    }

    // Check if timelock has passed
    let current_time = env.ledger().timestamp();
    let activation_time = pause_state.pause_timestamp + pause_state.timelock_delay;

    // Paused only if timelock has passed
    Ok(current_time >= activation_time)
}

/// Require that contract is not paused
pub fn require_not_paused(env: &Env) -> Result<(), Error> {
    // If pause state is not initialized, allow operations
    let pause_state = match get_pause_state(env) {
        Ok(state) => state,
        Err(Error::NotInitialized) => return Ok(()),
        Err(e) => return Err(e),
    };

    // Check if timelock has passedd

    if !pause_state.is_paused {
        return Ok(());
    }

    let current_time = env.ledger().timestamp();
    let activation_time = pause_state.pause_timestamp + pause_state.timelock_delay;

    // Paused only if timelock has passed
    if current_time >= activation_time {
        return Err(Error::ContractPaused);
    }

    Ok(())
}

/// Check if emergency withdrawal is available (grace period not expired)
pub fn is_withdrawal_allowed(env: &Env) -> Result<bool, Error> {
    let pause_state = get_pause_state(env)?;

    if !pause_state.is_paused {
        return Ok(true); // Not paused, withdrawals always allowed
    }

    // Calculate grace period end time
    let grace_period_end = pause_state.last_pause_time + pause_state.grace_period;
    let current_time = env.ledger().timestamp();

    Ok(current_time < grace_period_end)
}

/// Request pause with multi-sig threshold requirement
pub fn request_pause(env: &Env, requester: Address, reason: Option<Symbol>) -> Result<(), Error> {
    // Require authentication from requester
    requester.require_auth();

    let mut pause_state = get_pause_state(env)?;

    // Check if this signer hasn't already signed
    if pause_state.pause_signers.contains(&requester) {
        return Err(Error::AlreadySigned);
    }

    // Add signer to the list
    pause_state.pause_signers.push_back(requester.clone());

    // Set pause reason if provided
    if reason.is_some() {
        pause_state.pause_reason = reason;
    }

    // If this is the first signature, record the timestamp for timelock
    if pause_state.pause_signers.len() == 1 {
        pause_state.pause_timestamp = env.ledger().timestamp();
    }

    // Check if we have reached the required number of signatures
    if (pause_state.pause_signers.len() as u32) >= pause_state.required_signatures {
        pause_state.is_paused = true;
        pause_state.last_pause_time = env.ledger().timestamp();

        // Emit pause event
        storage::emit_pause_event(env, true, pause_state.pause_reason.clone());
    }

    storage::set_pause_state(env, &pause_state);
    Ok(())
}

/// Cancel pending pause request (admin can clear all signers)
pub fn cancel_pause_request(env: &Env, admin: Address) -> Result<(), Error> {
    // Verify admin privileges
    admin.require_auth();

    let _config = crate::init::get_config(env)?;
    if _config.admin != admin {
        return Err(Error::Unauthorized);
    }

    let mut pause_state = get_pause_state(env)?;

    // Clear signers only if not yet activated
    if !pause_state.is_paused {
        pause_state.pause_signers = Vec::new(env);
        pause_state.pause_timestamp = 0;
        pause_state.pause_reason = None;
    } else {
        return Err(Error::InvalidPauseState);
    }

    storage::set_pause_state(env, &pause_state);
    Ok(())
}

/// Unpause the contract (admin-only, requires auth and may have timelock)
pub fn unpause_contract(env: &Env, admin: Address) -> Result<(), Error> {
    // Require authentication from admin
    admin.require_auth();

    let mut pause_state = get_pause_state(env)?;

    // Verify caller is admin
    let config = crate::init::get_config(env)?;
    if config.admin != admin {
        return Err(Error::Unauthorized);
    }

    // Contract must be in paused state
    if !pause_state.is_paused {
        return Err(Error::InvalidPauseState);
    }

    // Reset pause state
    pause_state.is_paused = false;
    pause_state.pause_timestamp = 0;
    pause_state.pause_signers = Vec::new(env);
    pause_state.pause_reason = None;

    storage::set_pause_state(env, &pause_state);

    // Emit unpause event
    storage::emit_unpause_event(env);

    Ok(())
}

/// Get remaining signatures needed to activate pause
pub fn get_remaining_signatures(env: &Env) -> Result<u32, Error> {
    let pause_state = get_pause_state(env)?;
    let signed = pause_state.pause_signers.len() as u32;
    let remaining = pause_state.required_signatures.saturating_sub(signed);
    Ok(remaining)
}

/// Get current signers for pending pause
pub fn get_pause_signers(env: &Env) -> Result<Vec<Address>, Error> {
    let pause_state = get_pause_state(env)?;
    Ok(pause_state.pause_signers)
}

/// Get timelock remaining time in seconds
pub fn get_timelock_remaining(env: &Env) -> Result<u64, Error> {
    let pause_state = get_pause_state(env)?;

    if !pause_state.is_paused {
        return Ok(0);
    }

    let current_time = env.ledger().timestamp();
    let activation_time = pause_state.pause_timestamp + pause_state.timelock_delay;

    if current_time >= activation_time {
        Ok(0)
    } else {
        Ok(activation_time - current_time)
    }
}

/// Get grace period remaining in seconds for emergency withdrawals
pub fn get_grace_period_remaining(env: &Env) -> Result<u64, Error> {
    let pause_state = get_pause_state(env)?;

    if !pause_state.is_paused {
        return Ok(0);
    }

    let grace_period_end = pause_state.last_pause_time + pause_state.grace_period;
    let current_time = env.ledger().timestamp();

    if current_time >= grace_period_end {
        Ok(0)
    } else {
        Ok(grace_period_end - current_time)
    }
}

/// Update pause configuration (admin-only)
pub fn update_pause_config(
    env: &Env,
    admin: Address,
    timelock_delay: Option<u64>,
    required_signatures: Option<u32>,
    grace_period: Option<u64>,
) -> Result<(), Error> {
    // Require authentication from admin
    admin.require_auth();

    let config = crate::init::get_config(env)?;
    if config.admin != admin {
        return Err(Error::Unauthorized);
    }

    let mut pause_state = get_pause_state(env)?;

    // Update configuration values if provided
    if let Some(delay) = timelock_delay {
        pause_state.timelock_delay = delay;
    }
    if let Some(sigs) = required_signatures {
        pause_state.required_signatures = sigs;
    }
    if let Some(period) = grace_period {
        pause_state.grace_period = period;
    }

    storage::set_pause_state(env, &pause_state);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_pause_state() {
        let state = PauseState::default();
        assert!(!state.is_paused);
        assert_eq!(state.pause_timestamp, 0);
        assert_eq!(state.timelock_delay, 0);
        assert_eq!(state.required_signatures, 0);
        assert_eq!(state.grace_period, 7200);
    }
}
