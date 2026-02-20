use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{Submission, SubmissionStatus};
use crate::validation;
use soroban_sdk::{Address, BytesN, Env, Symbol};

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
pub fn validate_claim(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
) -> Result<(), Error> {
    let quest = storage::get_quest(env, quest_id)?;
    let submission = storage::get_submission(env, quest_id, submitter)?;

    // Check if already claimed
    if submission.status == SubmissionStatus::Paid {
        return Err(Error::AlreadyClaimed);
    }

    // Validate status transition: Approved -> Paid
    validation::validate_submission_status_transition(
        &submission.status,
        &SubmissionStatus::Paid,
    )?;

    // Validate quest claims limit
    validation::validate_quest_claims_limit(quest.total_claims)?;

    Ok(())
}
