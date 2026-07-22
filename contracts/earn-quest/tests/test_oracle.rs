#![cfg(test)]
#![allow(clippy::too_many_arguments)]

use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, U256};

extern crate earn_quest;
use earn_quest::errors::Error;
use earn_quest::types::{OracleConfig, OracleType, PriceData};
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MockOracleState {
    Data(PriceData),
    None,
    Panic,
}

/// Configurable Mock Oracle Contract for tests
#[contract]
pub struct MockPriceFeedOracle;

#[allow(clippy::too_many_arguments)]
#[contractimpl]
impl MockPriceFeedOracle {
    pub fn set_price_data(
        env: Env,
        base: Address,
        quote: Address,
        price: U256,
        decimals: u32,
        timestamp: u64,
        confidence: u32,
    ) {
        let key = (base, quote);
        let data = PriceData {
            base_asset: key.0.clone(),
            quote_asset: key.1.clone(),
            price,
            decimals,
            timestamp,
            confidence,
        };
        env.storage()
            .instance()
            .set(&key, &MockOracleState::Data(data));
    }

    pub fn set_price_mismatch(
        env: Env,
        key_base: Address,
        key_quote: Address,
        base_asset: Address,
        quote_asset: Address,
        price: U256,
        decimals: u32,
        timestamp: u64,
        confidence: u32,
    ) {
        let key = (key_base, key_quote);
        let data = PriceData {
            base_asset,
            quote_asset,
            price,
            decimals,
            timestamp,
            confidence,
        };
        env.storage()
            .instance()
            .set(&key, &MockOracleState::Data(data));
    }

    pub fn set_price_none(env: Env, base: Address, quote: Address) {
        let key = (base, quote);
        env.storage().instance().set(&key, &MockOracleState::None);
    }

    pub fn set_panic(env: Env, base: Address, quote: Address) {
        let key = (base, quote);
        env.storage().instance().set(&key, &MockOracleState::Panic);
    }

    pub fn lastprice(env: Env, base: Address, quote: Address) -> Option<PriceData> {
        let key = (base, quote);
        match env.storage().instance().get::<_, MockOracleState>(&key) {
            Some(MockOracleState::Data(data)) => Some(data),
            Some(MockOracleState::Panic) => panic!("Mock oracle panicking"),
            _ => None,
        }
    }

    pub fn price(env: Env, base: Address, quote: Address) -> Option<PriceData> {
        Self::lastprice(env, base, quote)
    }
}

fn setup_earn_quest(env: &Env) -> (Address, EarnQuestContractClient<'_>) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);
    (contract_id, client)
}

fn setup_mock_oracle(env: &Env) -> (Address, MockPriceFeedOracleClient<'_>) {
    let contract_id = env.register_contract(None, MockPriceFeedOracle);
    let client = MockPriceFeedOracleClient::new(env, &contract_id);
    (contract_id, client)
}

#[test]
fn test_oracle_admin_operations() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let oracle_addr = Address::generate(&env);
    let oracle_config = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };

    // Add oracle configuration
    client.add_oracle(&admin, &oracle_config);

    // Verify it is registered
    let configs = client.get_oracle_configs();
    assert_eq!(configs.len(), 1);
    assert_eq!(configs.get(0).unwrap(), oracle_config);

    // Update oracle config (deactivate it)
    let mut updated_config = oracle_config.clone();
    updated_config.is_active = false;
    client.update_oracle(&admin, &updated_config);

    let active_configs = client.get_active_oracle_configs();
    assert_eq!(active_configs.len(), 0);

    let configs = client.get_oracle_configs();
    assert_eq!(configs.len(), 1);
    assert!(!configs.get(0).unwrap().is_active);

    // Remove oracle config
    client.remove_oracle(&admin, &oracle_addr);
    let configs = client.get_oracle_configs();
    assert_eq!(configs.len(), 0);
}

#[test]
fn test_oracle_invalid_config_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let oracle_addr = Address::generate(&env);

    // Invalid: max_age_seconds is 0
    let invalid_config1 = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 0,
        min_confidence: 80,
        is_active: true,
    };
    let res = client.try_add_oracle(&admin, &invalid_config1);
    match res {
        Err(Ok(Error::InvalidOracleConfig)) => {}
        _ => panic!("expected InvalidOracleConfig, got {:?}", res),
    }

    // Invalid: min_confidence is > 100
    let invalid_config2 = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 101,
        is_active: true,
    };
    let res = client.try_add_oracle(&admin, &invalid_config2);
    match res {
        Err(Ok(Error::InvalidOracleConfig)) => {}
        _ => panic!("expected InvalidOracleConfig, got {:?}", res),
    }
}

#[test]
fn test_oracle_query_success() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let (oracle_addr, oracle_client) = setup_mock_oracle(&env);
    let base = Address::generate(&env);
    let quote = Address::generate(&env);

    // Configure mock oracle to return valid price data
    oracle_client.set_price_data(&base, &quote, &U256::from_u32(&env, 5000), &7, &1000, &85);

    // Add oracle config
    let oracle_config = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(&admin, &oracle_config);

    // Query specific oracle
    let price_data = client.get_price_from_oracle(&oracle_addr, &base, &quote, &300);
    assert_eq!(price_data.price, U256::from_u32(&env, 5000));
    assert_eq!(price_data.timestamp, 1000);
    assert_eq!(price_data.confidence, 85);

    // Query aggregated price
    let agg_price = client.get_price(&base, &quote, &300);
    assert_eq!(agg_price.weighted_price, U256::from_u32(&env, 5000));
    assert_eq!(agg_price.sources_used, 1);
    assert_eq!(agg_price.total_sources, 1);
}

#[test]
fn test_oracle_inactive_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let (oracle_addr, oracle_client) = setup_mock_oracle(&env);
    let base = Address::generate(&env);
    let quote = Address::generate(&env);

    oracle_client.set_price_data(&base, &quote, &U256::from_u32(&env, 5000), &7, &1000, &85);

    let oracle_config = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: false, // Inactive
    };
    client.add_oracle(&admin, &oracle_config);

    let res = client.try_get_price_from_oracle(&oracle_addr, &base, &quote, &300);
    match res {
        Err(Ok(Error::OracleInactive)) => {}
        _ => panic!("expected OracleInactive, got {:?}", res),
    }
}

#[test]
fn test_oracle_stale_data_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let (oracle_addr, oracle_client) = setup_mock_oracle(&env);
    let base = Address::generate(&env);
    let quote = Address::generate(&env);

    // Stale: timestamp 600 (older than max age of 300 seconds when ledger is 1000)
    oracle_client.set_price_data(&base, &quote, &U256::from_u32(&env, 5000), &7, &600, &85);

    let oracle_config = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(&admin, &oracle_config);

    let res = client.try_get_price_from_oracle(&oracle_addr, &base, &quote, &300);
    match res {
        Err(Ok(Error::StaleOracleData)) => {}
        _ => panic!("expected StaleOracleData, got {:?}", res),
    }
}

#[test]
fn test_oracle_low_confidence_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let (oracle_addr, oracle_client) = setup_mock_oracle(&env);
    let base = Address::generate(&env);
    let quote = Address::generate(&env);

    // Low confidence: 75 (below config minimum of 80)
    oracle_client.set_price_data(&base, &quote, &U256::from_u32(&env, 5000), &7, &1000, &75);

    let oracle_config = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(&admin, &oracle_config);

    let res = client.try_get_price_from_oracle(&oracle_addr, &base, &quote, &300);
    match res {
        Err(Ok(Error::LowOracleConfidence)) => {}
        _ => panic!("expected LowOracleConfidence, got {:?}", res),
    }
}

#[test]
fn test_oracle_response_mismatch_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let (oracle_addr, oracle_client) = setup_mock_oracle(&env);
    let base = Address::generate(&env);
    let quote = Address::generate(&env);
    let wrong_quote = Address::generate(&env);

    // Oracle returns wrong quote asset
    oracle_client.set_price_mismatch(
        &base,
        &quote,
        &base,
        &wrong_quote,
        &U256::from_u32(&env, 5000),
        &7,
        &1000,
        &85,
    );

    let oracle_config = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(&admin, &oracle_config);

    let res = client.try_get_price_from_oracle(&oracle_addr, &base, &quote, &300);
    match res {
        Err(Ok(Error::OracleRespMismatch)) => {}
        _ => panic!("expected OracleRespMismatch, got {:?}", res),
    }
}

#[test]
fn test_oracle_invalid_data_bounds_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let (oracle_addr, oracle_client) = setup_mock_oracle(&env);
    let base = Address::generate(&env);
    let quote = Address::generate(&env);

    // Invalid confidence (> 100)
    oracle_client.set_price_data(&base, &quote, &U256::from_u32(&env, 5000), &7, &1000, &101);

    let oracle_config = OracleConfig {
        oracle_address: oracle_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(&admin, &oracle_config);

    let res = client.try_get_price_from_oracle(&oracle_addr, &base, &quote, &300);
    match res {
        Err(Ok(Error::InvalidOracleData)) => {}
        _ => panic!("expected InvalidOracleData, got {:?}", res),
    }

    // Invalid timestamp in future
    oracle_client.set_price_data(&base, &quote, &U256::from_u32(&env, 5000), &7, &1001, &85);
    let res2 = client.try_get_price_from_oracle(&oracle_addr, &base, &quote, &300);
    match res2 {
        Err(Ok(Error::InvalidOracleData)) => {}
        _ => panic!("expected InvalidOracleData, got {:?}", res2),
    }
}

#[test]
fn test_oracle_external_failures_handling() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let base = Address::generate(&env);
    let quote = Address::generate(&env);

    // Case 1: Oracle is set to panic
    let (oracle_addr1, oracle_client1) = setup_mock_oracle(&env);
    oracle_client1.set_panic(&base, &quote);
    let oracle_config1 = OracleConfig {
        oracle_address: oracle_addr1.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(&admin, &oracle_config1);

    let res1 = client.try_get_price_from_oracle(&oracle_addr1, &base, &quote, &300);
    match res1 {
        Err(Ok(Error::NoValidOracleData)) => {}
        _ => panic!("expected NoValidOracleData on panic, got {:?}", res1),
    }

    // Case 2: Oracle returns None
    let (oracle_addr2, oracle_client2) = setup_mock_oracle(&env);
    oracle_client2.set_price_none(&base, &quote);
    let oracle_config2 = OracleConfig {
        oracle_address: oracle_addr2.clone(),
        oracle_type: OracleType::Custom,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(&admin, &oracle_config2);

    let res2 = client.try_get_price_from_oracle(&oracle_addr2, &base, &quote, &300);
    match res2 {
        Err(Ok(Error::NoValidOracleData)) => {}
        _ => panic!(
            "expected NoValidOracleData on None response, got {:?}",
            res2
        ),
    }

    // Case 3: Calling non-existent contract address
    let non_existent_addr = Address::generate(&env);
    let oracle_config3 = OracleConfig {
        oracle_address: non_existent_addr.clone(),
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(&admin, &oracle_config3);

    let res3 = client.try_get_price_from_oracle(&non_existent_addr, &base, &quote, &300);
    match res3 {
        Err(Ok(Error::NoValidOracleData)) => {}
        _ => panic!(
            "expected NoValidOracleData on non-existent contract, got {:?}",
            res3
        ),
    }
}

#[test]
fn test_oracle_aggregation_filtering_and_fallback() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let base = Address::generate(&env);
    let quote = Address::generate(&env);

    // Oracle 1: Valid price (1000), min_confidence weight = 80
    let (oracle_addr1, oracle_client1) = setup_mock_oracle(&env);
    oracle_client1.set_price_data(&base, &quote, &U256::from_u32(&env, 1000), &7, &1000, &85);
    client.add_oracle(
        &admin,
        &OracleConfig {
            oracle_address: oracle_addr1.clone(),
            oracle_type: OracleType::StellarOracle,
            max_age_seconds: 300,
            min_confidence: 80,
            is_active: true,
        },
    );

    // Oracle 2: Stale price (2000), should be filtered out
    let (oracle_addr2, oracle_client2) = setup_mock_oracle(&env);
    oracle_client2.set_price_data(&base, &quote, &U256::from_u32(&env, 2000), &7, &600, &85);
    client.add_oracle(
        &admin,
        &OracleConfig {
            oracle_address: oracle_addr2.clone(),
            oracle_type: OracleType::StellarOracle,
            max_age_seconds: 300,
            min_confidence: 80,
            is_active: true,
        },
    );

    // Oracle 3: Low confidence price (3000), should be filtered out
    let (oracle_addr3, oracle_client3) = setup_mock_oracle(&env);
    oracle_client3.set_price_data(&base, &quote, &U256::from_u32(&env, 3000), &7, &1000, &70);
    client.add_oracle(
        &admin,
        &OracleConfig {
            oracle_address: oracle_addr3.clone(),
            oracle_type: OracleType::StellarOracle,
            max_age_seconds: 300,
            min_confidence: 80,
            is_active: true,
        },
    );

    // Oracle 4: Another valid price (1100), min_confidence weight = 70
    let (oracle_addr4, oracle_client4) = setup_mock_oracle(&env);
    oracle_client4.set_price_data(&base, &quote, &U256::from_u32(&env, 1100), &7, &950, &75);
    client.add_oracle(
        &admin,
        &OracleConfig {
            oracle_address: oracle_addr4.clone(),
            oracle_type: OracleType::StellarOracle,
            max_age_seconds: 300,
            min_confidence: 70, // Needs at least 70, returns 75 (valid)
            is_active: true,
        },
    );

    // Calculate expected weighted average:
    // Oracle 1: price = 1000, weight = 80
    // Oracle 4: price = 1100, weight = 70
    // Total weight = 80 + 70 = 150
    // Weighted sum = 1000 * 80 + 1100 * 70 = 80000 + 77000 = 157000
    // Weighted average = 157000 / 150 = 1046
    let agg_price = client.get_price(&base, &quote, &300);
    assert_eq!(agg_price.weighted_price, U256::from_u32(&env, 1046));
    assert_eq!(agg_price.sources_used, 2);
    assert_eq!(agg_price.total_sources, 4);

    // If both valid oracles are removed/deactivated, query fails with NoValidOracleData
    client.remove_oracle(&admin, &oracle_addr1);
    client.remove_oracle(&admin, &oracle_addr4);
    let res = client.try_get_price(&base, &quote, &300);
    match res {
        Err(Ok(Error::NoValidOracleData)) => {}
        _ => panic!("expected NoValidOracleData, got {:?}", res),
    }
}

#[test]
fn test_validate_reward_with_oracle_confidence_limits() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let (oracle_addr, oracle_client) = setup_mock_oracle(&env);
    let reward_asset = Address::generate(&env);
    let reference_asset = Address::generate(&env);

    client.add_oracle(
        &admin,
        &OracleConfig {
            oracle_address: oracle_addr.clone(),
            oracle_type: OracleType::StellarOracle,
            max_age_seconds: 300,
            min_confidence: 60, // config min is low
            is_active: true,
        },
    );

    // Case 1: Oracle confidence is 85. Aggregation avg confidence will be 85 (>= 80 threshold in validate_reward)
    oracle_client.set_price_data(
        &reward_asset,
        &reference_asset,
        &U256::from_u32(&env, 10000000),
        &7,
        &1000,
        &85,
    );
    client.validate_reward_with_oracle(&reward_asset, &100, &reference_asset, &5);

    // Case 2: Oracle confidence is 75 (valid for config, but average confidence 75 < 80 threshold in validate_reward)
    oracle_client.set_price_data(
        &reward_asset,
        &reference_asset,
        &U256::from_u32(&env, 10000000),
        &7,
        &1000,
        &75,
    );
    let res2 = client.try_validate_reward_with_oracle(&reward_asset, &100, &reference_asset, &5);
    match res2 {
        Err(Ok(Error::LowOracleConfidence)) => {}
        _ => panic!(
            "expected LowOracleConfidence in reward validation, got {:?}",
            res2
        ),
    }
}
