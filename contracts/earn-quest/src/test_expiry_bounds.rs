#![cfg(test)]

//! Unit tests for quest expiry bounds validation (issue #2284).
//!
//! The quest `deadline` is already bounded by `validate_deadline`
//! (`MIN_DEADLINE_DURATION`..`MAX_DEADLINE_DURATION` relative to the current
//! ledger timestamp). These tests cover the missing half of the expiry path:
//! the grace period that extends the *effective* quest expiry
//! (`deadline + grace_period_seconds`), both at quest registration and when
//! an admin sets the global default grace period.

use crate::errors::Error;
use crate::quest;
use crate::validation::{self, MAX_GRACE_PERIOD_SECONDS};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, Address, Env};

#[test]
fn grace_period_within_bounds_is_accepted() {
    assert!(validation::validate_grace_period(0).is_ok());
    assert!(validation::validate_grace_period(60).is_ok());
    assert!(validation::validate_grace_period(86_400).is_ok()); // 1 day
    assert!(validation::validate_grace_period(MAX_GRACE_PERIOD_SECONDS).is_ok());
}

#[test]
fn grace_period_beyond_max_is_rejected() {
    assert_eq!(
        validation::validate_grace_period(MAX_GRACE_PERIOD_SECONDS + 1),
        Err(Error::GracePeriodTooLarge)
    );
    assert_eq!(
        validation::validate_grace_period(u64::MAX),
        Err(Error::GracePeriodTooLarge)
    );
}

#[test]
fn registering_quest_with_oversized_grace_period_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86_400;

    env.as_contract(&cid, || {
        let result = quest::register_quest_with_category_and_grace_period(
            &env,
            &symbol_short!("Q1"),
            &creator,
            &token,
            1000,
            &verifier,
            deadline,
            Some(MAX_GRACE_PERIOD_SECONDS + 1),
            0,
        );
        assert_eq!(result, Err(Error::GracePeriodTooLarge));
    });
}

#[test]
fn registering_quest_with_bounded_grace_period_is_allowed() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86_400;

    env.as_contract(&cid, || {
        let result = quest::register_quest_with_category_and_grace_period(
            &env,
            &symbol_short!("Q2"),
            &creator,
            &token,
            1000,
            &verifier,
            deadline,
            Some(86_400),
            0,
        );
        assert!(result.is_ok());
    });
}

#[test]
fn admin_setting_oversized_default_grace_period_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);
    let client = crate::EarnQuestContractClient::new(&env, &cid);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let result = client.try_set_quest_grace_period(&admin, &(MAX_GRACE_PERIOD_SECONDS + 1));
    assert!(result.is_err());

    // The default is unchanged after the rejected update.
    assert_eq!(client.get_default_grace_period(), 10);
}

#[test]
fn admin_setting_bounded_default_grace_period_is_allowed() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);
    let client = crate::EarnQuestContractClient::new(&env, &cid);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    client.set_quest_grace_period(&admin, &86_400);
    assert_eq!(client.get_default_grace_period(), 86_400);
}
