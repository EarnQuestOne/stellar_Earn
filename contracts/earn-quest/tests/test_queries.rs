#![cfg(test)]

use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

extern crate earn_quest;
use earn_quest::types::QuestStatus;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

fn setup(env: &Env) -> EarnQuestContractClient<'_> {
    let contract_id = env.register_contract(None, EarnQuestContract);
    EarnQuestContractClient::new(env, &contract_id)
}

fn register(
    client: &EarnQuestContractClient,
    env: &Env,
    id: soroban_sdk::Symbol,
    creator: &Address,
    reward: i128,
) {
    let token = Address::generate(env);
    let verifier = Address::generate(env);
    client.register_quest(&id, creator, &token, &reward, &verifier, &99999u64);
}

//================================================================================
// get_active_quests
//================================================================================

#[test]
fn test_get_active_quests_returns_all_active() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("Q1"), &creator, 100);
    register(&client, &env, symbol_short!("Q2"), &creator, 200);
    register(&client, &env, symbol_short!("Q3"), &creator, 300);

    let results = client.get_active_quests(&0, &10);
    assert_eq!(results.len(), 3);
}

#[test]
fn test_get_active_quests_empty_when_none_registered() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let results = client.get_active_quests(&0, &10);
    assert_eq!(results.len(), 0);
}

//================================================================================
// get_quests_by_status
//================================================================================

#[test]
fn test_get_quests_by_status_active() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("QA"), &creator, 500);
    register(&client, &env, symbol_short!("QB"), &creator, 500);

    let active = client.get_quests_by_status(&QuestStatus::Active, &0, &10);
    assert_eq!(active.len(), 2);
}

#[test]
fn test_get_quests_by_status_no_match_returns_empty() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("QA"), &creator, 500);

    let expired = client.get_quests_by_status(&QuestStatus::Expired, &0, &10);
    assert_eq!(expired.len(), 0);
}

#[test]
fn test_get_quests_by_status_cancelled_returns_empty_when_none_cancelled() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("QC"), &creator, 100);

    let cancelled = client.get_quests_by_status(&QuestStatus::Cancelled, &0, &10);
    assert_eq!(cancelled.len(), 0);
}

//================================================================================
// get_quests_by_creator
//================================================================================

#[test]
fn test_get_quests_by_creator_returns_only_creator_quests() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator_a = Address::generate(&env);
    let creator_b = Address::generate(&env);

    register(&client, &env, symbol_short!("A1"), &creator_a, 100);
    register(&client, &env, symbol_short!("A2"), &creator_a, 200);
    register(&client, &env, symbol_short!("B1"), &creator_b, 300);

    let results_a = client.get_quests_by_creator(&creator_a, &0, &10);
    assert_eq!(results_a.len(), 2);

    let results_b = client.get_quests_by_creator(&creator_b, &0, &10);
    assert_eq!(results_b.len(), 1);
}

#[test]
fn test_get_quests_by_creator_unknown_creator_returns_empty() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);
    let unknown = Address::generate(&env);

    register(&client, &env, symbol_short!("Q1"), &creator, 100);

    let results = client.get_quests_by_creator(&unknown, &0, &10);
    assert_eq!(results.len(), 0);
}

//================================================================================
// get_quests_by_reward_range
//================================================================================

#[test]
fn test_get_quests_by_reward_range_filters_correctly() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("R1"), &creator, 100);
    register(&client, &env, symbol_short!("R2"), &creator, 500);
    register(&client, &env, symbol_short!("R3"), &creator, 1000);

    let results = client.get_quests_by_reward_range(&100, &500, &0, &10);
    assert_eq!(results.len(), 2);
}

#[test]
fn test_get_quests_by_reward_range_exact_match() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("E1"), &creator, 250);
    register(&client, &env, symbol_short!("E2"), &creator, 750);

    let results = client.get_quests_by_reward_range(&250, &250, &0, &10);
    assert_eq!(results.len(), 1);
    assert_eq!(results.get(0).unwrap().reward_amount, 250);
}

#[test]
fn test_get_quests_by_reward_range_no_match_returns_empty() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("N1"), &creator, 1000);

    let results = client.get_quests_by_reward_range(&1, &100, &0, &10);
    assert_eq!(results.len(), 0);
}

//================================================================================
// Pagination
//================================================================================

#[test]
fn test_pagination_limit_respected() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("P1"), &creator, 100);
    register(&client, &env, symbol_short!("P2"), &creator, 200);
    register(&client, &env, symbol_short!("P3"), &creator, 300);
    register(&client, &env, symbol_short!("P4"), &creator, 400);
    register(&client, &env, symbol_short!("P5"), &creator, 500);

    let page1 = client.get_active_quests(&0, &2);
    assert_eq!(page1.len(), 2);

    let page2 = client.get_active_quests(&2, &2);
    assert_eq!(page2.len(), 2);

    let page3 = client.get_active_quests(&4, &2);
    assert_eq!(page3.len(), 1);
}

#[test]
fn test_pagination_offset_beyond_results_returns_empty() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("O1"), &creator, 100);
    register(&client, &env, symbol_short!("O2"), &creator, 200);

    let results = client.get_active_quests(&10, &10);
    assert_eq!(results.len(), 0);
}

#[test]
fn test_pagination_zero_limit_returns_empty() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("Z1"), &creator, 100);

    let results = client.get_active_quests(&0, &0);
    assert_eq!(results.len(), 0);
}

#[test]
fn test_creator_query_pagination() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("C1"), &creator, 100);
    register(&client, &env, symbol_short!("C2"), &creator, 200);
    register(&client, &env, symbol_short!("C3"), &creator, 300);

    let first = client.get_quests_by_creator(&creator, &0, &2);
    assert_eq!(first.len(), 2);

    let second = client.get_quests_by_creator(&creator, &2, &2);
    assert_eq!(second.len(), 1);
}

#[test]
fn test_reward_range_pagination() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register(&client, &env, symbol_short!("W1"), &creator, 100);
    register(&client, &env, symbol_short!("W2"), &creator, 200);
    register(&client, &env, symbol_short!("W3"), &creator, 300);

    let page = client.get_quests_by_reward_range(&100, &300, &1, &1);
    assert_eq!(page.len(), 1);
}
