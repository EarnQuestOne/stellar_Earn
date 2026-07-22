#![cfg(test)]

use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, BytesN, Env, Symbol};

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
