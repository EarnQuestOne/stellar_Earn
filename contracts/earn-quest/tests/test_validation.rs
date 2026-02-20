#![cfg(test)]

use soroban_sdk::{symbol_short, testutils::Address as _, testutils::Ledger, Address, BytesN, Env};

extern crate earn_quest;
use earn_quest::types::{QuestStatus, SubmissionStatus};
use earn_quest::validation;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

//================================================================================
// Test Setup
//================================================================================

fn setup_contract(env: &Env) -> (Address, EarnQuestContractClient<'_>) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);
    (contract_id, client)
}

//================================================================================
// Address Validation Tests
//================================================================================

#[test]
fn test_validate_addresses_distinct_pass() {
    let env = Env::default();
    let addr1 = Address::generate(&env);
    let addr2 = Address::generate(&env);

    let result = validation::validate_addresses_distinct(&addr1, &addr2);
    assert!(result.is_ok());
}

#[test]
fn test_validate_addresses_distinct_fail_same() {
    let env = Env::default();
    let addr1 = Address::generate(&env);

    let result = validation::validate_addresses_distinct(&addr1, &addr1);
    assert!(result.is_err());
}

#[test]
fn test_register_quest_creator_verifier_same_address_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);

    // Set a future deadline
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    // Creator and verifier are the same address - should fail
    let result = client.try_register_quest(
        &quest_id,
        &creator,
        &token,
        &1000,
        &creator, // same as creator
        &5000,
    );

    assert!(result.is_err());
}

//================================================================================
// Amount Range Validation Tests
//================================================================================

#[test]
fn test_validate_reward_amount_valid() {
    let result = validation::validate_reward_amount(100);
    assert!(result.is_ok());
}

#[test]
fn test_validate_reward_amount_minimum_valid() {
    let result = validation::validate_reward_amount(1);
    assert!(result.is_ok());
}

#[test]
fn test_validate_reward_amount_zero_rejected() {
    let result = validation::validate_reward_amount(0);
    assert!(result.is_err());
}

#[test]
fn test_validate_reward_amount_negative_rejected() {
    let result = validation::validate_reward_amount(-100);
    assert!(result.is_err());
}

#[test]
fn test_validate_reward_amount_too_large_rejected() {
    let result = validation::validate_reward_amount(validation::MAX_REWARD_AMOUNT + 1);
    assert!(result.is_err());
}

#[test]
fn test_validate_reward_amount_at_max_valid() {
    let result = validation::validate_reward_amount(validation::MAX_REWARD_AMOUNT);
    assert!(result.is_ok());
}

#[test]
fn test_register_quest_zero_reward_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let result = client.try_register_quest(&quest_id, &creator, &token, &0, &verifier, &5000);
    assert!(result.is_err());
}

#[test]
fn test_register_quest_negative_reward_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let result = client.try_register_quest(&quest_id, &creator, &token, &-500, &verifier, &5000);
    assert!(result.is_err());
}

#[test]
fn test_register_quest_max_reward_valid() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let result = client.try_register_quest(
        &quest_id,
        &creator,
        &token,
        &validation::MAX_REWARD_AMOUNT,
        &verifier,
        &5000,
    );
    assert!(result.is_ok());
}

#[test]
fn test_register_quest_exceeds_max_reward_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let over_max = validation::MAX_REWARD_AMOUNT + 1;
    let result =
        client.try_register_quest(&quest_id, &creator, &token, &over_max, &verifier, &5000);
    assert!(result.is_err());
}

//================================================================================
// Deadline Validation Tests
//================================================================================

#[test]
fn test_validate_deadline_future_valid() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let result = validation::validate_deadline(&env, 2000);
    assert!(result.is_ok());
}

#[test]
fn test_validate_deadline_past_rejected() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 5000;
    });

    let result = validation::validate_deadline(&env, 1000);
    assert!(result.is_err());
}

#[test]
fn test_validate_deadline_equal_to_now_rejected() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let result = validation::validate_deadline(&env, 1000);
    assert!(result.is_err());
}

#[test]
fn test_register_quest_deadline_in_past_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Set current ledger time to 5000
    env.ledger().with_mut(|li| {
        li.timestamp = 5000;
    });

    // Deadline is 1000 (in the past)
    let result = client.try_register_quest(&quest_id, &creator, &token, &1000, &verifier, &1000);
    assert!(result.is_err());
}

#[test]
fn test_register_quest_deadline_in_future_valid() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let result =
        client.try_register_quest(&quest_id, &creator, &token, &500, &verifier, &10000);
    assert!(result.is_ok());
}

//================================================================================
// Quest Expiry Validation Tests
//================================================================================

#[test]
fn test_validate_quest_not_expired_valid() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let result = validation::validate_quest_not_expired(&env, 5000);
    assert!(result.is_ok());
}

#[test]
fn test_validate_quest_expired_rejected() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 6000;
    });

    let result = validation::validate_quest_not_expired(&env, 5000);
    assert!(result.is_err());
}

//================================================================================
// String / Symbol Length Validation Tests
//================================================================================

#[test]
fn test_validate_symbol_length_valid() {
    let result = validation::validate_symbol_length(&symbol_short!("TEST"));
    assert!(result.is_ok());
}

#[test]
fn test_validate_symbol_length_short_valid() {
    let result = validation::validate_symbol_length(&symbol_short!("A"));
    assert!(result.is_ok());
}

//================================================================================
// Array Length Validation Tests
//================================================================================

#[test]
fn test_validate_array_length_valid() {
    let result = validation::validate_array_length(5, 10);
    assert!(result.is_ok());
}

#[test]
fn test_validate_array_length_at_max_valid() {
    let result = validation::validate_array_length(10, 10);
    assert!(result.is_ok());
}

#[test]
fn test_validate_array_length_exceeds_max_rejected() {
    let result = validation::validate_array_length(11, 10);
    assert!(result.is_err());
}

#[test]
fn test_validate_array_length_zero_valid() {
    let result = validation::validate_array_length(0, 10);
    assert!(result.is_ok());
}

#[test]
fn test_validate_badge_count_valid() {
    let result = validation::validate_badge_count(0);
    assert!(result.is_ok());
}

#[test]
fn test_validate_badge_count_at_max_rejected() {
    let result = validation::validate_badge_count(validation::MAX_BADGES_COUNT);
    assert!(result.is_err());
}

#[test]
fn test_validate_badge_count_below_max_valid() {
    let result = validation::validate_badge_count(validation::MAX_BADGES_COUNT - 1);
    assert!(result.is_ok());
}

//================================================================================
// Quest Status Transition Tests
//================================================================================

#[test]
fn test_quest_status_active_to_paused_valid() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Active,
        &QuestStatus::Paused,
    );
    assert!(result.is_ok());
}

#[test]
fn test_quest_status_active_to_completed_valid() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Active,
        &QuestStatus::Completed,
    );
    assert!(result.is_ok());
}

#[test]
fn test_quest_status_active_to_expired_valid() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Active,
        &QuestStatus::Expired,
    );
    assert!(result.is_ok());
}

#[test]
fn test_quest_status_paused_to_active_valid() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Paused,
        &QuestStatus::Active,
    );
    assert!(result.is_ok());
}

#[test]
fn test_quest_status_paused_to_expired_valid() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Paused,
        &QuestStatus::Expired,
    );
    assert!(result.is_ok());
}

#[test]
fn test_quest_status_completed_to_active_rejected() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Completed,
        &QuestStatus::Active,
    );
    assert!(result.is_err());
}

#[test]
fn test_quest_status_expired_to_active_rejected() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Expired,
        &QuestStatus::Active,
    );
    assert!(result.is_err());
}

#[test]
fn test_quest_status_completed_to_paused_rejected() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Completed,
        &QuestStatus::Paused,
    );
    assert!(result.is_err());
}

#[test]
fn test_quest_status_same_to_same_rejected() {
    let result = validation::validate_quest_status_transition(
        &QuestStatus::Active,
        &QuestStatus::Active,
    );
    assert!(result.is_err());
}

//================================================================================
// Submission Status Transition Tests
//================================================================================

#[test]
fn test_submission_status_pending_to_approved_valid() {
    let result = validation::validate_submission_status_transition(
        &SubmissionStatus::Pending,
        &SubmissionStatus::Approved,
    );
    assert!(result.is_ok());
}

#[test]
fn test_submission_status_pending_to_rejected_valid() {
    let result = validation::validate_submission_status_transition(
        &SubmissionStatus::Pending,
        &SubmissionStatus::Rejected,
    );
    assert!(result.is_ok());
}

#[test]
fn test_submission_status_approved_to_paid_valid() {
    let result = validation::validate_submission_status_transition(
        &SubmissionStatus::Approved,
        &SubmissionStatus::Paid,
    );
    assert!(result.is_ok());
}

#[test]
fn test_submission_status_rejected_to_approved_rejected() {
    let result = validation::validate_submission_status_transition(
        &SubmissionStatus::Rejected,
        &SubmissionStatus::Approved,
    );
    assert!(result.is_err());
}

#[test]
fn test_submission_status_paid_to_pending_rejected() {
    let result = validation::validate_submission_status_transition(
        &SubmissionStatus::Paid,
        &SubmissionStatus::Pending,
    );
    assert!(result.is_err());
}

#[test]
fn test_submission_status_pending_to_paid_rejected() {
    // Cannot go directly from Pending to Paid (must be Approved first)
    let result = validation::validate_submission_status_transition(
        &SubmissionStatus::Pending,
        &SubmissionStatus::Paid,
    );
    assert!(result.is_err());
}

#[test]
fn test_submission_status_approved_to_rejected_rejected() {
    // Cannot reject an already approved submission
    let result = validation::validate_submission_status_transition(
        &SubmissionStatus::Approved,
        &SubmissionStatus::Rejected,
    );
    assert!(result.is_err());
}

//================================================================================
// Quest Active Status Validation Tests
//================================================================================

#[test]
fn test_validate_quest_is_active_when_active() {
    let result = validation::validate_quest_is_active(&QuestStatus::Active);
    assert!(result.is_ok());
}

#[test]
fn test_validate_quest_is_active_when_paused_rejected() {
    let result = validation::validate_quest_is_active(&QuestStatus::Paused);
    assert!(result.is_err());
}

#[test]
fn test_validate_quest_is_active_when_completed_rejected() {
    let result = validation::validate_quest_is_active(&QuestStatus::Completed);
    assert!(result.is_err());
}

#[test]
fn test_validate_quest_is_active_when_expired_rejected() {
    let result = validation::validate_quest_is_active(&QuestStatus::Expired);
    assert!(result.is_err());
}

//================================================================================
// Quest Claims Limit Tests
//================================================================================

#[test]
fn test_validate_quest_claims_limit_valid() {
    let result = validation::validate_quest_claims_limit(0);
    assert!(result.is_ok());
}

#[test]
fn test_validate_quest_claims_limit_at_max_rejected() {
    let result = validation::validate_quest_claims_limit(validation::MAX_QUEST_CLAIMS);
    assert!(result.is_err());
}

#[test]
fn test_validate_quest_claims_limit_below_max_valid() {
    let result = validation::validate_quest_claims_limit(validation::MAX_QUEST_CLAIMS - 1);
    assert!(result.is_ok());
}

//================================================================================
// Integration Tests — Full Flow with Validation
//================================================================================

#[test]
fn test_full_quest_lifecycle_with_validation() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);

    // Set ledger time
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    // 1. Register quest (all validations pass)
    client.register_quest(&quest_id, &creator, &token, &500, &verifier, &10000);

    // 2. Submit proof
    let proof = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);

    // 3. Approve submission (validates Pending -> Approved transition)
    client.approve_submission(&quest_id, &submitter, &verifier);
}

#[test]
fn test_duplicate_quest_registration_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    // First registration should succeed
    client.register_quest(&quest_id, &creator, &token, &1000, &verifier, &10000);

    // Second registration with same ID should fail
    let result =
        client.try_register_quest(&quest_id, &creator, &token, &2000, &verifier, &20000);
    assert!(result.is_err());
}

#[test]
fn test_submit_proof_to_nonexistent_quest_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("FAKE");
    let submitter = Address::generate(&env);
    let proof = BytesN::from_array(&env, &[1u8; 32]);

    let result = client.try_submit_proof(&quest_id, &submitter, &proof);
    assert!(result.is_err());
}

#[test]
fn test_approve_by_wrong_verifier_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);
    let wrong_verifier = Address::generate(&env);
    let submitter = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    client.register_quest(&quest_id, &creator, &token, &1000, &verifier, &10000);

    let proof = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);

    // Wrong verifier attempts to approve
    let result = client.try_approve_submission(&quest_id, &submitter, &wrong_verifier);
    assert!(result.is_err());
}

#[test]
fn test_edge_case_min_reward_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    // Minimum valid reward amount (1)
    let result = client.try_register_quest(&quest_id, &creator, &token, &1, &verifier, &10000);
    assert!(result.is_ok());
}

#[test]
fn test_edge_case_deadline_just_after_now() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    // Deadline is just 1 second after current timestamp
    let result = client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &1001);
    assert!(result.is_ok());
}

#[test]
fn test_edge_case_deadline_exactly_at_now_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);

    let quest_id = symbol_short!("QUEST1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    // Deadline equal to now should be rejected
    let result = client.try_register_quest(&quest_id, &creator, &token, &100, &verifier, &1000);
    assert!(result.is_err());
}
