#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, QuestStatus};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    token::StellarAssetClient,
    Address, BytesN, Env, Symbol,
};

fn setup<'a>(
    env: &Env,
) -> (
    EarnQuestContractClient<'a>,
    Address,
    Address,
    Address,
    StellarAssetClient<'a>,
) {
    env.mock_all_auths();

    let contract_address = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_address);
    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let token_admin = Address::generate(env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let token_admin_client = StellarAssetClient::new(env, &token_address);

    (client, creator, verifier, token_address, token_admin_client)
}

#[allow(clippy::too_many_arguments)]
fn register_and_fund(
    env: &Env,
    client: &EarnQuestContractClient,
    creator: &Address,
    verifier: &Address,
    token_address: &Address,
    token_admin_client: &StellarAssetClient,
    quest_id: Symbol,
    reward: i128,
    max_participants: u32,
) {
    let deadline = env.ledger().timestamp() + 86_400;
    let total = reward * i128::from(max_participants);
    token_admin_client.mint(creator, &total);
    client.register_quest(
        &quest_id,
        creator,
        token_address,
        &reward,
        verifier,
        &deadline,
        &max_participants,
    );
    client.deposit_escrow(&quest_id, creator, &total);
}

#[test]
fn test_zero_reward_amount_is_rejected() {
    let env = Env::default();
    let (client, creator, verifier, token_address, _) = setup(&env);

    assert!(client
        .try_register_quest(
            &symbol_short!("EDGE1"),
            &creator,
            &token_address,
            &0,
            &verifier,
            &(env.ledger().timestamp() + 86_400),
            &1,
        )
        .is_err());
}

#[test]
fn test_duplicate_quest_creation_is_rejected_consistently() {
    let env = Env::default();
    let (client, creator, verifier, token_address, _) = setup(&env);
    let quest_id = symbol_short!("EDGE2");
    let deadline = env.ledger().timestamp() + 86_400;

    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &1_000,
        &verifier,
        &deadline,
        &2,
    );

    assert!(client
        .try_register_quest(
            &quest_id,
            &creator,
            &token_address,
            &1_000,
            &verifier,
            &deadline,
            &2,
        )
        .is_err());
}

#[test]
fn test_past_deadline_submission_is_rejected() {
    let env = Env::default();
    let (client, creator, verifier, token_address, _) = setup(&env);
    let quest_id = symbol_short!("EDGE3");
    let deadline = 10_u64;

    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &1_000,
        &verifier,
        &deadline,
        &2,
    );

    env.ledger()
        .with_mut(|ledger| ledger.timestamp = deadline + 1);

    let result = client.try_submit_proof(
        &quest_id,
        &Address::generate(&env),
        &BytesN::from_array(&env, &[9; 32]),
    );
    assert!(result.is_err());

    client.expire_quest(&quest_id, &creator);
    assert_eq!(client.get_quest(&quest_id).status, QuestStatus::Expired);
}

#[test]
fn property_claim_counter_matches_successful_approvals() {
    let env = Env::default();
    let (client, creator, verifier, token_address, token_admin_client) = setup(&env);
    let quest_id = symbol_short!("PROP1");

    register_and_fund(
        &env,
        &client,
        &creator,
        &verifier,
        &token_address,
        &token_admin_client,
        quest_id.clone(),
        750,
        2,
    );

    let first_submitter = Address::generate(&env);
    client.submit_proof(
        &quest_id,
        &first_submitter,
        &BytesN::from_array(&env, &[1; 32]),
    );
    client.approve_submission(&quest_id, &first_submitter, &verifier);

    let second_submitter = Address::generate(&env);
    client.submit_proof(
        &quest_id,
        &second_submitter,
        &BytesN::from_array(&env, &[2; 32]),
    );
    client.approve_submission(&quest_id, &second_submitter, &verifier);

    let rejected_submitter = Address::generate(&env);
    let rejected = client.try_submit_proof(
        &quest_id,
        &rejected_submitter,
        &BytesN::from_array(&env, &[3; 32]),
    );

    let quest = client.get_quest(&quest_id);
    assert!(rejected.is_err());
    assert_eq!(quest.total_claims, 2);
    assert_eq!(quest.status, QuestStatus::Completed);
}

#[test]
fn property_reputation_tracks_approved_quests() {
    let env = Env::default();
    let (client, creator, verifier, token_address, token_admin_client) = setup(&env);
    let user = Address::generate(&env);

    for index in 0..2_u32 {
        let quest_id = Symbol::new(&env, &format!("R{}", index));
        register_and_fund(
            &env,
            &client,
            &creator,
            &verifier,
            &token_address,
            &token_admin_client,
            quest_id.clone(),
            1_000,
            1,
        );

        let proof_hash = BytesN::from_array(&env, &[(index as u8) + 11; 32]);
        client.submit_proof(&quest_id, &user, &proof_hash);
        client.approve_submission(&quest_id, &user, &verifier);

        let stats = client.get_user_stats(&user);
        assert_eq!(stats.total_xp, (index + 1) * 100);
        assert_eq!(stats.quests_completed, index + 1);
        assert_eq!(stats.level, index + 2);
    }
}

#[test]
fn test_deterministic_fuzz_lifecycle_keeps_state_consistent() {
    let env = Env::default();
    let (client, creator, verifier, token_address, token_admin_client) = setup(&env);
    let quest_id = symbol_short!("FZZ1");

    register_and_fund(
        &env,
        &client,
        &creator,
        &verifier,
        &token_address,
        &token_admin_client,
        quest_id.clone(),
        320,
        2,
    );

    for turn in 0..3_u32 {
        let submitter = Address::generate(&env);
        let proof_hash = BytesN::from_array(&env, &[turn as u8 + 1; 32]);
        if client
            .try_submit_proof(&quest_id, &submitter, &proof_hash)
            .is_ok()
        {
            let _ = client.try_approve_submission(&quest_id, &submitter, &verifier);
        }

        let quest = client.get_quest(&quest_id);
        assert!(quest.total_claims <= 2);
        assert!(client.get_escrow_balance(&quest_id) >= 0);
        if quest.total_claims == 2 {
            assert_eq!(quest.status, QuestStatus::Completed);
        }
    }
}
