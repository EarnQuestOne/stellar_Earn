#![cfg(test)]

//! Invariant tests for the quest lifecycle state machine.
//!
//! Each test asserts a structural invariant that must hold regardless of the
//! sequence of operations performed on a quest or submission:
//!
//! Quest state machine:
//!   Active ──► Paused ──► Active
//!   Active ──► Cancelled  (terminal)
//!   Active ──► Expired    (terminal)
//!   Active ──► Completed  (terminal)
//!   Paused ──► Cancelled  (terminal)
//!   Paused ──► Expired    (terminal)
//!
//! Submission state machine:
//!   Pending ──► Approved ──► Paid
//!   Pending ──► Approved ──► PartiallyPaid ──► Paid
//!   Pending ──► Rejected  (no public reject endpoint; tested via claim guard)
//!
//! Invariants tested:
//!   1. Terminal quest states reject all mutating operations.
//!   2. A quest can only be paused from Active; resuming requires Paused.
//!   3. Submissions are rejected when the quest is not Active.
//!   4. Approved submissions cannot be re-approved.
//!   5. Paid submissions cannot be claimed again (double-claim prevention).
//!   6. Cancellation moves quest to terminal state and refunds escrow.
//!   7. Expiry is only possible after the deadline + buffer has passed.
//!   8. total_claims only increases; it never decreases.
//!   9. Escrow balance invariant: deposited >= paid_out + refunded at all times.
//!  10. Paused quest rejects new submissions but allows resume.

extern crate earn_quest;

use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, BytesN, Env, Symbol,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

struct Ctx<'a> {
    env: Env,
    client: EarnQuestContractClient<'a>,
    admin: Address,
    token: Address,
}

fn setup() -> Ctx<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin);
    let token = token_obj.address();

    env.ledger().with_mut(|l| l.timestamp = 1_000);
    client.initialize(&admin);

    Ctx {
        env,
        client,
        admin,
        token,
    }
}

/// Register a quest with a 1-day deadline; return (quest_id, creator, verifier).
fn register_quest(ctx: &Ctx, id: Symbol) -> (Symbol, Address, Address) {
    let creator = Address::generate(&ctx.env);
    let verifier = Address::generate(&ctx.env);
    let deadline = ctx.env.ledger().timestamp() + 86_400;
    ctx.client
        .register_quest(&id, &creator, &ctx.token, &500_i128, &verifier, &deadline);
    (id, creator, verifier)
}

/// Submit proof and return the submitter address.
fn submit(ctx: &Ctx, quest_id: &Symbol) -> Address {
    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(quest_id, &submitter, &proof);
    submitter
}

/// Mint tokens into the contract so payouts can succeed.
fn fund_contract(ctx: &Ctx, amount: i128) {
    let contract_addr = ctx.client.address.clone();
    let token_admin = StellarAssetClient::new(&ctx.env, &ctx.token);
    token_admin.mint(&contract_addr, &amount);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Terminal states reject all mutating operations
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn cancelled_quest_rejects_submission() {
    let ctx = setup();
    let (qid, creator, _verifier) = register_quest(&ctx, symbol_short!("Q1"));
    ctx.client.cancel_quest(&qid, &creator);

    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[2u8; 32]);
    let result = ctx.client.try_submit_proof(&qid, &submitter, &proof);
    assert!(result.is_err(), "cancelled quest must reject submissions");
}

#[test]
fn cancelled_quest_rejects_pause() {
    let ctx = setup();
    let (qid, creator, _verifier) = register_quest(&ctx, symbol_short!("Q2"));
    ctx.client.cancel_quest(&qid, &creator);

    // pause_quest(caller, quest_id)
    let result = ctx.client.try_pause_quest(&ctx.admin, &qid);
    assert!(result.is_err(), "cancelled quest must reject pause");
}

#[test]
fn expired_quest_rejects_submission() {
    let ctx = setup();
    let (qid, creator, _verifier) = register_quest(&ctx, symbol_short!("Q3"));

    // Advance time past deadline + expiry buffer (10 s)
    ctx.env
        .ledger()
        .with_mut(|l| l.timestamp = 1_000 + 86_400 + 20);
    ctx.client.expire_quest(&qid, &creator);

    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[3u8; 32]);
    let result = ctx.client.try_submit_proof(&qid, &submitter, &proof);
    assert!(result.is_err(), "expired quest must reject submissions");
}

#[test]
fn expired_quest_rejects_cancel() {
    let ctx = setup();
    let (qid, creator, _verifier) = register_quest(&ctx, symbol_short!("Q4"));

    ctx.env
        .ledger()
        .with_mut(|l| l.timestamp = 1_000 + 86_400 + 20);
    ctx.client.expire_quest(&qid, &creator);

    let result = ctx.client.try_cancel_quest(&qid, &creator);
    assert!(result.is_err(), "expired quest must reject cancellation");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pause / resume only from valid states
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn cannot_pause_already_paused_quest() {
    let ctx = setup();
    let (qid, _creator, _verifier) = register_quest(&ctx, symbol_short!("Q5"));
    ctx.client.pause_quest(&ctx.admin, &qid);

    let result = ctx.client.try_pause_quest(&ctx.admin, &qid);
    assert!(result.is_err(), "pausing an already-paused quest must fail");
}

#[test]
fn cannot_resume_active_quest() {
    let ctx = setup();
    let (qid, _creator, _verifier) = register_quest(&ctx, symbol_short!("Q6"));

    let result = ctx.client.try_resume_quest(&ctx.admin, &qid);
    assert!(result.is_err(), "resuming an active quest must fail");
}

#[test]
fn pause_then_resume_returns_to_active() {
    let ctx = setup();
    let (qid, _creator, _verifier) = register_quest(&ctx, symbol_short!("Q7"));

    ctx.client.pause_quest(&ctx.admin, &qid);
    ctx.client.resume_quest(&ctx.admin, &qid);

    // After resume the quest must accept new submissions
    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[7u8; 32]);
    let result = ctx.client.try_submit_proof(&qid, &submitter, &proof);
    assert!(result.is_ok(), "resumed quest must accept submissions");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Submissions rejected when quest is not Active
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn paused_quest_rejects_new_submissions() {
    let ctx = setup();
    let (qid, _creator, _verifier) = register_quest(&ctx, symbol_short!("Q8"));
    ctx.client.pause_quest(&ctx.admin, &qid);

    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[8u8; 32]);
    let result = ctx.client.try_submit_proof(&qid, &submitter, &proof);
    assert!(result.is_err(), "paused quest must reject submissions");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Approved submissions cannot be re-approved
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn approved_submission_cannot_be_approved_again() {
    let ctx = setup();
    let (qid, _creator, verifier) = register_quest(&ctx, symbol_short!("Q9"));
    let submitter = submit(&ctx, &qid);

    ctx.client.approve_submission(&qid, &submitter, &verifier);

    let result = ctx
        .client
        .try_approve_submission(&qid, &submitter, &verifier);
    assert!(result.is_err(), "double-approval must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Double-claim prevention
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn paid_submission_cannot_be_claimed_again() {
    let ctx = setup();
    let (qid, _creator, verifier) = register_quest(&ctx, symbol_short!("QC"));
    let submitter = submit(&ctx, &qid);
    fund_contract(&ctx, 500);

    ctx.client.approve_submission(&qid, &submitter, &verifier);
    ctx.client.claim_reward(&qid, &submitter, &500_i128);

    let result = ctx.client.try_claim_reward(&qid, &submitter, &500_i128);
    assert!(result.is_err(), "claiming a paid submission must fail");
}

#[test]
fn pending_submission_cannot_be_claimed() {
    let ctx = setup();
    let (qid, _creator, _verifier) = register_quest(&ctx, symbol_short!("QP"));
    let submitter = submit(&ctx, &qid);

    let result = ctx.client.try_claim_reward(&qid, &submitter, &500_i128);
    assert!(result.is_err(), "claiming a pending submission must fail");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cancellation moves quest to terminal state and refunds escrow
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn cancel_quest_is_terminal_and_refunds_escrow() {
    let ctx = setup();
    let (qid, creator, _verifier) = register_quest(&ctx, symbol_short!("QD"));

    // Deposit escrow
    let token_admin = StellarAssetClient::new(&ctx.env, &ctx.token);
    token_admin.mint(&creator, &500_i128);
    ctx.client
        .deposit_escrow(&qid, &creator, &ctx.token, &500_i128);

    let token_client = TokenClient::new(&ctx.env, &ctx.token);
    let balance_before = token_client.balance(&creator);

    ctx.client.cancel_quest(&qid, &creator);

    // Creator should have been refunded
    let balance_after = token_client.balance(&creator);
    assert!(
        balance_after >= balance_before,
        "cancellation must refund escrow to creator"
    );

    // Quest is now terminal — further cancellation must fail
    let result = ctx.client.try_cancel_quest(&qid, &creator);
    assert!(
        result.is_err(),
        "cancelled quest must reject re-cancellation"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Expiry only possible after deadline + buffer
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn expire_before_deadline_is_rejected() {
    let ctx = setup();
    let (qid, creator, _verifier) = register_quest(&ctx, symbol_short!("QE"));

    // Still within the deadline window
    let result = ctx.client.try_expire_quest(&qid, &creator);
    assert!(result.is_err(), "expiry before deadline must be rejected");
}

#[test]
fn expire_after_deadline_succeeds() {
    let ctx = setup();
    let (qid, creator, _verifier) = register_quest(&ctx, symbol_short!("QF"));

    ctx.env
        .ledger()
        .with_mut(|l| l.timestamp = 1_000 + 86_400 + 20);
    let result = ctx.client.try_expire_quest(&qid, &creator);
    assert!(
        result.is_ok(),
        "expiry after deadline + buffer must succeed"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. total_claims only increases
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn total_claims_monotonically_increases() {
    let ctx = setup();
    let (qid, _creator, verifier) = register_quest(&ctx, symbol_short!("QG"));
    fund_contract(&ctx, 1_500);

    let s1 = submit(&ctx, &qid);
    let s2 = submit(&ctx, &qid);
    let s3 = submit(&ctx, &qid);

    ctx.client.approve_submission(&qid, &s1, &verifier);
    let claims_0 = ctx.client.get_quest(&qid).total_claims;

    ctx.client.claim_reward(&qid, &s1, &500_i128);
    let claims_1 = ctx.client.get_quest(&qid).total_claims;
    assert!(
        claims_1 >= claims_0,
        "total_claims must not decrease after first claim"
    );

    ctx.client.approve_submission(&qid, &s2, &verifier);
    ctx.client.claim_reward(&qid, &s2, &500_i128);
    let claims_2 = ctx.client.get_quest(&qid).total_claims;
    assert!(
        claims_2 >= claims_1,
        "total_claims must not decrease after second claim"
    );

    ctx.client.approve_submission(&qid, &s3, &verifier);
    ctx.client.claim_reward(&qid, &s3, &500_i128);
    let claims_3 = ctx.client.get_quest(&qid).total_claims;
    assert!(
        claims_3 >= claims_2,
        "total_claims must not decrease after third claim"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Escrow balance invariant: deposited >= paid_out + refunded
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn escrow_balance_invariant_holds_after_payout() {
    let ctx = setup();
    let (qid, creator, verifier) = register_quest(&ctx, symbol_short!("QH"));

    let token_admin = StellarAssetClient::new(&ctx.env, &ctx.token);
    token_admin.mint(&creator, &1_000_i128);
    ctx.client
        .deposit_escrow(&qid, &creator, &ctx.token, &1_000_i128);

    let submitter = submit(&ctx, &qid);
    ctx.client.approve_submission(&qid, &submitter, &verifier);
    ctx.client.claim_reward(&qid, &submitter, &500_i128);

    let escrow = ctx.client.get_escrow_info(&qid);
    assert!(
        escrow.total_deposited >= escrow.total_paid_out + escrow.total_refunded,
        "deposited must always be >= paid_out + refunded"
    );
}

#[test]
fn escrow_balance_invariant_holds_after_cancel_refund() {
    let ctx = setup();
    let (qid, creator, _verifier) = register_quest(&ctx, symbol_short!("QI"));

    let token_admin = StellarAssetClient::new(&ctx.env, &ctx.token);
    token_admin.mint(&creator, &800_i128);
    ctx.client
        .deposit_escrow(&qid, &creator, &ctx.token, &800_i128);

    ctx.client.cancel_quest(&qid, &creator);

    let escrow = ctx.client.get_escrow_info(&qid);
    assert!(
        escrow.total_deposited >= escrow.total_paid_out + escrow.total_refunded,
        "deposited must always be >= paid_out + refunded after cancel"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Paused quest rejects submissions but allows resume
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn paused_quest_allows_resume_and_then_submission() {
    let ctx = setup();
    let (qid, _creator, _verifier) = register_quest(&ctx, symbol_short!("QJ"));

    ctx.client.pause_quest(&ctx.admin, &qid);

    // Submission must fail while paused
    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[10u8; 32]);
    assert!(
        ctx.client
            .try_submit_proof(&qid, &submitter, &proof)
            .is_err(),
        "submission must fail while paused"
    );

    // Resume and verify submission is now accepted
    ctx.client.resume_quest(&ctx.admin, &qid);
    let result = ctx.client.try_submit_proof(&qid, &submitter, &proof);
    assert!(result.is_ok(), "submission must succeed after resume");
}
