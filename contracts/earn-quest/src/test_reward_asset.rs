//! Tests: quest registration rejects a zero/default reward asset address.
//!
//! Coverage:
//!   1. Registering a quest with the zero contract address as the reward
//!      asset returns `Error::InvalidAsset`.
//!   2. Registering a quest with a real token address succeeds.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, token, Address, Env};

use crate::errors::Error;
use crate::{EarnQuestContract, EarnQuestContractClient};

fn setup() -> (Env, EarnQuestContractClient<'static>, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(token_admin);
    let token = token_contract_obj.address();

    (env, client, creator, verifier, token)
}

#[test]
fn test_register_quest_with_zero_reward_asset_rejected() {
    let (env, client, creator, verifier, _token) = setup();
    let deadline = env.ledger().timestamp() + 86_400;
    let zero_asset = Address::from_contract_id(&[0u8; 32]);

    let result = client.try_register_quest(
        &symbol_short!("q1"),
        &creator,
        &zero_asset,
        &1000i128,
        &verifier,
        &deadline,
    );

    assert!(matches!(result, Err(Ok(Error::InvalidAsset))));
}

#[test]
fn test_register_quest_with_valid_reward_asset_succeeds() {
    let (env, client, creator, verifier, token) = setup();
    let deadline = env.ledger().timestamp() + 86_400;

    client.register_quest(
        &symbol_short!("q1"),
        &creator,
        &token,
        &1000i128,
        &verifier,
        &deadline,
    );

    // Quest should now exist.
    let quest = client.get_quest(&symbol_short!("q1")).unwrap();
    assert_eq!(quest.reward_asset, token);
}
