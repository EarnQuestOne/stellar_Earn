//! Tests for the `get_submission_status` getter (#2288): it returns a single
//! submission's current status by ID, and surfaces `SubmissionNotFound` when no
//! submission exists.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, Address, BytesN, Env, Symbol};

use crate::errors::Error;
use crate::types::SubmissionStatus;
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
fn test_get_submission_status_returns_pending_after_submit() {
    let ctx = setup();
    let qid = symbol_short!("q1");
    register_quest(&ctx, &qid);

    let proof = BytesN::from_array(&ctx.env, &[7u8; 32]);
    ctx.client.submit_proof(&qid, &ctx.submitter, &proof);

    let status = ctx.client.get_submission_status(&qid, &ctx.submitter);
    assert_eq!(status, SubmissionStatus::Pending);
}

#[test]
fn test_get_submission_status_missing_returns_not_found() {
    let ctx = setup();
    let qid = symbol_short!("q2");
    register_quest(&ctx, &qid);

    let result = ctx.client.try_get_submission_status(&qid, &ctx.submitter);
    assert_eq!(result, Err(Ok(Error::SubmissionNotFound)));
}
