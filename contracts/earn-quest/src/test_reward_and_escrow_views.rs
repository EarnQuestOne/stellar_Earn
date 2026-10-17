//! Tests for:
//!   * Maximum reward-amount validation on quest registration (implausibly
//!     large rewards are rejected with `Error::AmountTooLarge`, the boundary
//!     value is accepted, and a zero reward is rejected).
//!   * The read-only escrow views: `get_escrow_balance` (remaining) and the new
//!     `get_escrow_total_deposited` (cumulative deposits), including that a
//!     payout reduces the remaining balance while leaving total-deposited
//!     unchanged.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, token, Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;
use crate::types::EscrowBalances;
use crate::validation::MAX_REWARD_AMOUNT;
use crate::{EarnQuestContract, EarnQuestContractClient};

fn make_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

struct TestCtx<'a> {
    env: Env,
    client: EarnQuestContractClient<'a>,
    contract_id: Address,
    creator: Address,
    verifier: Address,
    token: Address,
    token_admin: token::StellarAssetClient<'a>,
}

fn setup() -> TestCtx<'static> {
    let env = make_env();
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let token_admin_addr = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(token_admin_addr);
    let token = token_contract_obj.address();
    let token_admin = token::StellarAssetClient::new(&env, &token);

    TestCtx {
        env,
        client,
        contract_id,
        creator,
        verifier,
        token,
        token_admin,
    }
}

fn register_with_reward(ctx: &TestCtx, quest_id: &Symbol, reward: i128) {
    let deadline = ctx.env.ledger().timestamp() + 86_400;
    ctx.client.register_quest(
        quest_id,
        &ctx.creator,
        &ctx.token,
        &reward,
        &ctx.verifier,
        &deadline,
    );
}

fn as_contract<T>(ctx: &TestCtx, f: impl FnOnce() -> T) -> T {
    ctx.env.as_contract(&ctx.contract_id, f)
}

// ── Maximum reward validation on registration ─────────────────────────────

#[test]
fn test_register_quest_rejects_reward_above_max() {
    let ctx = setup();
    let qid = symbol_short!("q_over");
    let deadline = ctx.env.ledger().timestamp() + 86_400;

    let result = ctx.client.try_register_quest(
        &qid,
        &ctx.creator,
        &ctx.token,
        &(MAX_REWARD_AMOUNT + 1),
        &ctx.verifier,
        &deadline,
    );
    assert_eq!(result, Err(Ok(Error::AmountTooLarge)));
}

#[test]
fn test_register_quest_accepts_reward_at_max_boundary() {
    let ctx = setup();
    let qid = symbol_short!("q_max");
    register_with_reward(&ctx, &qid, MAX_REWARD_AMOUNT);

    let quest = ctx.client.get_quest(&qid);
    assert_eq!(quest.reward_amount, MAX_REWARD_AMOUNT);
}

#[test]
fn test_register_quest_rejects_zero_reward() {
    let ctx = setup();
    let qid = symbol_short!("q_zero");
    let deadline = ctx.env.ledger().timestamp() + 86_400;

    let result = ctx.client.try_register_quest(
        &qid,
        &ctx.creator,
        &ctx.token,
        &0i128,
        &ctx.verifier,
        &deadline,
    );
    assert_eq!(result, Err(Ok(Error::InvalidRewardAmount)));
}

// ── Escrow views: remaining vs total deposited ────────────────────────────

#[test]
fn test_escrow_total_deposited_matches_deposit() {
    let ctx = setup();
    let qid = symbol_short!("q_esc");
    register_with_reward(&ctx, &qid, 1_000i128);

    ctx.token_admin.mint(&ctx.creator, &5_000i128);
    ctx.client
        .deposit_escrow(&qid, &ctx.creator, &ctx.token, &5_000i128);

    assert_eq!(ctx.client.get_escrow_balance(&qid), 5_000i128);
    assert_eq!(ctx.client.get_escrow_total_deposited(&qid), 5_000i128);
}

#[test]
fn test_total_deposited_unchanged_by_payout() {
    let ctx = setup();
    let qid = symbol_short!("q_pay");
    register_with_reward(&ctx, &qid, 1_000i128);

    // Seed escrow accounting so that some funds have already been paid out:
    // remaining = 1_000 - 300 = 700, but total_deposited stays 1_000.
    as_contract(&ctx, || {
        storage::set_escrow_balances(
            &ctx.env,
            &qid,
            &EscrowBalances {
                total_deposited: 1_000,
                total_paid_out: 300,
                total_refunded: 0,
                is_active: true,
                deposit_count: 1,
            },
        );
    });

    assert_eq!(ctx.client.get_escrow_balance(&qid), 700i128);
    assert_eq!(ctx.client.get_escrow_total_deposited(&qid), 1_000i128);
}
