#![cfg(test)]

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{
    symbol_short, testutils::Address as _, token::StellarAssetClient, Address, BytesN, Env,
};

fn setup(
    env: &Env,
) -> (
    Address,
    EarnQuestContractClient<'_>,
    Address,
    Address,
    Address,
    Address,
) {
    env.mock_all_auths();
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    let token_obj = env.register_stellar_asset_contract_v2(admin.clone());
    let token = token_obj.address();
    StellarAssetClient::new(env, &token).mint(&contract_id, &1000);
    client.initialize(&admin);
    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let submitter = Address::generate(env);
    let quest_id = symbol_short!("Q_DC");
    client.register_quest(
        &quest_id,
        &creator,
        &token,
        &100i128,
        &verifier,
        &(env.ledger().timestamp() + 10000),
    );
    client.deposit_escrow(&quest_id, &creator, &token, &500i128);
    let proof: BytesN<32> = BytesN::from_array(env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);
    (contract_id, client, token, creator, verifier, submitter)
}

/// Claiming twice for the same submission must fail on the second attempt.
#[test]
#[should_panic]
fn double_claim_is_rejected() {
    let env = Env::default();
    let (_id, client, _token, _creator, _verifier, submitter) = setup(&env);
    let quest_id = symbol_short!("Q_DC");
    client.claim_reward(&quest_id, &submitter, &100i128);
    client.claim_reward(&quest_id, &submitter, &100i128); // must panic
}
