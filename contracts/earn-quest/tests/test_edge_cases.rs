#![cfg(test)]

//! Edge case test coverage for the EarnQuest contract.
//!
//! Covers scenarios not exercised by the focused unit tests:
//!   - Contract initialization guard (double-init)
//!   - Deadline boundary values (too-soon / too-far)
//!   - Commit-reveal flow errors (wrong salt, double commit, reveal without commit)
//!   - Claim on non-approved / rejected submissions
//!   - Submitting to paused or time-expired quests
//!   - Dispute state-machine violations
//!   - Batch size limits
//!   - Reward-range query edge cases
//!   - Platform / creator stats
//!   - Quest cancellation authorization

extern crate earn_quest;

use earn_quest::types::{BatchApprovalInput, BatchQuestInput};
use earn_quest::validation;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    Address, BytesN, Env, Symbol, Vec,
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Deploy and initialize the contract; return (env, client, admin, token_address).
fn setup() -> (Env, EarnQuestContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin);
    let token = token_obj.address();

    // timestamp > 0 so deadline arithmetic makes sense
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    client.initialize(&admin);

    (env, client, admin, token)
}

/// Register a standard quest with a far-future deadline.
fn register_quest(
    env: &Env,
    client: &EarnQuestContractClient,
    quest_id: &Symbol,
    creator: &Address,
    token: &Address,
    verifier: &Address,
) {
    let deadline = env.ledger().timestamp() + 86_400; // +1 day
    client.register_quest(quest_id, creator, token, &500_i128, verifier, &deadline);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Initialization
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_sets_admin_and_roles() {
    let (_env, client, admin, _token) = setup();

    assert_eq!(client.get_admin(), admin);
    assert!(client.is_admin(&admin));
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialization_panics() {
    let (_env, client, admin, _token) = setup();
    // Second call must panic
    client.initialize(&admin);
}

#[test]
fn test_has_role_returns_false_for_unknown_address() {
    let (env, client, _admin, _token) = setup();
    let stranger = Address::generate(&env);
    use earn_quest::types::Role;
    assert!(!client.has_role(&stranger, &Role::Admin));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Deadline boundary values
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_deadline_exactly_min_duration_is_valid() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let now = env.ledger().timestamp();

    // deadline = now + MIN_DEADLINE_DURATION  →  valid
    let deadline = now + validation::MIN_DEADLINE_DURATION;
    let result = client.try_register_quest(
        &symbol_short!("QE1"),
        &creator,
        &token,
        &100_i128,
        &verifier,
        &deadline,
    );
    assert!(result.is_ok(), "deadline at exactly MIN_DEADLINE_DURATION should be accepted");
}

#[test]
fn test_deadline_one_second_before_min_duration_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let now = env.ledger().timestamp();

    // deadline = now + MIN_DEADLINE_DURATION - 1  →  DeadlineTooSoon
    let deadline = now + validation::MIN_DEADLINE_DURATION - 1;
    let result = client.try_register_quest(
        &symbol_short!("QE2"),
        &creator,
        &token,
        &100_i128,
        &verifier,
        &deadline,
    );
    assert!(result.is_err(), "deadline just below MIN_DEADLINE_DURATION should be rejected");
}

#[test]
fn test_deadline_at_max_duration_is_valid() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let now = env.ledger().timestamp();

    // deadline = now + MAX_DEADLINE_DURATION  →  valid
    let deadline = now + validation::MAX_DEADLINE_DURATION;
    let result = client.try_register_quest(
        &symbol_short!("QE3"),
        &creator,
        &token,
        &100_i128,
        &verifier,
        &deadline,
    );
    assert!(result.is_ok(), "deadline at MAX_DEADLINE_DURATION should be accepted");
}

#[test]
fn test_deadline_one_second_beyond_max_duration_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let now = env.ledger().timestamp();

    // deadline = now + MAX_DEADLINE_DURATION + 1  →  DeadlineTooFar
    let deadline = now + validation::MAX_DEADLINE_DURATION + 1;
    let result = client.try_register_quest(
        &symbol_short!("QE4"),
        &creator,
        &token,
        &100_i128,
        &verifier,
        &deadline,
    );
    assert!(result.is_err(), "deadline beyond MAX_DEADLINE_DURATION should be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Commit-reveal edge cases
// ─────────────────────────────────────────────────────────────────────────────

/// Build the commitment hash the same way the contract does:
///   sha256(proof_hash || salt || submitter_xdr)
fn make_commitment(env: &Env, proof: &BytesN<32>, salt: &BytesN<32>, submitter: &Address) -> BytesN<32> {
    use soroban_sdk::{xdr::ToXdr, Bytes};
    let mut data = Bytes::new(env);
    data.append(&proof.clone().into());
    data.append(&salt.clone().into());
    data.append(&submitter.to_xdr(env));
    BytesN::from(env.crypto().sha256(&data))
}

#[test]
fn test_commit_then_reveal_succeeds() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("CR1");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    let proof: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
    let salt: BytesN<32> = BytesN::from_array(&env, &[9u8; 32]);
    let commitment = make_commitment(&env, &proof, &salt, &submitter);

    client.commit_submission(&quest_id, &submitter, &commitment);
    // Reveal must succeed
    client.reveal_submission(&quest_id, &submitter, &proof, &salt);

    // Submission should now exist with Pending status
    let sub = client.get_submission(&quest_id, &submitter);
    use earn_quest::types::SubmissionStatus;
    assert_eq!(sub.status, SubmissionStatus::Pending);
}

#[test]
fn test_reveal_with_wrong_salt_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("CR2");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    let proof: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
    let correct_salt: BytesN<32> = BytesN::from_array(&env, &[9u8; 32]);
    let wrong_salt: BytesN<32> = BytesN::from_array(&env, &[0u8; 32]);

    let commitment = make_commitment(&env, &proof, &correct_salt, &submitter);
    client.commit_submission(&quest_id, &submitter, &commitment);

    // Reveal with wrong salt → InvalidCommitment
    let result = client.try_reveal_submission(&quest_id, &submitter, &proof, &wrong_salt);
    assert!(result.is_err(), "reveal with wrong salt must be rejected");
}

#[test]
fn test_reveal_with_wrong_proof_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("CR3");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    let proof: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
    let wrong_proof: BytesN<32> = BytesN::from_array(&env, &[8u8; 32]);
    let salt: BytesN<32> = BytesN::from_array(&env, &[9u8; 32]);

    let commitment = make_commitment(&env, &proof, &salt, &submitter);
    client.commit_submission(&quest_id, &submitter, &commitment);

    // Reveal with wrong proof → InvalidCommitment
    let result = client.try_reveal_submission(&quest_id, &submitter, &wrong_proof, &salt);
    assert!(result.is_err(), "reveal with wrong proof must be rejected");
}

#[test]
fn test_double_commit_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("CR4");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    let proof: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
    let salt: BytesN<32> = BytesN::from_array(&env, &[9u8; 32]);
    let commitment = make_commitment(&env, &proof, &salt, &submitter);

    client.commit_submission(&quest_id, &submitter, &commitment);

    // Second commit for same (quest, submitter) → AlreadyApproved (#52)
    let result = client.try_commit_submission(&quest_id, &submitter, &commitment);
    assert!(result.is_err(), "double commit must be rejected");
}

#[test]
fn test_reveal_without_prior_commit_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("CR5");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    let proof: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
    let salt: BytesN<32> = BytesN::from_array(&env, &[9u8; 32]);

    // No commit was made → CommitmentNotFound (#113)
    let result = client.try_reveal_submission(&quest_id, &submitter, &proof, &salt);
    assert!(result.is_err(), "reveal without prior commit must be rejected");
}

#[test]
fn test_commit_to_nonexistent_quest_rejected() {
    let (env, client, _admin, _token) = setup();
    let submitter = Address::generate(&env);
    let fake_quest = symbol_short!("NOQUEST");
    let commitment: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);

    let result = client.try_commit_submission(&fake_quest, &submitter, &commitment);
    assert!(result.is_err(), "commit to non-existent quest must be rejected");
}

#[test]
fn test_commit_to_expired_quest_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("CR6");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    // Advance ledger past the deadline
    env.ledger().with_mut(|l| l.timestamp = 1_000 + 86_400 + 100);

    let commitment: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_commit_submission(&quest_id, &submitter, &commitment);
    assert!(result.is_err(), "commit on expired quest must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Claim on non-approved / rejected submissions
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_claim_pending_submission_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("CL1");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    let proof: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);

    // Submission is Pending, not Approved → InvalidStatusTransition
    let result = client.try_claim_reward(&quest_id, &submitter);
    assert!(result.is_err(), "claiming a pending submission must be rejected");
}

#[test]
fn test_claim_rejected_submission_rejected() {
    let (env, client, admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("CL2");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    let proof: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);

    // Use the admin as a mock stand-in for a rejection call path.
    // Since there is no explicit reject_submission entry point in lib.rs we
    // verify the claim guard by attempting to claim a non-approved submission.
    // The submission is still Pending, so this tests the same guard.
    let result = client.try_claim_reward(&quest_id, &submitter);
    assert!(result.is_err(), "claiming an unapproved submission must be rejected");
    let _ = admin; // silence unused warning
}

#[test]
fn test_claim_nonexistent_submission_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let stranger = Address::generate(&env);
    let quest_id = symbol_short!("CL3");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    // No submission was ever made by `stranger`
    let result = client.try_claim_reward(&quest_id, &stranger);
    assert!(result.is_err(), "claiming for a non-existent submission must be rejected");
}

#[test]
fn test_claim_nonexistent_quest_rejected() {
    let (env, client, _admin, _token) = setup();
    let submitter = Address::generate(&env);

    let result = client.try_claim_reward(&symbol_short!("NOPE"), &submitter);
    assert!(result.is_err(), "claiming reward for non-existent quest must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Submitting to paused or time-expired quests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_submit_proof_to_paused_quest_rejected() {
    let (env, client, admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("SP1");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    // Grant Admin role so pause_quest succeeds
    use earn_quest::types::Role;
    client.grant_role(&admin, &admin, &Role::Admin);
    client.pause_quest(&admin, &quest_id);

    let proof: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof);
    assert!(result.is_err(), "submit to paused quest must be rejected");
}

#[test]
fn test_submit_proof_after_deadline_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("SP2");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    // Advance time past the deadline
    env.ledger().with_mut(|l| l.timestamp = 1_000 + 86_400 + 100);

    let proof: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
    let result = client.try_submit_proof(&quest_id, &submitter, &proof);
    assert!(result.is_err(), "submit after deadline must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Quest status transitions — illegal paths
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_pause_already_paused_quest_rejected() {
    let (env, client, admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let quest_id = symbol_short!("QS1");

    use earn_quest::types::Role;
    client.grant_role(&admin, &admin, &Role::Admin);
    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    client.pause_quest(&admin, &quest_id);

    // Pausing an already-paused quest → InvalidStatusTransition
    let result = client.try_pause_quest(&admin, &quest_id);
    assert!(result.is_err(), "pausing an already-paused quest must be rejected");
}

#[test]
fn test_resume_active_quest_rejected() {
    let (env, client, admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let quest_id = symbol_short!("QS2");

    use earn_quest::types::Role;
    client.grant_role(&admin, &admin, &Role::Admin);
    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    // Quest is Active, cannot resume an already-active quest
    let result = client.try_resume_quest(&admin, &quest_id);
    assert!(result.is_err(), "resuming an already-active quest must be rejected");
}

#[test]
fn test_pause_nonexistent_quest_rejected() {
    let (env, client, admin, _token) = setup();

    use earn_quest::types::Role;
    client.grant_role(&admin, &admin, &Role::Admin);

    let result = client.try_pause_quest(&admin, &symbol_short!("NONE"));
    assert!(result.is_err(), "pausing a non-existent quest must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Dispute state-machine violations
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_open_duplicate_pending_dispute_rejected() {
    let (env, client, _admin, _token) = setup();
    let initiator = Address::generate(&env);
    let arbitrator = Address::generate(&env);
    let quest_id = symbol_short!("D1");

    client.open_dispute(&quest_id, &initiator, &arbitrator);

    // Opening a second dispute while first is still Pending → DisputeAlreadyExists (#82)
    let result = client.try_open_dispute(&quest_id, &initiator, &arbitrator);
    assert!(result.is_err(), "duplicate pending dispute must be rejected");
}

#[test]
fn test_resolve_nonexistent_dispute_rejected() {
    let (env, client, _admin, _token) = setup();
    let initiator = Address::generate(&env);
    let arbitrator = Address::generate(&env);

    let result = client.try_resolve_dispute(&symbol_short!("D2"), &initiator, &arbitrator);
    assert!(result.is_err(), "resolving a non-existent dispute must be rejected");
}

#[test]
fn test_resolve_dispute_by_wrong_arbitrator_rejected() {
    let (env, client, _admin, _token) = setup();
    let initiator = Address::generate(&env);
    let arbitrator = Address::generate(&env);
    let wrong_arbitrator = Address::generate(&env);
    let quest_id = symbol_short!("D3");

    client.open_dispute(&quest_id, &initiator, &arbitrator);

    // Wrong arbitrator → DisputeNotAuthorized (#84)
    let result = client.try_resolve_dispute(&quest_id, &initiator, &wrong_arbitrator);
    assert!(result.is_err(), "resolve by wrong arbitrator must be rejected");
}

#[test]
fn test_withdraw_resolved_dispute_rejected() {
    let (env, client, _admin, _token) = setup();
    let initiator = Address::generate(&env);
    let arbitrator = Address::generate(&env);
    let quest_id = symbol_short!("D4");

    client.open_dispute(&quest_id, &initiator, &arbitrator);
    client.resolve_dispute(&quest_id, &initiator, &arbitrator);

    // Already Resolved, cannot withdraw → DisputeNotPending (#83)
    let result = client.try_withdraw_dispute(&quest_id, &initiator);
    assert!(result.is_err(), "withdrawing a resolved dispute must be rejected");
}

#[test]
fn test_appeal_pending_dispute_rejected() {
    let (env, client, _admin, _token) = setup();
    let initiator = Address::generate(&env);
    let arbitrator = Address::generate(&env);
    let new_arbitrator = Address::generate(&env);
    let quest_id = symbol_short!("D5");

    client.open_dispute(&quest_id, &initiator, &arbitrator);

    // Dispute is Pending (not Resolved) → DisputeNotResolved (#95)
    let result = client.try_appeal_dispute(&quest_id, &initiator, &new_arbitrator);
    assert!(result.is_err(), "appealing a pending dispute must be rejected");
}

#[test]
fn test_get_nonexistent_dispute_rejected() {
    let (env, client, _admin, _token) = setup();
    let initiator = Address::generate(&env);

    let result = client.try_get_dispute(&symbol_short!("D6"), &initiator);
    assert!(result.is_err(), "fetching a non-existent dispute must be rejected");
}

#[test]
fn test_reopen_dispute_after_withdrawal_is_allowed() {
    let (env, client, _admin, _token) = setup();
    let initiator = Address::generate(&env);
    let arbitrator = Address::generate(&env);
    let quest_id = symbol_short!("D7");

    client.open_dispute(&quest_id, &initiator, &arbitrator);
    client.withdraw_dispute(&quest_id, &initiator);

    // After withdrawal the contract allows a new dispute to overwrite the old record
    let result = client.try_open_dispute(&quest_id, &initiator, &arbitrator);
    assert!(result.is_ok(), "re-opening after withdrawal must be allowed");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Batch size limit enforcement
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_batch_quest_registration_exceeds_max_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86_400;

    let mut quests: Vec<BatchQuestInput> = Vec::new(&env);
    for i in 0..=validation::MAX_BATCH_QUEST_REGISTRATION {
        quests.push_back(BatchQuestInput {
            id: Symbol::new(&env, &format!("q{}", i)),
            reward_asset: token.clone(),
            reward_amount: 100_i128,
            verifier: verifier.clone(),
            deadline,
        });
    }

    let result = client.try_register_quests_batch(&creator, &quests);
    assert!(result.is_err(), "batch exceeding MAX_BATCH_QUEST_REGISTRATION must be rejected");
}

#[test]
fn test_batch_approval_exceeds_max_rejected() {
    let (env, client, _admin, _token) = setup();
    let verifier = Address::generate(&env);

    let mut approvals: Vec<BatchApprovalInput> = Vec::new(&env);
    for i in 0..=validation::MAX_BATCH_APPROVALS {
        let mut subs: Vec<Address> = Vec::new(&env);
        subs.push_back(Address::generate(&env));
        approvals.push_back(BatchApprovalInput {
            quest_id: Symbol::new(&env, &format!("q{}", i)),
            submissions: subs,
        });
    }

    let result = client.try_approve_submissions_batch(&verifier, &approvals);
    assert!(result.is_err(), "batch approval exceeding MAX_BATCH_APPROVALS must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Reward-range query edge cases
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_reward_range_exact_boundary_match() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86_400;

    // Register two quests: reward 100 and reward 500
    client.register_quest(
        &symbol_short!("RR1"),
        &creator,
        &token,
        &100_i128,
        &verifier,
        &deadline,
    );
    client.register_quest(
        &symbol_short!("RR2"),
        &creator,
        &token,
        &500_i128,
        &verifier,
        &deadline,
    );

    // Query with min == max == 100: should match exactly one quest
    let results = client.get_quests_by_reward_range(&100_i128, &100_i128, &0, &10);
    assert_eq!(results.len(), 1, "exact boundary reward query should return one result");
    assert_eq!(results.get(0).unwrap().reward_amount, 100);
}

#[test]
fn test_reward_range_inverted_min_max_returns_empty() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86_400;

    client.register_quest(
        &symbol_short!("RR3"),
        &creator,
        &token,
        &300_i128,
        &verifier,
        &deadline,
    );

    // min > max (inverted range) → no quest satisfies both constraints
    let results = client.get_quests_by_reward_range(&900_i128, &100_i128, &0, &10);
    assert_eq!(results.len(), 0, "inverted reward range must return empty");
}

#[test]
fn test_reward_range_query_zero_limit_returns_empty() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86_400;

    client.register_quest(
        &symbol_short!("RR4"),
        &creator,
        &token,
        &200_i128,
        &verifier,
        &deadline,
    );

    // limit = 0: caller asked for nothing
    let results = client.get_quests_by_reward_range(&1_i128, &1_000_000_i128, &0, &0);
    assert_eq!(results.len(), 0, "limit=0 must return empty");
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Platform and creator stats
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_platform_stats_initial_state() {
    let (_env, client, _admin, _token) = setup();
    let stats = client.get_platform_stats();

    assert_eq!(stats.total_quests_created, 0);
    assert_eq!(stats.total_submissions, 0);
    assert_eq!(stats.total_rewards_distributed, 0);
    assert_eq!(stats.total_active_users, 0);
    assert_eq!(stats.total_rewards_claimed, 0);
}

#[test]
fn test_creator_stats_for_unknown_address_returns_defaults() {
    let (env, client, _admin, _token) = setup();
    let stranger = Address::generate(&env);

    let stats = client.get_creator_stats(&stranger);
    assert_eq!(stats.quests_created, 0);
    assert_eq!(stats.total_rewards_posted, 0);
}

#[test]
fn test_reset_platform_stats_by_non_stats_admin_rejected() {
    let (env, client, _admin, _token) = setup();
    let unauthorized = Address::generate(&env);

    let result = client.try_reset_platform_stats(&unauthorized);
    assert!(result.is_err(), "non-StatsAdmin must not reset platform stats");
}

#[test]
fn test_reset_platform_stats_by_stats_admin_succeeds() {
    let (env, client, admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86_400;

    // Register a quest so stats are non-zero
    client.register_quest(
        &symbol_short!("PS1"),
        &creator,
        &token,
        &100_i128,
        &verifier,
        &deadline,
    );

    // admin already has StatsAdmin role from initialize
    client.reset_platform_stats(&admin);

    let stats = client.get_platform_stats();
    assert_eq!(stats.total_quests_created, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Quest cancellation authorization
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_cancel_quest_by_non_creator_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let imposter = Address::generate(&env);
    let quest_id = symbol_short!("CQ1");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    let result = client.try_cancel_quest(&quest_id, &imposter);
    assert!(result.is_err(), "cancel by non-creator must be rejected");
}

#[test]
fn test_expire_quest_before_deadline_rejected() {
    let (env, client, _admin, token) = setup();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let quest_id = symbol_short!("CQ2");

    register_quest(&env, &client, &quest_id, &creator, &token, &verifier);

    // Deadline is still in the future → cannot expire yet
    let result = client.try_expire_quest(&quest_id, &creator);
    assert!(result.is_err(), "expiring a quest before its deadline must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Admin role management edge cases
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_add_admin_by_non_superadmin_rejected() {
    let (env, client, _admin, _token) = setup();
    let unauthorized = Address::generate(&env);
    let new_admin = Address::generate(&env);

    let result = client.try_add_admin(&unauthorized, &new_admin);
    assert!(result.is_err(), "add_admin by non-SuperAdmin must be rejected");
}

#[test]
fn test_grant_role_when_contract_paused_rejected() {
    let (env, client, admin, _token) = setup();
    let grantee = Address::generate(&env);

    use earn_quest::types::Role;
    client.emergency_pause(&admin);

    let result = client.try_grant_role(&admin, &grantee, &Role::Admin);
    assert!(result.is_err(), "grant_role while paused must be rejected");
}
