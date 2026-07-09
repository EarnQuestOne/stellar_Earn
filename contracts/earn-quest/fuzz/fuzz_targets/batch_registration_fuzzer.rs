#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol, Vec};

#[derive(Arbitrary, Debug)]
struct BatchRegistrationInput {
    batch_len: u8,
    seed: [u8; 8],
    reward_amount: i128,
    deadline_offset: u64,
    force_invalid_amount: bool,
    force_invalid_deadline: bool,
    duplicate_ids: bool,
}

fuzz_target!(|data: BatchRegistrationInput| {
    let env = Env::default();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let contract_id = env.register_contract(None, earn_quest::EarnQuestContract);
    let client = earn_quest::EarnQuestContractClient::new(&env, &contract_id);

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = client.try_initialize(&admin);
    }));

    let mut quests: Vec<earn_quest::BatchQuestInput> = Vec::new(&env);
    let len = (data.batch_len as usize % 6) + 1;

    for i in 0..len {
        let id_text = if data.duplicate_ids && i > 0 {
            "Q1"
        } else {
            match (data.seed[i % data.seed.len()] % 4) as u8 {
                0 => "Q1",
                1 => "Q2",
                2 => "Q3",
                _ => "Q4",
            }
        };
        let safe_id = id_text
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
            .take(32)
            .collect::<String>();
        let quest_id = Symbol::new(&env, &safe_id);

        let reward_amount = if data.force_invalid_amount {
            -1
        } else {
            data.reward_amount.abs().max(1)
        };

        let deadline = if data.force_invalid_deadline {
            env.ledger().timestamp().saturating_sub(1)
        } else {
            env.ledger().timestamp().saturating_add(data.deadline_offset.max(60))
        };

        quests.push_back(earn_quest::BatchQuestInput {
            id: quest_id,
            reward_asset: Address::generate(&env),
            reward_amount,
            verifier: Address::generate(&env),
            deadline,
        });
    }

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = client.try_register_quests_batch(&creator, &quests);
    }));
});
