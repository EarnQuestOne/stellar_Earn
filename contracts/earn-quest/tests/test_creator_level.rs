#![cfg(test)]

use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, BytesN, Env, Symbol};

extern crate earn_quest;
use earn_quest::errors::Error;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

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

    token_admin_client.mint(&contract_id, &100000);

    (contract_id, client, token_contract, token_client)
}

fn complete_quest_and_award_xp(
    client: &EarnQuestContractClient,
    env: &Env,
    quest_id: Symbol,
    creator: &Address,
    token_contract: &Address,
    verifier: &Address,
    submitter: &Address,
) {
    client.register_quest(&quest_id, creator, token_contract, &100, verifier, &100000);

    let proof = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(&quest_id, submitter, &proof);
    client.approve_submission(&quest_id, submitter, verifier);
    client.claim_reward(&quest_id, submitter, &100);
}

fn level_up_user(
    client: &EarnQuestContractClient,
    env: &Env,
    creator: &Address,
    token_contract: &Address,
    verifier: &Address,
    user: &Address,
    target_level: u32,
) {
    let mut counter = 0u32;
    while client.get_user_stats(user).level < target_level {
        counter += 1;
        let quest_id = Symbol::new(env, &format!("LQ_{}", counter));
        complete_quest_and_award_xp(
            client,
            env,
            quest_id,
            creator,
            token_contract,
            verifier,
            user,
        );
    }
}

//================================================================================
// Min Creator Level Tests
//================================================================================

#[test]
fn test_default_min_creator_level_is_zero() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    assert_eq!(client.get_min_creator_level(), 0);
}

#[test]
fn test_low_level_user_cannot_create_quest_when_threshold_set() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let low_level_creator = Address::generate(&env);

    client.initialize(&admin);
    client.set_min_creator_level(&admin, &2);

    let result = client.try_register_quest(
        &symbol_short!("QUEST1"),
        &low_level_creator,
        &token_contract,
        &100,
        &verifier,
        &100000,
    );
    match result {
        Err(Ok(Error::InsufficientCreatorLevel)) => {}
        _ => panic!("expected InsufficientCreatorLevel, got {:?}", result),
    }
}

#[test]
fn test_high_level_user_can_create_quest() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    client.initialize(&admin);

    level_up_user(
        &client,
        &env,
        &admin,
        &token_contract,
        &verifier,
        &creator,
        2,
    );

    client.set_min_creator_level(&admin, &2);

    client.register_quest(
        &symbol_short!("QUEST1"),
        &creator,
        &token_contract,
        &100,
        &verifier,
        &100000,
    );
}

#[test]
fn test_whitelisted_user_bypasses_level_check() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let low_level_creator = Address::generate(&env);

    client.initialize(&admin);
    client.set_min_creator_level(&admin, &2);

    client.add_creator_whitelist(&admin, &low_level_creator);
    assert!(client.is_creator_whitelisted(&low_level_creator));

    client.register_quest(
        &symbol_short!("QUEST1"),
        &low_level_creator,
        &token_contract,
        &100,
        &verifier,
        &100000,
    );
}

#[test]
fn test_whitelist_removal_reblocks_low_level_user() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let low_level_creator = Address::generate(&env);

    client.initialize(&admin);
    client.set_min_creator_level(&admin, &2);

    client.add_creator_whitelist(&admin, &low_level_creator);
    client.register_quest(
        &symbol_short!("QUEST1"),
        &low_level_creator,
        &token_contract,
        &100,
        &verifier,
        &100000,
    );

    client.remove_creator_whitelist(&admin, &low_level_creator);
    assert!(!client.is_creator_whitelisted(&low_level_creator));

    let result = client.try_register_quest(
        &symbol_short!("QUEST2"),
        &low_level_creator,
        &token_contract,
        &100,
        &verifier,
        &100000,
    );
    match result {
        Err(Ok(Error::InsufficientCreatorLevel)) => {}
        _ => panic!("expected InsufficientCreatorLevel, got {:?}", result),
    }
}

#[test]
fn test_setting_level_to_zero_disables_check() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, token_contract, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let low_level_creator = Address::generate(&env);

    client.initialize(&admin);
    client.set_min_creator_level(&admin, &2);

    let result = client.try_register_quest(
        &symbol_short!("QUEST1"),
        &low_level_creator,
        &token_contract,
        &100,
        &verifier,
        &100000,
    );
    match result {
        Err(Ok(Error::InsufficientCreatorLevel)) => {}
        _ => panic!("expected InsufficientCreatorLevel, got {:?}", result),
    }

    client.set_min_creator_level(&admin, &0);
    assert_eq!(client.get_min_creator_level(), 0);

    client.register_quest(
        &symbol_short!("QUEST2"),
        &low_level_creator,
        &token_contract,
        &100,
        &verifier,
        &100000,
    );
}

#[test]
fn test_non_admin_cannot_set_min_creator_level() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);

    client.initialize(&admin);

    let result = client.try_set_min_creator_level(&non_admin, &2);
    match result {
        Err(Ok(Error::Unauthorized)) => {}
        _ => panic!("expected Unauthorized, got {:?}", result),
    }
}

#[test]
fn test_non_admin_cannot_manage_whitelist() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    let result = client.try_add_creator_whitelist(&non_admin, &user);
    match result {
        Err(Ok(Error::Unauthorized)) => {}
        _ => panic!("expected Unauthorized, got {:?}", result),
    }

    let result = client.try_remove_creator_whitelist(&non_admin, &user);
    match result {
        Err(Ok(Error::Unauthorized)) => {}
        _ => panic!("expected Unauthorized, got {:?}", result),
    }
}

#[test]
fn test_whitelist_status_is_persistent() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client, _, _) = setup_contract_and_token(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    assert!(!client.is_creator_whitelisted(&user));

    client.add_creator_whitelist(&admin, &user);
    assert!(client.is_creator_whitelisted(&user));

    client.remove_creator_whitelist(&admin, &user);
    assert!(!client.is_creator_whitelisted(&user));
}
