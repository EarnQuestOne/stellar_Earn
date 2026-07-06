#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol, Vec};

#[derive(Arbitrary, Debug)]
struct BatchApprovalInputFuzz {
    batch_len: u8,
    seed: [u8; 8],
    duplicate_quest_ids: bool,
    duplicate_submitters: bool,
    invalid_status_transition: bool,
}

fuzz_target!(|data: BatchApprovalInputFuzz| {
    let env = Env::default();

    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let contract_id = env.register_contract(None, earn_quest::EarnQuestContract);
    let client = earn_quest::EarnQuestContractClient::new(&env, &contract_id);

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = client.try_initialize(&admin);
    }));

    let mut submissions: Vec<earn_quest::BatchApprovalInput> = Vec::new(&env);
    let len = (data.batch_len as usize % 6) + 1;

    for i in 0..len {
        let quest_id = if data.duplicate_quest_ids && i > 0 {
            Symbol::new(&env, "Q1")
        } else {
            let id_text = match (data.seed[i % data.seed.len()] % 4) as u8 {
                0 => "Q1",
                1 => "Q2",
                2 => "Q3",
                _ => "Q4",
            };
            let safe_id = id_text
                .chars()
                .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
                .take(32)
                .collect::<String>();
            Symbol::new(&env, &safe_id)
        };

        let mut submitters: Vec<Address> = Vec::new(&env);
        let count = ((data.seed[(i + 1) % data.seed.len()] % 3) as usize) + 1;

        for j in 0..count {
            let submitter = Address::generate(&env);
            submitters.push_back(submitter);
        }

        submissions.push_back(earn_quest::BatchApprovalInput {
            quest_id,
            submissions: submitters,
        });
    }

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = client.try_approve_submissions_batch(&verifier, &submissions);
    }));
});
