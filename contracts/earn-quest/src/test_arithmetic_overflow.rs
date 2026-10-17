//! Tests: explicit checked arithmetic on financial fields (escrow / payout /
//! claim paths) returns graceful `Error` variants on overflow/underflow instead
//! of relying on the release-profile `overflow-checks` backstop (which aborts
//! the whole transaction).
//!
//! Coverage:
//!   1. `deposit_escrow`: cumulative deposits landing exactly on `i128::MAX`
//!      succeed (near-overflow boundary); a further deposit returns
//!      `Error::ArithmeticOverflow`.
//!   2. `record_payout`: paying out exactly the remaining balance at
//!      `i128::MAX` succeeds; corrupted accounting (paid_out > deposited)
//!      yields `Error::ArithmeticUnderflow` instead of a panic.
//!   3. `slash_verifier_stake`: bps-multiplication overflow and remainder
//!      underflow return graceful errors.
//!   4. `claim_reward`: claiming exactly up to `i128::MAX` succeeds without a
//!      panic (the claim path is bounded by `validate_claim_amount`, so the
//!      `checked_add` there is defense-in-depth).
//!   5. `increment_quest_claims`: `total_claims` at `u32::MAX` returns
//!      `Error::ArithmeticOverflow`.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, token, Address, BytesN, Env, Symbol};

use crate::errors::Error;
use crate::storage;
use crate::types::{EscrowBalances, SubmissionStatus, VerifierStake};
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
    submitter: Address,
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
    let submitter = Address::generate(&env);

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
        submitter,
        token,
        token_admin,
    }
}

fn register_quest(ctx: &TestCtx, quest_id: &Symbol) {
    let deadline = ctx.env.ledger().timestamp() + 86_400;
    ctx.client.register_quest(
        quest_id,
        &ctx.creator,
        &ctx.token,
        &1000i128,
        &ctx.verifier,
        &deadline,
    );
}

/// Runs a closure in the contract's invocation context so instance-storage
/// access (and module functions that touch it) is allowed, mirroring the
/// pattern used across the repo's tests.
fn as_contract<T>(ctx: &TestCtx, f: impl FnOnce() -> T) -> T {
    ctx.env.as_contract(&ctx.contract_id, f)
}

// ──────────────────────────────────────────────────────────────────────────
// 1. deposit_escrow: near-overflow boundary + overflow → graceful error
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_deposit_escrow_near_max_then_overflow_returns_graceful_error() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    // Seed the escrow accounting ledger near the boundary (the creator's token
    // balance is separate from the contract's cumulative deposit counter).
    as_contract(&ctx, || {
        storage::set_escrow_balances(
            &ctx.env,
            &qid,
            &EscrowBalances {
                total_deposited: i128::MAX - 10_000,
                total_paid_out: 0,
                total_refunded: 0,
                is_active: true,
                deposit_count: 1,
            },
        );
    });
    // Fund the creator for the real token transfer leg of the boundary deposit.
    ctx.token_admin.mint(&ctx.creator, &20_000i128);

    // A deposit of the exact remaining amount lands total_deposited on i128::MAX
    // (near-overflow boundary) and succeeds through the full transfer path.
    ctx.client
        .deposit_escrow(&qid, &ctx.creator, &ctx.token, &10_000i128);

    let balances = as_contract(&ctx, || storage::get_escrow_balances(&ctx.env, &qid)).unwrap();
    assert_eq!(balances.total_deposited, i128::MAX);
    assert_eq!(balances.deposit_count, 2);

    // A third deposit would push total_deposited past i128::MAX: the checked_add
    // guard returns a graceful error instead of a panic.
    let result = ctx
        .client
        .try_deposit_escrow(&qid, &ctx.creator, &ctx.token, &10_000i128);
    assert_eq!(result, Err(Ok(Error::ArithmeticOverflow)));

    // State is unchanged after the rejected deposit.
    let balances = as_contract(&ctx, || storage::get_escrow_balances(&ctx.env, &qid)).unwrap();
    assert_eq!(balances.total_deposited, i128::MAX);
    assert_eq!(balances.deposit_count, 2);
}

// ──────────────────────────────────────────────────────────────────────────
// 2. record_payout: boundary success + corrupted-accounting underflow
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_record_payout_at_max_boundary_succeeds() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    // total_deposited at i128::MAX with exactly 10_000 left to pay out.
    as_contract(&ctx, || {
        storage::set_escrow_balances(
            &ctx.env,
            &qid,
            &EscrowBalances {
                total_deposited: i128::MAX,
                total_paid_out: i128::MAX - 10_000,
                total_refunded: 0,
                is_active: true,
                deposit_count: 1,
            },
        );
    });

    // Paying out the exact remaining balance succeeds (boundary, no overflow).
    as_contract(&ctx, || {
        crate::escrow::record_payout(&ctx.env, &qid, &ctx.submitter, &ctx.token, 10_000i128)
            .unwrap();
    });

    let balances = as_contract(&ctx, || storage::get_escrow_balances(&ctx.env, &qid)).unwrap();
    assert_eq!(balances.total_paid_out, i128::MAX);

    // Nothing left to pay out → InsufficientEscrow (still a graceful error).
    let result = as_contract(&ctx, || {
        crate::escrow::record_payout(&ctx.env, &qid, &ctx.submitter, &ctx.token, 1i128)
    });
    assert_eq!(result, Err(Error::InsufficientEscrow));
}

#[test]
fn test_corrupted_escrow_accounting_returns_underflow_not_panic() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    // Simulate accounting so far outside the representable range that the
    // available-balance subtraction itself cannot be expressed in i128.
    as_contract(&ctx, || {
        storage::set_escrow_balances(
            &ctx.env,
            &qid,
            &EscrowBalances {
                total_deposited: 100,
                total_paid_out: i128::MAX,
                total_refunded: i128::MAX,
                is_active: true,
                deposit_count: 1,
            },
        );
    });

    // available_balance underflows → graceful error instead of a panic.
    let result = as_contract(&ctx, || crate::escrow::get_balance(&ctx.env, &qid));
    assert_eq!(result, Err(Error::ArithmeticUnderflow));

    // The payout path surfaces the same error before any transfer.
    let result = as_contract(&ctx, || {
        crate::escrow::record_payout(&ctx.env, &qid, &ctx.submitter, &ctx.token, 10i128)
    });
    assert_eq!(result, Err(Error::ArithmeticUnderflow));
}

// ──────────────────────────────────────────────────────────────────────────
// 3. slash_verifier_stake: multiplication overflow + remainder underflow
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_slash_stake_multiply_overflow_returns_graceful_error() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    as_contract(&ctx, || {
        storage::set_verifier_stake(
            &ctx.env,
            &qid,
            &ctx.verifier,
            &VerifierStake {
                token: ctx.token.clone(),
                amount: u128::MAX,
                is_active: true,
            },
        );
    });

    // amount * bps overflows u128 before the /10_000 division.
    let result = as_contract(&ctx, || {
        crate::escrow::slash_verifier_stake(&ctx.env, &qid, &ctx.verifier, 10_000, &ctx.submitter)
    });
    assert_eq!(result, Err(Error::ArithmeticOverflow));
}

#[test]
fn test_slash_stake_remainder_underflow_returns_graceful_error() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    as_contract(&ctx, || {
        storage::set_verifier_stake(
            &ctx.env,
            &qid,
            &ctx.verifier,
            &VerifierStake {
                token: ctx.token.clone(),
                amount: 100,
                is_active: true,
            },
        );
    });

    // 20_000 bps = 200%: the computed slash exceeds the stake, so the remainder
    // would go negative → checked_sub returns a graceful error.
    let result = as_contract(&ctx, || {
        crate::escrow::slash_verifier_stake(&ctx.env, &qid, &ctx.verifier, 20_000, &ctx.submitter)
    });
    assert_eq!(result, Err(Error::ArithmeticUnderflow));
}

// ──────────────────────────────────────────────────────────────────────────
// 4. claim_reward: claimed_amount lands exactly on i128::MAX without a panic
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_claim_reward_at_max_boundary_succeeds() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    // Overwrite the stored reward with a near-max value (bypasses the
    // registration cap — a corruption probe for the claim arithmetic).
    as_contract(&ctx, || {
        let mut quest = storage::get_quest(&ctx.env, &qid).unwrap();
        quest.reward_amount = i128::MAX;
        storage::set_quest(&ctx.env, &qid, &quest);
    });

    // Fund the contract so the payout leg can complete.
    ctx.token_admin.mint(&ctx.contract_id, &500i128);

    let proof = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(&qid, &ctx.submitter, &proof);
    ctx.client
        .approve_submission(&qid, &ctx.submitter, &ctx.verifier);

    // Push claimed_amount near the boundary while keeping claimed <= reward so
    // validation passes: claiming the remaining 500 lands exactly on i128::MAX.
    as_contract(&ctx, || {
        let mut submission = storage::get_submission(&ctx.env, &qid, &ctx.submitter).unwrap();
        submission.claimed_amount = i128::MAX - 500;
        storage::set_submission(&ctx.env, &qid, &ctx.submitter, &submission);
    });

    ctx.client.claim_reward(&qid, &ctx.submitter, &500i128);

    let submission = as_contract(&ctx, || {
        storage::get_submission(&ctx.env, &qid, &ctx.submitter)
    })
    .unwrap();
    assert_eq!(submission.claimed_amount, i128::MAX);
    assert_eq!(submission.status, SubmissionStatus::Paid);

    let quest = as_contract(&ctx, || storage::get_quest(&ctx.env, &qid)).unwrap();
    assert_eq!(quest.total_claims, 1);
}

// ──────────────────────────────────────────────────────────────────────────
// 5. increment_quest_claims: total_claims at u32::MAX → graceful overflow
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_increment_quest_claims_overflow_returns_graceful_error() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    // Corrupt the counter to u32::MAX (defense-in-depth probe: claim_reward's
    // own limit check makes this unreachable via the entrypoint).
    as_contract(&ctx, || {
        let mut quest = storage::get_quest(&ctx.env, &qid).unwrap();
        quest.total_claims = u32::MAX;
        storage::set_quest(&ctx.env, &qid, &quest);
    });

    let result = as_contract(&ctx, || storage::increment_quest_claims(&ctx.env, &qid));
    assert_eq!(result, Err(Error::ArithmeticOverflow));
}
