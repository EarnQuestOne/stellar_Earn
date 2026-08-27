//! Unit tests for the cap on registered oracle configurations.
//!
//! Guards against unbounded instance storage and unbounded gas in
//! `get_aggregated_price`, which iterates every registered oracle.

use crate::errors::Error;
use crate::oracle::MAX_ORACLE_CONFIGS;
use crate::storage;
use crate::types::{OracleConfig, OracleType};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

fn make_config(oracle_address: Address) -> OracleConfig {
    OracleConfig {
        oracle_address,
        oracle_type: OracleType::StellarAsset,
        max_age_seconds: 300,
        min_confidence: 50,
        is_active: true,
    }
}

#[test]
fn registering_up_to_the_cap_is_allowed() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);

    env.as_contract(&cid, || {
        for _ in 0..MAX_ORACLE_CONFIGS {
            let config = make_config(Address::generate(&env));
            assert!(storage::add_oracle_config(&env, &config).is_ok());
        }

        assert_eq!(
            storage::get_oracle_addresses(&env).len(),
            MAX_ORACLE_CONFIGS
        );
    });
}

#[test]
fn registering_beyond_the_cap_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);

    env.as_contract(&cid, || {
        for _ in 0..MAX_ORACLE_CONFIGS {
            let config = make_config(Address::generate(&env));
            storage::add_oracle_config(&env, &config).unwrap();
        }

        // The next new oracle exceeds the cap.
        let extra = make_config(Address::generate(&env));
        assert_eq!(
            storage::add_oracle_config(&env, &extra),
            Err(Error::OracleLimitReached)
        );

        // The list is unchanged and the over-cap config was not persisted.
        assert_eq!(
            storage::get_oracle_addresses(&env).len(),
            MAX_ORACLE_CONFIGS
        );
        assert_eq!(
            storage::get_oracle_config(&env, &extra.oracle_address),
            Err(Error::OracleInactive)
        );
    });
}

#[test]
fn updating_an_existing_oracle_at_the_cap_is_allowed() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);

    env.as_contract(&cid, || {
        let mut first = None;
        for _ in 0..MAX_ORACLE_CONFIGS {
            let config = make_config(Address::generate(&env));
            storage::add_oracle_config(&env, &config).unwrap();
            if first.is_none() {
                first = Some(config);
            }
        }

        // Updating an already-registered oracle must not hit the cap.
        let mut updated = first.unwrap();
        updated.is_active = false;
        updated.max_age_seconds = 600;
        assert!(storage::update_oracle_config(&env, &updated).is_ok());

        // The update is persisted and the address list is unchanged.
        let stored = storage::get_oracle_config(&env, &updated.oracle_address).unwrap();
        assert!(!stored.is_active);
        assert_eq!(stored.max_age_seconds, 600);
        assert_eq!(
            storage::get_oracle_addresses(&env).len(),
            MAX_ORACLE_CONFIGS
        );
    });
}

#[test]
fn removing_an_oracle_frees_a_slot() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);

    env.as_contract(&cid, || {
        let mut first = None;
        for _ in 0..MAX_ORACLE_CONFIGS {
            let config = make_config(Address::generate(&env));
            storage::add_oracle_config(&env, &config).unwrap();
            if first.is_none() {
                first = Some(config);
            }
        }

        // Removing one oracle allows a new one to be registered.
        let removed = first.unwrap();
        storage::remove_oracle_config(&env, &removed.oracle_address).unwrap();
        let replacement = make_config(Address::generate(&env));
        assert!(storage::add_oracle_config(&env, &replacement).is_ok());
        assert_eq!(
            storage::get_oracle_addresses(&env).len(),
            MAX_ORACLE_CONFIGS
        );
    });
}
