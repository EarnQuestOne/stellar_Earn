//! Unit tests for the reward/oracle-price deviation check used by
//! `validate_reward_with_oracle`.

use crate::check_reward_deviation;
use crate::errors::Error;

#[test]
fn within_tolerance_passes() {
    // Oracle price 1000, reward 1050 -> 5% deviation, 10% allowed.
    assert!(check_reward_deviation(1050, 1000, 10).is_ok());
    assert!(check_reward_deviation(950, 1000, 10).is_ok());
}

#[test]
fn exact_boundary_passes() {
    // Exactly 10% deviation on either side is accepted.
    assert!(check_reward_deviation(1100, 1000, 10).is_ok());
    assert!(check_reward_deviation(900, 1000, 10).is_ok());
}

#[test]
fn exceeding_tolerance_is_rejected() {
    // 20% deviation with 10% allowed.
    assert_eq!(
        check_reward_deviation(1200, 1000, 10),
        Err(Error::RewardDeviationTooHigh)
    );
    // Just over the boundary (10.1%).
    assert_eq!(
        check_reward_deviation(1101, 1000, 10),
        Err(Error::RewardDeviationTooHigh)
    );
}

#[test]
fn zero_percent_rejects_any_difference() {
    assert!(check_reward_deviation(1000, 1000, 0).is_ok());
    assert_eq!(
        check_reward_deviation(1001, 1000, 0),
        Err(Error::RewardDeviationTooHigh)
    );
}

#[test]
fn negative_reward_is_rejected() {
    assert_eq!(
        check_reward_deviation(-1, 1000, 10),
        Err(Error::InvalidRewardAmount)
    );
}

#[test]
fn non_positive_oracle_price_is_rejected() {
    assert_eq!(
        check_reward_deviation(1000, 0, 10),
        Err(Error::InvalidOracleData)
    );
}
