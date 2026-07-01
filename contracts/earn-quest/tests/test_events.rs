#![cfg(test)]

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events},
    Address, BytesN, Env, IntoVal, Symbol,
};

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

    client.initialize(&admin);

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

    // Topics: [EventName, QuestID, Creator, RewardAsset]
    let t_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let t_id: Symbol = topics.get(1).unwrap().into_val(&env);
    let t_creator: Address = topics.get(2).unwrap().into_val(&env);
    let t_asset: Address = topics.get(3).unwrap().into_val(&env);

    assert_eq!(t_name, symbol_short!("quest_reg"));
    assert_eq!(t_id, quest_id);
    assert_eq!(t_creator, creator);
    assert_eq!(t_asset, token_address);

    // Verify Data: (reward_amount, verifier, deadline)
    let (amount_data, verifier_data, deadline_data): (i128, Address, u64) = data.into_val(&env);
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

    // Topics: [EventName, QuestID, Submitter, Verifier]
    let t_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let t_id: Symbol = topics.get(1).unwrap().into_val(&env);
    let t_sub: Address = topics.get(2).unwrap().into_val(&env);
    let t_verifier: Address = topics.get(3).unwrap().into_val(&env);

    assert_eq!(t_name, symbol_short!("sub_appr"));
    assert_eq!(t_id, quest_id);
    assert_eq!(t_sub, user);
    assert_eq!(t_verifier, verifier);

    // --- STEP 4: CLAIM REWARD ---
    client.claim_reward(&quest_id, &user, &reward_amount);

    let events = env.events().all();

    // After claim_reward, we expect 2 events: reward_claimed and xp_awarded
    // Get the second-to-last event (reward_claimed)
    let event_count = events.len();
    let (_, topics, data) = events.get(event_count - 2).unwrap();

    // Topics: [EventName, QuestID, Submitter, RewardAsset]
    let t_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let t_id: Symbol = topics.get(1).unwrap().into_val(&env);
    let t_sub: Address = topics.get(2).unwrap().into_val(&env);
    let t_asset: Address = topics.get(3).unwrap().into_val(&env);

    assert_eq!(t_name, symbol_short!("claimed"));
    assert_eq!(t_id, quest_id);
    assert_eq!(t_sub, user);
    assert_eq!(t_asset, token_address);

    // Verify Data: (reward_amount)
    let (claimed_amount,): (i128,) = data.into_val(&env);
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

#[test]
fn test_escrow_topped_up_event_emitted_on_second_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Deploy a real token so transfers succeed
    let token_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_address = token_obj.address();
    let token_admin = StellarAssetClient::new(&env, &token_address);
    // Mint enough for two deposits
    token_admin.mint(&creator, &2_000_i128);

    client.initialize(&admin);

    let quest_id = symbol_short!("q_topup");
    let reward_amount = 500_i128;
    let deadline = 99_999_u64;

    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &reward_amount,
        &verifier,
        &deadline,
    );

    // ── First deposit: should emit `esc_dep`, NOT `esc_top` ──────────────────
    client.deposit_escrow(&quest_id, &creator, &token_address, &1_000_i128);

    let events_after_first = env.events().all();
    let (_, first_topics, _) = events_after_first.last().unwrap();
    let first_event_name: Symbol = first_topics.get(0).unwrap().into_val(&env);
    assert_eq!(
        first_event_name,
        symbol_short!("esc_dep"),
        "initial deposit must emit esc_dep"
    );

    // ── Second deposit (top-up): must emit `esc_top` ────────────────────────
    client.deposit_escrow(&quest_id, &creator, &token_address, &500_i128);

    let events_after_topup = env.events().all();
    let (contract, topup_topics, topup_data) = events_after_topup.last().unwrap();

    assert_eq!(contract, contract_id, "event must come from our contract");

    // Topics: [esc_top, quest_id, depositor, token]
    let t_name: Symbol = topup_topics.get(0).unwrap().into_val(&env);
    let t_quest: Symbol = topup_topics.get(1).unwrap().into_val(&env);
    let t_depositor: Address = topup_topics.get(2).unwrap().into_val(&env);
    let t_token: Address = topup_topics.get(3).unwrap().into_val(&env);

    assert_eq!(t_name, symbol_short!("esc_top"), "top-up event name must be esc_top");
    assert_eq!(t_quest, quest_id, "quest_id topic must match");
    assert_eq!(t_depositor, creator, "depositor topic must match");
    assert_eq!(t_token, token_address, "token topic must match");

    // Data: (amount, new_balance)
    let (topup_amount, new_balance): (i128, i128) = topup_data.into_val(&env);
    assert_eq!(topup_amount, 500_i128, "top-up amount in data must match");
    assert_eq!(new_balance, 1_500_i128, "new_balance must reflect cumulative deposits");
}

#[test]
fn test_escrow_topped_up_event_not_emitted_on_initial_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let token_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_address = token_obj.address();
    let token_admin = StellarAssetClient::new(&env, &token_address);
    token_admin.mint(&creator, &1_000_i128);

    client.initialize(&admin);

    let quest_id = symbol_short!("q_init");
    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &500_i128,
        &verifier,
        &99_999_u64,
    );

    client.deposit_escrow(&quest_id, &creator, &token_address, &1_000_i128);

    // The last event must be esc_dep, never esc_top
    let events = env.events().all();
    let (_, topics, _) = events.last().unwrap();
    let name: Symbol = topics.get(0).unwrap().into_val(&env);
    assert_eq!(name, symbol_short!("esc_dep"), "first deposit must emit esc_dep not esc_top");
    assert_ne!(
        name,
        symbol_short!("esc_top"),
        "esc_top must NOT be emitted on initial deposit"
    );
}

#[test]
fn test_escrow_topped_up_event_emitted_on_every_subsequent_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let token_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_address = token_obj.address();
    let token_admin = StellarAssetClient::new(&env, &token_address);
    token_admin.mint(&creator, &5_000_i128);

    client.initialize(&admin);

    let quest_id = symbol_short!("q_multi");
    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &500_i128,
        &verifier,
        &99_999_u64,
    );

    // Initial deposit
    client.deposit_escrow(&quest_id, &creator, &token_address, &1_000_i128);

    // Top-up 1
    client.deposit_escrow(&quest_id, &creator, &token_address, &500_i128);
    let (_, t1, d1) = env.events().all().last().unwrap();
    let n1: Symbol = t1.get(0).unwrap().into_val(&env);
    let (_, bal1): (i128, i128) = d1.into_val(&env);
    assert_eq!(n1, symbol_short!("esc_top"), "second deposit must be esc_top");
    assert_eq!(bal1, 1_500_i128);

    // Top-up 2
    client.deposit_escrow(&quest_id, &creator, &token_address, &500_i128);
    let (_, t2, d2) = env.events().all().last().unwrap();
    let n2: Symbol = t2.get(0).unwrap().into_val(&env);
    let (_, bal2): (i128, i128) = d2.into_val(&env);
    assert_eq!(n2, symbol_short!("esc_top"), "third deposit must also be esc_top");
    assert_eq!(bal2, 2_000_i128);
}
