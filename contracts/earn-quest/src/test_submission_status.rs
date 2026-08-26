#![cfg(test)]

//! Tests for the submission-status getter (issue #2288): a direct read of a
//! single submission's status without loading the full record.

use crate::errors::Error;
use crate::types::SubmissionStatus;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, Address, BytesN, Env};

fn setup(env: &Env) -> (crate::EarnQuestContractClient<'_>, Address) {
    env.mock_all_auths();
    let cid = env.register_contract(None, crate::EarnQuestContract);
    let client = crate::EarnQuestContractClient::new(env, &cid);
    let admin = Address::generate(env);
    let token_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token = token_obj.address();
    client.initialize(&admin);
    (client, token)
}

fn register_quest_and_submit(
    client: &crate::EarnQuestContractClient<'_>,
    env: &Env,
    token: &Address,
    quest_id: &soroban_sdk::Symbol,
    submitter: &Address,
) -> Address {
    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let deadline = env.ledger().timestamp() + 86_400;
    client.register_quest(quest_id, &creator, token, &1000, &verifier, &deadline);
    let proof: BytesN<32> = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(quest_id, submitter, &proof);
    verifier
}

#[test]
fn submission_status_is_pending_after_submit() {
    let env = Env::default();
    let (client, token) = setup(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q1");
    register_quest_and_submit(&client, &env, &token, &quest_id, &submitter);

    let status = client.get_submission_status(&quest_id, &submitter);
    assert_eq!(status, SubmissionStatus::Pending);
}

#[test]
fn submission_status_is_approved_after_approval() {
    let env = Env::default();
    let (client, token) = setup(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q2");
    let verifier = register_quest_and_submit(&client, &env, &token, &quest_id, &submitter);

    client.approve_submission(&quest_id, &submitter, &verifier);

    let status = client.get_submission_status(&quest_id, &submitter);
    assert_eq!(status, SubmissionStatus::Approved);
}

#[test]
fn submission_status_returns_not_found_for_unknown_submission() {
    let env = Env::default();
    let (client, token) = setup(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q3");
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86_400;
    client.register_quest(&quest_id, &creator, &token, &1000, &verifier, &deadline);

    // No submission exists for this quest/submitter.
    let result = client.try_get_submission_status(&quest_id, &submitter);
    assert_eq!(result, Err(Ok(Error::SubmissionNotFound)));
}
