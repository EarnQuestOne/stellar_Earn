#![no_main]

use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;
use soroban_sdk::{testutils::Address as _, Env, Address, Symbol};
use earn_quest::EarnQuestContractClient;

#[derive(Arbitrary, Debug)]
struct QuestInput {
    quest_id: [u8; 8],
    reward_amount: i128,
    deadline_offset: u64,
}

fuzz_target!(|data: QuestInput| {
    let env = Env::default();
    let admin = Address::random(&env);
    let creator = Address::random(&env);
    let verifier = Address::random(&env);
    let reward_asset = Address::random(&env);
    
    // Initialize contract
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, earn_quest::EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);
    
    // Try to initialize (ignore if already initialized)
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.initialize(&admin);
    }));
    
    // Create quest ID from fuzz data
    let quest_id_bytes = data.quest_id;
    let quest_id_str = std::str::from_utf8(&quest_id_bytes).unwrap_or("test");
    let quest_id = Symbol::new(&env, quest_id_str);
    
    // Calculate deadline (current time + offset)
    let current_time = env.ledger().timestamp();
    let deadline = current_time + data.deadline_offset;
    
    // Try to register quest with fuzzed inputs
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.register_quest(
            &quest_id,
            &creator,
            &reward_asset,
            &data.reward_amount,
            &verifier,
            &deadline,
        );
    }));
});
