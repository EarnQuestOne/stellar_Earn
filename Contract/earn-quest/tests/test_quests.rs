#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, QuestStatus};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

fn setup_env<'a>(env: &Env) -> (EarnQuestContractClient<'a>, Address, Address, Address) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let reward_asset = Address::generate(env);

    (client, creator, verifier, reward_asset)
}

#[test]
fn test_register_quest_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");
    let reward_amount: i128 = 1000;
    let deadline = env.ledger().timestamp() + 86400;

    // Register quest - should succeed
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &reward_amount,
        &verifier,
        &deadline,
    );

    // Verify quest exists
    assert!(client.quest_exists(&quest_id));

    // Get quest and verify details
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.id, quest_id);
    assert_eq!(quest.creator, creator);
    assert_eq!(quest.reward_asset, reward_asset);
    assert_eq!(quest.reward_amount, reward_amount);
    assert_eq!(quest.verifier, verifier);
    assert_eq!(quest.status, QuestStatus::Active);
}

#[test]
fn test_register_quest_duplicate_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    // Register first quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
    );

    // Try to register same quest again - should panic
    let result = client.try_register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
    );
    assert!(result.is_err());
}

#[test]
fn test_register_quest_invalid_reward_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    // Zero reward - should fail
    let result = client.try_register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &0_i128,
        &verifier,
        &deadline,
    );
    assert!(result.is_err());
}

#[test]
fn test_pause_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

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

    // Pause quest
    client.pause_quest(&quest_id, &creator);

    // Verify status changed
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Paused);
}

#[test]
fn test_resume_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    // Register and pause quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
    );
    client.pause_quest(&quest_id, &creator);

    // Resume quest
    client.resume_quest(&quest_id, &creator);

    // Verify status changed back
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Active);
}

#[test]
fn test_complete_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

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

    // Complete quest
    client.complete_quest(&quest_id, &creator);

    // Verify status changed
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Completed);
}

#[test]
fn test_unauthorized_status_update() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

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

    // Try to pause with non-creator - should fail
    let other = Address::generate(&env);
    let result = client.try_pause_quest(&quest_id, &other);
    assert!(result.is_err());
}

#[test]
fn test_invalid_status_transition() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    // Register and complete quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
    );
    client.complete_quest(&quest_id, &creator);

    // Try to pause completed quest - should fail
    let result = client.try_pause_quest(&quest_id, &creator);
    assert!(result.is_err());
}

#[test]
fn test_is_quest_active() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

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

    // Should be active
    assert!(client.is_quest_active(&quest_id));

    // Pause quest
    client.pause_quest(&quest_id, &creator);

    // Should not be active
    assert!(!client.is_quest_active(&quest_id));
}

#[test]
fn test_quest_exists() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    // Should not exist yet
    assert!(!client.quest_exists(&quest_id));

    // Register quest
    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
    );

    // Should exist now
    assert!(client.quest_exists(&quest_id));
}
