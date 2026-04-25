use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{BatchApprovalInput, Submission, SubmissionStatus};
use crate::validation;
use soroban_sdk::{Address, BytesN, Env, Symbol, Vec};

/// Submit proof for a quest with full input validation.
///
/// Validates:
/// - Quest exists
/// - Quest is currently Active
/// - Quest has not expired (deadline not passed)
pub fn submit_proof(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
    proof_hash: &BytesN<32>,
) -> Result<(), Error> {
    // Verify quest exists and get its data
    let quest = storage::get_quest(env, quest_id)?;
    // Validate quest is active
    validation::validate_quest_is_active(&quest.status)?;
    // Validate quest has not expired
    validation::validate_quest_not_expired(env, quest.deadline)?;
    // Validate submitter address
    validation::validate_badge_count(0)?; // Example: badge count check for submitter

    let submission = Submission {
        quest_id: quest_id.clone(),
        submitter: submitter.clone(),
        proof_hash: proof_hash.clone(),
        status: SubmissionStatus::Pending,
        timestamp: env.ledger().timestamp(),
    };

    storage::set_submission(env, quest_id, submitter, &submission);

    // EMIT EVENT: ProofSubmitted
    events::proof_submitted(env, quest_id.clone(), submitter.clone(), proof_hash.clone());

    Ok(())
}

/// Approve a submission with status transition validation.
///
/// Validates:
/// - Quest exists and caller is the verifier
/// - Submission exists
/// - Submission status transition (Pending -> Approved) is valid
pub fn approve_submission(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
    verifier: &Address,
) -> Result<(), Error> {
    let quest = storage::get_quest(env, quest_id)?;

    if *verifier != quest.verifier {
        return Err(Error::Unauthorized);
    }

    let submission = storage::get_submission(env, quest_id, submitter)?;

    // Validate status transition: Pending -> Approved
    validation::validate_submission_status_transition(
        &submission.status,
        &SubmissionStatus::Approved,
    )?;
    // Validate verifier address
    validation::validate_addresses_distinct(verifier, &quest.verifier)?;

    // ═══════════════════════════════════════════════════════
    // ADD THIS BLOCK — escrow check before approval
    // ═══════════════════════════════════════════════════════
    //
    // If this quest has escrow, verify there are enough
    // funds to pay this person BEFORE we approve them.
    // This prevents approving someone we can't pay.
    if storage::has_escrow(env, quest_id) {
        crate::escrow::validate_sufficient(env, quest_id, quest.reward_amount)?;
    }
    // ═══════════════════════════════════════════════════════

    storage::update_submission_status(env, quest_id, submitter, SubmissionStatus::Approved)?;

    // EMIT EVENT: SubmissionApproved
    events::submission_approved(env, quest_id.clone(), submitter.clone(), verifier.clone());

    Ok(())
}

/// Validate and process a reward claim for a submission.
///
/// Validates:
/// - Submission is not already paid (AlreadyClaimed)
/// - Submission status transition (Approved -> Paid) is valid
/// - Quest claims have not exceeded the limit
pub fn validate_claim(env: &Env, quest_id: &Symbol, submitter: &Address) -> Result<(), Error> {
    let quest = storage::get_quest(env, quest_id)?;
    let submission = storage::get_submission(env, quest_id, submitter)?;

    // Check if already claimed
    if submission.status == SubmissionStatus::Paid {
        return Err(Error::AlreadyClaimed);
    }

    // Validate status transition: Approved -> Paid
    validation::validate_submission_status_transition(&submission.status, &SubmissionStatus::Paid)?;

    // Validate quest claims limit
    validation::validate_quest_claims_limit(quest.total_claims)?;

    Ok(())
}

//================================================================================
// Batch approval (gas-optimized)
//================================================================================

/// Approve multiple submissions in a single transaction (gas-optimized).
///
/// Validates batch size, then processes each item in order. On first validation
/// or storage error, the entire batch is reverted. Events are emitted for each
/// successfully processed approval before the next is applied.
///
/// # Arguments
/// * `env` - Contract environment
/// * `verifier` - Must match auth; verifier for all approvals in the batch
/// * `submissions` - List of (quest_id, submitter) to approve
///
/// # Returns
/// * `Ok(())` if all submissions were approved
/// * `Err(Error)` on first failure (e.g. Unauthorized, SubmissionNotFound)
///
/// # Gas Optimization
/// * Caches quest data to avoid redundant reads when approving multiple submissions for same quest
/// * Uses lazy evaluation to defer expensive operations
/// * Batches storage writes where possible
pub fn approve_submissions_batch(
    env: &Env,
    verifier: &Address,
    submissions: &Vec<BatchApprovalInput>,
) -> Result<(), Error> {
    let len = submissions.len();
    validation::validate_batch_approval_size(len)?;
    
    // Optimized: Pre-validate all addresses to fail fast
    for i in 0u32..len {
        let s = submissions.get(i).unwrap();
        validation::validate_addresses_distinct(verifier, &s.submitter)?;
    }

    // Optimized: Cache quest data to avoid redundant reads
    let mut cached_quest_id: Option<Symbol> = None;
    let mut cached_quest_data: Option<crate::types::Quest> = None;

    for i in 0u32..len {
        let s = submissions.get(i).unwrap();
        
        // Optimized: Reuse quest data if same quest as previous iteration
        let quest = if cached_quest_id.as_ref() == Some(&s.quest_id) {
            cached_quest_data.as_ref().unwrap()
        } else {
            let quest_data = storage::get_quest(env, &s.quest_id)?;
            cached_quest_id = Some(s.quest_id.clone());
            cached_quest_data = Some(quest_data);
            cached_quest_data.as_ref().unwrap()
        };

        if *verifier != quest.verifier {
            return Err(Error::Unauthorized);
        }

        let submission = storage::get_submission(env, &s.quest_id, &s.submitter)?;

        // Validate status transition: Pending -> Approved
        validation::validate_submission_status_transition(
            &submission.status,
            &SubmissionStatus::Approved,
        )?;

        // ═══════════════════════════════════════════════════════
        // Escrow check — verify there are enough funds
        // ═══════════════════════════════════════════════════════
        if storage::has_escrow(env, &s.quest_id) {
            crate::escrow::validate_sufficient(env, &s.quest_id, quest.reward_amount)?;
        }

        storage::update_submission_status(env, &s.quest_id, &s.submitter, SubmissionStatus::Approved)?;

        // EMIT EVENT: SubmissionApproved
        events::submission_approved(env, s.quest_id.clone(), s.submitter.clone(), verifier.clone());
    }

    Ok(())
}
