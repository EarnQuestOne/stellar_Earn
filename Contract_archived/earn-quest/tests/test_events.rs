#![cfg(test)]

use soroban_sdk::{
    symbol_short, testutils::{Address as _, Events}, Address, BytesN, Env, IntoVal, Symbol
};

use earn_quest::{EarnQuestContract, EarnQuestContractClient, QuestStatus};

fn create_test_env() -> (Env, EarnQuestContractClient, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let reward_asset = Address::generate(&env);

    (env, client, admin, creator, verifier, reward_asset)
}

#[test]
fn test_initialize_event() {
    let (env, client, admin, _, _, _) = create_test_env();

    client.initialize(&admin);

    // Check for initialization event
    let events = env.events().all();
    let last_event = events.last().unwrap();

    assert_eq!(
        last_event.topics,
        (Symbol::new(&env, "init"), admin.clone()).into_val(&env)
    );
}

#[test]
fn test_update_config_event() {
    let (env, client, admin, _, _, _) = create_test_env();

    client.initialize(&admin);

    let new_admin = Address::generate(&env);
    client.update_config(&admin, &Some(new_admin.clone()));

    // Check for admin update event
    let events = env.events().all();
    let last_event = events.last().unwrap();

    assert_eq!(
        last_event.topics,
        (Symbol::new(&env, "admin_upd"), admin).into_val(&env)
    );
    assert_eq!(last_event.data, (new_admin,).into_val(&env));
}

#[test]
fn test_quest_registration_event() {
    let (env, client, admin, creator, verifier, reward_asset) = create_test_env();

    client.initialize(&admin);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000,
        &verifier,
        &deadline,
        &10,
    );

    // Check for quest registration event
    let events = env.events().all();
    let last_event = events.last().unwrap();

    assert_eq!(
        last_event.topics,
        (Symbol::new(&env, "quest_reg"), quest_id).into_val(&env)
    );
}

#[test]
fn test_quest_status_update_event() {
    let (env, client, admin, creator, verifier, reward_asset) = create_test_env();

    client.initialize(&admin);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000,
        &verifier,
        &deadline,
        &10,
    );

    client.update_quest_status(&quest_id, &creator, &QuestStatus::Paused);

    // Check for status update event
    let events = env.events().all();
    let last_event = events.last().unwrap();

    assert_eq!(
        last_event.topics,
        (Symbol::new(&env, "status_upd"), quest_id).into_val(&env)
    );
}

#[test]
fn test_quest_cancellation_event() {
    let (env, client, admin, creator, verifier, reward_asset) = create_test_env();

    client.initialize(&admin);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000,
        &verifier,
        &deadline,
        &10,
    );

    client.cancel_quest(&quest_id, &creator);

    // Check for cancellation event
    let events = env.events().all();
    let last_event = events.last().unwrap();

    assert_eq!(
        last_event.topics,
        (Symbol::new(&env, "quest_can"), quest_id).into_val(&env)
    );
}

#[test]
fn test_submission_events() {
    let (env, client, admin, creator, verifier, reward_asset) = create_test_env();

    client.initialize(&admin);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;
    let submitter = Address::generate(&env);

    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000,
        &verifier,
        &deadline,
        &10,
    );

    let proof_hash = BytesN::from_array(&env, &[0u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash);

    // Check for submission event
    let events = env.events().all();
    let submit_event = events.last().unwrap();

    assert_eq!(
        submit_event.topics,
        (Symbol::new(&env, "proof_sub"), quest_id.clone()).into_val(&env)
    );
}

#[test]
fn test_pause_initialization_event() {
    let (env, client, admin, _, _, _) = create_test_env();

    client.initialize(&admin);
    client.initialize_pause(&admin, &3600, &2, &7200);

    // Check for pause initialization event
    let events = env.events().all();
    let last_event = events.last().unwrap();

    assert_eq!(
        last_event.topics,
        (Symbol::new(&env, "pause_init"), 3600u64).into_val(&env)
    );
}

#[test]
fn test_pause_config_update_event() {
    let (env, client, admin, _, _, _) = create_test_env();

    client.initialize(&admin);
    client.initialize_pause(&admin, &3600, &2, &7200);
    client.update_pause_config(&admin, &Some(7200), &Some(3), &Some(10800));

    // Check for pause config update event
    let events = env.events().all();
    let last_event = events.last().unwrap();

    assert_eq!(
        last_event.topics,
        (Symbol::new(&env, "pause_cfg"), admin).into_val(&env)
    );
}

#[test]
fn test_xp_award_event() {
    let (env, client, admin, creator, verifier, reward_asset) = create_test_env();

    client.initialize(&admin);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;
    let submitter = Address::generate(&env);

    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000,
        &verifier,
        &deadline,
        &10,
    );

    // Note: XP award happens during approve_submission
    // This test would need escrow setup to fully test
    // Keeping it as a placeholder for integration testing
}

#[test]
fn test_badge_grant_event() {
    let (env, client, admin, _, _, _) = create_test_env();

    client.initialize(&admin);

    let user = Address::generate(&env);
    let badge = symbol_short!("hero");

    // First need to create user stats by awarding XP
    // This is a simplified test - full integration would need quest completion
}

#[test]
fn test_submission_paid_event() {
    let (env, client, admin, creator, verifier, reward_asset) = create_test_env();

    client.initialize(&admin);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;
    let submitter = Address::generate(&env);

    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000,
        &verifier,
        &deadline,
        &10,
    );

    // Would need full escrow setup to test paid event
    // Keeping as placeholder for integration testing
}

#[test]
fn test_event_ordering() {
    let (env, client, admin, creator, verifier, reward_asset) = create_test_env();

    client.initialize(&admin);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000,
        &verifier,
        &deadline,
        &10,
    );

    let events = env.events().all();
    
    // Should have at least 2 events: init and quest_reg
    assert!(events.len() >= 2);
    
    // Verify event types in order
    let init_event = &events[events.len() - 2];
    let quest_event = &events[events.len() - 1];
    
    assert_eq!(
        init_event.topics.get(0).unwrap(),
        Symbol::new(&env, "init").into_val(&env)
    );
    
    assert_eq!(
        quest_event.topics.get(0).unwrap(),
        Symbol::new(&env, "quest_reg").into_val(&env)
    );
}
