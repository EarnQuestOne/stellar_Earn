#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, symbol_short, BytesN};
use soroban_sdk::token::{StellarAssetClient, TokenClient};

// Import from the library
extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

#[test]
fn test_payout_success() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);
    
    // 1. Setup Token
    let admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_contract = token_contract_obj.address();
    let token_admin_client = StellarAssetClient::new(&env, &token_contract);
    let token_client = TokenClient::new(&env, &token_contract);
    
    // Fund the contract with enough tokens for payout
    let reward_amount = 100i128;
    token_admin_client.mint(&contract_id, &1000); 
    
    // 2. Setup Quest
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    
    let quest_id = symbol_short!("Q1");
    
    client.register_quest(
        &quest_id,
        &creator,
        &token_contract,
        &reward_amount,
        &verifier,
        &10000,
    );
    
    // 3. Submit Proof
    let proof = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    
    // 4. Approve Submission
    client.approve_submission(&quest_id, &submitter, &verifier);
    
    // 5. Claim Reward
    let pre_balance = token_client.balance(&submitter);
    assert_eq!(pre_balance, 0);
    
    client.claim_reward(&quest_id, &submitter);
    
    let post_balance = token_client.balance(&submitter);
    assert_eq!(post_balance, 100);
}

#[test]
fn test_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_contract = token_contract_obj.address();
    // Do NOT fund contract
    
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q2");
    
    client.register_quest(
        &quest_id,
        &creator,
        &token_contract,
        &100,
        &verifier,
        &10000,
    );
    
    let proof = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);
    
    // Claim should fail with InsufficientBalance
    let res = client.try_claim_reward(&quest_id, &submitter);
    assert!(res.is_err(), "Expected claim to fail due to insufficient balance");
}

#[test]
fn test_double_claim_prevention() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_contract = token_contract_obj.address();
    let token_admin_client = StellarAssetClient::new(&env, &token_contract);
    token_admin_client.mint(&contract_id, &1000); 
    
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q3");
    
    client.register_quest(
        &quest_id,
        &creator,
        &token_contract,
        &100,
        &verifier,
        &10000,
    );
    
    let proof = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);
    
    // First claim
    client.claim_reward(&quest_id, &submitter);
    
    // Second claim should fail with AlreadyClaimed
    let res = client.try_claim_reward(&quest_id, &submitter);
    assert!(res.is_err(), "Expected second claim to fail");
}
