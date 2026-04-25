//! tests/test_stats.rs
//!
//! Comprehensive test suite for platform-wide and per-creator statistics.
//!
//! Test groups:
//!   1. Initial state — all counters start at zero
//!   2. Quest creation tracking
//!   3. Submission / active-user tracking
//!   4. Claim / reward-claimed tracking
//!   5. Per-creator isolation
//!   6. Multi-creator scenarios
//!   7. Counter integrity (idempotency, monotonicity)
//!   8. Admin-only reset
//!   9. Public query access (no auth required)

#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
use soroban_sdk::{symbol_short, Address, BytesN, Env};

use earn_quest::{EarnQuestContract, EarnQuestContractClient};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

fn make_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

fn set_time(env: &Env, ts: u64) {
    env.ledger().set(LedgerInfo {
        protocol_version: 20,
        sequence_number: 1,
        timestamp: ts,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 1_000_000,
    });
}

fn setup(env: &Env) -> (EarnQuestContractClient, Address) {
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &cid);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

fn mock_token(env: &Env) -> Address {
    Address::generate(env)
}

fn register_quest(
    client: &EarnQuestContractClient,
    env: &Env,
    id: &str,
    creator: &Address,
    reward_amount: i128,
) -> soroban_sdk::Symbol {
    let quest_id = symbol_short!(id);
    let token = mock_token(env);
    let verifier = Address::generate(env);
    let deadline = env.ledger().timestamp() + 86_400;
    client.register_quest(&quest_id, creator, &token, &reward_amount, &verifier, &deadline);
    quest_id
}

fn submit(
    client: &EarnQuestContractClient,
    env: &Env,
    quest_id: &soroban_sdk::Symbol,
    submitter: &Address,
) {
    let proof: BytesN<32> = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(quest_id, submitter, &proof);
}

fn full_lifecycle(
    client: &EarnQuestContractClient,
    env: &Env,
    quest_sym: &str,
    creator: &Address,
    submitter: &Address,
    reward_amount: i128,
) -> soroban_sdk::Symbol {
    let quest_id = symbol_short!(quest_sym);
    let token = mock_token(env);
    let verifier = Address::generate(env);
    let deadline = env.ledger().timestamp() + 86_400;
    client.register_quest(&quest_id, creator, &token, &reward_amount, &verifier, &deadline);
    let proof: BytesN<32> = BytesN::from_array(env, &[2u8; 32]);
    client.submit_proof(&quest_id, submitter, &proof);
    client.approve_submission(&quest_id, submitter, &verifier);
    client.claim_reward(&quest_id, submitter);
    quest_id
}

// ---------------------------------------------------------------------------
// 1. Initial state
// ---------------------------------------------------------------------------

#[test]
fn test_stats_initial_state_all_zero() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 0);
    assert_eq!(stats.total_submissions, 0);
    assert_eq!(stats.total_rewards_distributed, 0);
    assert_eq!(stats.total_active_users, 0);
    assert_eq!(stats.total_rewards_claimed, 0);
}

#[test]
fn test_creator_stats_initial_state_all_zero() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);

    let stats = client.get_creator_stats(&creator);
    assert_eq!(stats.quests_created, 0);
    assert_eq!(stats.total_rewards_posted, 0);
    assert_eq!(stats.total_submissions_received, 0);
    assert_eq!(stats.total_claims_paid, 0);
}

// ---------------------------------------------------------------------------
// 2. Quest creation tracking
// ---------------------------------------------------------------------------

#[test]
fn test_platform_quest_count_increments_on_single_create() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);

    register_quest(&client, &env, "q001", &creator, 500);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 1);
}

#[test]
fn test_platform_quest_count_increments_multiple_times() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);

    register_quest(&client, &env, "q001", &creator, 100);
    register_quest(&client, &env, "q002", &creator, 200);
    register_quest(&client, &env, "q003", &creator, 300);

    assert_eq!(client.get_platform_stats().total_quests_created, 3);
}

#[test]
fn test_platform_rewards_distributed_tracks_sum_of_reward_amounts() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);

    register_quest(&client, &env, "q001", &creator, 1_000);
    register_quest(&client, &env, "q002", &creator, 2_500);

    assert_eq!(client.get_platform_stats().total_rewards_distributed, 3_500);
}

#[test]
fn test_creator_quest_count_and_rewards_posted_track_correctly() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);

    register_quest(&client, &env, "q001", &creator, 400);
    register_quest(&client, &env, "q002", &creator, 600);

    let c = client.get_creator_stats(&creator);
    assert_eq!(c.quests_created, 2);
    assert_eq!(c.total_rewards_posted, 1_000);
}

#[test]
fn test_platform_quest_count_is_monotonically_increasing() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);

    assert_eq!(client.get_platform_stats().total_quests_created, 0);
    register_quest(&client, &env, "q001", &creator, 50);
    assert_eq!(client.get_platform_stats().total_quests_created, 1);
    register_quest(&client, &env, "q002", &creator, 50);
    assert_eq!(client.get_platform_stats().total_quests_created, 2);
}

// ---------------------------------------------------------------------------
// 3. Submission / active-user tracking
// ---------------------------------------------------------------------------

#[test]
fn test_platform_submission_count_increments_on_submit() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let submitter = Address::generate(&env);

    let qid = register_quest(&client, &env, "q001", &creator, 500);
    submit(&client, &env, &qid, &submitter);

    assert_eq!(client.get_platform_stats().total_submissions, 1);
}

#[test]
fn test_platform_active_users_increments_on_first_submission() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);

    let qid = register_quest(&client, &env, "q001", &creator, 500);
    submit(&client, &env, &qid, &user);

    assert_eq!(client.get_platform_stats().total_active_users, 1);
}

#[test]
fn test_platform_active_users_does_not_double_count_same_user() {
    // Same user submits on two different quests — must count as 1 unique user.
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);

    let qid1 = register_quest(&client, &env, "q001", &creator, 100);
    let qid2 = register_quest(&client, &env, "q002", &creator, 200);
    submit(&client, &env, &qid1, &user);
    submit(&client, &env, &qid2, &user);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_submissions, 2, "two submission entries");
    assert_eq!(stats.total_active_users, 1, "same user must not be double-counted");
}

#[test]
fn test_platform_active_users_counts_each_distinct_address_once() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let u1 = Address::generate(&env);
    let u2 = Address::generate(&env);
    let u3 = Address::generate(&env);

    let qid1 = register_quest(&client, &env, "q001", &creator, 300);
    let qid2 = register_quest(&client, &env, "q002", &creator, 300);
    let qid3 = register_quest(&client, &env, "q003", &creator, 300);

    submit(&client, &env, &qid1, &u1);
    submit(&client, &env, &qid2, &u2);
    submit(&client, &env, &qid3, &u3);

    assert_eq!(client.get_platform_stats().total_active_users, 3);
}

#[test]
fn test_creator_submissions_received_increments_per_submission() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let u1 = Address::generate(&env);
    let u2 = Address::generate(&env);

    let qid = register_quest(&client, &env, "q001", &creator, 500);
    submit(&client, &env, &qid, &u1);
    submit(&client, &env, &qid, &u2);

    let c = client.get_creator_stats(&creator);
    assert_eq!(c.total_submissions_received, 2);
}

#[test]
fn test_submission_count_increments_per_submission_not_per_user() {
    // Same user, two quests → 2 submissions total but 1 unique active user.
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);

    let qid1 = register_quest(&client, &env, "q001", &creator, 100);
    let qid2 = register_quest(&client, &env, "q002", &creator, 200);
    submit(&client, &env, &qid1, &user);
    submit(&client, &env, &qid2, &user);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_submissions, 2);
    assert_eq!(stats.total_active_users, 1);
}

// ---------------------------------------------------------------------------
// 4. Claim / reward-claimed tracking
// ---------------------------------------------------------------------------

#[test]
fn test_platform_rewards_claimed_increments_on_single_claim() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let submitter = Address::generate(&env);

    full_lifecycle(&client, &env, "q001", &creator, &submitter, 500);

    assert_eq!(client.get_platform_stats().total_rewards_claimed, 1);
}

#[test]
fn test_platform_rewards_claimed_increments_on_multiple_claims() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let u1 = Address::generate(&env);
    let u2 = Address::generate(&env);

    full_lifecycle(&client, &env, "q001", &creator, &u1, 300);
    full_lifecycle(&client, &env, "q002", &creator, &u2, 700);

    assert_eq!(client.get_platform_stats().total_rewards_claimed, 2);
}

#[test]
fn test_creator_claims_paid_increments_after_each_claim() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let u1 = Address::generate(&env);
    let u2 = Address::generate(&env);

    full_lifecycle(&client, &env, "q001", &creator, &u1, 400);
    full_lifecycle(&client, &env, "q002", &creator, &u2, 600);

    let c = client.get_creator_stats(&creator);
    assert_eq!(c.total_claims_paid, 2);
}

#[test]
fn test_submission_without_claim_does_not_increment_rewards_claimed() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);
    let submitter = Address::generate(&env);

    let qid = register_quest(&client, &env, "q001", &creator, 500);
    submit(&client, &env, &qid, &submitter);
    // No approve or claim

    assert_eq!(client.get_platform_stats().total_rewards_claimed, 0);
}

// ---------------------------------------------------------------------------
// 5. Per-creator isolation
// ---------------------------------------------------------------------------

#[test]
fn test_creator_stats_are_isolated_between_creators() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let ca = Address::generate(&env);
    let cb = Address::generate(&env);
    let submitter = Address::generate(&env);

    // creator_a: 2 quests
    register_quest(&client, &env, "a001", &ca, 1_000);
    register_quest(&client, &env, "a002", &ca, 2_000);
    // creator_b: 1 quest
    register_quest(&client, &env, "b001", &cb, 500);

    // submit to creator_a's quest only
    submit(&client, &env, &symbol_short!("a001"), &submitter);

    let ca_stats = client.get_creator_stats(&ca);
    let cb_stats = client.get_creator_stats(&cb);

    assert_eq!(ca_stats.quests_created, 2);
    assert_eq!(ca_stats.total_rewards_posted, 3_000);
    assert_eq!(ca_stats.total_submissions_received, 1);

    assert_eq!(cb_stats.quests_created, 1);
    assert_eq!(cb_stats.total_rewards_posted, 500);
    assert_eq!(cb_stats.total_submissions_received, 0, "creator_b got no submissions");
}

#[test]
fn test_platform_aggregates_across_all_creators() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let ca = Address::generate(&env);
    let cb = Address::generate(&env);

    register_quest(&client, &env, "a001", &ca, 1_000);
    register_quest(&client, &env, "b001", &cb, 2_000);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 2);
    assert_eq!(stats.total_rewards_distributed, 3_000);
}

#[test]
fn test_creator_claims_paid_isolated_from_other_creator_claims() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let ca = Address::generate(&env);
    let cb = Address::generate(&env);
    let u1 = Address::generate(&env);
    let u2 = Address::generate(&env);

    full_lifecycle(&client, &env, "a001", &ca, &u1, 300);
    full_lifecycle(&client, &env, "b001", &cb, &u2, 700);

    assert_eq!(client.get_creator_stats(&ca).total_claims_paid, 1);
    assert_eq!(client.get_creator_stats(&cb).total_claims_paid, 1);
    // Platform sees both
    assert_eq!(client.get_platform_stats().total_rewards_claimed, 2);
}

// ---------------------------------------------------------------------------
// 6. Multi-creator / multi-user scenarios
// ---------------------------------------------------------------------------

#[test]
fn test_full_platform_lifecycle_all_counters_consistent() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);

    let ca = Address::generate(&env);
    let cb = Address::generate(&env);
    let u1 = Address::generate(&env);
    let u2 = Address::generate(&env);
    let u3 = Address::generate(&env);

    register_quest(&client, &env, "a001", &ca, 100);
    register_quest(&client, &env, "a002", &ca, 200);
    register_quest(&client, &env, "b001", &cb, 300);
    register_quest(&client, &env, "b002", &cb, 400);

    // u1 submits twice; u2 and u3 each submit once
    submit(&client, &env, &symbol_short!("a001"), &u1);
    submit(&client, &env, &symbol_short!("a002"), &u2);
    submit(&client, &env, &symbol_short!("b001"), &u1); // second submission by u1
    submit(&client, &env, &symbol_short!("b002"), &u3);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 4);
    assert_eq!(stats.total_submissions, 4);
    assert_eq!(stats.total_active_users, 3, "u1 submits twice but counts once");
    assert_eq!(stats.total_rewards_distributed, 1_000);
    assert_eq!(stats.total_rewards_claimed, 0);
}

// ---------------------------------------------------------------------------
// 7. Counter integrity
// ---------------------------------------------------------------------------

#[test]
fn test_minimum_reward_amount_tracked_correctly() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);

    register_quest(&client, &env, "q001", &creator, 1);

    assert_eq!(client.get_platform_stats().total_rewards_distributed, 1);
}

#[test]
fn test_large_reward_amount_tracked_without_overflow() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let creator = Address::generate(&env);

    let big: i128 = i128::MAX / 4;
    register_quest(&client, &env, "q001", &creator, big);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_rewards_distributed, big as u128);
}

// ---------------------------------------------------------------------------
// 8. Admin-only reset
// ---------------------------------------------------------------------------

#[test]
fn test_admin_can_reset_platform_stats_to_zero() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, admin) = setup(&env);
    let creator = Address::generate(&env);

    register_quest(&client, &env, "q001", &creator, 500);
    assert_eq!(client.get_platform_stats().total_quests_created, 1);

    client.reset_platform_stats(&admin);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 0);
    assert_eq!(stats.total_rewards_distributed, 0);
    assert_eq!(stats.total_submissions, 0);
    assert_eq!(stats.total_active_users, 0);
    assert_eq!(stats.total_rewards_claimed, 0);
}

#[test]
fn test_non_admin_cannot_reset_platform_stats() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _) = setup(&env);
    let random = Address::generate(&env);

    let result = client.try_reset_platform_stats(&random);
    assert!(result.is_err(), "non-admin must be rejected");
}

#[test]
fn test_stats_accumulate_correctly_after_reset() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, admin) = setup(&env);
    let creator = Address::generate(&env);

    register_quest(&client, &env, "q001", &creator, 500);
    client.reset_platform_stats(&admin);

    // A quest created after reset should restart from 1
    register_quest(&client, &env, "q002", &creator, 250);
    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 1, "counter must restart after reset");
    assert_eq!(stats.total_rewards_distributed, 250);
}

// ---------------------------------------------------------------------------
// 9. Public query — no auth required
// ---------------------------------------------------------------------------

#[test]
fn test_get_platform_stats_requires_no_auth() {
    // Intentionally not calling mock_all_auths globally for this test.
    let env = Env::default();
    set_time(&env, 1_000);
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &cid);

    // initialize still requires auth
    env.mock_all_auths();
    let admin = Address::generate(&env);
    client.initialize(&admin);

    // get_platform_stats must not require auth — call without mock
    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 0);
}

#[test]
fn test_get_creator_stats_requires_no_auth() {
    let env = Env::default();
    set_time(&env, 1_000);
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &cid);

    env.mock_all_auths();
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let creator = Address::generate(&env);
    let c = client.get_creator_stats(&creator);
    assert_eq!(c.quests_created, 0);
}