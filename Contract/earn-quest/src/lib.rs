#![no_std]

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Symbol, Vec};

mod errors;
mod payout;
mod quest;
mod reputation;
mod storage;
mod submission;
pub mod test;
pub mod types;

use errors::Error;
use types::{Quest, QuestStatus, Submission, SubmissionStatus, UserStats};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    /// Register a new quest with participant limit
    pub fn register_quest(
        env: Env,
        id: Symbol,
        creator: Address,
        reward_asset: Address,
        reward_amount: i128,
        verifier: Address,
        deadline: u64,
        max_participants: u32,
    ) -> Result<(), Error> {
        quest::create_quest(
            &env,
            id,
            creator,
            reward_asset,
            reward_amount,
            verifier,
            deadline,
            max_participants,
        )
    }

    /// Get quest details
    pub fn get_quest(env: Env, id: Symbol) -> Result<Quest, Error> {
        storage::get_quest(&env, &id).ok_or(Error::QuestNotFound)
    }

    /// Update quest status (creator only)
    pub fn update_quest_status(
        env: Env,
        quest_id: Symbol,
        caller: Address,
        status: QuestStatus,
    ) -> Result<(), Error> {
        quest::update_quest_status(&env, &quest_id, &caller, status)
    }

    /// Check if a quest has reached its participant limit
    pub fn is_quest_full(env: Env, quest_id: Symbol) -> Result<bool, Error> {
        let quest = storage::get_quest(&env, &quest_id).ok_or(Error::QuestNotFound)?;
        Ok(quest::is_quest_full(&quest))
    }

    /// Submit proof for a quest
    pub fn submit_proof(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        proof_hash: BytesN<32>,
    ) -> Result<(), Error> {
        submission::submit_proof(&env, quest_id, submitter, proof_hash)
    }

    /// Get submission details
    pub fn get_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
    ) -> Result<Submission, Error> {
        storage::get_submission(&env, &quest_id, &submitter).ok_or(Error::SubmissionNotFound)
    }

    /// Approve submission and trigger payout (verifier only)
    pub fn approve_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        verifier: Address,
    ) -> Result<(), Error> {
        // Approve submission and increment claim counter
        submission::approve_submission(&env, &quest_id, &submitter, &verifier)?;

        // Get quest and submission
        let quest = storage::get_quest(&env, &quest_id).ok_or(Error::QuestNotFound)?;
        let mut sub = storage::get_submission(&env, &quest_id, &submitter)
            .ok_or(Error::SubmissionNotFound)?;

        // Transfer reward using Stellar token contract
        // Note: In production, this would transfer tokens. In tests, we skip this.
        // let token_client = token::Client::new(&env, &quest.reward_asset);
        // token_client.transfer(
        //     &quest.creator,
        //     &submitter,
        //     &quest.reward_amount,
        // );

        // Award XP to user
        reputation::award_xp(&env, &submitter, 100)?;

        // Update submission to paid
        sub.status = SubmissionStatus::Paid;
        storage::set_submission(&env, &sub);

        Ok(())
    }

    /// Reject submission (verifier only)
    pub fn reject_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        verifier: Address,
    ) -> Result<(), Error> {
        submission::reject_submission(&env, &quest_id, &submitter, &verifier)
    }

    /// Get user statistics
    pub fn get_user_stats(env: Env, address: Address) -> Result<UserStats, Error> {
        storage::get_user_stats(&env, &address).ok_or(Error::UserStatsNotFound)
    }

    /// Grant badge to user (admin only)
    pub fn grant_badge(
        env: Env,
        address: Address,
        badge: Symbol,
        admin: Address,
    ) -> Result<(), Error> {
        reputation::grant_badge(&env, &address, badge, &admin)
    }
}
