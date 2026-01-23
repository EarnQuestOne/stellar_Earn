use crate::errors::Error;
use crate::quest;
use crate::errors::Error;
use crate::storage;
use crate::types::{QuestStatus, Submission, SubmissionStatus};
use soroban_sdk::{Address, BytesN, Env, Symbol, Vec};

/// Submit proof of quest completion
/// Validates that the quest exists, is active, hasn't expired, and user hasn't already submitted
pub fn submit_proof(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    proof_hash: BytesN<32>,
) -> Result<(), Error> {
    // Verify submitter authorization
    submitter.require_auth();

    // Get quest
    let quest = storage::get_quest(env, &quest_id).ok_or(Error::QuestNotFound)?;

    // Validate quest is active and accepting submissions
    quest::validate_quest_active(env, &quest)?;

    // Check if submission already exists
    if storage::has_submission(env, &quest_id, &submitter) {
        return Err(Error::SubmissionAlreadyExists);
    }

    // Create submission
    let submission = Submission {
        quest_id: quest_id.clone(),
        submitter: submitter.clone(),
        proof_hash,
        status: SubmissionStatus::Pending,
        timestamp: env.ledger().timestamp(),
    };

    // Store submission
    storage::set_submission(env, &submission);

    // Emit event
    env.events().publish(
        (Symbol::new(env, "proof_sub"), quest_id),
        submitter,
    );

    Ok(())
}

/// Approve a submission and increment claim counter
pub fn approve_submission(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
    verifier: &Address,
) -> Result<(), Error> {
    // Verify verifier authorization
    verifier.require_auth();

    // Get quest
    let mut quest = storage::get_quest(env, quest_id).ok_or(Error::QuestNotFound)?;

    // Verify caller is the designated verifier
    if quest.verifier != *verifier {
        return Err(Error::Unauthorized);
    }

    // Get submission
    let mut submission = storage::get_submission(env, quest_id, submitter)
        .ok_or(Error::SubmissionNotFound)?;

    // Check submission is pending
    if submission.status != SubmissionStatus::Pending {
        return Err(Error::InvalidSubmissionStatus);
    }

    // Check if quest is full (race condition protection)
    if quest::is_quest_full(&quest) {
        return Err(Error::QuestFull);
    }

    // Update submission status
    submission.status = SubmissionStatus::Approved;
    storage::set_submission(env, &submission);

    // Increment total claims counter
    quest.total_claims += 1;
    storage::set_quest(env, &quest);

    // Auto-complete quest if limit reached
    quest::auto_complete_quest_if_full(env, &mut quest);

    // Emit event
    env.events().publish(
        (Symbol::new(env, "approved"), quest_id.clone()),
        submitter.clone(),
    );

    Ok(())
}

/// Reject a submission
pub fn reject_submission(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
    verifier: &Address,
) -> Result<(), Error> {
    // Verify verifier authorization
    verifier.require_auth();

    // Get quest
    let quest = storage::get_quest(env, quest_id).ok_or(Error::QuestNotFound)?;

    // Verify caller is the designated verifier
    if quest.verifier != *verifier {
        return Err(Error::Unauthorized);
    }

    // Get submission
    let mut submission = storage::get_submission(env, quest_id, submitter)
        .ok_or(Error::SubmissionNotFound)?;

    // Check submission is pending
    if submission.status != SubmissionStatus::Pending {
        return Err(Error::InvalidSubmissionStatus);
    }

    // Update submission status
    submission.status = SubmissionStatus::Rejected;
    storage::set_submission(env, &submission);

    // Emit event
    env.events().publish(
        (Symbol::new(env, "rejected"), quest_id.clone()),
        submitter.clone(),
    );

    Ok(())
}
