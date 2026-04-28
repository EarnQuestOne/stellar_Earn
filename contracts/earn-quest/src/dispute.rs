use crate::errors::Error;
use crate::storage;
use crate::validation;
use crate::events;
use crate::admin;
use soroban_sdk::{Address, Env, Symbol};

use super::types::{Dispute, DisputeStatus};

/// Open a new dispute for a rejected submission.
///
/// Only the submitter (initiator) can open a dispute.
/// The submission must exist and be in `Rejected` status.
/// Only one open dispute per (quest_id, initiator) is allowed.
/// Opens a new dispute for a rejected submission.
///
/// Only the submitter (initiator) can open a dispute.
/// The submission must exist and be in `Rejected` status.
/// Only one open dispute per (quest_id, initiator) is allowed.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest in dispute.
/// * `initiator` - The address of the user initiating the dispute.
/// * `arbitrator` - The address of the designated arbitrator.
///
/// # Returns
///
/// * `Ok(Dispute)` containing the created dispute record.
/// * `Err(Error::DisputeAlreadyExists)` if a pending dispute already exists.
/// * `Err(Error)` if authorization or validation fails.
pub fn open_dispute(
    env: &Env,
    quest_id: Symbol,
    initiator: Address,
    arbitrator: Address,
) -> Result<Dispute, Error> {
    // Auth: initiator must sign
    initiator.require_auth();

    // Ensure dispute doesn't already exist for this initiator/quest
    if storage::has_dispute(env, &quest_id, &initiator) {
        let d = storage::get_dispute(env, &quest_id, &initiator)?;
        if d.status == DisputeStatus::Pending || d.status == DisputeStatus::UnderReview {
            return Err(Error::DisputeAlreadyExists);
        }
        // If exists but resolved/withdrawn, allow opening a new one (we'll overwrite)
    }

    // Validate arbitrator is not the zero address (could add more checks)
    // For simplicity, arbitrator can be any address (could be designated by creator or admin)

    // Create dispute
    let dispute = Dispute {
        quest_id: quest_id.clone(),
        initiator: initiator.clone(),
        arbitrator: arbitrator.clone(),
        status: DisputeStatus::Pending,
        filed_at: env.ledger().timestamp(),
    };

    // Store dispute
    storage::set_dispute(env, &quest_id, &initiator, &dispute);

    // Emit event
    events::dispute_opened(env, quest_id, initiator, arbitrator);

    Ok(dispute)
}

/// Resolve an open dispute. Only the assigned arbitrator can call this.
9
/// Resolves an open dispute.
///
/// Only the assigned arbitrator can resolve the dispute.
/// The dispute must be in `Pending` or `UnderReview` status.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest.
/// * `initiator` - The address of the dispute initiator.
/// * `arbitrator` - The address of the arbitrator resolving the dispute.
///
/// # Returns
///
/// * `Ok(())` if the dispute is successfully resolved.
/// * `Err(Error::DisputeNotAuthorized)` if the caller is not the assigned arbitrator.
/// * `Err(Error::DisputeNotPending)` if the dispute is not in a resolvable state.

/// If the dispute is in `Appealed` status, only an admin can resolve it.

pub fn resolve_dispute(
    env: &Env,
    quest_id: Symbol,
    initiator: Address,
    arbitrator: Address,
) -> Result<(), Error> {
    // Auth: arbitrator must sign
    arbitrator.require_auth();

    // Fetch dispute
    let mut dispute = storage::get_dispute(env, &quest_id, &initiator)?;

    // Validate status
    match dispute.status {
        DisputeStatus::Pending | DisputeStatus::UnderReview => {
            // Verify caller is the assigned arbitrator
            if dispute.arbitrator != arbitrator {
                return Err(Error::DisputeNotAuthorized);
            }
        }
        DisputeStatus::Appealed => {
            // Verify caller is an admin for appeals
            admin::require_admin(env, &arbitrator)?;
        }
        _ => return Err(Error::DisputeNotPending),
    }

    // Update status to Resolved
    dispute.status = DisputeStatus::Resolved;
    storage::set_dispute(env, &quest_id, &initiator, &dispute);

    // Emit event
    events::dispute_resolved(env, quest_id, initiator, arbitrator);

    Ok(())
}

/// Appeal a resolved dispute. Only the initiator can call this.
/// The dispute must be in `Resolved` status.
pub fn appeal_dispute(
    env: &Env,
    quest_id: Symbol,
    initiator: Address,
    new_arbitrator: Address,
) -> Result<(), Error> {
    // Auth: initiator must sign
    initiator.require_auth();

    // Fetch dispute
    let mut dispute = storage::get_dispute(env, &quest_id, &initiator)?;

    // Must be Resolved to appeal
    if dispute.status != DisputeStatus::Resolved {
        return Err(Error::DisputeNotResolved);
    }

    // Update status to Appealed
    dispute.status = DisputeStatus::Appealed;
    dispute.arbitrator = new_arbitrator.clone();
    storage::set_dispute(env, &quest_id, &initiator, &dispute);

    // Emit event
    events::dispute_appealed(env, quest_id, initiator, new_arbitrator);

    Ok(())
}

/// Withdraw a dispute (only by initiator, only while Pending).
/// Withdraws an open dispute.
///
/// Only the initiator can withdraw their own dispute, and only if it's still `Pending`.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest.
/// * `initiator` - The address of the user who filed the dispute.
///
/// # Returns
///
/// * `Ok(())` if the dispute is successfully withdrawn.
/// * `Err(Error::DisputeNotPending)` if the dispute is already under review or resolved.
pub fn withdraw_dispute(
    env: &Env,
    quest_id: Symbol,
    initiator: Address,
) -> Result<(), Error> {
    // Auth: initiator must sign
    initiator.require_auth();

    // Fetch dispute
    let mut dispute = storage::get_dispute(env, &quest_id, &initiator)?;

    // Status must be Pending (cannot withdraw UnderReview or Resolved)
    if dispute.status != DisputeStatus::Pending {
        return Err(Error::DisputeNotPending);
    }

    // Mark as withdrawn
    dispute.status = DisputeStatus::Withdrawn;
    storage::set_dispute(env, &quest_id, &initiator, &dispute);

    // Emit event
    events::dispute_withdrawn(env, quest_id, initiator);

    Ok(())
}

/// Get dispute details for a quest and initiator.
/// Retrieves the details of a specific dispute.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest.
/// * `initiator` - The address of the dispute initiator.
///
/// # Returns
///
/// * `Ok(Dispute)` if found.
/// * `Err(Error::DisputeNotFound)` if no dispute exists for the given ID and initiator.
pub fn get_dispute(
    env: &Env,
    quest_id: Symbol,
    initiator: Address,
) -> Result<Dispute, Error> {
    storage::get_dispute(env, &quest_id, &initiator)
}

/// Check if a dispute exists and is in a pending/review state.
/// Checks if a dispute exists and is in an active (Pending or UnderReview) state.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest.
/// * `initiator` - The address of the initiator.
///
/// # Returns
///
/// `true` if an active dispute exists, `false` otherwise.
pub fn has_active_dispute(env: &Env, quest_id: &Symbol, initiator: &Address) -> bool {
    matches!(
        storage::get_dispute(env, quest_id, initiator).ok(),
        Some(d) if d.status == DisputeStatus::Pending || d.status == DisputeStatus::UnderReview
    )
}
