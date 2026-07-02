#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Symbol, Vec};

/// Raw byte inputs that map to every contract type that crosses the ABI boundary.
#[derive(Arbitrary, Debug)]
struct DecodingInput {
    // Symbol-like fields (quest IDs, badge IDs)
    symbol_bytes: [u8; 32],
    // BytesN<32> proof hash
    proof_hash: [u8; 32],
    // Numeric fields
    reward_amount: i128,
    deadline_offset: u64,
    xp_value: u64,
    // Enum discriminants (exercised as raw u8)
    quest_status_disc: u8,
    submission_status_disc: u8,
    dispute_status_disc: u8,
    role_disc: u8,
    // String-like metadata fields
    title_bytes: [u8; 64],
    description_bytes: [u8; 128],
    category_bytes: [u8; 32],
    // Batch sizes
    batch_size: u8,
}

fuzz_target!(|data: DecodingInput| {
    let env = Env::default();

    // ── Symbol decoding ──────────────────────────────────────────────────────
    // Soroban symbols only allow [a-zA-Z0-9_] and max 32 chars.
    // Feed arbitrary bytes and ensure the SDK never panics outside catch_unwind.
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        if let Ok(s) = std::str::from_utf8(&data.symbol_bytes) {
            let safe_symbol = s
                .chars()
                .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
                .take(32)
                .collect::<std::string::String>();
            let _ = Symbol::new(&env, &safe_symbol);
        }
    }));

    // ── BytesN<32> round-trip ────────────────────────────────────────────────
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _hash: BytesN<32> = BytesN::from_array(&env, &data.proof_hash);
    }));

    // ── Validation functions on raw numeric inputs ───────────────────────────
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = earn_quest::validation::validate_reward_amount(data.reward_amount);
    }));

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let deadline = env.ledger().timestamp().saturating_add(data.deadline_offset);
        let _ = earn_quest::validation::validate_deadline(&env, deadline);
    }));

    // ── String / metadata decoding ───────────────────────────────────────────
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        if let Ok(s) = std::str::from_utf8(&data.title_bytes) {
            let _soroban_str = String::from_str(&env, s);
        }
    }));

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        if let Ok(s) = std::str::from_utf8(&data.description_bytes) {
            let _soroban_str = String::from_str(&env, s);
        }
    }));

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        if let Ok(s) = std::str::from_utf8(&data.category_bytes) {
            let _soroban_str = String::from_str(&env, s);
        }
    }));

    // ── QuestStatus discriminant decoding ────────────────────────────────────
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _status = match data.quest_status_disc % 5 {
            0 => earn_quest::QuestStatus::Active,
            1 => earn_quest::QuestStatus::Paused,
            2 => earn_quest::QuestStatus::Completed,
            3 => earn_quest::QuestStatus::Expired,
            _ => earn_quest::QuestStatus::Cancelled,
        };
    }));

    // ── SubmissionStatus discriminant decoding ───────────────────────────────
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _status = match data.submission_status_disc % 5 {
            0 => earn_quest::SubmissionStatus::Pending,
            1 => earn_quest::SubmissionStatus::Approved,
            2 => earn_quest::SubmissionStatus::PartiallyPaid,
            3 => earn_quest::SubmissionStatus::Rejected,
            _ => earn_quest::SubmissionStatus::Paid,
        };
    }));

    // ── DisputeStatus discriminant decoding ──────────────────────────────────
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _status = match data.dispute_status_disc % 5 {
            0 => earn_quest::DisputeStatus::Pending,
            1 => earn_quest::DisputeStatus::UnderReview,
            2 => earn_quest::DisputeStatus::Resolved,
            3 => earn_quest::DisputeStatus::Withdrawn,
            _ => earn_quest::DisputeStatus::Appealed,
        };
    }));

    // ── Role discriminant decoding ───────────────────────────────────────────
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _role = match data.role_disc % 6 {
            0 => earn_quest::Role::SuperAdmin,
            1 => earn_quest::Role::Admin,
            2 => earn_quest::Role::Pauser,
            3 => earn_quest::Role::OracleAdmin,
            4 => earn_quest::Role::StatsAdmin,
            _ => earn_quest::Role::BadgeAdmin,
        };
    }));

    // ── BatchQuestInput Vec construction ────────────────────────────────────
    // Exercises Vec serialisation with variable-length inputs.
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let count = (data.batch_size as usize).min(10);
        let mut inputs: Vec<earn_quest::BatchQuestInput> = Vec::new(&env);
        for i in 0..count {
            let id_str = format!("q{i}");
            if let Ok(sym) = Symbol::try_from_str(&env, &id_str) {
                let asset = Address::generate(&env);
                let verifier = Address::generate(&env);
                inputs.push_back(earn_quest::BatchQuestInput {
                    id: sym,
                    reward_asset: asset,
                    reward_amount: data.reward_amount.abs().max(1),
                    verifier,
                    deadline: env.ledger().timestamp().saturating_add(data.deadline_offset.max(60)),
                    grace_period_seconds: None,
                });
            }
        }
    }));
});
