#![cfg(test)]

//! Tests for `convert_reward_amount` — verifies that the conversion uses the
//! actual decimal count reported by the oracle feed rather than the old
//! hardcoded 7-decimal assumption.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, U256};

extern crate earn_quest;
use earn_quest::types::{OracleConfig, OracleType, PriceData};
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

// ─── Minimal mock oracle ────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MockState {
    Data(PriceData),
    None,
}

#[contract]
pub struct MockOracle;

#[contractimpl]
impl MockOracle {
    /// Store a `PriceData` keyed by (base, quote).
    pub fn set_price(env: Env, base: Address, quote: Address, data: PriceData) {
        env.storage()
            .instance()
            .set(&(base, quote), &MockState::Data(data));
    }

    pub fn lastprice(env: Env, base: Address, quote: Address) -> Option<PriceData> {
        match env
            .storage()
            .instance()
            .get::<_, MockState>(&(base, quote))
        {
            Some(MockState::Data(d)) => Some(d),
            _ => None,
        }
    }

    pub fn price(env: Env, base: Address, quote: Address) -> Option<PriceData> {
        Self::lastprice(env, base, quote)
    }
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

fn setup_earn_quest(env: &Env) -> (Address, EarnQuestContractClient<'_>) {
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &cid);
    (cid, client)
}

/// Register a mock oracle and prime it with a price for (base, quote).
fn setup_oracle_with_price(
    env: &Env,
    client: &EarnQuestContractClient<'_>,
    admin: &Address,
    base: &Address,
    quote: &Address,
    price: u128,
    decimals: u32,
) {
    let oracle_cid = env.register_contract(None, MockOracle);
    let oracle_client = MockOracleClient::new(env, &oracle_cid);

    let ts = env.ledger().timestamp();
    oracle_client.set_price(
        base,
        quote,
        &PriceData {
            base_asset: base.clone(),
            quote_asset: quote.clone(),
            price: U256::from_u128(env, price),
            decimals,
            timestamp: ts,
            confidence: 90,
        },
    );

    client.add_oracle(
        admin,
        &OracleConfig {
            oracle_address: oracle_cid,
            oracle_type: OracleType::StellarOracle,
            max_age_seconds: 600,
            min_confidence: 80,
            is_active: true,
        },
    );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

/// Same asset — amount should pass through unchanged, no oracle needed.
#[test]
fn test_same_asset_passthrough() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let asset = Address::generate(&env);
    let result = client.convert_reward_amount(&asset, &asset, &500);
    assert_eq!(result, 500, "same-asset conversion must be identity");
}

/// 7-decimal price feed (the original Stellar default).
/// price = 2_000_000_0 (i.e. 2.0 with 7 decimal places)
/// amount = 1_000_000_0 (i.e. 1.0 tokens)
/// expected output ≈ 1_000_000_0 * 2_000_000_0 / 10^7 = 2_000_000_0
#[test]
fn test_7_decimal_token_conversion() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // price = 2.0 expressed in 7 decimals → 20_000_000
    setup_oracle_with_price(&env, &client, &admin, &from, &to, 20_000_000, 7);

    let amount = 10_000_000i128; // 1.0 token (7 decimals)
    let result = client.convert_reward_amount(&from, &to, &amount);
    // 10_000_000 * 20_000_000 / 10^7 = 20_000_000
    assert_eq!(result, 20_000_000, "7-decimal: expected 2× output");
}

/// 6-decimal price feed (e.g. USDC).
/// price = 2_000_000 (i.e. 2.0 with 6 decimal places)
/// amount = 5_000_000 (i.e. 5.0 tokens)
/// expected output = 5_000_000 * 2_000_000 / 10^6 = 10_000_000
#[test]
fn test_6_decimal_token_conversion() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // price = 2.0 expressed in 6 decimals → 2_000_000
    setup_oracle_with_price(&env, &client, &admin, &from, &to, 2_000_000, 6);

    let amount = 5_000_000i128; // 5.0 tokens (6 decimals)
    let result = client.convert_reward_amount(&from, &to, &amount);
    // 5_000_000 * 2_000_000 / 10^6 = 10_000_000
    assert_eq!(result, 10_000_000, "6-decimal: expected 2× output");
}

/// 8-decimal price feed (e.g. WBTC).
/// price = 300_000_000 (i.e. 3.0 with 8 decimal places)
/// amount = 100_000_000 (i.e. 1.0 token)
/// expected output = 100_000_000 * 300_000_000 / 10^8 = 300_000_000
#[test]
fn test_8_decimal_token_conversion() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // price = 3.0 expressed in 8 decimals → 300_000_000
    setup_oracle_with_price(&env, &client, &admin, &from, &to, 300_000_000, 8);

    let amount = 100_000_000i128; // 1.0 token (8 decimals)
    let result = client.convert_reward_amount(&from, &to, &amount);
    // 100_000_000 * 300_000_000 / 10^8 = 300_000_000
    assert_eq!(result, 300_000_000, "8-decimal: expected 3× output");
}

/// Regression guard: ensure the old hardcoded 7-decimal divisor (10_000_000)
/// would have produced a WRONG result for a 6-decimal feed, proving the fix
/// is necessary.
///
/// With 6-decimal price = 2_000_000 and amount = 5_000_000:
///   Correct  (÷ 10^6): 5_000_000 * 2_000_000 / 1_000_000 = 10_000_000
///   Old wrong (÷ 10^7): 5_000_000 * 2_000_000 / 10_000_000 = 1_000_000  ← off by 10×
#[test]
fn test_6_decimal_would_be_wrong_with_hardcoded_7() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    setup_oracle_with_price(&env, &client, &admin, &from, &to, 2_000_000, 6);

    let amount = 5_000_000i128;
    let result = client.convert_reward_amount(&from, &to, &amount);

    // The correct answer is 10_000_000; the old buggy answer would have been 1_000_000.
    assert_ne!(
        result, 1_000_000,
        "regression: result must NOT equal the old hardcoded-7-decimal wrong value"
    );
    assert_eq!(result, 10_000_000, "result must equal the correct 6-decimal value");
}

/// 1:1 price in 6 decimals — amount should be returned unchanged.
#[test]
fn test_1_to_1_price_6_decimals() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (_, client) = setup_earn_quest(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // price = 1.0 in 6 decimals → 1_000_000
    setup_oracle_with_price(&env, &client, &admin, &from, &to, 1_000_000, 6);

    let amount = 7_500_000i128;
    let result = client.convert_reward_amount(&from, &to, &amount);
    assert_eq!(result, 7_500_000, "1:1 price should preserve the amount");
}
