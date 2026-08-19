#![cfg(test)]

//! Integration tests for `convert_reward_amount` decimal handling (issue #1947).
//!
//! The conversion must use each asset's actual decimals (SEP-41 `decimals()`)
//! and the oracle price's reported decimals instead of assuming 7 decimals.
//!
//! Test coverage:
//! - Same-asset conversion short-circuits
//! - 7/7 decimals preserves legacy behavior
//! - Source token with 6 decimals
//! - Target token with 18 decimals
//! - Source token with 18 decimals -> target with 6 decimals
//! - Oracle price quoted with 8 decimals (non-7 price quote)
//! - Mixed source/target decimals with non-trivial price

use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, U256};

extern crate earn_quest;
use earn_quest::errors::Error;
use earn_quest::types::{OracleConfig, OracleType, PriceData};
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

//================================================================================
// Mock Contracts
//================================================================================

/// SEP-41 mock token with configurable decimals.
#[contract]
pub struct MockTokenContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MockTokenData {
    Decimals,
}

#[contractimpl]
impl MockTokenContract {
    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&MockTokenData::Decimals)
            .unwrap_or(7)
    }

    pub fn set_decimals(env: Env, decimals: u32) {
        env.storage()
            .instance()
            .set(&MockTokenData::Decimals, &decimals);
    }
}

/// Mock oracle that returns configurable price data for a base/quote pair.
#[contract]
pub struct MockOracleContract;

#[contractimpl]
impl MockOracleContract {
    pub fn set_price_data(
        env: Env,
        base: Address,
        quote: Address,
        price: U256,
        decimals: u32,
        timestamp: u64,
        confidence: u32,
    ) {
        let data = PriceData {
            base_asset: base.clone(),
            quote_asset: quote.clone(),
            price,
            decimals,
            timestamp,
            confidence,
        };
        env.storage().instance().set(&(base, quote), &data);
    }

    pub fn lastprice(env: Env, base: Address, quote: Address) -> Option<PriceData> {
        env.storage().instance().get(&(base, quote))
    }

    pub fn price(env: Env, base: Address, quote: Address) -> Option<PriceData> {
        Self::lastprice(env, base, quote)
    }
}

//================================================================================
// Helpers
//================================================================================

const LEDGER_TIMESTAMP: u64 = 1000;

fn make_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = LEDGER_TIMESTAMP);
    env
}

fn setup(env: &Env) -> (EarnQuestContractClient<'_>, Address) {
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &cid);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

fn deploy_token(env: &Env, decimals: u32) -> Address {
    let id = env.register_contract(None, MockTokenContract);
    let token = MockTokenContractClient::new(env, &id);
    token.set_decimals(&decimals);
    id
}

fn deploy_oracle<'a>(
    env: &'a Env,
    client: &EarnQuestContractClient<'_>,
    admin: &Address,
) -> MockOracleContractClient<'a> {
    let id = env.register_contract(None, MockOracleContract);
    let oracle = MockOracleContractClient::new(env, &id);
    let config = OracleConfig {
        oracle_address: id,
        oracle_type: OracleType::StellarOracle,
        max_age_seconds: 300,
        min_confidence: 80,
        is_active: true,
    };
    client.add_oracle(admin, &config);
    oracle
}

fn set_price(
    env: &Env,
    oracle: &MockOracleContractClient<'_>,
    base: &Address,
    quote: &Address,
    price: u64,
    decimals: u32,
) {
    oracle.set_price_data(
        base,
        quote,
        &U256::from_parts(env, 0, 0, 0, price),
        &decimals,
        &LEDGER_TIMESTAMP,
        &95,
    );
}

//================================================================================
// Tests
//================================================================================

#[test]
fn test_same_asset_returns_amount_unchanged() {
    let env = make_env();
    let (client, _admin) = setup(&env);

    let asset = deploy_token(&env, 18);
    let amount = 123_456_789i128;

    let result = client.convert_reward_amount(&asset, &asset, &amount);
    assert_eq!(result, amount);
}

#[test]
fn test_seven_decimal_conversion_preserves_legacy_behavior() {
    let env = make_env();
    let (client, admin) = setup(&env);
    let oracle = deploy_oracle(&env, &client, &admin);

    let from = deploy_token(&env, 7);
    let to = deploy_token(&env, 7);
    // 1.0 with 7 decimals
    set_price(&env, &oracle, &from, &to, 10_000_000, 7);

    let result = client.convert_reward_amount(&from, &to, &100i128);
    assert_eq!(result, 100);
}

#[test]
fn test_six_decimal_source_to_seven_decimal_target() {
    let env = make_env();
    let (client, admin) = setup(&env);
    let oracle = deploy_oracle(&env, &client, &admin);

    let from = deploy_token(&env, 6);
    let to = deploy_token(&env, 7);
    // 1.0 with 7 decimals
    set_price(&env, &oracle, &from, &to, 10_000_000, 7);

    // 100 minor units (0.000100) at 1.0 -> 0.000100 = 1000 minor units (7 decimals)
    let result = client.convert_reward_amount(&from, &to, &100i128);
    assert_eq!(result, 1000);
}

#[test]
fn test_seven_decimal_source_to_eighteen_decimal_target() {
    let env = make_env();
    let (client, admin) = setup(&env);
    let oracle = deploy_oracle(&env, &client, &admin);

    let from = deploy_token(&env, 7);
    let to = deploy_token(&env, 18);
    // 1.0 with 7 decimals
    set_price(&env, &oracle, &from, &to, 10_000_000, 7);

    // 100 minor units (0.00000001) at 1.0 -> 10^13 minor units (18 decimals)
    let result = client.convert_reward_amount(&from, &to, &100i128);
    assert_eq!(result, 10_000_000_000_000i128);
}

#[test]
fn test_eighteen_decimal_source_to_six_decimal_target() {
    let env = make_env();
    let (client, admin) = setup(&env);
    let oracle = deploy_oracle(&env, &client, &admin);

    let from = deploy_token(&env, 18);
    let to = deploy_token(&env, 6);
    // 300.0 with 7 decimals (e.g. 300 USDC per ETH)
    set_price(&env, &oracle, &from, &to, 3_000_000_000, 7);

    // 1.0 ETH (10^18 minor units) at 300.0 -> 300.0 USDC = 300_000_000 minor units (6 decimals)
    let result = client.convert_reward_amount(&from, &to, &1_000_000_000_000_000_000i128);
    assert_eq!(result, 300_000_000i128);
}

#[test]
fn test_price_with_eight_decimal_quote_is_respected() {
    let env = make_env();
    let (client, admin) = setup(&env);
    let oracle = deploy_oracle(&env, &client, &admin);

    let from = deploy_token(&env, 7);
    let to = deploy_token(&env, 7);
    // 1.0 quoted with 8 decimals
    set_price(&env, &oracle, &from, &to, 100_000_000, 8);

    let result = client.convert_reward_amount(&from, &to, &100i128);
    assert_eq!(result, 100);
}

#[test]
fn test_mixed_decimals_with_non_integer_price() {
    let env = make_env();
    let (client, admin) = setup(&env);
    let oracle = deploy_oracle(&env, &client, &admin);

    let from = deploy_token(&env, 6);
    let to = deploy_token(&env, 18);
    // 0.25 with 7 decimals
    set_price(&env, &oracle, &from, &to, 2_500_000, 7);

    // 100 minor units (0.000100) at 0.25 -> 0.000025 = 2.5 * 10^13 minor units (18 decimals)
    let result = client.convert_reward_amount(&from, &to, &100i128);
    assert_eq!(result, 25_000_000_000_000i128);
}

#[test]
fn test_conversion_with_stellar_asset_contract() {
    let env = make_env();
    let (client, admin) = setup(&env);
    let oracle = deploy_oracle(&env, &client, &admin);

    // Native Stellar asset contracts always use 7 decimals.
    let token_admin = Address::generate(&env);
    let from_sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let to_sac = env.register_stellar_asset_contract_v2(token_admin);
    let from = from_sac.address();
    let to = to_sac.address();

    assert_eq!(token::TokenClient::new(&env, &from).decimals(), 7);
    assert_eq!(token::TokenClient::new(&env, &to).decimals(), 7);

    // 2.5 with 7 decimals
    set_price(&env, &oracle, &from, &to, 25_000_000, 7);

    let result = client.convert_reward_amount(&from, &to, &1000i128);
    assert_eq!(result, 2500);
}

#[test]
fn test_amount_too_large_is_rejected() {
    let env = make_env();
    let (client, admin) = setup(&env);
    let oracle = deploy_oracle(&env, &client, &admin);

    let from = deploy_token(&env, 6);
    let to = deploy_token(&env, 18);
    // Max possible price (7 decimals); to_decimals > from_decimals forces up-scaling.
    set_price(&env, &oracle, &from, &to, u64::MAX, 7);

    // i128::MAX pushed through the up-scaling conversion exceeds u128::MAX,
    // so the AmountTooLarge guard must reject it.
    let result = client.try_convert_reward_amount(&from, &to, &i128::MAX);
    assert_eq!(result, Err(Ok(Error::AmountTooLarge)));
}
