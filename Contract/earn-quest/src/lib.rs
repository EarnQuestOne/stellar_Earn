#![no_std]

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Symbol, Vec};

mod errors;
mod payout;
mod quest;
mod reputation;
mod storage;
mod submission;
mod types;

pub use errors::Error;
pub use types::{Quest, QuestStatus, Submission, SubmissionStatus, UserStats};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    // ==================== Quest Functions ====================

    /// Register a new quest
    /// Only the creator can register a quest and must authorize the transaction
    pub fn register_quest(
        env: Env,
        id: Symbol,
        creator: Address,
        reward_asset: Address,
        reward_amount: i128,
        verifier: Address,
        deadline: u64,
    ) -> Result<(), Error> {
        quest::register_quest(
            &env,
            id,
            creator,
            reward_asset,
            reward_amount,
            verifier,
            deadline,
        )
    }

    /// Get quest details by ID
    pub fn get_quest(env: Env, quest_id: Symbol) -> Result<Quest, Error> {
        quest::get_quest(&env, quest_id)
    }

    /// Update quest status
    /// Only the quest creator can update the status
    pub fn update_quest_status(
        env: Env,
        quest_id: Symbol,
        caller: Address,
        new_status: QuestStatus,
    ) -> Result<(), Error> {
        quest::update_quest_status(&env, quest_id, caller, new_status)
    }

    /// Pause a quest
    pub fn pause_quest(env: Env, quest_id: Symbol, caller: Address) -> Result<(), Error> {
        quest::pause_quest(&env, quest_id, caller)
    }

    /// Resume a paused quest
    pub fn resume_quest(env: Env, quest_id: Symbol, caller: Address) -> Result<(), Error> {
        quest::resume_quest(&env, quest_id, caller)
    }

    /// Complete a quest
    pub fn complete_quest(env: Env, quest_id: Symbol, caller: Address) -> Result<(), Error> {
        quest::complete_quest(&env, quest_id, caller)
    }

    /// Check if a quest exists
    pub fn quest_exists(env: Env, quest_id: Symbol) -> bool {
        quest::quest_exists(&env, &quest_id)
    }

    /// Check if quest is active and not expired
    pub fn is_quest_active(env: Env, quest_id: Symbol) -> Result<bool, Error> {
        quest::is_quest_active(&env, &quest_id)
    }

    // ==================== Submission Functions ====================

    /// Submit proof of quest completion
    /// Validates quest exists, is active, hasn't expired, and prevents duplicates
    pub fn submit_proof(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        proof_hash: BytesN<32>,
    ) -> Result<(), Error> {
        submission::submit_proof(&env, quest_id, submitter, proof_hash)
    }

    /// Get a specific submission by quest_id and submitter
    pub fn get_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
    ) -> Result<Submission, Error> {
        submission::get_submission(&env, quest_id, submitter)
    }

    /// Get all quest submissions for a user (returns quest IDs)
    pub fn get_user_submissions(env: Env, user: Address) -> Vec<Symbol> {
        submission::get_user_submissions(&env, user)
    }

    /// Approve a submission by the designated verifier
    /// Only the quest's assigned verifier can approve submissions
    pub fn approve_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        verifier: Address,
    ) -> Result<(), Error> {
        submission::approve_submission(&env, quest_id, submitter, verifier)
    }

    /// Reject a submission by the designated verifier
    /// Only the quest's assigned verifier can reject submissions
    pub fn reject_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        verifier: Address,
    ) -> Result<(), Error> {
        submission::reject_submission(&env, quest_id, submitter, verifier)
    }
}
