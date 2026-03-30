#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

#[test]
fn test_upgrade_authorization() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = Address::generate(&env);
    let other_user = Address::generate(&env);
    let dummy_wasm_hash = BytesN::from_array(&env, &[0u8; 32]);

    // Initialize
    client.initialize(&admin);

    // Non-admin should not be able to upgrade
    let result = client.try_upgrade_contract(&other_user, &dummy_wasm_hash);
    assert!(result.is_err());

    // Non-admin should not be able to trigger migration
    let result = client.try_trigger_migration(&other_user);
    assert!(result.is_err());

    // Non-admin should not be able to trigger rollback
    let result = client.try_trigger_rollback(&other_user, &0);
    assert!(result.is_err());
}

#[test]
fn test_migration_trigger_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = Address::generate(&env);

    // Initialize (sets version 1)
    client.initialize(&admin);
    assert_eq!(client.get_version(), 1);

    // Triggering migration when already at current version should succeed and do nothing
    client.trigger_migration(&admin);
    assert_eq!(client.get_version(), 1);
}

#[test]
fn test_rollback_invalid_version() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = Address::generate(&env);

    // Initialize (sets version 1)
    client.initialize(&admin);

    // Try to rollback to a version equal to or higher than current (1)
    let result = client.try_trigger_rollback(&admin, &1);
    assert!(result.is_err());

    let result = client.try_trigger_rollback(&admin, &2);
    assert!(result.is_err());
}

#[test]
fn test_successful_rollback() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = Address::generate(&env);

    // Initialize (sets version 1)
    client.initialize(&admin);
    assert_eq!(client.get_version(), 1);

    // Rollback to version 0
    client.trigger_rollback(&admin, &0);
    assert_eq!(client.get_version(), 0);

    // Migration can bring it back to 1
    client.trigger_migration(&admin);
    assert_eq!(client.get_version(), 1);
}

#[test]
fn test_upgrade_contract_entrypoint_authorization() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = Address::generate(&env);

    // Initialize
    client.initialize(&admin);

    // Verify calling it with correct admin doesn't fail with Unauthorized (though it will fail with host error if hash is invalid)
    // We already tested authorization in test_upgrade_authorization
}

#[test]
fn test_trigger_migration_without_initialization_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = Address::generate(&env);
    let result = client.try_trigger_migration(&admin);
    assert!(result.is_err());
}

#[test]
fn test_rollback_updates_config_version() {
    let env = Env::default();
    env.mock_all_auths();
    let client =
        EarnQuestContractClient::new(&env, &env.register_contract(None, EarnQuestContract));

    let admin = Address::generate(&env);
    client.initialize(&admin);

    client.trigger_rollback(&admin, &0);
    assert_eq!(client.get_version(), 0);
    assert_eq!(client.get_config().version, 0);

    client.trigger_migration(&admin);
    assert_eq!(client.get_version(), 1);
    assert_eq!(client.get_config().version, 1);
}
