//! Data Structure Size Optimization Tests — Issue #276
//!
//! Verifies that the split structs work correctly:
//!   - EscrowBalances (hot) + EscrowMeta (cold)
//!   - UserCore (hot) + UserBadges (cold)
//!   - QuestMetadataCore (hot) + QuestMetadataExtended (cold)
//!   - PlatformStats assembled from individual counters

#![cfg(test)]

use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    Address, BytesN, Env, String, Vec,
};

extern crate earn_quest;
use earn_quest::types::{Badge, MetadataDescription, QuestMetadata};
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

fn setup(env: &Env) -> (EarnQuestContractClient<'_>, Address) {
    let id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &id);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

fn set_time(env: &Env, ts: u64) {
    env.ledger().with_mut(|li| li.timestamp = ts);
}

use earn_quest::validation::MIN_DEADLINE_DURATION;

fn future_deadline(env: &Env) -> u64 {
    env.ledger().timestamp() + MIN_DEADLINE_DURATION + 3_600
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EscrowBalances / EscrowMeta split
// ─────────────────────────────────────────────────────────────────────────────

/// After deposit, get_escrow_balance() returns the correct available amount
/// using only the hot-path EscrowBalances entry.
#[test]
fn test_escrow_balance_uses_hot_path() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    set_time(&env, 1_000);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = token_obj.address();

    // Mint tokens to creator
    soroban_sdk::token::StellarAssetClient::new(&env, &token).mint(&creator, &500);

    let quest_id = symbol_short!("QEB");
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &future_deadline(&env));
    client.deposit_escrow(&quest_id, &creator, &token, &300);

    let balance = client.get_escrow_balance(&quest_id);
    assert_eq!(balance, 300, "escrow balance should be 300 after deposit");
}

/// get_escrow_info() assembles the full view from both split entries.
#[test]
fn test_escrow_info_assembles_from_split_entries() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    set_time(&env, 1_000);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = token_obj.address();

    soroban_sdk::token::StellarAssetClient::new(&env, &token).mint(&creator, &500);

    let quest_id = symbol_short!("QEI");
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &future_deadline(&env));
    client.deposit_escrow(&quest_id, &creator, &token, &200);

    let info = client.get_escrow_info(&quest_id);
    assert_eq!(info.total_deposited, 200);
    assert_eq!(info.total_paid_out, 0);
    assert_eq!(info.total_refunded, 0);
    assert!(info.is_active);
    assert_eq!(info.deposit_count, 1);
    assert_eq!(info.depositor, creator);
    assert_eq!(info.token, token);
}

/// Multiple top-ups accumulate correctly in EscrowBalances.
#[test]
fn test_escrow_topup_accumulates_in_balances() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    set_time(&env, 1_000);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = token_obj.address();

    soroban_sdk::token::StellarAssetClient::new(&env, &token).mint(&creator, &1_000);

    let quest_id = symbol_short!("QTOP");
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &future_deadline(&env));
    client.deposit_escrow(&quest_id, &creator, &token, &100);
    client.deposit_escrow(&quest_id, &creator, &token, &200);
    client.deposit_escrow(&quest_id, &creator, &token, &300);

    let info = client.get_escrow_info(&quest_id);
    assert_eq!(info.total_deposited, 600);
    assert_eq!(info.deposit_count, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UserCore / UserBadges split
// ─────────────────────────────────────────────────────────────────────────────

/// award_xp() updates UserCore without touching UserBadges.
/// Verified by checking XP and level after award, then confirming badges empty.
#[test]
fn test_award_xp_only_updates_user_core() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    set_time(&env, 1_000);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = token_obj.address();

    soroban_sdk::token::StellarAssetClient::new(&env, &token).mint(&creator, &500);

    let quest_id = symbol_short!("QXPU");
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &future_deadline(&env));
    client.deposit_escrow(&quest_id, &creator, &token, &100);

    let proof = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);
    client.claim_reward(&quest_id, &submitter);

    // UserCore should have XP
    let stats = client.get_user_stats(&submitter);
    assert!(stats.xp > 0, "XP should be awarded after claim");
    assert_eq!(stats.quests_completed, 1);

    // UserBadges should be empty (not touched by award_xp)
    let badges = client.get_user_badges(&submitter);
    assert_eq!(badges.badges.len(), 0, "badges should be empty after XP award");
}

/// grant_badge() only updates UserBadges without touching UserCore XP.
#[test]
fn test_grant_badge_only_updates_user_badges() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let user = Address::generate(&env);

    // Grant a badge — UserCore should remain at defaults
    client.grant_badge(&admin, &user, &Badge::Rookie);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 1);
    assert!(badges.badges.contains(&Badge::Rookie));

    // UserCore XP should be 0 (untouched)
    let stats = client.get_user_stats(&user);
    assert_eq!(stats.xp, 0, "XP should be 0 after badge grant only");
    assert_eq!(stats.quests_completed, 0);
}

/// Multiple badges accumulate in UserBadges independently of XP.
#[test]
fn test_multiple_badges_stored_in_user_badges() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let user = Address::generate(&env);

    client.grant_badge(&admin, &user, &Badge::Rookie);
    client.grant_badge(&admin, &user, &Badge::Explorer);
    client.grant_badge(&admin, &user, &Badge::Veteran);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 3);
}

/// Duplicate badge is not added twice.
#[test]
fn test_duplicate_badge_not_added_to_user_badges() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let user = Address::generate(&env);

    client.grant_badge(&admin, &user, &Badge::Master);
    client.grant_badge(&admin, &user, &Badge::Master); // duplicate

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 1, "duplicate badge must not be added");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. QuestMetadataCore / QuestMetadataExtended split
// ─────────────────────────────────────────────────────────────────────────────

/// register_quest_with_metadata stores and retrieves full metadata correctly.
#[test]
fn test_metadata_stored_and_retrieved_correctly() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    set_time(&env, 1_000);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QMD");

    let mut tags = Vec::new(&env);
    tags.push_back(String::from_str(&env, "rust"));
    tags.push_back(String::from_str(&env, "soroban"));

    let mut reqs = Vec::new(&env);
    reqs.push_back(String::from_str(&env, "Write a smart contract"));

    let metadata = QuestMetadata {
        title: String::from_str(&env, "Build a Contract"),
        description: MetadataDescription::Inline(String::from_str(&env, "Create a Soroban contract")),
        category: String::from_str(&env, "Development"),
        requirements: reqs.clone(),
        tags: tags.clone(),
    };

    client.register_quest_with_metadata(
        &quest_id, &creator, &token, &100, &verifier,
        &future_deadline(&env), &metadata,
    );

    assert!(client.has_quest_metadata(&quest_id));

    let retrieved = client.get_quest_metadata(&quest_id);
    assert_eq!(retrieved.title, String::from_str(&env, "Build a Contract"));
    assert_eq!(retrieved.category, String::from_str(&env, "Development"));
    assert_eq!(retrieved.tags.len(), 2);
    assert_eq!(retrieved.requirements.len(), 1);
}

/// Updating metadata replaces both Core and Extended entries.
#[test]
fn test_metadata_update_replaces_both_entries() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    set_time(&env, 1_000);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QMDU");

    let metadata_v1 = QuestMetadata {
        title: String::from_str(&env, "Old Title"),
        description: MetadataDescription::Inline(String::from_str(&env, "Old desc")),
        category: String::from_str(&env, "OldCat"),
        requirements: Vec::new(&env),
        tags: Vec::new(&env),
    };

    client.register_quest_with_metadata(
        &quest_id, &creator, &token, &100, &verifier,
        &future_deadline(&env), &metadata_v1,
    );

    let mut new_tags = Vec::new(&env);
    new_tags.push_back(String::from_str(&env, "updated"));

    let metadata_v2 = QuestMetadata {
        title: String::from_str(&env, "New Title"),
        description: MetadataDescription::Inline(String::from_str(&env, "New desc")),
        category: String::from_str(&env, "NewCat"),
        requirements: Vec::new(&env),
        tags: new_tags,
    };

    client.update_quest_metadata(&quest_id, &creator, &metadata_v2);

    let retrieved = client.get_quest_metadata(&quest_id);
    assert_eq!(retrieved.title, String::from_str(&env, "New Title"));
    assert_eq!(retrieved.category, String::from_str(&env, "NewCat"));
    assert_eq!(retrieved.tags.len(), 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PlatformStats individual counters
// ─────────────────────────────────────────────────────────────────────────────

/// Platform stats start at zero.
#[test]
fn test_platform_stats_start_at_zero() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 0);
    assert_eq!(stats.total_submissions, 0);
    assert_eq!(stats.total_rewards_claimed, 0);
    assert_eq!(stats.total_rewards_distributed, 0);
    assert_eq!(stats.total_active_users, 0);
}

/// reset_platform_stats zeroes all individual counters.
#[test]
fn test_reset_platform_stats_zeroes_all_counters() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    // Reset should work even on fresh state
    client.reset_platform_stats(&admin);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 0);
    assert_eq!(stats.total_submissions, 0);
    assert_eq!(stats.total_rewards_claimed, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Full lifecycle — all split structs exercised together
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_full_lifecycle_with_split_structs() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    set_time(&env, 1_000);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = token_obj.address();

    soroban_sdk::token::StellarAssetClient::new(&env, &token).mint(&creator, &1_000);

    let quest_id = symbol_short!("QFL");

    // Register with metadata
    let metadata = QuestMetadata {
        title: String::from_str(&env, "Full Lifecycle Quest"),
        description: MetadataDescription::Inline(String::from_str(&env, "Test all splits")),
        category: String::from_str(&env, "Testing"),
        requirements: Vec::new(&env),
        tags: Vec::new(&env),
    };
    client.register_quest_with_metadata(
        &quest_id, &creator, &token, &100, &verifier,
        &future_deadline(&env), &metadata,
    );

    // Deposit escrow (writes EscrowBalances + EscrowMeta)
    client.deposit_escrow(&quest_id, &creator, &token, &100);

    // Submit + approve + claim (updates UserCore via award_xp)
    let proof = BytesN::from_array(&env, &[2u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);
    client.claim_reward(&quest_id, &submitter);

    // Grant badge (writes UserBadges only)
    client.grant_badge(&admin, &submitter, &Badge::Rookie);

    // Verify UserCore has XP
    let stats = client.get_user_stats(&submitter);
    assert!(stats.xp > 0);
    assert_eq!(stats.quests_completed, 1);

    // Verify UserBadges has badge
    let badges = client.get_user_badges(&submitter);
    assert_eq!(badges.badges.len(), 1);

    // Verify escrow balance reduced after payout
    let balance = client.get_escrow_balance(&quest_id);
    assert_eq!(balance, 0, "escrow should be empty after full payout");

    // Verify metadata still readable
    let meta = client.get_quest_metadata(&quest_id);
    assert_eq!(meta.title, String::from_str(&env, "Full Lifecycle Quest"));
}
