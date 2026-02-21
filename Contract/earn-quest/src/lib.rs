#![no_std]

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Symbol};

mod errors;
mod escrow;
mod init;
mod payout;
mod quest;
mod reputation;
mod storage;
mod submission;
pub mod test;
pub mod types;

use errors::Error;
use init::ContractConfig;
use types::{Quest, Submission, UserStats};

// Re-export types for use in tests
pub use types::{QuestStatus, SubmissionStatus};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    /// Register a new quest with participant limit
    #[allow(clippy::too_many_arguments)]
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

    /// Approve submission and trigger payout from escrow (verifier only)
    pub fn approve_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        verifier: Address,
    ) -> Result<(), Error> {
        // Validate sufficient escrow before approving
        let quest_data = storage::get_quest(&env, &quest_id).ok_or(Error::QuestNotFound)?;
        escrow::validate_escrow_sufficient(&env, &quest_id, quest_data.reward_amount)?;

        // Approve submission and increment claim counter
        submission::approve_submission(&env, &quest_id, &submitter, &verifier)?;

        // Process payout from escrow
        payout::process_payout(&env, &quest_id, &submitter)?;

        // Award XP to user
        reputation::award_xp(&env, &submitter, 100)?;

        // Update submission to paid
        let mut sub = storage::get_submission(&env, &quest_id, &submitter)
            .ok_or(Error::SubmissionNotFound)?;
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

    /// Check if a quest has expired based on its deadline
    pub fn check_expired(env: Env, quest_id: Symbol) -> Result<bool, Error> {
        let quest = storage::get_quest(&env, &quest_id).ok_or(Error::QuestNotFound)?;
        Ok(quest::check_expired(&env, &quest))
    }

    /// Manually expire a quest (creator only)
    pub fn expire_quest(env: Env, quest_id: Symbol, caller: Address) -> Result<(), Error> {
        quest::expire_quest(&env, &quest_id, &caller)
    }

    /// Initialize the contract with admin setup
    ///
    /// This function must be called before any other contract functions.
    /// It can only be called once. Subsequent calls will fail.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        init::initialize(&env, admin)
    }

    /// Get current contract configuration
    pub fn get_config(env: Env) -> Result<ContractConfig, Error> {
        init::get_config(&env)
    }

    /// Update contract configuration (admin only)
    pub fn update_config(
        env: Env,
        admin: Address,
        new_admin: Option<Address>,
    ) -> Result<(), Error> {
        init::update_config(&env, admin, new_admin)
    }

    /// Authorize contract upgrade (admin only)
    ///
    /// This function verifies that only the admin can authorize upgrades.
    /// It does not perform the upgrade itself but validates the authorization.
    pub fn authorize_upgrade(env: Env, admin: Address) -> Result<(), Error> {
        init::authorize_upgrade(&env, admin)
    }

    /// Check if contract is initialized
    pub fn is_initialized(env: Env) -> bool {
        init::is_initialized(&env)
    }

    /// Get current contract version
    pub fn get_version(env: Env) -> Result<u32, Error> {
        init::get_version(&env)
    }

    /// Get the current admin address
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        init::get_admin(&env)
    }

    // ── Escrow Functions ──

    /// Deposit funds into escrow for a quest (creator only).
    /// Tokens are transferred from the creator to the contract and held until payout or withdrawal.
    pub fn deposit_escrow(
        env: Env,
        quest_id: Symbol,
        creator: Address,
        amount: i128,
    ) -> Result<(), Error> {
        escrow::deposit_escrow(&env, &quest_id, &creator, amount)
    }

    /// Get the current escrow balance for a quest
    pub fn get_escrow_balance(env: Env, quest_id: Symbol) -> i128 {
        escrow::get_escrow_balance(&env, &quest_id)
    }

    /// Withdraw unclaimed escrow funds back to the quest creator.
    /// Only available after the quest is Completed, Expired, or Cancelled.
    pub fn withdraw_unclaimed(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error> {
        escrow::withdraw_unclaimed(&env, &quest_id, &creator)
    }

    /// Cancel a quest (creator only). Sets status to Cancelled, allowing escrow withdrawal.
    pub fn cancel_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<(), Error> {
        quest::cancel_quest(&env, &quest_id, &creator)
    }
}
