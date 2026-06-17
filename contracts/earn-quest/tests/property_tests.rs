#![cfg(test)]

use proptest::prelude::*;
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, BytesN, Env, Symbol};

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

const MAX_REWARD_AMOUNT: i128 = 1_000_000_000_000_000;

fn init_contract() -> (Env, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token_contract = token_contract_obj.address();

    (env, contract_id, token_contract)
}

fn register_and_approve_submission(
    env: &Env,
    client: &EarnQuestContractClient,
    contract_id: &Address,
    token_admin_client: &StellarAssetClient,
    token_contract: &Address,
    reward_amount: i128,
) -> (Symbol, Address) {
    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let submitter = Address::generate(env);
    let quest_id = symbol_short!("QX");

    client.register_quest(
        &quest_id,
        &creator,
        token_contract,
        &reward_amount,
        &verifier,
        &10000,
    );

    token_admin_client.mint(contract_id, &reward_amount);

    let proof = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);

    (quest_id, submitter)
}

proptest! {
    #[test]
    fn negative_or_zero_claims_are_rejected(amount in (i128::MIN..=0_i128)) {
        let (env, contract_id, token_contract) = init_contract();
    let client = EarnQuestContractClient::new(&env, &contract_id);
    let token_admin = StellarAssetClient::new(&env, &token_contract);
    let _token_client = TokenClient::new(&env, &token_contract);
    let (quest_id, submitter) = register_and_approve_submission(
        &env,
        &client,
        &contract_id,
        &token_admin,
        &token_contract,
        100,
    );

        let result = client.try_claim_reward(&quest_id, &submitter, &amount);
        prop_assert!(result.is_err());
    }

    #[test]
    fn large_valid_claim_amounts_near_maximum_reward_succeed(amount in (MAX_REWARD_AMOUNT - 10..=MAX_REWARD_AMOUNT)) {
        let (env, contract_id, token_contract) = init_contract();
        let client = EarnQuestContractClient::new(&env, &contract_id);
        let token_admin = StellarAssetClient::new(&env, &token_contract);
        let token_client = TokenClient::new(&env, &token_contract);
        let (quest_id, submitter) = register_and_approve_submission(
            &env,
            &client,
            &contract_id,
            &token_admin,
            &token_contract,
            amount,
        );

        let result = client.try_claim_reward(&quest_id, &submitter, &amount);
        prop_assert!(result.is_ok());
        prop_assert_eq!(token_client.balance(&submitter), amount);
    }

    #[test]
    fn multiple_valid_claims_do_not_overflow(
        reward_amount in (2_i128..=MAX_REWARD_AMOUNT),
        first_claim in (1_i128..=MAX_REWARD_AMOUNT),
    ) {
        prop_assume!(first_claim < reward_amount);
        let second_claim = reward_amount - first_claim;
        prop_assume!(second_claim > 0);

        let (env, contract_id, token_contract) = init_contract();
        let client = EarnQuestContractClient::new(&env, &contract_id);
        let token_admin = StellarAssetClient::new(&env, &token_contract);
        let token_client = TokenClient::new(&env, &token_contract);
        let (quest_id, submitter) = register_and_approve_submission(
            &env,
            &client,
            &contract_id,
            &token_admin,
            &token_contract,
            reward_amount,
        );

        client.claim_reward(&quest_id, &submitter, &first_claim);
        prop_assert_eq!(token_client.balance(&submitter), first_claim);

        client.claim_reward(&quest_id, &submitter, &second_claim);
        prop_assert_eq!(token_client.balance(&submitter), reward_amount);
    }

    #[test]
    fn claim_boundary_values_are_handled_gracefully(amount in prop_oneof![
        Just(0_i128),
        Just(1_i128),
        Just(i128::from(u64::MAX - 1)),
        Just(i128::from(u64::MAX)),
    ]) {
        let (env, contract_id, token_contract) = init_contract();
        let client = EarnQuestContractClient::new(&env, &contract_id);
        let token_admin = StellarAssetClient::new(&env, &token_contract);
        let token_client = TokenClient::new(&env, &token_contract);
        let (quest_id, submitter) = register_and_approve_submission(
            &env,
            &client,
            &contract_id,
            &token_admin,
            &token_contract,
            1,
        );

        let result = client.try_claim_reward(&quest_id, &submitter, &amount);

        if amount == 1 {
            prop_assert!(result.is_ok());
            prop_assert_eq!(token_client.balance(&submitter), 1);
        } else {
            prop_assert!(result.is_err());
        }
    }
}
