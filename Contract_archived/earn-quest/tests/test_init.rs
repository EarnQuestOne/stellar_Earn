#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{testutils::Address as _, Env};

#[test]
fn test_initialize_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);

    // Initialize contract with admin
    client.initialize(&admin);

    // Verify contract is now initialized
    assert!(client.is_initialized());

    // Verify admin is set correctly
    let retrieved_admin = client.get_admin();
    assert_eq!(retrieved_admin, admin);

    // Verify version is set
    let version = client.get_version();
    assert_eq!(version, 1);
}

#[test]
fn test_initialize_already_initialized() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);
    let other_admin = soroban_sdk::Address::generate(&env);

    // First initialization should succeed
    client.initialize(&admin);

    // Second initialization should fail - use try_ version to catch error
    let result = client.try_initialize(&other_admin);
    assert!(result.is_err());
}

#[test]
fn test_is_initialized_before_init() {
    let env = Env::default();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    // Contract should not be initialized yet
    assert!(!client.is_initialized());
}

#[test]
fn test_get_admin_not_initialized() {
    let env = Env::default();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    // Getting admin before initialization should panic, so we use try_ version
    let result = client.try_get_admin();
    assert!(result.is_err());
}

#[test]
fn test_get_version_not_initialized() {
    let env = Env::default();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    // Getting version before initialization should fail
    let result = client.try_get_version();
    assert!(result.is_err());
}

#[test]
fn test_get_config() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);

    // Get config
    let config = client.get_config();
    assert_eq!(config.admin, admin);
    assert_eq!(config.version, 1);
    assert!(config.initialized);
}

#[test]
fn test_get_config_not_initialized() {
    let env = Env::default();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    // Getting config before initialization should fail
    let result = client.try_get_config();
    assert!(result.is_err());
}

#[test]
fn test_authorize_upgrade_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);

    // Admin should be able to authorize upgrade
    client.authorize_upgrade(&admin);
}

#[test]
fn test_authorize_upgrade_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);
    let other_user = soroban_sdk::Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);

    // Non-admin should not be able to authorize upgrade
    let result = client.try_authorize_upgrade(&other_user);
    assert!(result.is_err());
}

#[test]
fn test_authorize_upgrade_not_initialized() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);

    // Should not be able to authorize upgrade before initialization
    let result = client.try_authorize_upgrade(&admin);
    assert!(result.is_err());
}

#[test]
fn test_update_config_change_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);
    let new_admin = soroban_sdk::Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);

    // Update admin
    client.update_config(&admin, &Some(new_admin.clone()));

    // Verify new admin is set
    let config = client.get_config();
    assert_eq!(config.admin, new_admin);
}

#[test]
fn test_update_config_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);
    let other_user = soroban_sdk::Address::generate(&env);
    let new_admin = soroban_sdk::Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);

    // Non-admin should not be able to update config
    let result = client.try_update_config(&other_user, &Some(new_admin));
    assert!(result.is_err());
}

#[test]
fn test_update_config_not_initialized() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);
    let new_admin = soroban_sdk::Address::generate(&env);

    // Should not be able to update config before initialization
    let result = client.try_update_config(&admin, &Some(new_admin));
    assert!(result.is_err());
}

#[test]
fn test_initialization_sequence() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = soroban_sdk::Address::generate(&env);
    let new_admin = soroban_sdk::Address::generate(&env);

    // 1. Contract should not be initialized
    assert!(!client.is_initialized());

    // 2. Initialize contract
    client.initialize(&admin);
    assert!(client.is_initialized());

    // 3. Verify initial config
    let config = client.get_config();
    assert_eq!(config.admin, admin);
    assert_eq!(config.version, 1);
    assert!(config.initialized);

    // 4. Admin can authorize upgrade
    client.authorize_upgrade(&admin);

    // 5. Admin can update configuration
    client.update_config(&admin, &Some(new_admin.clone()));

    // 6. New admin can now authorize upgrade
    client.authorize_upgrade(&new_admin);

    // 7. Old admin should not be able to authorize anymore
    let result = client.try_authorize_upgrade(&admin);
    assert!(result.is_err());
}

#[test]
fn test_prevent_re_initialization_after_successful_init() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin1 = soroban_sdk::Address::generate(&env);
    let admin2 = soroban_sdk::Address::generate(&env);

    // First initialization
    client.initialize(&admin1);
    assert!(client.is_initialized());

    // Verify who is admin
    assert_eq!(client.get_admin(), admin1);

    // Try to re-initialize with different admin - should fail
    let result = client.try_initialize(&admin2);
    assert!(result.is_err());

    // Verify original admin is still set
    assert_eq!(client.get_admin(), admin1);
}

#[test]
fn test_multiple_config_updates() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin1 = soroban_sdk::Address::generate(&env);
    let admin2 = soroban_sdk::Address::generate(&env);
    let admin3 = soroban_sdk::Address::generate(&env);

    // Initialize
    client.initialize(&admin1);

    // Update to admin2
    client.update_config(&admin1, &Some(admin2.clone()));
    assert_eq!(client.get_admin(), admin2);

    // Update to admin3 from admin2
    client.update_config(&admin2, &Some(admin3.clone()));
    assert_eq!(client.get_admin(), admin3);

    // admin1 should not be able to authorize upgrade anymore
    assert!(client.try_authorize_upgrade(&admin1).is_err());

    // admin2 should not be able to authorize upgrade anymore
    assert!(client.try_authorize_upgrade(&admin2).is_err());

    // Only admin3 should be able to authorize
    client.authorize_upgrade(&admin3);
}
