#![cfg(test)]

use soroban_sdk::{symbol_short, testutils::Address as _, testutils::Ledger as _, Address, Env};

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

fn register_with_category(
    client: &EarnQuestContractClient,
    env: &Env,
    id: soroban_sdk::Symbol,
    creator: &Address,
    reward: i128,
    category: u32,
) {
    let token = Address::generate(env);
    let verifier = Address::generate(env);
    client.register_quest_with_category(
        &id, creator, &token, &reward, &verifier, &99999u64, &category,
    );
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
// get_quests_by_category
//================================================================================

#[test]
fn test_get_quests_by_category_returns_only_category_quests() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register_with_category(&client, &env, symbol_short!("D1"), &creator, 100, 1);
    register_with_category(&client, &env, symbol_short!("N1"), &creator, 200, 2);
    register_with_category(&client, &env, symbol_short!("D2"), &creator, 300, 1);

    let defi = client.get_quests_by_category(&1, &0, &10);
    assert_eq!(defi.len(), 2);
    assert_eq!(defi.get(0).unwrap().id, symbol_short!("D1"));
    assert_eq!(defi.get(1).unwrap().id, symbol_short!("D2"));

    let nft = client.get_quests_by_category(&2, &0, &10);
    assert_eq!(nft.len(), 1);
    assert_eq!(nft.get(0).unwrap().id, symbol_short!("N1"));
}

#[test]
fn test_get_quests_by_category_paginates_index_results() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register_with_category(&client, &env, symbol_short!("C1"), &creator, 100, 7);
    register_with_category(&client, &env, symbol_short!("C2"), &creator, 200, 7);
    register_with_category(&client, &env, symbol_short!("C3"), &creator, 300, 7);

    let page = client.get_quests_by_category(&7, &1, &1);
    assert_eq!(page.len(), 1);
    assert_eq!(page.get(0).unwrap().id, symbol_short!("C2"));
}

#[test]
fn test_get_quests_by_category_unknown_category_returns_empty() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);

    register_with_category(&client, &env, symbol_short!("C1"), &creator, 100, 3);

    let results = client.get_quests_by_category(&9, &0, &10);
    assert_eq!(results.len(), 0);
}

#[test]
fn test_category_index_removes_cancelled_quests() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);
    let quest_id = symbol_short!("CX");

    register_with_category(&client, &env, quest_id.clone(), &creator, 100, 4);
    client.cancel_quest(&quest_id, &creator);

    let results = client.get_quests_by_category(&4, &0, &10);
    assert_eq!(results.len(), 0);
}

#[test]
fn test_category_index_removes_expired_quests() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);
    let client = setup(&env);
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);
    let quest_id = symbol_short!("EX");
    let deadline = 1_000u64 + 86_400;

    client.register_quest_with_category(
        &quest_id, &creator, &token, &100i128, &verifier, &deadline, &5u32,
    );

    env.ledger().with_mut(|l| l.timestamp = deadline + 20);
    client.expire_quest(&quest_id, &creator);

    let results = client.get_quests_by_category(&5, &0, &10);
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

//================================================================================
// get_user_active_quest_ids
//================================================================================

#[test]
fn test_get_user_active_quest_ids_empty_for_new_user() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let user = Address::generate(&env);

    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 0);
}

#[test]
fn test_get_user_active_quest_ids_tracks_submissions() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);
    let verifier = Address::generate(&env);
    let proof = soroban_sdk::BytesN::from_array(&env, &[1u8; 32]);

    // Register two quests
    register(&client, &env, symbol_short!("Q1"), &creator, 100);
    register(&client, &env, symbol_short!("Q2"), &creator, 200);

    // Initially, user has no active quests
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 0);

    // User submits to first quest
    client.submit_proof(&symbol_short!("Q1"), &user, &proof);
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 1);
    assert_eq!(results.get(0).unwrap(), symbol_short!("Q1"));

    // User submits to second quest
    client.submit_proof(&symbol_short!("Q2"), &user, &proof);
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 2);
    assert!(results.contains(symbol_short!("Q1")));
    assert!(results.contains(symbol_short!("Q2")));
}

#[test]
fn test_get_user_active_quest_ids_removes_on_completion() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);
    let verifier = Address::generate(&env);
    let proof = soroban_sdk::BytesN::from_array(&env, &[1u8; 32]);
    let token = Address::generate(&env);

    // Register quest and set up escrow
    client.register_quest(&symbol_short!("Q1"), &creator, &token, &100i128, &verifier, &99999u64);
    client.deposit_escrow(&symbol_short!("Q1"), &creator, &token, &1000i128);

    // User submits
    client.submit_proof(&symbol_short!("Q1"), &user, &proof);
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 1);

    // Approve submission
    client.approve_submission(&symbol_short!("Q1"), &user, &verifier);
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 1); // Still active until claimed

    // Claim reward (should remove from active list)
    client.claim_reward(&symbol_short!("Q1"), &user, &100i128);
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 0); // No longer active after being paid
}

#[test]
fn test_get_user_active_quest_ids_multiple_users_independent() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let proof = soroban_sdk::BytesN::from_array(&env, &[1u8; 32]);

    // Register quests
    register(&client, &env, symbol_short!("Q1"), &creator, 100);
    register(&client, &env, symbol_short!("Q2"), &creator, 200);

    // User1 submits to Q1
    client.submit_proof(&symbol_short!("Q1"), &user1, &proof);

    // User2 submits to Q2
    client.submit_proof(&symbol_short!("Q2"), &user2, &proof);

    // Check that each user only sees their own active quests
    let results1 = client.get_user_active_quest_ids(&user1);
    assert_eq!(results1.len(), 1);
    assert_eq!(results1.get(0).unwrap(), symbol_short!("Q1"));

    let results2 = client.get_user_active_quest_ids(&user2);
    assert_eq!(results2.len(), 1);
    assert_eq!(results2.get(0).unwrap(), symbol_short!("Q2"));
}

#[test]
fn test_get_user_active_quest_ids_no_duplicates_on_duplicate_submission() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);
    let proof = soroban_sdk::BytesN::from_array(&env, &[1u8; 32]);

    // Register quest
    register(&client, &env, symbol_short!("Q1"), &creator, 100);

    // First submission
    client.submit_proof(&symbol_short!("Q1"), &user, &proof);
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 1);

    // Attempt second submission to same quest (this should fail, but if it didn't,
    // we shouldn't have duplicates)
    let result = client.try_submit_proof(&symbol_short!("Q1"), &user, &proof);
    assert!(result.is_err()); // Should fail due to AlreadyClaimed error

    // Verify still only one entry
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 1);
}

#[test]
fn test_get_user_active_quest_ids_partial_payment_still_active() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);
    let verifier = Address::generate(&env);
    let proof = soroban_sdk::BytesN::from_array(&env, &[1u8; 32]);
    let token = Address::generate(&env);

    // Register quest with higher reward
    client.register_quest(&symbol_short!("Q1"), &creator, &token, &1000i128, &verifier, &99999u64);
    client.deposit_escrow(&symbol_short!("Q1"), &creator, &token, &2000i128);

    // User submits and gets approved
    client.submit_proof(&symbol_short!("Q1"), &user, &proof);
    client.approve_submission(&symbol_short!("Q1"), &user, &verifier);

    // Partial claim (less than full reward)
    client.claim_reward(&symbol_short!("Q1"), &user, &500i128);
    
    // Should still be active since not fully paid
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 1);

    // Full claim (remaining amount)
    client.claim_reward(&symbol_short!("Q1"), &user, &500i128);
    
    // Now should be removed from active list
    let results = client.get_user_active_quest_ids(&user);
    assert_eq!(results.len(), 0);
}
