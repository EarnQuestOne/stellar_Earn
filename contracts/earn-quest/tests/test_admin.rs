#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env};

extern crate earn_quest;
use earn_quest::types::Badge;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

//================================================================================
// Test Setup
//================================================================================

fn setup_contract(env: &Env) -> (Address, EarnQuestContractClient<'_>) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);
    (contract_id, client)
}

//================================================================================
// Initialization Tests
//================================================================================

#[test]
fn test_initialize_sets_initial_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let initial_admin = Address::generate(&env);

    client.initialize(&initial_admin);

    assert!(client.is_admin(&initial_admin));
}

#[test]
fn test_non_admin_is_not_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let initial_admin = Address::generate(&env);
    let non_admin = Address::generate(&env);

    client.initialize(&initial_admin);

    assert!(!client.is_admin(&non_admin));
}

//================================================================================
// Add Admin Tests
//================================================================================

#[test]
fn test_admin_can_add_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let initial_admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize(&initial_admin);
    client.add_admin(&initial_admin, &new_admin);

    assert!(client.is_admin(&new_admin));
}

#[test]
fn test_multiple_admins_can_be_registered() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let admin3 = Address::generate(&env);

    client.initialize(&admin1);
    client.add_admin(&admin1, &admin2);
    client.add_admin(&admin1, &admin3);

    assert!(client.is_admin(&admin1));
    assert!(client.is_admin(&admin2));
    assert!(client.is_admin(&admin3));
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_non_admin_cannot_add_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let initial_admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize(&initial_admin);
    client.add_admin(&non_admin, &new_admin);
}

//================================================================================
// Remove Admin Tests
//================================================================================

#[test]
fn test_admin_can_remove_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    client.initialize(&admin1);
    client.add_admin(&admin1, &admin2);

    assert!(client.is_admin(&admin2));

    client.remove_admin(&admin1, &admin2);

    assert!(!client.is_admin(&admin2));
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_non_admin_cannot_remove_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);

    client.initialize(&admin);
    client.remove_admin(&non_admin, &admin);
}

#[test]
fn test_admin_status_can_be_granted_and_revoked() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    // Initially not admin
    assert!(!client.is_admin(&user));

    // Grant admin status
    client.add_admin(&admin, &user);
    assert!(client.is_admin(&user));

    // Revoke admin status
    client.remove_admin(&admin, &user);
    assert!(!client.is_admin(&user));
}

//================================================================================
// Protected Function Tests
//================================================================================

#[test]
fn test_admin_can_grant_badge() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);
    client.grant_badge(&admin, &user, &Badge::rookie(&env));

    let badges = client.get_user_badges(&user);
    assert!(badges.badges.contains(&Badge::rookie(&env)));
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_non_admin_cannot_grant_badge() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);
    client.grant_badge(&non_admin, &user, &Badge::rookie(&env));
}

#[test]
fn test_second_admin_can_grant_badge() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin1);
    client.add_admin(&admin1, &admin2);

    // Second admin grants badge
    client.grant_badge(&admin2, &user, &Badge::explorer(&env));

    let badges = client.get_user_badges(&user);
    assert!(badges.badges.contains(&Badge::explorer(&env)));
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_removed_admin_cannot_grant_badge() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin1);
    client.add_admin(&admin1, &admin2);
    client.remove_admin(&admin1, &admin2);

    // Removed admin tries to grant badge
    client.grant_badge(&admin2, &user, &Badge::rookie(&env));
}

//================================================================================
// Edge Case Tests
//================================================================================

#[test]
fn test_admin_can_add_same_admin_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize(&admin);
    client.add_admin(&admin, &new_admin);
    client.add_admin(&admin, &new_admin); // Should not panic

    assert!(client.is_admin(&new_admin));
}

#[test]
fn test_remove_non_existent_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);

    client.initialize(&admin);
    client.remove_admin(&admin, &non_admin); // Should not panic

    assert!(!client.is_admin(&non_admin));
}
