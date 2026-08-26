#![cfg(test)]

//! Tests for:
//! - #2280: claiming a zero/negative amount returns the typed
//!   `Error::InvalidClaimAmount` instead of proceeding silently.
//! - #2279: the total number of submissions across all batch-approval inputs
//!   is capped at `MAX_BATCH_APPROVALS` so a single oversized inner list
//!   cannot exhaust gas.

use crate::errors::Error;
use crate::validation;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{symbol_short, Address, BytesN, Env, Symbol, Vec};

fn setup(env: &Env) -> (crate::EarnQuestContractClient<'_>, Address) {
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);
    let client = crate::EarnQuestContractClient::new(env, &cid);
    let admin = Address::generate(env);
    let token_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token = token_obj.address();
    let token_admin = StellarAssetClient::new(env, &token);
    token_admin.mint(&cid, &1_000_000);
    client.initialize(&admin);
    (client, token)
}

fn register_quest_and_approve_submission(
    client: &crate::EarnQuestContractClient<'_>,
    env: &Env,
    token: &Address,
    quest_id: &Symbol,
    submitter: &Address,
) {
    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let deadline = env.ledger().timestamp() + 86_400;
    client.register_quest(quest_id, &creator, token, &1000, &verifier, &deadline);
    let proof: BytesN<32> = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(quest_id, submitter, &proof);
    client.approve_submission(quest_id, submitter, &verifier);
}

//================================================================================
// #2280 — typed error on zero-amount claim
//================================================================================

#[test]
fn claiming_zero_amount_returns_typed_error() {
    let env = Env::default();
    let (client, token) = setup(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q1");
    register_quest_and_approve_submission(&client, &env, &token, &quest_id, &submitter);

    let result = client.try_claim_reward(&quest_id, &submitter, &0i128);
    assert_eq!(result, Err(Ok(Error::InvalidClaimAmount)));
}

#[test]
fn claiming_negative_amount_returns_typed_error() {
    let env = Env::default();
    let (client, token) = setup(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q2");
    register_quest_and_approve_submission(&client, &env, &token, &quest_id, &submitter);

    let result = client.try_claim_reward(&quest_id, &submitter, &-5i128);
    assert_eq!(result, Err(Ok(Error::InvalidClaimAmount)));
}

#[test]
fn claiming_full_reward_still_succeeds() {
    let env = Env::default();
    let (client, token) = setup(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q3");
    register_quest_and_approve_submission(&client, &env, &token, &quest_id, &submitter);

    let result = client.try_claim_reward(&quest_id, &submitter, &1000i128);
    assert!(result.is_ok());
}

//================================================================================
// #2279 — total batch-approval length bound
//================================================================================

#[test]
fn batch_approval_total_within_limit_is_accepted() {
    assert!(validation::validate_batch_approval_total(0).is_ok());
    assert!(validation::validate_batch_approval_total(validation::MAX_BATCH_APPROVALS).is_ok());
}

#[test]
fn batch_approval_total_beyond_limit_is_rejected() {
    assert_eq!(
        validation::validate_batch_approval_total(validation::MAX_BATCH_APPROVALS + 1),
        Err(Error::ArrayTooLong)
    );
    assert_eq!(
        validation::validate_batch_approval_total(u32::MAX),
        Err(Error::ArrayTooLong)
    );
}

#[test]
fn batch_approval_with_oversized_inner_list_is_rejected() {
    let env = Env::default();
    let (client, _token) = setup(&env);
    let verifier = Address::generate(&env);
    let quest_id = symbol_short!("BQ1");

    // 51 submitters in a single input → total exceeds MAX_BATCH_APPROVALS (50).
    let mut submitters = Vec::new(&env);
    for _ in 0..(validation::MAX_BATCH_APPROVALS + 1) {
        submitters.push_back(Address::generate(&env));
    }
    let mut inputs = Vec::new(&env);
    inputs.push_back(crate::types::BatchApprovalInput {
        quest_id: quest_id.clone(),
        submissions: submitters,
    });

    let result = client.try_approve_submissions_batch(&verifier, &inputs);
    assert_eq!(result, Err(Ok(Error::ArrayTooLong)));
}

#[test]
fn batch_approval_total_across_multiple_inputs_is_bounded() {
    let env = Env::default();
    let (client, _token) = setup(&env);
    let verifier = Address::generate(&env);

    // Two inputs whose combined total (60) exceeds the cap, even though each
    // input is individually within bounds.
    let mut inputs = Vec::new(&env);
    for i in 0..2u32 {
        let mut submitters = Vec::new(&env);
        for _ in 0..30 {
            submitters.push_back(Address::generate(&env));
        }
        inputs.push_back(crate::types::BatchApprovalInput {
            quest_id: symbol_short!("BQ1"),
            submissions: submitters,
        });
        let _ = i;
    }

    let result = client.try_approve_submissions_batch(&verifier, &inputs);
    assert_eq!(result, Err(Ok(Error::ArrayTooLong)));
}
