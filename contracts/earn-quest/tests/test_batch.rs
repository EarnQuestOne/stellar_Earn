#![cfg(test)]

use soroban_sdk::testutils::Events as _;
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{
    symbol_short, testutils::Address as _, Address, BytesN, Env, IntoVal, Symbol, Vec, TryFromVal,
};

extern crate earn_quest;
use earn_quest::types::{BatchApprovalInput, BatchQuestInput};
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

//================================================================================
// Helpers
//================================================================================

fn setup_contract_and_token(
    env: &Env,
) -> (
    Address,
    EarnQuestContractClient<'_>,
    Address,
    TokenClient<'_>,
) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let admin = Address::generate(env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_contract = token_contract_obj.address();
    let token_admin_client = StellarAssetClient::new(env, &token_contract);
    let token_client = TokenClient::new(env, &token_contract);

    token_admin_client.mint(&contract_id, &100_000);

    (contract_id, client, token_contract, token_client)
}

fn make_quest_input(
    _env: &Env,
    id: &Symbol,
    reward_asset: &Address,
    reward_amount: i128,
    verifier: &Address,
    deadline: u64,
) -> BatchQuestInput {
    BatchQuestInput {
        id: id.clone(),
        reward_asset: reward_asset.clone(),
        reward_amount,
        verifier: verifier.clone(),
        deadline,
    }
}

fn make_approval_input(quest_id: &Symbol, submitter: &Address) -> BatchApprovalInput {
    BatchApprovalInput {
        quest_id: quest_id.clone(),
        submitter: submitter.clone(),
    }
}

//================================================================================
// Batch quest registration tests
//================================================================================

#[test]
fn test_register_quests_batch_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = 10000u64;

    let mut quests = Vec::new(&env);
    quests.push_back(make_quest_input(
        &env,
        &symbol_short!("BQ1"),
        &token_contract,
        100,
        &verifier,
        deadline,
    ));
    quests.push_back(make_quest_input(
        &env,
        &symbol_short!("BQ2"),
        &token_contract,
        200,
        &verifier,
        deadline,
    ));
    quests.push_back(make_quest_input(
        &env,
        &symbol_short!("BQ3"),
        &token_contract,
        300,
        &verifier,
        deadline,
    ));

    client.register_quests_batch(&creator, &quests);

    // All three quests should exist (read via single register would fail if duplicate)
    let res = client.try_register_quest(
        &symbol_short!("BQ1"),
        &creator,
        &token_contract,
        &100,
        &verifier,
        &deadline,
    );
    assert!(res.is_err(), "BQ1 should already exist");
}

#[test]
fn test_register_quests_batch_emits_events() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = 10000u64;

    let mut quests = Vec::new(&env);
    quests.push_back(make_quest_input(
        &env,
        &symbol_short!("E1"),
        &token_contract,
        50,
        &verifier,
        deadline,
    ));
    quests.push_back(make_quest_input(
        &env,
        &symbol_short!("E2"),
        &token_contract,
        50,
        &verifier,
        deadline,
    ));

    client.register_quests_batch(&creator, &quests);

    let events = env.events().all();
    let mut reg_count = 0u32;
    for i in 0..events.len() {
        let (_addr, topics, _data) = events.get(i).unwrap();
        if !topics.is_empty() {
            let t0: Symbol = topics.get(0).unwrap().into_val(&env);
            if t0 == symbol_short!("quest_reg") {
                reg_count += 1;
            }
        }
    }
    assert!(
        reg_count >= 2,
        "expected at least 2 quest_reg events, got {}",
        reg_count
    );
    let reg_events = events
        .iter()
        .filter(|e| {
            let topics = &e.1;
            let t0: Symbol = Symbol::from_val(&env, &topics.get(0).unwrap());
            t0 == symbol_short!("quest_reg")
        })
        .count();
    assert!(
        reg_events >= 2,
        "expected at least 2 quest_reg events, got {}",
        reg_events
    );
}

#[test]
fn test_register_quests_batch_size_limit_enforced() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = 10000u64;

    // MAX_BATCH_QUEST_REGISTRATION is 50; 51 should fail
    let mut quests = Vec::new(&env);
    for i in 0u32..51 {
        let sym = Symbol::new(&env, &format!("Q{:02}", i));
        quests.push_back(make_quest_input(
            &env,
            &sym,
            &token_contract,
            1,
            &verifier,
            deadline,
        ));
    }

    let res = client.try_register_quests_batch(&creator, &quests);
    assert!(res.is_err(), "batch of 51 should exceed limit");
}

#[test]
fn test_register_quests_batch_empty_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let quests = Vec::new(&env);

    let res = client.try_register_quests_batch(&creator, &quests);
    assert!(res.is_err(), "empty batch should fail");
}

#[test]
fn test_register_quests_batch_duplicate_in_batch_reverts() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = 10000u64;
    let id = symbol_short!("DUP");

    let mut quests = Vec::new(&env);
    quests.push_back(make_quest_input(
        &env,
        &id,
        &token_contract,
        100,
        &verifier,
        deadline,
    ));
    quests.push_back(make_quest_input(
        &env,
        &id,
        &token_contract,
        200,
        &verifier,
        deadline,
    ));

    let res = client.try_register_quests_batch(&creator, &quests);
    assert!(res.is_err(), "duplicate id in batch should revert");

    // First quest should not be stored (entire batch reverted)
    let res2 =
        client.try_register_quest(&id, &creator, &token_contract, &100, &verifier, &deadline);
    assert!(
        res2.is_ok(),
        "quest DUP should not exist after reverted batch"
    );
}

//================================================================================
// Batch approval tests
//================================================================================

#[test]
fn test_approve_submissions_batch_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, token_client) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter1 = Address::generate(&env);
    let submitter2 = Address::generate(&env);
    let deadline = 10000u64;
    let proof = BytesN::from_array(&env, &[1u8; 32]);

    // Register two quests
    client.register_quest(
        &symbol_short!("AQ1"),
        &creator,
        &token_contract,
        &100,
        &verifier,
        &deadline,
    );
    client.register_quest(
        &symbol_short!("AQ2"),
        &creator,
        &token_contract,
        &200,
        &verifier,
        &deadline,
    );

    // Submit proof for both
    client.submit_proof(&symbol_short!("AQ1"), &submitter1, &proof);
    client.submit_proof(&symbol_short!("AQ2"), &submitter2, &proof);

    // Batch approve
    let mut submissions = Vec::new(&env);
    submissions.push_back(make_approval_input(&symbol_short!("AQ1"), &submitter1));
    submissions.push_back(make_approval_input(&symbol_short!("AQ2"), &submitter2));
    client.approve_submissions_batch(&verifier, &submissions);

    // Claim both rewards
    client.claim_reward(&symbol_short!("AQ1"), &submitter1);
    client.claim_reward(&symbol_short!("AQ2"), &submitter2);

    assert_eq!(token_client.balance(&submitter1), 100);
    assert_eq!(token_client.balance(&submitter2), 200);
}

#[test]
fn test_approve_submissions_batch_emits_events() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let deadline = 10000u64;
    let proof = BytesN::from_array(&env, &[1u8; 32]);

    client.register_quest(
        &symbol_short!("AE1"),
        &creator,
        &token_contract,
        &50,
        &verifier,
        &deadline,
    );
    client.submit_proof(&symbol_short!("AE1"), &submitter, &proof);

    let mut submissions = Vec::new(&env);
    submissions.push_back(make_approval_input(&symbol_short!("AE1"), &submitter));
    client.approve_submissions_batch(&verifier, &submissions);

    let events = env.events().all();
    let mut appr_count = 0u32;
    for i in 0..events.len() {
        let (_addr, topics, _data) = events.get(i).unwrap();
        if !topics.is_empty() {
            let t0: Symbol = topics.get(0).unwrap().into_val(&env);
            if t0 == symbol_short!("sub_appr") {
                appr_count += 1;
            }
        }
    }
    assert!(
        appr_count >= 1,
        "expected at least 1 submission_approved event, got {}",
        appr_count
    );
    let appr_events = events
        .iter()
        .filter(|e| {
            let topics = &e.1;
            let t0: Symbol = Symbol::from_val(&env, &topics.get(0).unwrap());
            t0 == symbol_short!("sub_appr")
        })
        .count();
    assert!(
        appr_events >= 1,
        "expected at least 1 submission_approved event"
    );
}

#[test]
fn test_approve_submissions_batch_size_limit_enforced() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let deadline = 10000u64;
    let proof = BytesN::from_array(&env, &[1u8; 32]);

    // Prepare one valid submission and then exceed max batch size using duplicates.
    // Validation checks size before processing entries.
    let quest_id = symbol_short!("LQMAX");
    client.register_quest(
        &quest_id,
        &creator,
        &token_contract,
        &1,
        &verifier,
        &deadline,
    );
    client.submit_proof(&quest_id, &submitter, &proof);

    let mut submissions = Vec::new(&env);
    for _ in 0u32..51 {
        submissions.push_back(make_approval_input(&quest_id, &submitter));
    }

    let res = client.try_approve_submissions_batch(&verifier, &submissions);
    assert!(res.is_err(), "batch of 51 approvals should exceed limit");
}

#[test]
fn test_approve_submissions_batch_empty_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let verifier = Address::generate(&env);
    let submissions = Vec::new(&env);

    let res = client.try_approve_submissions_batch(&verifier, &submissions);
    assert!(res.is_err(), "empty approval batch should fail");
}

#[test]
fn test_approve_submissions_batch_unauthorized_reverts() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let other_verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let deadline = 10000u64;
    let proof = BytesN::from_array(&env, &[1u8; 32]);

    client.register_quest(
        &symbol_short!("UQ1"),
        &creator,
        &token_contract,
        &50,
        &verifier,
        &deadline,
    );
    client.submit_proof(&symbol_short!("UQ1"), &submitter, &proof);

    let mut submissions = Vec::new(&env);
    submissions.push_back(make_approval_input(&symbol_short!("UQ1"), &submitter));
    // other_verifier is not the quest verifier
    let res = client.try_approve_submissions_batch(&other_verifier, &submissions);
    assert!(res.is_err(), "wrong verifier should cause batch to fail");
}

//================================================================================
// Gas / behavior: batch vs single (documentation)
//================================================================================

#[test]
fn test_batch_registration_same_state_as_single_calls() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = 10000u64;

    let mut quests = Vec::new(&env);
    quests.push_back(make_quest_input(
        &env,
        &symbol_short!("S1"),
        &token_contract,
        10,
        &verifier,
        deadline,
    ));
    quests.push_back(make_quest_input(
        &env,
        &symbol_short!("S2"),
        &token_contract,
        20,
        &verifier,
        deadline,
    ));

    client.register_quests_batch(&creator, &quests);

    // State should be identical to two separate register_quest calls
    let res1 = client.try_register_quest(
        &symbol_short!("S1"),
        &creator,
        &token_contract,
        &10,
        &verifier,
        &deadline,
    );
    let res2 = client.try_register_quest(
        &symbol_short!("S2"),
        &creator,
        &token_contract,
        &20,
        &verifier,
        &deadline,
    );
    assert!(
        res1.is_err() && res2.is_err(),
        "both quests should already exist"
    );
}
