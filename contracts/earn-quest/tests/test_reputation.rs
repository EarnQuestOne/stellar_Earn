#![cfg(test)]

use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, BytesN, Env, Symbol, Vec};

extern crate earn_quest;
use earn_quest::types::{Badge, BadgeType};
use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::String as SString;

fn setup_contract_and_token(
    env: &Env,
) -> (
    Address,
    EarnQuestContractClient<'_>,
    Address,
    TokenClient<'_>,
) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let admin = Address::generate(env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_contract = token_contract_obj.address();
    let token_admin_client = StellarAssetClient::new(env, &token_contract);
    let token_client = TokenClient::new(env, &token_contract);

    token_admin_client.mint(&contract_id, &10000);

    (contract_id, client, token_contract, token_client)
}

#[allow(clippy::too_many_arguments)]
fn complete_quest(
    client: &EarnQuestContractClient,
    env: &Env,
    quest_id: soroban_sdk::Symbol,
    creator: &Address,
    token_contract: &Address,
    verifier: &Address,
    submitter: &Address,
    reward_amount: i128,
) {
    client.register_quest(
        &quest_id,
        creator,
        token_contract,
        &reward_amount,
        verifier,
        &10000,
    );

    let proof = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(&quest_id, submitter, &proof);
    client.approve_submission(&quest_id, submitter, verifier);
    client.claim_reward(&quest_id, submitter, &reward_amount);
}

#[test]
fn test_xp_awarded_on_quest_completion() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);

    let stats_before = client.get_user_stats(&submitter);
    assert_eq!(stats_before.xp, 0);
    assert_eq!(stats_before.level, 1);
    assert_eq!(stats_before.quests_completed, 0);

    complete_quest(
        &client,
        &env,
        symbol_short!("Q1"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );

    let stats_after = client.get_user_stats(&submitter);
    assert_eq!(stats_after.xp, 100);
    assert_eq!(stats_after.level, 1);
    assert_eq!(stats_after.quests_completed, 1);
}

#[test]
fn test_level_calculation_progression() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);

    complete_quest(
        &client,
        &env,
        symbol_short!("Q1"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 1);
    assert_eq!(stats.xp, 100);

    complete_quest(
        &client,
        &env,
        symbol_short!("Q2"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 1);
    assert_eq!(stats.xp, 200);

    complete_quest(
        &client,
        &env,
        symbol_short!("Q3"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 2);
    assert_eq!(stats.xp, 300);

    complete_quest(
        &client,
        &env,
        symbol_short!("Q4"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    complete_quest(
        &client,
        &env,
        symbol_short!("Q5"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    complete_quest(
        &client,
        &env,
        symbol_short!("Q6"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 3);
    assert_eq!(stats.xp, 600);

    for i in 7..=10 {
        complete_quest(
            &client,
            &env,
            Symbol::new(&env, &format!("Q{}", i)),
            &creator,
            &token_contract,
            &verifier,
            &submitter,
            100,
        );
    }
    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 4);
    assert_eq!(stats.xp, 1000);

    for i in 11..=15 {
        complete_quest(
            &client,
            &env,
            Symbol::new(&env, &format!("Q{}", i)),
            &creator,
            &token_contract,
            &verifier,
            &submitter,
            100,
        );
    }
    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 5);
    assert_eq!(stats.xp, 1500);
}

#[test]
fn test_grant_badge_by_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);
    client.grant_badge(&admin, &user, &Badge::Rookie);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 1);
    assert_eq!(badges.badges.get(0).unwrap(), Badge::Rookie);
}

#[test]
fn test_grant_multiple_badges() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);
    client.grant_badge(&admin, &user, &Badge::Rookie);
    client.grant_badge(&admin, &user, &Badge::Explorer);
    client.grant_badge(&admin, &user, &Badge::Veteran);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 3);
    assert!(badges.badges.contains(&Badge::Rookie));
    assert!(badges.badges.contains(&Badge::Explorer));
    assert!(badges.badges.contains(&Badge::Veteran));
}

#[test]
fn test_duplicate_badge_not_added() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);
    client.grant_badge(&admin, &user, &Badge::Master);
    client.grant_badge(&admin, &user, &Badge::Master);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 1);
    assert_eq!(badges.badges.get(0).unwrap(), Badge::Master);
}

#[test]
fn test_user_stats_query_for_new_user() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);

    let user = Address::generate(&env);

    let stats = client.get_user_stats(&user);
    assert_eq!(stats.xp, 0);
    assert_eq!(stats.level, 1);
    assert_eq!(stats.quests_completed, 0);
    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 0);
}

#[test]
fn test_quest_completion_increments_counter() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);

    for i in 1..=5 {
        complete_quest(
            &client,
            &env,
            Symbol::new(&env, &format!("Q{}", i)),
            &creator,
            &token_contract,
            &verifier,
            &submitter,
            100,
        );
    }

    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.quests_completed, 5);
    assert_eq!(stats.xp, 500);
}

#[test]
fn test_level_boundaries() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);

    complete_quest(
        &client,
        &env,
        symbol_short!("Q1"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    complete_quest(
        &client,
        &env,
        symbol_short!("Q2"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 1);
    assert_eq!(stats.xp, 200);

    complete_quest(
        &client,
        &env,
        symbol_short!("Q3"),
        &creator,
        &token_contract,
        &verifier,
        &submitter,
        100,
    );
    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 2);
    assert_eq!(stats.xp, 300);
}

#[test]
fn test_multiple_users_independent_stats() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    complete_quest(
        &client,
        &env,
        symbol_short!("Q1"),
        &creator,
        &token_contract,
        &verifier,
        &user1,
        100,
    );
    complete_quest(
        &client,
        &env,
        symbol_short!("Q2"),
        &creator,
        &token_contract,
        &verifier,
        &user1,
        100,
    );
    complete_quest(
        &client,
        &env,
        symbol_short!("Q3"),
        &creator,
        &token_contract,
        &verifier,
        &user1,
        100,
    );

    complete_quest(
        &client,
        &env,
        symbol_short!("Q4"),
        &creator,
        &token_contract,
        &verifier,
        &user2,
        100,
    );

    let stats1 = client.get_user_stats(&user1);
    assert_eq!(stats1.xp, 300);
    assert_eq!(stats1.level, 2);
    assert_eq!(stats1.quests_completed, 3);

    let stats2 = client.get_user_stats(&user2);
    assert_eq!(stats2.xp, 100);
    assert_eq!(stats2.level, 1);
    assert_eq!(stats2.quests_completed, 1);
}

#[test]
fn test_max_level_cap() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);

    for i in 1..=20 {
        complete_quest(
            &client,
            &env,
            Symbol::new(&env, &format!("Q{}", i)),
            &creator,
            &token_contract,
            &verifier,
            &submitter,
            100,
        );
    }

    let stats = client.get_user_stats(&submitter);
    assert_eq!(stats.level, 5);
    assert_eq!(stats.xp, 2000);
}

//================================================================================
// Configurable Badge Type Registry Tests (#46)
//================================================================================

#[test]
fn test_default_badge_types_seeded_on_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let types = client.list_badge_types();
    assert_eq!(types.len(), 5, "5 legacy badges should be seeded");

    let rookie_id = symbol_short!("ROOKIE");
    let bt = client.get_badge_type(&rookie_id);
    assert_eq!(bt.id, rookie_id);
    assert_eq!(bt.xp_reward, 10);
}

#[test]
fn test_register_custom_badge_type_and_grant() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    client.initialize(&admin);

    let custom_id = Symbol::new(&env, "trailblzr");
    let bt = BadgeType {
        id: custom_id.clone(),
        name: SString::from_str(&env, "Trailblazer"),
        description: SString::from_str(&env, "First-mover badge."),
        xp_reward: 50,
    };
    client.register_badge_type(&admin, &bt);

    let types = client.list_badge_types();
    assert_eq!(types.len(), 6);

    client.grant_badge(&admin, &user, &Badge::Explorer);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 1);
    assert_eq!(badges.badges.get(0).unwrap(), Badge::Explorer);
}

#[test]
fn test_register_duplicate_badge_type_overwrites() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let bt = BadgeType {
        id: symbol_short!("ROOKIE"),
        name: SString::from_str(&env, "Rookie v2"),
        description: SString::from_str(&env, "updated"),
        xp_reward: 99,
    };
    client.register_badge_type(&admin, &bt);

    let updated = client.get_badge_type(&symbol_short!("ROOKIE"));
    assert_eq!(updated.name, SString::from_str(&env, "Rookie v2"));
    assert_eq!(updated.xp_reward, 99);
}

#[test]
fn test_update_badge_type_and_grant() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    client.initialize(&admin);

    let bt = BadgeType {
        id: symbol_short!("ROOKIE"),
        name: SString::from_str(&env, "Rookie"),
        description: SString::from_str(&env, "updated copy"),
        xp_reward: 15,
    };
    client.update_badge_type(&admin, &bt);

    client.grant_badge(&admin, &user, &Badge::Rookie);

    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 1);
    assert_eq!(badges.badges.get(0).unwrap(), Badge::Rookie);
}

#[test]
fn test_remove_badge_type() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let id = symbol_short!("LEGEND");
    client.remove_badge_type(&admin, &id);

    let types = client.list_badge_types();
    assert_eq!(types.len(), 4);

    // Registry entry is gone, but enum-based grants still succeed.
    let user = Address::generate(&env);
    client.grant_badge(&admin, &user, &Badge::Legend);
    let badges = client.get_user_badges(&user);
    assert_eq!(badges.badges.len(), 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_non_admin_cannot_register_badge_type() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let outsider = Address::generate(&env);
    client.initialize(&admin);

    let bt = BadgeType {
        id: Symbol::new(&env, "rogue"),
        name: SString::from_str(&env, "Rogue"),
        description: SString::from_str(&env, "x"),
        xp_reward: 0,
    };
    client.register_badge_type(&outsider, &bt);
}

#[test]
fn test_award_xp_batch_equivalence_single_user_multiple_grants() {
    let env1 = Env::default();
    env1.mock_all_auths();
    let (_, client1, _, _) = setup_contract_and_token(&env1);
    let admin1 = Address::generate(&env1);
    client1.initialize(&admin1);
    let user1 = Address::generate(&env1);

    // Sequential grants
    let mut grants1 = Vec::new(&env1);
    grants1.push_back((user1.clone(), 100u64));
    grants1.push_back((user1.clone(), 150u64));
    grants1.push_back((user1.clone(), 100u64));

    for i in 0u32..grants1.len() {
        let (u, xp) = grants1.get(i).unwrap();
        let _ = client1.award_xp_batch(&Vec::from_array(&env1, [(u, xp)]));
    }
    let stats_sequential = client1.get_user_stats(&user1);

    // Batched grants in single call
    let env2 = Env::default();
    env2.mock_all_auths();
    let (_, client2, _, _) = setup_contract_and_token(&env2);
    let admin2 = Address::generate(&env2);
    client2.initialize(&admin2);
    let user2 = Address::generate(&env2);

    let mut grants2 = Vec::new(&env2);
    grants2.push_back((user2.clone(), 100u64));
    grants2.push_back((user2.clone(), 150u64));
    grants2.push_back((user2.clone(), 100u64));

    client2.award_xp_batch(&grants2);
    let stats_batched = client2.get_user_stats(&user2);

    assert_eq!(stats_batched.xp, stats_sequential.xp);
    assert_eq!(stats_batched.level, stats_sequential.level);
    assert_eq!(stats_batched.quests_completed, stats_sequential.quests_completed);
    assert_eq!(stats_batched.xp, 350);
    assert_eq!(stats_batched.level, 2); // 350 XP >= 300 -> Level 2
    assert_eq!(stats_batched.quests_completed, 3);
}

#[test]
fn test_award_xp_batch_equivalence_multiple_users() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    let user_c = Address::generate(&env);

    let mut grants = Vec::new(&env);
    grants.push_back((user_a.clone(), 200u64));
    grants.push_back((user_b.clone(), 400u64));
    grants.push_back((user_a.clone(), 150u64));
    grants.push_back((user_c.clone(), 1000u64));
    grants.push_back((user_b.clone(), 300u64));

    client.award_xp_batch(&grants);

    let stats_a = client.get_user_stats(&user_a);
    let stats_b = client.get_user_stats(&user_b);
    let stats_c = client.get_user_stats(&user_c);

    assert_eq!(stats_a.xp, 350);
    assert_eq!(stats_a.level, 2);
    assert_eq!(stats_a.quests_completed, 2);

    assert_eq!(stats_b.xp, 700);
    assert_eq!(stats_b.level, 3); // 700 XP >= 600 -> Level 3
    assert_eq!(stats_b.quests_completed, 2);

    assert_eq!(stats_c.xp, 1000);
    assert_eq!(stats_c.level, 4); // 1000 XP >= 1000 -> Level 4
    assert_eq!(stats_c.quests_completed, 1);
}

#[test]
fn test_award_xp_batch_empty_grant_list() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let grants = Vec::new(&env);
    client.award_xp_batch(&grants);
}

