#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, QuestStatus};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
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

#[test]
fn test_register_quest_with_past_deadline_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");

    // Set a past deadline (use 0 as past)
    let past_deadline = 0u64;

    // Try to register quest with past deadline - should fail
    let result = client.try_register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &past_deadline,
        &10,
    );

    assert!(result.is_err());
}

#[test]
fn test_register_quest_with_current_time_deadline_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest2");
    let current_time = env.ledger().timestamp();

    // Try to register quest with deadline = current time - should fail
    let result = client.try_register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &current_time,
        &10,
    );

    assert!(result.is_err());
}

#[test]
fn test_register_quest_with_future_deadline_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest3");
    let future_deadline = env.ledger().timestamp() + 86400; // 1 day in future

    // Register quest with future deadline - should succeed
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &future_deadline,
        &10,
    );

    // Verify quest exists and is active
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Active);
    assert_eq!(quest.deadline, future_deadline);
}

#[test]
fn test_check_expired_returns_false_before_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest4");
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Check if expired - should be false
    let is_expired = client.check_expired(&quest_id);
    assert!(!is_expired);
}

#[test]
fn test_check_expired_returns_true_after_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest5");
    let deadline = env.ledger().timestamp() + 100;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Advance time past deadline
    env.ledger().with_mut(|ledger_info| {
        ledger_info.timestamp = deadline + 1;
    });

    // Check if expired - should be true
    let is_expired = client.check_expired(&quest_id);
    assert!(is_expired);
}

#[test]
fn test_submission_rejected_after_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest6");
    let deadline = env.ledger().timestamp() + 100;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Advance time past deadline
    env.ledger().with_mut(|ledger_info| {
        ledger_info.timestamp = deadline + 1;
    });

    // Try to submit proof after deadline - should fail
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof_hash);

    assert!(result.is_err());
}

#[test]
fn test_submission_accepted_before_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest7");
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Submit proof before deadline - should succeed
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash);

    // Verify submission exists
    let submission = client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.quest_id, quest_id);
    assert_eq!(submission.submitter, submitter);
}

#[test]
fn test_manual_expire_quest_by_creator() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest8");
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Manually expire quest
    client.expire_quest(&quest_id, &creator);

    // Verify quest status is Expired
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Expired);
}

#[test]
fn test_manual_expire_quest_by_non_creator_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest9");
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Try to expire quest with non-creator - should fail
    let other = Address::generate(&env);
    let result = client.try_expire_quest(&quest_id, &other);

    assert!(result.is_err());
}

#[test]
fn test_cannot_expire_already_expired_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest10");
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Expire quest
    client.expire_quest(&quest_id, &creator);

    // Try to expire again - should fail
    let result = client.try_expire_quest(&quest_id, &creator);
    assert!(result.is_err());
}

#[test]
fn test_cannot_expire_completed_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin.clone())
        .address();
    let token_admin_client = StellarAssetClient::new(&env, &token_address);

    let quest_id = symbol_short!("quest11");
    let deadline = env.ledger().timestamp() + 86400;
    let reward: i128 = 1000;

    token_admin_client.mint(&creator, &reward);

    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &reward,
        &verifier,
        &deadline,
        &1,
    );

    client.deposit_escrow(&quest_id, &creator, &reward);

    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash);
    client.approve_submission(&quest_id, &submitter, &verifier);

    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Completed);

    let result = client.try_expire_quest(&quest_id, &creator);
    assert!(result.is_err());
}

#[test]
fn test_auto_expire_on_submission_attempt() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest12");
    let deadline = env.ledger().timestamp() + 100;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Verify quest is active
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Active);

    // Advance time past deadline
    env.ledger().with_mut(|ledger_info| {
        ledger_info.timestamp = deadline + 1;
    });

    // Try to submit - should fail since deadline passed
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof_hash);
    assert!(result.is_err());

    // Creator can manually expire the quest after deadline
    client.expire_quest(&quest_id, &creator);

    // Verify quest status is now Expired
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Expired);
}

#[test]
fn test_expired_quest_cannot_accept_submissions() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest13");
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Manually expire quest
    client.expire_quest(&quest_id, &creator);

    // Try to submit to expired quest - should fail
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof_hash);

    assert!(result.is_err());
}

#[test]
fn test_timestamp_validation_edge_case() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest14");
    let current_time = env.ledger().timestamp();
    let deadline = current_time + 1; // Just 1 second in future

    // Register quest with minimal future deadline
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    // Should not be expired yet
    let is_expired = client.check_expired(&quest_id);
    assert!(!is_expired);

    // Submit should succeed
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash);

    // Advance time by exactly 1 second
    env.ledger().with_mut(|ledger_info| {
        ledger_info.timestamp = deadline;
    });

    // At deadline, should still not be expired (deadline is exclusive)
    let is_expired = client.check_expired(&quest_id);
    assert!(!is_expired);

    // Advance time by 1 more second
    env.ledger().with_mut(|ledger_info| {
        ledger_info.timestamp = deadline + 1;
    });

    // Now should be expired
    let is_expired = client.check_expired(&quest_id);
    assert!(is_expired);
}

#[test]
fn test_multiple_quests_with_different_deadlines() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let current_time = env.ledger().timestamp();

    // Register quest 1 with short deadline
    let quest_id_1 = symbol_short!("short");
    let deadline_1 = current_time + 100;
    client.register_quest(
        &quest_id_1,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline_1,
        &10,
    );

    // Register quest 2 with long deadline
    let quest_id_2 = symbol_short!("long");
    let deadline_2 = current_time + 10000;
    client.register_quest(
        &quest_id_2,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline_2,
        &10,
    );

    // Advance time past first deadline but before second
    env.ledger().with_mut(|ledger_info| {
        ledger_info.timestamp = deadline_1 + 1;
    });

    // Quest 1 should be expired
    let is_expired_1 = client.check_expired(&quest_id_1);
    assert!(is_expired_1);

    // Quest 2 should not be expired
    let is_expired_2 = client.check_expired(&quest_id_2);
    assert!(!is_expired_2);

    // Quest 1 submission should fail
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id_1, &submitter, &proof_hash);
    assert!(result.is_err());

    // Quest 2 submission should succeed
    let submitter2 = Address::generate(&env);
    let proof_hash2 = BytesN::from_array(&env, &[2u8; 32]);
    client.submit_proof(&quest_id_2, &submitter2, &proof_hash2);
}
