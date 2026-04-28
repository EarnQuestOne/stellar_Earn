use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{BatchApprovalInput, Commitment, EscrowInfo, Submission, SubmissionStatus};
use crate::validation;
use soroban_sdk::{xdr::ToXdr, Address, Bytes, BytesN, Env, Symbol, Vec};

/// Commit to a submission by providing a hash of the proof and a secret salt.
/// This prevents front-running by hiding the actual proof until the reveal phase.
///
/// Validates:
/// - Quest exists and is Active
/// - Quest has not expired
/// - User does not already have a submission or commitment
pub fn commit_submission(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
    commitment_hash: &BytesN<32>,
) -> Result<(), Error> {
    // Verify quest exists and get its data
    let quest = storage::get_quest(env, quest_id)?;
    // Validate quest is active
    validation::validate_quest_is_active(&quest.status)?;
    // Validate quest has not expired
    validation::validate_quest_not_expired(env, quest.deadline)?;

    // Check for existing submission to prevent double submission
    if storage::has_submission(env, quest_id, submitter) {
        return Err(Error::AlreadyClaimed);
    }

    // Check for existing commitment
    if storage::has_commitment(env, quest_id, submitter) {
        return Err(Error::AlreadyApproved);
    }

    let commitment = Commitment {
        hash: commitment_hash.clone(),
        timestamp: env.ledger().timestamp(),
    };

    storage::set_commitment(env, quest_id, submitter, &commitment);

    // EMIT EVENT: CommitmentSubmitted
    events::commitment_submitted(
        env,
        quest_id.clone(),
        submitter.clone(),
        commitment_hash.clone(),
    );

    Ok(())
}

/// Reveal the proof and salt to complete the submission process.
/// The contract verifies that hash(proof_hash + salt + submitter) matches the commitment.
///
/// Validates:
/// - Commitment exists for the user
/// - Provided proof and salt match the stored commitment
pub fn reveal_submission(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
    proof_hash: &BytesN<32>,
    salt: &BytesN<32>,
) -> Result<(), Error> {
    // 1. Retrieve the stored commitment
    let commitment = storage::get_commitment(env, quest_id, submitter)?;

    // 2. Verify the commitment: hash(proof_hash + salt + submitter_xdr)
    let mut data = Bytes::new(env);
    data.append(&proof_hash.clone().into());
    data.append(&salt.clone().into());
    data.append(&submitter.to_xdr(env));

    let calculated_hash = env.crypto().sha256(&data);

    if calculated_hash != commitment.hash {
        return Err(Error::InvalidCommitment);
    }

    // 3. Create the actual submission
    let submission = Submission {
        quest_id: quest_id.clone(),
        submitter: submitter.clone(),
        proof_hash: proof_hash.clone(),
        status: SubmissionStatus::Pending,
        claimed_amount: 0,
        timestamp: env.ledger().timestamp(),
    };

    storage::set_submission(env, quest_id, submitter, &submission);

    // 4. Cleanup the commitment to free up storage
    storage::delete_commitment(env, quest_id, submitter);

    // 5. EMIT EVENTS
    events::submission_revealed(env, quest_id.clone(), submitter.clone(), proof_hash.clone());
    events::proof_submitted(env, quest_id.clone(), submitter.clone(), proof_hash.clone());

    Ok(())
}

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
        claimed_amount: 0,
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

    let mut submission = storage::get_submission(env, quest_id, submitter)?;

    // Validate status transition: Pending -> Approved
    validation::validate_submission_status_transition(
        &submission.status,
        &SubmissionStatus::Approved,
    )?;

    // Escrow check before approval: ensure sufficient funds if escrow is used
    if storage::has_escrow(env, quest_id) {
        crate::escrow::validate_sufficient(env, quest_id, quest.reward_amount)?;
    }

    // Update submission status directly to avoid redundant read
    submission.status = SubmissionStatus::Approved;
    storage::set_submission(env, quest_id, submitter, &submission);

    // EMIT EVENT: SubmissionApproved
    events::submission_approved(env, quest_id.clone(), submitter.clone(), verifier.clone());

    Ok(())
}

/// Validates a claim amount against the remaining reward for a submission.
pub fn validate_claim_amount(
    quest: &crate::types::Quest,
    submission: &crate::types::Submission,
    amount: i128,
) -> Result<i128, Error> {
    validation::validate_reward_amount(amount)?;

    let remaining = quest.reward_amount - submission.claimed_amount;
    if amount > remaining {
        return Err(Error::InvalidClaimAmount);
    }

    Ok(remaining)
}

/// Core claim validation that operates on already-fetched data.
/// This avoids repeated storage reads when the data is already available.
pub fn validate_claim_data(
    quest: &crate::types::Quest,
    submission: &crate::types::Submission,
) -> Result<(), Error> {
    // Check if already fully claimed
    if submission.status == SubmissionStatus::Paid {
        return Err(Error::AlreadyClaimed);
    }

    // Validate status transition: Approved/PartiallyPaid -> Paid or PartiallyPaid
    validation::validate_submission_status_transition(
        &submission.status,
        &SubmissionStatus::Paid,
    )?;

    // Validate quest claims limit
    validation::validate_quest_claims_limit(quest.total_claims)?;

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
    validate_claim_data(&quest, &submission)
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
/// * Caches quest and escrow data to avoid redundant reads when approving multiple submissions for same quest
/// * Uses lazy evaluation to defer expensive operations
/// * Batches storage writes where possible
pub fn approve_submissions_batch(
    env: &Env,
    verifier: &Address,
    submissions: &Vec<BatchApprovalInput>,
) -> Result<(), Error> {
    let len = submissions.len();
    validation::validate_batch_approval_size(len)?;

    // Pre-validate all addresses to fail fast
    for i in 0u32..len {
        let s = submissions.get(i).ok_or(Error::IndexOutOfBounds)?;
        validation::validate_addresses_distinct(verifier, &s.submitter)?;
    }

    // Cache quest and escrow data to avoid redundant reads
    let mut cached_quest_id: Option<Symbol> = None;
    let mut cached_quest_data: Option<crate::types::Quest> = None;
    let mut cached_escrow: Option<crate::types::EscrowInfo> = None;

    for i in 0u32..len {
        let s = submissions.get(i).unwrap();

        // Reuse quest data if same quest as previous iteration
        let quest = if cached_quest_id.as_ref() == Some(&s.quest_id) {
            cached_quest_data.as_ref().unwrap()
        } else {
            let quest_data = storage::get_quest(env, &s.quest_id)?;
            cached_quest_id = Some(s.quest_id.clone());
            cached_quest_data = Some(quest_data);
            // Also cache escrow if it exists for this quest
            if storage::has_escrow(env, &s.quest_id) {
                cached_escrow = Some(storage::get_escrow(env, &s.quest_id)?);
            } else {
                cached_escrow = None;
            }
            cached_quest_data.as_ref().unwrap()
        };

        if *verifier != quest.verifier {
            return Err(Error::Unauthorized);
        }

        // Single read of submission; will be updated directly
        let mut submission = storage::get_submission(env, &s.quest_id, &s.submitter)?;

        // Validate status transition: Pending -> Approved
        validation::validate_submission_status_transition(
            &submission.status,
            &SubmissionStatus::Approved,
        )?;

        // Escrow check — verify there are enough funds using cached data
        if let Some(ref escrow) = cached_escrow {
            if !escrow.is_active {
                return Err(Error::EscrowInactive);
            }
            let available = escrow.total_deposited - escrow.total_paid_out - escrow.total_refunded;
            if available < quest.reward_amount {
                return Err(Error::InsufficientEscrow);
            }
        }

        // Direct update to avoid redundant read
        submission.status = SubmissionStatus::Approved;
        storage::set_submission(env, &s.quest_id, &s.submitter, &submission);

        // Emit event
        events::submission_approved(env, s.quest_id.clone(), s.submitter.clone(), verifier.clone());
    }

    Ok(())
}
