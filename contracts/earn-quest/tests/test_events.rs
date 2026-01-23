#![cfg(test)]

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{Address, BytesN, Env, IntoVal, Symbol, symbol_short, testutils::{Address as _, Events}};
use soroban_sdk::token::StellarAssetClient;

#[test]
fn test_full_quest_lifecycle_events() {
    let env = Env::default();
    env.mock_all_auths();

    // 1. Setup Contract and Client
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    // 2. Setup Token (Crucial for Claiming)
    let admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_address = token_contract_obj.address();
    let token_admin_client = StellarAssetClient::new(&env, &token_address);
    
    // Fund the contract so it can pay out rewards later
    let fund_amount = 1000i128;
    token_admin_client.mint(&contract_id, &fund_amount);

    // 3. Test Data
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let user = Address::generate(&env);
    let quest_id = symbol_short!("quest_01");
    let reward_amount = 100i128;
    let deadline = 5000u64;

    // --- STEP 1: REGISTER QUEST ---
    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &reward_amount,
        &verifier,
        &deadline,
    );

    // Verify Register Event
    let events = env.events().all();
    let (contract, topics, data) = events.last().unwrap();
    
    assert_eq!(contract, contract_id);

    // Topics: [EventName, QuestID, Creator]
    let t_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let t_id: Symbol = topics.get(1).unwrap().into_val(&env);
    let t_creator: Address = topics.get(2).unwrap().into_val(&env);

    assert_eq!(t_name, symbol_short!("quest_reg"));
    assert_eq!(t_id, quest_id);
    assert_eq!(t_creator, creator);
    
    // Verify Data: (reward_asset, reward_amount, verifier, deadline)
    let (asset_data, amount_data, verifier_data, deadline_data): (Address, i128, Address, u64) = data.into_val(&env);
    assert_eq!(asset_data, token_address);
    assert_eq!(amount_data, reward_amount);
    assert_eq!(verifier_data, verifier);
    assert_eq!(deadline_data, deadline);

    // --- STEP 2: SUBMIT PROOF ---
    let proof_hash = BytesN::from_array(&env, &[0u8; 32]);
    client.submit_proof(&quest_id, &user, &proof_hash);

    let events = env.events().all();
    let (_, topics, _) = events.last().unwrap();

    // Topics: [EventName, QuestID, Submitter]
    let t_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let t_id: Symbol = topics.get(1).unwrap().into_val(&env);
    let t_sub: Address = topics.get(2).unwrap().into_val(&env);

    assert_eq!(t_name, symbol_short!("proof_sub"));
    assert_eq!(t_id, quest_id);
    assert_eq!(t_sub, user);
    
    // --- STEP 3: APPROVE SUBMISSION ---
    client.approve_submission(&quest_id, &user, &verifier);

    let events = env.events().all();
    let (_, topics, _) = events.last().unwrap();

    // Topics: [EventName, QuestID, Submitter]
    let t_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let t_id: Symbol = topics.get(1).unwrap().into_val(&env);
    let t_sub: Address = topics.get(2).unwrap().into_val(&env);

    assert_eq!(t_name, symbol_short!("sub_appr"));
    assert_eq!(t_id, quest_id);
    assert_eq!(t_sub, user);

    // --- STEP 4: CLAIM REWARD ---
    client.claim_reward(&quest_id, &user);

    let events = env.events().all();
    
    // After claim_reward, we expect 2 events: reward_claimed and xp_awarded
    // Get the second-to-last event (reward_claimed)
    let event_count = events.len();
    let (_, topics, data) = events.get(event_count - 2).unwrap();

    // Topics: [EventName, QuestID, Submitter]
    let t_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let t_id: Symbol = topics.get(1).unwrap().into_val(&env);
    let t_sub: Address = topics.get(2).unwrap().into_val(&env);

    assert_eq!(t_name, symbol_short!("claimed"));
    assert_eq!(t_id, quest_id);
    assert_eq!(t_sub, user);

    // Verify Data: (reward_asset, reward_amount)
    let (claimed_asset, claimed_amount): (Address, i128) = data.into_val(&env);
    assert_eq!(claimed_asset, token_address);
    assert_eq!(claimed_amount, reward_amount);
    
    // Verify the XP awarded event (last event)
    let (_, topics, data) = events.last().unwrap();
    let t_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let t_user: Address = topics.get(1).unwrap().into_val(&env);
    
    assert_eq!(t_name, symbol_short!("xp_award"));
    assert_eq!(t_user, user);
    
    // Verify XP data: (xp_amount, total_xp, level)
    let (xp_amount, total_xp, level): (u64, u64, u32) = data.into_val(&env);
    assert_eq!(xp_amount, 100);
    assert_eq!(total_xp, 100);
    assert_eq!(level, 1);
}