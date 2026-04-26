//! Timestamp Manipulation Prevention Tests — Issue #271
//!
//! Verifies that all time-based logic in the contract is protected against
//! validator timestamp manipulation.  Soroban's `env.ledger().timestamp()`
//! returns the ledger close time, which validators can nudge slightly within
//! the Stellar consensus window (~5 s per ledger).
//!
//! Protection strategy:
//!   - Relative minimum deadline duration  (`MIN_DEADLINE_DURATION`)
//!   - Relative maximum deadline cap       (`MAX_DEADLINE_DURATION`)
//!   - Expiry grace buffer                 (`MIN_EXPIRY_BUFFER`)

#![cfg(test)]

use soroban_sdk::{symbol_short, testutils::Address as _, testutils::Ledger, Address, Env};

extern crate earn_quest;
use earn_quest::validation::{
    MAX_DEADLINE_DURATION, MIN_DEADLINE_DURATION, MIN_EXPIRY_BUFFER,
};
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

fn setup(env: &Env) -> EarnQuestContractClient<'_> {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.initialize(&admin);
    client
}

fn set_time(env: &Env, ts: u64) {
    env.ledger().with_mut(|li| li.timestamp = ts);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Minimum deadline duration enforcement
// ─────────────────────────────────────────────────────────────────────────────

/// A deadline exactly at MIN_DEADLINE_DURATION seconds in the future must be
/// accepted.
#[test]
fn test_deadline_at_min_duration_accepted() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QMD");

    let deadline = now + MIN_DEADLINE_DURATION;
    let result = client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);
    assert!(result.is_ok(), "deadline at MIN_DEADLINE_DURATION should be accepted");
}

/// A deadline one second *below* MIN_DEADLINE_DURATION must be rejected.
/// This is the core protection: a validator cannot nudge the close time
/// forward by a few seconds to immediately expire a quest.
#[test]
fn test_deadline_below_min_duration_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QBMD");

    // deadline is MIN_DEADLINE_DURATION - 1 seconds in the future
    let deadline = now + MIN_DEADLINE_DURATION - 1;
    let result = client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);
    assert!(result.is_err(), "deadline below MIN_DEADLINE_DURATION must be rejected");
}

/// A deadline of only 1 second in the future must be rejected.
/// Without this check a validator could advance the close time by 1 s and
/// immediately expire the quest.
#[test]
fn test_deadline_one_second_future_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("Q1S");

    let result =
        client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &(now + 1));
    assert!(result.is_err(), "1-second deadline must be rejected");
}

/// A deadline in the past must still be rejected.
#[test]
fn test_deadline_in_past_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 50_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QPAST");

    let result =
        client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &(now - 1));
    assert!(result.is_err(), "past deadline must be rejected");
}

/// A deadline equal to the current timestamp must be rejected.
#[test]
fn test_deadline_equal_to_now_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QEQN");

    let result = client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &now);
    assert!(result.is_err(), "deadline equal to now must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Maximum deadline cap enforcement
// ─────────────────────────────────────────────────────────────────────────────

/// A deadline exactly at MAX_DEADLINE_DURATION seconds in the future must be
/// accepted.
#[test]
fn test_deadline_at_max_duration_accepted() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QMXD");

    let deadline = now + MAX_DEADLINE_DURATION;
    let result = client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);
    assert!(result.is_ok(), "deadline at MAX_DEADLINE_DURATION should be accepted");
}

/// A deadline one second *above* MAX_DEADLINE_DURATION must be rejected.
/// Prevents indefinite escrow lock-up via an unreasonably far future deadline.
#[test]
fn test_deadline_above_max_duration_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QAMD");

    let deadline = now + MAX_DEADLINE_DURATION + 1;
    let result = client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);
    assert!(result.is_err(), "deadline above MAX_DEADLINE_DURATION must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Expiry grace buffer — prevents premature expiry via clock nudging
// ─────────────────────────────────────────────────────────────────────────────

/// A quest whose deadline has just passed (current == deadline) must NOT be
/// treated as expired yet — the grace buffer must absorb this.
#[test]
fn test_quest_not_expired_at_exact_deadline() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QNED");

    // Register with a valid deadline
    let deadline = now + MIN_DEADLINE_DURATION + 1_000;
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);

    // Advance time to exactly the deadline — within the buffer, not yet expired
    set_time(&env, deadline);

    // Submitting proof should still succeed (quest not yet definitively expired)
    use soroban_sdk::BytesN;
    let submitter = Address::generate(&env);
    let proof = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof);
    assert!(
        result.is_ok(),
        "quest should not be expired at exactly the deadline (within grace buffer)"
    );
}

/// A quest is definitively expired only after `deadline + MIN_EXPIRY_BUFFER`.
#[test]
fn test_quest_expired_after_buffer() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QEAB");

    let deadline = now + MIN_DEADLINE_DURATION + 1_000;
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);

    // Advance time past deadline + buffer
    set_time(&env, deadline + MIN_EXPIRY_BUFFER + 1);

    use soroban_sdk::BytesN;
    let submitter = Address::generate(&env);
    let proof = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof);
    assert!(
        result.is_err(),
        "quest must be expired after deadline + MIN_EXPIRY_BUFFER"
    );
}

/// A quest is NOT expired when time is within the grace buffer
/// (deadline < current < deadline + MIN_EXPIRY_BUFFER).
#[test]
fn test_quest_not_expired_within_grace_buffer() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QNGB");

    let deadline = now + MIN_DEADLINE_DURATION + 1_000;
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);

    // Advance time to deadline + (buffer / 2) — still within grace window
    set_time(&env, deadline + MIN_EXPIRY_BUFFER / 2);

    use soroban_sdk::BytesN;
    let submitter = Address::generate(&env);
    let proof = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof);
    assert!(
        result.is_ok(),
        "quest must not be expired within the grace buffer window"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. expire_quest respects the grace buffer
// ─────────────────────────────────────────────────────────────────────────────

/// `expire_quest` must fail if called before `deadline + MIN_EXPIRY_BUFFER`.
#[test]
fn test_cannot_expire_before_buffer() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QCEB");

    let deadline = now + MIN_DEADLINE_DURATION + 500;
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);

    // Advance to exactly the deadline (still within buffer)
    set_time(&env, deadline);

    let result = client.try_expire_quest(&quest_id, &creator);
    assert!(
        result.is_err(),
        "expire_quest must fail before deadline + MIN_EXPIRY_BUFFER"
    );
}

/// `expire_quest` must succeed after `deadline + MIN_EXPIRY_BUFFER`.
#[test]
fn test_can_expire_after_buffer() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);
    let quest_id = symbol_short!("QCAB");

    let deadline = now + MIN_DEADLINE_DURATION + 500;
    client.register_quest(&quest_id, &creator, &token, &100, &verifier, &deadline);

    // Advance past deadline + buffer
    set_time(&env, deadline + MIN_EXPIRY_BUFFER + 1);

    let result = client.try_expire_quest(&quest_id, &creator);
    assert!(
        result.is_ok(),
        "expire_quest must succeed after deadline + MIN_EXPIRY_BUFFER"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Batch registration respects the same deadline rules
// ─────────────────────────────────────────────────────────────────────────────

/// Batch registration with a too-soon deadline must fail.
#[test]
fn test_batch_registration_deadline_too_soon_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);

    use earn_quest::types::{BatchQuestInput, Quest, QuestMetadata, MetadataDescription};
    use soroban_sdk::Vec;

    let mut quests_vec = Vec::new(&env);
    let mut metadata_vec = Vec::new(&env);
    
    quests_vec.push_back(Quest {
        id: symbol_short!("BQ1"),
        creator: creator.clone(),
        reward_asset: token.clone(),
        reward_amount: 100,
        verifier: verifier.clone(),
        deadline: now + MIN_DEADLINE_DURATION - 1, // too soon
        status: earn_quest::types::QuestStatus::Active,
        total_claims: 0,
    });
    
    metadata_vec.push_back(QuestMetadata {
        title: soroban_sdk::String::from_str(&env, "Test Quest"),
        description: MetadataDescription::Inline(soroban_sdk::String::from_str(&env, "Description")),
        requirements: Vec::new(&env),
        category: soroban_sdk::String::from_str(&env, "test"),
        tags: Vec::new(&env),
    });

    let mut batch_inputs = Vec::new(&env);
    batch_inputs.push_back(BatchQuestInput {
        quests: quests_vec,
        metadata: metadata_vec,
    });

    let result = client.try_register_quests_batch(&creator, &batch_inputs);
    assert!(result.is_err(), "batch with too-soon deadline must be rejected");
}

/// Batch registration with a valid deadline must succeed.
#[test]
fn test_batch_registration_valid_deadline_accepted() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let now: u64 = 10_000;
    set_time(&env, now);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let token = Address::generate(&env);

    use earn_quest::types::{BatchQuestInput, Quest, QuestMetadata, MetadataDescription};
    use soroban_sdk::Vec;

    let mut quests_vec = Vec::new(&env);
    let mut metadata_vec = Vec::new(&env);
    
    quests_vec.push_back(Quest {
        id: symbol_short!("BQ2"),
        creator: creator.clone(),
        reward_asset: token.clone(),
        reward_amount: 100,
        verifier: verifier.clone(),
        deadline: now + MIN_DEADLINE_DURATION + 1_000,
        status: earn_quest::types::QuestStatus::Active,
        total_claims: 0,
    });
    
    metadata_vec.push_back(QuestMetadata {
        title: soroban_sdk::String::from_str(&env, "Test Quest"),
        description: MetadataDescription::Inline(soroban_sdk::String::from_str(&env, "Description")),
        requirements: Vec::new(&env),
        category: soroban_sdk::String::from_str(&env, "test"),
        tags: Vec::new(&env),
    });

    let mut batch_inputs = Vec::new(&env);
    batch_inputs.push_back(BatchQuestInput {
        quests: quests_vec,
        metadata: metadata_vec,
    });

    let result = client.try_register_quests_batch(&creator, &batch_inputs);
    assert!(result.is_ok(), "batch with valid deadline must be accepted");
}
