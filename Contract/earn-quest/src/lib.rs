
use soroban_sdk::{contract, contractimpl, Env, Address, Symbol, BytesN, Vec};
mod types;
mod storage;
mod quest;
mod submission;
mod payout;
mod reputation;
mod errors;

use errors::Error;

pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
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
    ) -> Result<types::Submission, Error> {
        submission::get_submission(&env, quest_id, submitter)
    }

    /// Get all quest submissions for a user (returns quest IDs)
    pub fn get_user_submissions(
        env: Env,
        user: Address,
    ) -> Vec<Symbol> {
        submission::get_user_submissions(&env, user)
    }

    /// Register a new quest (placeholder implementation)
    pub fn register_quest(
        env: Env,
        id: Symbol,
        creator: Address,
        reward_asset: Address,
        reward_amount: i128,
        verifier: Address,
        deadline: u64,
    ) -> Result<(), Error> {
        // Check if quest already exists
        if storage::quest_exists(&env, &id) {
            return Err(Error::QuestAlreadyExists);
        }

        // Validate reward amount
        if reward_amount <= 0 {
            return Err(Error::InvalidRewardAmount);
        }

        let quest = types::Quest {
            id,
            creator,
            reward_asset,
            reward_amount,
            verifier,
            deadline,
            status: types::QuestStatus::Active,
            total_claims: 0,
        };

        storage::store_quest(&env, &quest)
    }
}
