#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, symbol_short, BytesN};

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient, types::QuestStatus};

fn setup_contract(env: &Env) -> (Address, EarnQuestContractClient<'_>) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);
    (contract_id, client)
}

#[test]
fn test_admin_can_pause_and_resume_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin).address();

    client.initialize(&admin);

    let quest_id = symbol_short!("Q1");
    let deadline = env.ledger().timestamp() + 1000;
    client.register_quest(&quest_id, &creator, &token_contract, &100, &verifier, &deadline);

    // Initial status should be Active
    let quest = client.get_quest(&quest_id);
    assert!(matches!(quest.status, QuestStatus::Active));

    // Admin pauses quest
    client.pause_quest(&admin, &quest_id);
    let quest = client.get_quest(&quest_id);
    assert!(matches!(quest.status, QuestStatus::Paused));

    // Admin resumes quest
    client.resume_quest(&admin, &quest_id);
    let quest = client.get_quest(&quest_id);
    assert!(matches!(quest.status, QuestStatus::Active));
}

#[test]
#[should_panic(expected = "Error(Contract, #67)")]
fn test_paused_quest_rejects_submissions() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let submitter = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin).address();

    client.initialize(&admin);

    let quest_id = symbol_short!("Q1");
    let deadline = env.ledger().timestamp() + 1000;
    client.register_quest(&quest_id, &creator, &token_contract, &100, &verifier, &deadline);

    // Admin pauses quest
    client.pause_quest(&admin, &quest_id);

    // Try to submit proof - should panic with QuestNotActive (#67)
    let proof_hash = BytesN::from_array(&env, &[0u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_non_admin_cannot_pause_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin).address();

    client.initialize(&admin);

    let quest_id = symbol_short!("Q1");
    let deadline = env.ledger().timestamp() + 1000;
    client.register_quest(&quest_id, &creator, &token_contract, &100, &verifier, &deadline);

    // Non-admin tries to pause - should panic with Unauthorized (#10)
    client.pause_quest(&non_admin, &quest_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #63)")]
fn test_invalid_status_transitions_blocked() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin).address();

    client.initialize(&admin);

    let quest_id = symbol_short!("Q1");
    let deadline = env.ledger().timestamp() + 1000;
    client.register_quest(&quest_id, &creator, &token_contract, &100, &verifier, &deadline);

    // Admin resumes an already active quest - should panic with InvalidStatusTransition (#63)
    client.resume_quest(&admin, &quest_id);
}
