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
    // Require authorization from the submitter
    submitter.require_auth();

    // Validate quest exists
    let quest = storage::get_quest(env, &quest_id)?;

    // Check if quest is active
    if quest.status != QuestStatus::Active {
        return Err(Error::InvalidQuestStatus);
    }

    // Check if quest has expired
    let current_timestamp = env.ledger().timestamp();
    if current_timestamp > quest.deadline {
        return Err(Error::QuestExpired);
    }

    // Check for duplicate submission
    if storage::submission_exists(env, &quest_id, &submitter) {
        return Err(Error::DuplicateSubmission);
    }

    // Validate proof hash is not all zeros (basic validation)
    let zero_hash = BytesN::from_array(env, &[0u8; 32]);
    if proof_hash == zero_hash {
        return Err(Error::InvalidProofHash);
    }

    // Create submission
    let submission = Submission {
        quest_id: quest_id.clone(),
        submitter: submitter.clone(),
        proof_hash: proof_hash.clone(),
        status: SubmissionStatus::Pending,
        timestamp: current_timestamp,
    };

    // Store submission
    storage::store_submission(env, &submission)?;

    // Add to user's submission list
    storage::add_user_submission(env, &submitter, &quest_id)?;

    // Emit event
    env.events().publish(
        (Symbol::new(env, "proof_submitted"),),
        (quest_id, submitter, proof_hash),
    );

    Ok(())
}

/// Get a specific submission by quest_id and submitter
pub fn get_submission(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
) -> Result<Submission, Error> {
    storage::get_submission(env, &quest_id, &submitter)
}

/// Get all submissions for a specific user
/// Returns a vector of quest IDs that the user has submitted to
pub fn get_user_submissions(env: &Env, user: Address) -> Vec<Symbol> {
    storage::get_user_submissions(env, &user)
}

/// Approve a submission by the designated verifier
/// Validates verifier authorization and submission status before approval
pub fn approve_submission(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error> {
    // Require authorization from the verifier
    verifier.require_auth();

    // Get the quest to verify the verifier is authorized
    let quest = storage::get_quest(env, &quest_id)?;

    // Check if the caller is the authorized verifier for this quest
    if quest.verifier != verifier {
        return Err(Error::UnauthorizedVerifier);
    }

    // Get the current submission
    let mut submission = storage::get_submission(env, &quest_id, &submitter)?;

    // Validate current status - can only approve pending submissions
    match submission.status {
        SubmissionStatus::Pending => {
            // Update status to Approved
            submission.status = SubmissionStatus::Approved;
            storage::store_submission(env, &submission)?;

            // Emit approval event
            env.events().publish(
                (Symbol::new(env, "submission_approved"),),
                (quest_id, submitter, verifier),
            );

            Ok(())
        }
        SubmissionStatus::Approved | SubmissionStatus::Rejected => {
            Err(Error::SubmissionAlreadyProcessed)
        }
        SubmissionStatus::Paid => Err(Error::InvalidStatusTransition),
    }
}

/// Reject a submission by the designated verifier
/// Validates verifier authorization and submission status before rejection
pub fn reject_submission(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error> {
    // Require authorization from the verifier
    verifier.require_auth();

    // Get the quest to verify the verifier is authorized
    let quest = storage::get_quest(env, &quest_id)?;

    // Check if the caller is the authorized verifier for this quest
    if quest.verifier != verifier {
        return Err(Error::UnauthorizedVerifier);
    }

    // Get the current submission
    let mut submission = storage::get_submission(env, &quest_id, &submitter)?;

    // Validate current status - can only reject pending submissions
    match submission.status {
        SubmissionStatus::Pending => {
            // Update status to Rejected
            submission.status = SubmissionStatus::Rejected;
            storage::store_submission(env, &submission)?;

            // Emit rejection event
            env.events().publish(
                (Symbol::new(env, "submission_rejected"),),
                (quest_id, submitter, verifier),
            );

            Ok(())
        }
        SubmissionStatus::Approved | SubmissionStatus::Rejected => {
            Err(Error::SubmissionAlreadyProcessed)
        }
        SubmissionStatus::Paid => Err(Error::InvalidStatusTransition),
    }
}
