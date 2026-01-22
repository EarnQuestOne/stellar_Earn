#![cfg(test)]
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, BytesN, Env, Symbol, Vec,
};
use crate::types::{Quest, QuestStatus, Submission, SubmissionStatus};
use crate::storage;
use crate::submission;
use crate::errors::Error;

// Helper function to create a test quest
fn create_test_quest(env: &Env, quest_id: Symbol, deadline_offset: i64) -> Quest {
    Quest {
        id: quest_id,
        creator: Address::generate(env),
        reward_asset: Address::generate(env),
        reward_amount: 1000,
        verifier: Address::generate(env),
        deadline: (env.ledger().timestamp() as i64 + deadline_offset) as u64,
        status: QuestStatus::Active,
        total_claims: 0,
    }
}

#[test]
fn test_submit_proof_success() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest1");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store test quest
    let quest = create_test_quest(&env, quest_id, 86400); // 24 hours
    storage::store_quest(&env, &quest).unwrap();

    // Submit proof - should succeed
    let result = submission::submit_proof(&env, quest_id, submitter, proof_hash);
    assert!(result.is_ok());

    // Verify submission was stored
    let stored_submission = storage::get_submission(&env, &quest_id, &submitter).unwrap();
    assert_eq!(stored_submission.quest_id, quest_id);
    assert_eq!(stored_submission.submitter, submitter);
    assert_eq!(stored_submission.proof_hash, proof_hash);
    assert_eq!(stored_submission.status, SubmissionStatus::Pending);
}

#[test]
fn test_duplicate_submission_prevention() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest1");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store test quest
    let quest = create_test_quest(&env, quest_id, 86400);
    storage::store_quest(&env, &quest).unwrap();

    // Submit proof first time - should succeed
    let result1 = submission::submit_proof(&env, quest_id, submitter, proof_hash);
    assert!(result1.is_ok());

    // Submit proof second time - should fail
    let result2 = submission::submit_proof(&env, quest_id, submitter, proof_hash);
    assert_eq!(result2, Err(Error::DuplicateSubmission));
}

#[test]
fn test_submit_to_nonexistent_quest() {
    let env = Env::default();

    let quest_id = Symbol::new(&env, "nonexistent");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    let result = submission::submit_proof(&env, quest_id, submitter, proof_hash);
    assert_eq!(result, Err(Error::QuestNotFound));
}

#[test]
fn test_submit_to_expired_quest() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "expired_quest");
    let submitter = Address::generate(&env);
    let deadline = env.ledger().timestamp() - 1; // Already expired
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create expired quest
    let quest = create_test_quest(&env, quest_id, -1); // Expired 1 second ago
    storage::store_quest(&env, &quest).unwrap();

    // Try to submit - should fail
    let result = submission::submit_proof(&env, quest_id, submitter, proof_hash);
    assert_eq!(result, Err(Error::QuestExpired));
}

#[test]
fn test_invalid_proof_hash() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest1");
    let submitter = Address::generate(&env);
    let invalid_proof_hash = BytesN::from_array(&env, &[0u8; 32]); // Zero hash

    // Create and store test quest
    let quest = create_test_quest(&env, quest_id, 86400);
    storage::store_quest(&env, &quest).unwrap();

    // Try to submit with invalid proof - should fail
    let result = submission::submit_proof(&env, quest_id, submitter, invalid_proof_hash);
    assert_eq!(result, Err(Error::InvalidProofHash));
}

#[test]
fn test_get_nonexistent_submission() {
    let env = Env::default();

    let quest_id = Symbol::new(&env, "quest1");
    let submitter = Address::generate(&env);

    let result = submission::get_submission(&env, quest_id, submitter);
    assert_eq!(result, Err(Error::SubmissionNotFound));
}

#[test]
fn test_get_user_submissions() {
    let env = Env::default();

    // Setup test data
    let quest1_id = Symbol::new(&env, "quest1");
    let quest2_id = Symbol::new(&env, "quest2");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store quests
    let quest1 = create_test_quest(&env, quest1_id, 86400);
    let quest2 = create_test_quest(&env, quest2_id, 86400);
    storage::store_quest(&env, &quest1).unwrap();
    storage::store_quest(&env, &quest2).unwrap();

    // Submit to both quests
    submission::submit_proof(&env, quest1_id, submitter, proof_hash).unwrap();
    submission::submit_proof(&env, quest2_id, submitter, proof_hash).unwrap();

    // Get user submissions
    let user_submissions = submission::get_user_submissions(&env, submitter);
    assert_eq!(user_submissions.len(), 2);

    // Check that both quest IDs are present
    assert!(user_submissions.contains(&quest1_id));
    assert!(user_submissions.contains(&quest2_id));
}

#[test]
fn test_get_user_submissions_empty() {
    let env = Env::default();

    let submitter = Address::generate(&env);
    let user_submissions = submission::get_user_submissions(&env, submitter);
    assert_eq!(user_submissions.len(), 0);
}

#[test]
fn test_register_quest_validation() {
    let env = Env::default();

    let quest_id = Symbol::new(&env, "quest1");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86400;

    // Test invalid reward amount (this would be tested via contract call)
    // For now, test the storage function directly

    // Register valid quest
    let quest = create_test_quest(&env, quest_id, 86400);
    let result = storage::store_quest(&env, &quest);
    assert!(result.is_ok());

    // Try to store same quest again - should work (storage allows overwrites)
    let result = storage::store_quest(&env, &quest);
    assert!(result.is_ok());
}