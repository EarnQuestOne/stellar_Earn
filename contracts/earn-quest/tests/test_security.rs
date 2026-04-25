#![cfg(test)]

use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

fn setup_contract(env: &Env) -> (Address, EarnQuestContractClient<'_>) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);
    (contract_id, client)
}

#[test]
#[should_panic(expected = "Error(Contract, #50)")]
fn test_pause_blocks_register_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_contract = token_contract_obj.address();

    client.initialize(&admin);
    client.emergency_pause(&admin);

    let quest_id = symbol_short!("SQ1");
    // This should panic because contract is paused
    client.register_quest(
        &quest_id,
        &creator,
        &token_contract,
        &100,
        &verifier,
        &10000,
    );
}

#[test]
fn test_emergency_withdraw_when_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (contract_id, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_contract = token_contract_obj.address();
    let token_admin_client = StellarAssetClient::new(&env, &token_contract);
    let token_client = TokenClient::new(&env, &token_contract);

    client.initialize(&admin);

    // Fund contract
    token_admin_client.mint(&contract_id, &1000);

    // Pause
    client.emergency_pause(&admin);

    // Emergency withdraw to admin
    client.emergency_withdraw(&admin, &token_contract, &admin, &500);

    // Ensure admin received funds
    let bal = token_client.balance(&admin);
    assert_eq!(bal, 500);
}

#[test]
fn test_emergency_withdraw_fails_when_not_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_contract = token_contract_obj.address();

    client.initialize(&admin);

    // Try to withdraw without pausing
    let result = client.try_emergency_withdraw(&admin, &token_contract, &admin, &500);
    assert!(result.is_err());
}

#[test]
fn test_multisig_approve_and_unpause_with_zero_timelock() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    client.initialize(&admin1);
    client.add_admin(&admin1, &admin2);

    // Configure threshold=2 and timelock=0
    client.set_unpause_threshold(&admin1, &2u32);
    client.set_unpause_timelock(&admin1, &0u64);

    // Pause
    client.emergency_pause(&admin1);

    // Approvals
    client.emergency_approve_unpause(&admin1);
    client.emergency_approve_unpause(&admin2);

    // Now unpause should succeed immediately (timelock=0)
    client.emergency_unpause(&admin1);

    // After unpause, registering a quest should be allowed
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_contract = token_contract_obj.address();

    let quest_id = symbol_short!("SQ2");
    client.register_quest(
        &quest_id,
        &creator,
        &token_contract,
        &100,
        &verifier,
        &10000,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #53)")]
fn test_unpause_requires_enough_approvals() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    client.initialize(&admin1);
    client.add_admin(&admin1, &admin2);

    client.set_unpause_threshold(&admin1, &2u32);
    client.set_unpause_timelock(&admin1, &0u64);

    client.emergency_pause(&admin1);

    // Only one approval
    client.emergency_approve_unpause(&admin1);

    // Unpause should fail with InsufficientApprovals
    client.emergency_unpause(&admin1);
}
#[test]
fn test_approvals_cleared_after_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    client.initialize(&admin1);
    client.add_admin(&admin1, &admin2);

    client.set_unpause_threshold(&admin1, &2u32);
    client.set_unpause_timelock(&admin1, &0u64);

    // Round 1
    client.emergency_pause(&admin1);
    client.emergency_approve_unpause(&admin1);
    client.emergency_approve_unpause(&admin2);
    client.emergency_unpause(&admin1);

    // Pause again
    client.emergency_pause(&admin1);

    // Unpause should fail because previous approvals are cleared (round incremented)
    let result = client.try_emergency_unpause(&admin1);
    assert!(result.is_err());
    
    // Now approve again in new round
    client.emergency_approve_unpause(&admin1);
    client.emergency_approve_unpause(&admin2);
    client.emergency_unpause(&admin1);
}
