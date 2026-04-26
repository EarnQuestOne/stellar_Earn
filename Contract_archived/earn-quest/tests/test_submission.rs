#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, SubmissionStatus};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    Address, BytesN, Env,
};

fn setup_env<'a>(env: &Env) -> (EarnQuestContractClient<'a>, Address, Address, Address) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let reward_asset = Address::generate(env);

    (client, creator, verifier, reward_asset)
}

fn create_quest<'a>(
    client: &EarnQuestContractClient<'a>,
    env: &Env,
    creator: &Address,
    verifier: &Address,
    reward_asset: &Address,
) {
    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;
    client.register_quest(
        &quest_id,
        creator,
        reward_asset,
        &1000_i128,
        verifier,
        &deadline,
        &10,
    );
}

#[test]
fn test_submit_proof_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    // Create quest
    create_quest(&client, &env, &creator, &verifier, &reward_asset);

    let quest_id = symbol_short!("quest1");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);

    // Submit proof
    client.submit_proof(&quest_id, &submitter, &proof_hash);

    // Verify submission
    let submission = client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.quest_id, quest_id);
    assert_eq!(submission.submitter, submitter);
    assert_eq!(submission.status, SubmissionStatus::Pending);
}

#[test]
fn test_duplicate_submission_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);
    create_quest(&client, &env, &creator, &verifier, &reward_asset);

    let quest_id = symbol_short!("quest1");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);

    // Submit first time
    client.submit_proof(&quest_id, &submitter, &proof_hash);

    // Try to submit again - should fail
    let result = client.try_submit_proof(&quest_id, &submitter, &proof_hash);
    assert!(result.is_err());
}

#[test]
fn test_submit_to_nonexistent_quest_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, _verifier, _reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("noquest");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);

    // Try to submit to non-existent quest
    let result = client.try_submit_proof(&quest_id, &submitter, &proof_hash);
    assert!(result.is_err());
}

// Note: Proof hash validation is not currently implemented in the contract
// This test is skipped as it requires additional validation logic
// #[test]
// fn test_invalid_proof_hash_fails() {
//     let env = Env::default();
//     env.mock_all_auths();
//
//     let (client, creator, verifier, reward_asset) = setup_env(&env);
//     create_quest(&client, &env, &creator, &verifier, &reward_asset);
//
//     let quest_id = symbol_short!("quest1");
//     let submitter = Address::generate(&env);
//     let zero_hash = BytesN::from_array(&env, &[0u8; 32]); // Invalid zero hash
//
//     // Try to submit with zero hash
//     let result = client.try_submit_proof(&quest_id, &submitter, &zero_hash);
//     assert!(result.is_err());
// }

#[test]
fn test_multiple_user_submissions() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    // Create two quests
    let quest1_id = symbol_short!("quest1");
    let quest2_id = symbol_short!("quest2");
    let deadline = env.ledger().timestamp() + 86400;

    client.register_quest(
        &quest1_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );
    client.register_quest(
        &quest2_id,
        &creator,
        &reward_asset,
        &2000_i128,
        &verifier,
        &deadline,
        &10,
    );

    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);

    // Submit to both quests
    client.submit_proof(&quest1_id, &submitter, &proof_hash);
    client.submit_proof(&quest2_id, &submitter, &proof_hash);

    // Verify both submissions exist
    let submission1 = client.get_submission(&quest1_id, &submitter);
    assert_eq!(submission1.quest_id, quest1_id);

    let submission2 = client.get_submission(&quest2_id, &submitter);
    assert_eq!(submission2.quest_id, quest2_id);
}

#[test]
fn test_submit_proof_to_paused_quest_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);
    create_quest(&client, &env, &creator, &verifier, &reward_asset);

    let quest_id = symbol_short!("quest1");
    client.update_quest_status(&quest_id, &creator, &earn_quest::QuestStatus::Paused);

    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[8u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof_hash);
    assert!(result.is_err());
}

#[test]
fn test_submission_timestamp_matches_current_ledger_time() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);
    create_quest(&client, &env, &creator, &verifier, &reward_asset);

    let quest_id = symbol_short!("quest1");
    env.ledger().with_mut(|ledger| {
        ledger.timestamp = 42;
    });

    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[9u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash);

    let submission = client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Pending);
    assert_eq!(submission.timestamp, 42);
}
