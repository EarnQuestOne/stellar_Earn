//! Tests: the quest creator is prevented from approving submissions on their own
//! quest (issue #2287).
//!
//! The contract already enforces `creator != verifier` at quest registration, so
//! this guard is defense-in-depth for any state where `verifier == creator`
//! (e.g. a later verifier update, or legacy data). The tests force that state via
//! `storage::set_quest` (the same technique used by the corruption probes) to
//! exercise the guard directly.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, Address, BytesN, Env, Symbol};

use crate::errors::Error;
use crate::storage;
use crate::types::{BatchApprovalInput, SubmissionStatus};
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

    TestCtx {
        env,
        client,
        contract_id,
        creator,
        verifier,
        submitter,
        token,
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

/// Force the stored quest so that `verifier == creator` (the self-approval case).
/// `register_quest` forbids this, so we override the persisted quest directly,
/// mirroring the corruption-probe tests.
fn set_verifier_to_creator(ctx: &TestCtx, quest_id: &Symbol) {
    ctx.env.as_contract(&ctx.contract_id, || {
        let mut quest = storage::get_quest(&ctx.env, quest_id).unwrap();
        quest.verifier = quest.creator.clone();
        storage::set_quest(&ctx.env, quest_id, &quest);
    });
}

fn as_contract<T>(ctx: &TestCtx, f: impl FnOnce() -> T) -> T {
    ctx.env.as_contract(&ctx.contract_id, f)
}

fn submit(ctx: &TestCtx, quest_id: &Symbol) {
    let proof = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(quest_id, &ctx.submitter, &proof);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. A legitimate, distinct verifier can still approve (no regression)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_distinct_verifier_can_approve() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);
    submit(&ctx, &qid);

    // Non-try call panics on contract error, so reaching the next line proves the
    // approval succeeded.
    ctx.client
        .approve_submission(&qid, &ctx.submitter, &ctx.verifier);

    let sub = as_contract(&ctx, || {
        storage::get_submission(&ctx.env, &qid, &ctx.submitter)
    })
    .unwrap();
    assert_eq!(sub.status, SubmissionStatus::Approved);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. The quest creator may not approve submissions on their own quest
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_creator_cannot_self_approve() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);
    set_verifier_to_creator(&ctx, &qid);
    submit(&ctx, &qid);

    let result = as_contract(&ctx, || {
        crate::submission::approve_submission(&ctx.env, &qid, &ctx.submitter, &ctx.creator)
    });
    assert_eq!(result, Err(Error::SelfApprovalDisallowed));

    // State is unchanged: the submission remains pending.
    let sub = as_contract(&ctx, || {
        storage::get_submission(&ctx.env, &qid, &ctx.submitter)
    })
    .unwrap();
    assert_eq!(sub.status, SubmissionStatus::Pending);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Batch self-approval by the creator is also rejected
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_creator_cannot_self_approve_batch() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);
    set_verifier_to_creator(&ctx, &qid);
    submit(&ctx, &qid);

    let submissions = soroban_sdk::Vec::from_array(&ctx.env, [ctx.submitter.clone()]);
    let batch = soroban_sdk::Vec::from_array(
        &ctx.env,
        [BatchApprovalInput {
            quest_id: qid.clone(),
            submissions,
        }],
    );

    let result = as_contract(&ctx, || {
        crate::submission::approve_submissions_batch(&ctx.env, &ctx.creator, &batch)
    });
    assert_eq!(result, Err(Error::SelfApprovalDisallowed));

    let sub = as_contract(&ctx, || {
        storage::get_submission(&ctx.env, &qid, &ctx.submitter)
    })
    .unwrap();
    assert_eq!(sub.status, SubmissionStatus::Pending);
}
