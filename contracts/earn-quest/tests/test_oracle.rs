use earn_quest::storage;
use earn_quest::types::{OracleConfig, OracleType};
use soroban_sdk::{Address, Env};

#[test]
fn test_oracle_storage_functions() {
    let env = Env::default();
    
    // Test oracle storage initialization
    storage::initialize_oracle_storage(&env);
    
    // Test adding oracle config
    let oracle_address = Address::generate(&env);
    let config = OracleConfig {
        oracle_address: oracle_address.clone(),
        oracle_type: OracleType::StellarAsset,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    
    // This should succeed
    storage::add_oracle_config(&env, &config).unwrap();
    
    // Test checking if oracle exists
    assert!(storage::has_oracle_config(&env, &oracle_address));
    
    // Test getting oracle config
    let retrieved_config = storage::get_oracle_config(&env, &oracle_address).unwrap();
    assert_eq!(retrieved_config.oracle_address, oracle_address);
    assert_eq!(retrieved_config.oracle_type, OracleType::StellarAsset);
    
    // Test getting all oracle configs
    let all_configs = storage::get_all_oracle_configs(&env);
    assert_eq!(all_configs.len(), 1);
    
    // Test getting active oracle configs
    let active_configs = storage::get_active_oracle_configs(&env);
    assert_eq!(active_configs.len(), 1);
    
    // Test updating oracle config
    let updated_config = OracleConfig {
        oracle_address: oracle_address.clone(),
        oracle_type: OracleType::StellarAsset,
        max_age_seconds: 600,
        min_confidence: 85,
        is_active: false,
    };
    
    storage::update_oracle_config(&env, &updated_config).unwrap();
    
    // Check that active configs is now empty
    let active_configs = storage::get_active_oracle_configs(&env);
    assert_eq!(active_configs.len(), 0);
    
    // Test removing oracle config
    storage::remove_oracle_config(&env, &oracle_address).unwrap();
    
    // Check that oracle no longer exists
    assert!(!storage::has_oracle_config(&env, &oracle_address));
    let all_configs = storage::get_all_oracle_configs(&env);
    assert_eq!(all_configs.len(), 0);
}
