#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, SubmissionStatus};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, BytesN, Env};

fn setup_env<'a>(env: &Env) -> (EarnQuestContractClient<'a>, Address, Address, Address) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let reward_asset = Address::generate(env);

    (client, creator, verifier, reward_asset)
}

fn setup_quest_with_submission<'a>(
    env: &Env,
) -> (
    EarnQuestContractClient<'a>,
    Address,
    Address,
    Address,
    Address,
) {
    let (client, creator, verifier, reward_asset) = setup_env(env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
    );

    // Create submitter and submit proof
    let submitter = Address::generate(env);
    let proof_hash = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash);

    (client, creator, verifier, reward_asset, submitter)
}

#[test]
fn test_approve_submission_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _reward_asset, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    // Approve submission
    client.approve_submission(&quest_id, &submitter, &verifier);

    // Verify status changed
    let submission = client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Approved);
}

#[test]
fn test_reject_submission_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _reward_asset, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    // Reject submission
    client.reject_submission(&quest_id, &submitter, &verifier);

    // Verify status changed
    let submission = client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Rejected);
}

#[test]
fn test_unauthorized_approval_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, _verifier, _reward_asset, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    // Try to approve with non-verifier
    let unauthorized = Address::generate(&env);
    let result = client.try_approve_submission(&quest_id, &submitter, &unauthorized);
    assert!(result.is_err());
}

#[test]
fn test_unauthorized_rejection_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, _verifier, _reward_asset, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    // Try to reject with non-verifier
    let unauthorized = Address::generate(&env);
    let result = client.try_reject_submission(&quest_id, &submitter, &unauthorized);
    assert!(result.is_err());
}

#[test]
fn test_approve_nonexistent_submission_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest but don't submit
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
    );

    // Try to approve non-existent submission
    let submitter = Address::generate(&env);
    let result = client.try_approve_submission(&quest_id, &submitter, &verifier);
    assert!(result.is_err());
}

#[test]
fn test_double_approval_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _reward_asset, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    // Approve once
    client.approve_submission(&quest_id, &submitter, &verifier);

    // Try to approve again - should fail
    let result = client.try_approve_submission(&quest_id, &submitter, &verifier);
    assert!(result.is_err());
}

#[test]
fn test_reject_after_approval_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _reward_asset, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    // Approve first
    client.approve_submission(&quest_id, &submitter, &verifier);

    // Try to reject after approval - should fail
    let result = client.try_reject_submission(&quest_id, &submitter, &verifier);
    assert!(result.is_err());
}

#[test]
fn test_approve_after_rejection_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _reward_asset, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    // Reject first
    client.reject_submission(&quest_id, &submitter, &verifier);

    // Try to approve after rejection - should fail
    let result = client.try_approve_submission(&quest_id, &submitter, &verifier);
    assert!(result.is_err());
}
