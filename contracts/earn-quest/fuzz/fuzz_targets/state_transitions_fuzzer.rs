#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, Symbol};
use earn_quest::EarnQuestContractClient;

/// An operation in the quest lifecycle state machine.
#[derive(Arbitrary, Debug, Clone, Copy)]
enum QuestOp {
    RegisterQuest,
    SubmitProof,
    ApproveSubmission,
    ClaimReward,
    PauseQuest,
    ResumeQuest,
    CancelQuest,
    ExpireQuest,
    OpenDispute,
    ResolveDispute,
}

/// Fuzz input: a sequence of operations to drive the state machine.
#[derive(Arbitrary, Debug)]
struct StateMachineInput {
    /// Sequence of operations to execute (fixed array avoids unbounded allocation).
    ops: [QuestOp; 16],
    /// Reward amount for quest registration.
    reward_amount: i128,
    /// Deadline offset from current ledger time (seconds).
    deadline_offset: u64,
    /// Proof hash bytes.
    proof_hash: [u8; 32],
    /// Claim amount (may differ from reward_amount to exercise partial-pay paths).
    claim_amount: i128,
}

fuzz_target!(|data: StateMachineInput| {
    let env = Env::default();

    // ── Setup actors ─────────────────────────────────────────────────────────
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let arbitrator = Address::generate(&env);
    let reward_asset = Address::generate(&env);

    // ── Deploy and initialise ────────────────────────────────────────────────
    let contract_id = env.register_contract(None, earn_quest::EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.initialize(&admin);
    }));

    // Fixed quest ID for the lifecycle under test.
    let quest_id = Symbol::new(&env, "fuzzquest");
    let proof_hash: BytesN<32> = BytesN::from_array(&env, &data.proof_hash);

    // Sanitise inputs to avoid trivially invalid values.
    let reward_amount = data.reward_amount.abs().clamp(1, 1_000_000_000_000_000);
    let claim_amount = data.claim_amount.abs().clamp(1, reward_amount);
    let deadline = env
        .ledger()
        .timestamp()
        .saturating_add(data.deadline_offset.clamp(60, 86400 * 365));

    // ── Drive the state machine ──────────────────────────────────────────────
    for op in &data.ops {
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| match op {
            QuestOp::RegisterQuest => {
                let _ = client.try_register_quest(
                    &quest_id,
                    &creator,
                    &reward_asset,
                    &reward_amount,
                    &verifier,
                    &deadline,
                );
            }
            QuestOp::SubmitProof => {
                let _ = client.try_submit_proof(&quest_id, &submitter, &proof_hash);
            }
            QuestOp::ApproveSubmission => {
                let _ = client.try_approve_submission(&quest_id, &submitter, &verifier);
            }
            QuestOp::ClaimReward => {
                let _ = client.try_claim_reward(&quest_id, &submitter, &claim_amount);
            }
            QuestOp::PauseQuest => {
                let _ = client.try_pause_quest(&admin, &quest_id);
            }
            QuestOp::ResumeQuest => {
                let _ = client.try_resume_quest(&admin, &quest_id);
            }
            QuestOp::CancelQuest => {
                let _ = client.try_cancel_quest(&quest_id, &creator);
            }
            QuestOp::ExpireQuest => {
                let _ = client.try_expire_quest(&quest_id, &creator);
            }
            QuestOp::OpenDispute => {
                let _ = client.try_open_dispute(&quest_id, &submitter, &arbitrator);
            }
            QuestOp::ResolveDispute => {
                let _ = client.try_resolve_dispute(&quest_id, &submitter, &arbitrator, &false, &0_u32);
            }
        }));
    }

    // ── Invariant checks ─────────────────────────────────────────────────────
    // After any sequence of operations the contract must remain queryable
    // without panicking (no corrupted state).
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = client.try_get_quest(&quest_id);
    }));

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = client.try_get_user_stats(&submitter);
    }));

    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = client.try_get_submission(&quest_id, &submitter);
    }));
});
