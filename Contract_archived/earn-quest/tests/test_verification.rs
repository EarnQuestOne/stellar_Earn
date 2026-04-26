#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, SubmissionStatus};
use soroban_sdk::{
    symbol_short,
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env,
};

fn setup_env<'a>(env: &Env) -> (EarnQuestContractClient<'a>, Address, Address, Address) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let reward_asset = Address::generate(env);

    (client, creator, verifier, reward_asset)
}

fn setup_env_with_token<'a>(
    env: &Env,
) -> (
    EarnQuestContractClient<'a>,
    Address,
    Address,
    Address,
    StellarAssetClient<'a>,
    TokenClient<'a>,
) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let creator = Address::generate(env);
    let verifier = Address::generate(env);

    let token_admin = Address::generate(env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin.clone())
        .address();
    let token_admin_client = StellarAssetClient::new(env, &token_address);
    let token_client = TokenClient::new(env, &token_address);

    (
        client,
        creator,
        verifier,
        token_address,
        token_admin_client,
        token_client,
    )
}

fn setup_quest_with_submission<'a>(
    env: &Env,
) -> (
    EarnQuestContractClient<'a>,
    Address,
    Address,
    Address,
    Address,
) {
    let (client, creator, verifier, token_address, token_admin_client, _token_client) =
        setup_env_with_token(env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;
    let reward: i128 = 1000;
    let max_p: u32 = 10;

    token_admin_client.mint(&creator, &(reward * max_p as i128));

    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &reward,
        &verifier,
        &deadline,
        &max_p,
    );

    client.deposit_escrow(&quest_id, &creator, &(reward * max_p as i128));

    let submitter = Address::generate(env);
    let proof_hash = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash);

    (client, creator, verifier, token_address, submitter)
}

#[test]
fn test_approve_submission_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _token_address, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    client.approve_submission(&quest_id, &submitter, &verifier);

    let submission = client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Paid);
}

#[test]
fn test_reject_submission_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _token_address, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    client.reject_submission(&quest_id, &submitter, &verifier);

    let submission = client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Rejected);
}

#[test]
fn test_unauthorized_approval_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, _verifier, _token_address, submitter) =
        setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    let unauthorized = Address::generate(&env);
    let result = client.try_approve_submission(&quest_id, &submitter, &unauthorized);
    assert!(result.is_err());
}

#[test]
fn test_unauthorized_rejection_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, _verifier, _token_address, submitter) =
        setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    let unauthorized = Address::generate(&env);
    let result = client.try_reject_submission(&quest_id, &submitter, &unauthorized);
    assert!(result.is_err());
}

#[test]
fn test_approve_nonexistent_submission_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, creator, verifier, reward_asset) = setup_env(&env);

    let quest_id = symbol_short!("quest1");
    let deadline = env.ledger().timestamp() + 86400;

    client.register_quest(
        &quest_id,
        &creator,
        &reward_asset,
        &1000_i128,
        &verifier,
        &deadline,
        &10,
    );

    let submitter = Address::generate(&env);
    let result = client.try_approve_submission(&quest_id, &submitter, &verifier);
    assert!(result.is_err());
}

#[test]
fn test_double_approval_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _token_address, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    client.approve_submission(&quest_id, &submitter, &verifier);

    let result = client.try_approve_submission(&quest_id, &submitter, &verifier);
    assert!(result.is_err());
}

#[test]
fn test_reject_after_approval_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _token_address, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    client.approve_submission(&quest_id, &submitter, &verifier);

    let result = client.try_reject_submission(&quest_id, &submitter, &verifier);
    assert!(result.is_err());
}

#[test]
fn test_approve_after_rejection_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _creator, verifier, _token_address, submitter) = setup_quest_with_submission(&env);
    let quest_id = symbol_short!("quest1");

    client.reject_submission(&quest_id, &submitter, &verifier);

    let result = client.try_approve_submission(&quest_id, &submitter, &verifier);
    assert!(result.is_err());
}
