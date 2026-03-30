use soroban_sdk::{contracttype, Address, Env, Symbol};

use crate::errors::Error;

/// Lifecycle status of a dispute
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeStatus {
    /// Dispute has been filed and awaits review
    Pending,
    /// Evidence is actively being reviewed
    UnderReview,
    /// A final decision has been reached
    Resolved,
    /// Dispute was withdrawn by the initiator
    Withdrawn,
}

/// A dispute record for a contested quest submission
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    /// Quest the dispute relates to
    pub quest_id: Symbol,
    /// Address of the user who filed the dispute
    pub initiator: Address,
    /// Address of the assigned arbitrator
    pub arbitrator: Address,
    /// Current dispute status
    pub status: DisputeStatus,
    /// Ledger timestamp when the dispute was filed
    pub filed_at: u64,
}

/// Open a new dispute for a rejected submission.
///
/// Requires authentication from the initiator.
pub fn open_dispute(
    env: &Env,
    quest_id: Symbol,
    initiator: Address,
    arbitrator: Address,
) -> Result<Dispute, Error> {
    initiator.require_auth();
    Ok(Dispute {
        quest_id,
        initiator,
        arbitrator,
        status: DisputeStatus::Pending,
        filed_at: env.ledger().timestamp(),
    })
}

/// Resolve an open dispute.
///
/// Requires authentication from the assigned arbitrator.
pub fn resolve_dispute(dispute: &mut Dispute, arbitrator: &Address) -> Result<(), Error> {
    arbitrator.require_auth();
    if dispute.status != DisputeStatus::Pending && dispute.status != DisputeStatus::UnderReview {
        return Err(Error::InvalidQuestStatus);
    }
    dispute.status = DisputeStatus::Resolved;
    Ok(())
}
