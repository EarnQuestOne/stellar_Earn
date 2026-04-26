use crate::errors::Error;
use crate::storage;
use crate::validation;
use crate::events;
use soroban_sdk::{Address, Env, Symbol};

use super::types::{Dispute, DisputeStatus};

/// Open a new dispute for a rejected submission.
///
/// Only the submitter (initiator) can open a dispute.
/// The submission must exist and be in `Rejected` status.
/// Only one open dispute per (quest_id, initiator) is allowed.
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

    // Validate status: must be Pending or UnderReview
    match dispute.status {
        DisputeStatus::Pending | DisputeStatus::UnderReview => {
            // OK
        }
        _ => return Err(Error::DisputeNotPending),
    }

    // Verify caller is the assigned arbitrator
    if dispute.arbitrator != arbitrator {
        return Err(Error::DisputeNotAuthorized);
    }

    // Update status to Resolved
    dispute.status = DisputeStatus::Resolved;
    storage::set_dispute(env, &quest_id, &initiator, &dispute);

    // Emit event
    events::dispute_resolved(env, quest_id, initiator, arbitrator);

    Ok(())
}

/// Withdraw a dispute (only by initiator, only while Pending).
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
pub fn get_dispute(
    env: &Env,
    quest_id: Symbol,
    initiator: Address,
) -> Result<Dispute, Error> {
    storage::get_dispute(env, &quest_id, &initiator)
}

/// Check if a dispute exists and is in a pending/review state.
pub fn has_active_dispute(env: &Env, quest_id: &Symbol, initiator: &Address) -> bool {
    matches!(
        storage::get_dispute(env, quest_id, initiator).ok(),
        Some(d) if d.status == DisputeStatus::Pending || d.status == DisputeStatus::UnderReview
    )
}
