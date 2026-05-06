#![no_main]

use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;
use soroban_sdk::{testutils::Address as _, Env, Address, Symbol};
use earn_quest::EarnQuestContractClient;

#[derive(Arbitrary, Debug)]
struct SubmissionInput {
    quest_id: [u8; 8],
    submission_data: [u8; 32],
    user_address: [u8; 32],
}

fuzz_target!(|data: SubmissionInput| {
    let env = Env::default();
    let admin = Address::random(&env);
    let creator = Address::random(&env);
    let verifier = Address::random(&env);
    let reward_asset = Address::random(&env);
    let user = Address::random(&env);
    
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, earn_quest::EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);
    
    // Initialize contract
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.initialize(&admin);
    }));
    
    // Create quest ID
    let quest_id_bytes = data.quest_id;
    let quest_id_str = std::str::from_utf8(&quest_id_bytes).unwrap_or("quest");
    let quest_id = Symbol::new(&env, quest_id_str);
    
    // Try to register a quest first
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.register_quest(
            &quest_id,
            &creator,
            &reward_asset,
            &1000i128,
            &verifier,
            &(env.ledger().timestamp() + 86400),
        );
    }));
    
    // Convert submission data to string
    let submission_str = std::str::from_utf8(&data.submission_data).unwrap_or("submission");
    
    // Try to submit
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.submit_quest(&quest_id, &user, &Symbol::new(&env, submission_str));
    }));
});
