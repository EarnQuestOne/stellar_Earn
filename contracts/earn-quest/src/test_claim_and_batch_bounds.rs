//! Tests for:
//!   * Claiming a zero amount now returns the typed `Error::InvalidClaimAmount`
//!     instead of proceeding silently (#2280).
//!   * Batch approval bounds the *total* number of approvals across all inputs'
//!     inner vectors, rejecting an oversized call with `Error::ArrayTooLong`
//!     (#2279).

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, Address, Env, Symbol, Vec};

use crate::errors::Error;
use crate::types::BatchApprovalInput;
use crate::validation::MAX_BATCH_APPROVAL_TOTAL;
use crate::{EarnQuestContract, EarnQuestContractClient};

fn make_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

struct TestCtx<'a> {
    env: Env,
    client: EarnQuestContractClient<'a>,
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

#[test]
fn test_claim_zero_returns_typed_error() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    let result = ctx.client.try_claim_reward(&qid, &ctx.submitter, &0i128);
    assert_eq!(result, Err(Ok(Error::InvalidClaimAmount)));
}

#[test]
fn test_batch_approval_rejects_oversized_total() {
    let ctx = setup();

    // A single input whose inner submissions vector exceeds the total cap.
    let mut submitters: Vec<Address> = Vec::new(&ctx.env);
    for _ in 0..(MAX_BATCH_APPROVAL_TOTAL + 1) {
        submitters.push_back(Address::generate(&ctx.env));
    }

    let mut batch: Vec<BatchApprovalInput> = Vec::new(&ctx.env);
    batch.push_back(BatchApprovalInput {
        quest_id: symbol_short!("q1"),
        submissions: submitters,
    });

    let result = ctx
        .client
        .try_approve_submissions_batch(&ctx.verifier, &batch);
    assert_eq!(result, Err(Ok(Error::ArrayTooLong)));
}
