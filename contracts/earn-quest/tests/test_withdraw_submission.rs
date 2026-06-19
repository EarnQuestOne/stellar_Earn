#![cfg(test)]

extern crate earn_quest;

use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{
    symbol_short,
    testutils::Address as _,
    Address, BytesN, Env,
};

fn setup() -> (Env, EarnQuestContractClient<'static>, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q_withdraw_1");
    let asset = Address::generate(&env);

    client.register_quest(&quest_id, &creator, &asset, &100, &verifier, &10_000);

    (env, client, creator, verifier, submitter, quest_id, asset)
}

#[test]
fn test_withdraw_rejected_emits_and_allows_resubmit() {
    let (env, client, _creator, _verifier, submitter, quest_id, _asset) = setup();

    let proof_hash1 = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash1);

    let res = client.try_withdraw_submission(&quest_id, &submitter);
    assert!(res.is_err());

    {
        use earn_quest::storage;
        use earn_quest::types::{SubmissionStatus, Submission};
        let mut s: Submission = storage::get_submission(&env, &quest_id, &submitter).unwrap();
        s.status = SubmissionStatus::Rejected;
        storage::set_submission(&env, &quest_id, &submitter, &s);
    }



    client.withdraw_submission(&quest_id, &submitter);

    let s = client.get_submission(&quest_id, &submitter);
    assert_eq!(s.status, earn_quest::SubmissionStatus::Withdrawn);

    let events = env.events().all();

    let (_contract, topics, _data) = events.last().unwrap();
    let event_name: soroban_sdk::Symbol = topics.get(0).unwrap().into_val(&env);
    assert_eq!(event_name, symbol_short!("sub_wd"));

    let proof_hash2 = BytesN::from_array(&env, &[9u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof_hash2);

    let s2 = client.get_submission(&quest_id, &submitter);
    assert_eq!(s2.status, earn_quest::SubmissionStatus::Pending);

}

