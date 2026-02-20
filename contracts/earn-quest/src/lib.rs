#![no_std]

mod admin;
pub mod errors;
mod events;
mod security;
mod payout;
mod reputation;
pub mod storage;
pub mod types;
pub mod validation;
mod quest;
mod submission;

use crate::errors::Error;
use crate::types::{Badge, UserStats};
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Symbol};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    /// Initialize the contract with an initial admin
    pub fn initialize(env: Env, initial_admin: Address) -> Result<(), Error> {
        initial_admin.require_auth();
        storage::set_admin(&env, &initial_admin);
        Ok(())
    }

    /// Add a new admin (admin only)
    pub fn add_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::add_admin(&env, &caller, &new_admin)
    }

    /// Remove an admin (admin only)
    pub fn remove_admin(env: Env, caller: Address, admin_to_remove: Address) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::remove_admin(&env, &caller, &admin_to_remove)
    }

    /// Check if an address is an admin
    pub fn is_admin(env: Env, address: Address) -> bool {
        admin::is_admin(&env, &address)
    }

    /// Register a new quest with full input validation
    pub fn register_quest(
        env: Env,
        id: Symbol,
        creator: Address,
        reward_asset: Address,
        reward_amount: i128,
        verifier: Address,
        deadline: u64,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        creator.require_auth();

        quest::register_quest(
            &env,
            &id,
            &creator,
            &reward_asset,
            reward_amount,
            &verifier,
            deadline,
        )
    }

    /// Submit proof with input validation
    pub fn submit_proof(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        proof_hash: BytesN<32>,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        submitter.require_auth();

        submission::submit_proof(&env, &quest_id, &submitter, &proof_hash)
    }

    /// Approve submission with status transition validation
    pub fn approve_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        verifier: Address,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        verifier.require_auth();

        submission::approve_submission(&env, &quest_id, &submitter, &verifier)
    }

    /// Claim approved reward with full validation
    pub fn claim_reward(env: Env, quest_id: Symbol, submitter: Address) -> Result<(), Error> {
        // 1. Auth
        security::require_not_paused(&env)?;
        submitter.require_auth();

        // 2. Validate claim (status transitions, limits)
        submission::validate_claim(&env, &quest_id, &submitter)?;

        // 3. Data Retrieval for payout
        let quest = storage::get_quest(&env, &quest_id)?;

        // 4. Payout
        payout::transfer_reward(&env, &quest.reward_asset, &submitter, quest.reward_amount)?;

        // 5. State Update
        storage::update_submission_status(
            &env,
            &quest_id,
            &submitter,
            types::SubmissionStatus::Paid,
        )?;
        storage::increment_quest_claims(&env, &quest_id)?;

        // EMIT EVENT: RewardClaimed
        events::reward_claimed(
            &env,
            quest_id.clone(),
            submitter.clone(),
            quest.reward_asset,
            quest.reward_amount,
        );

        // 6. Award XP for quest completion
        reputation::award_xp(&env, &submitter, 100)?;

        Ok(())
    }

    /// Get user reputation stats
    pub fn get_user_stats(env: Env, user: Address) -> UserStats {
        reputation::get_user_stats(&env, &user)
    }

    /// Grant a badge to a user (admin only) with array length validation
    pub fn grant_badge(env: Env, admin: Address, user: Address, badge: Badge) -> Result<(), Error> {
        security::require_not_paused(&env)?;

        // Validate badge count before granting
        let stats = storage::get_user_stats_or_default(&env, &user);
        validation::validate_badge_count(stats.badges.len())?;

        reputation::grant_badge(&env, &admin, &user, badge)
    }

    /// Emergency: pause contract immediately (admin only)
    pub fn emergency_pause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_pause(&env, &caller)
    }

    /// Emergency: approve unpause (admin multisig approval)
    pub fn emergency_approve_unpause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_approve_unpause(&env, &caller)
    }

    /// Emergency: unpause contract after approvals and timelock
    pub fn emergency_unpause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_unpause(&env, &caller)
    }

    /// Emergency withdrawal when paused (admin only) with amount validation
    pub fn emergency_withdraw(
        env: Env,
        caller: Address,
        asset: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        // Validate withdraw amount range
        validation::validate_reward_amount(amount)?;
        security::emergency_withdraw(&env, &caller, &asset, &to, amount)
    }

    /// Admin: set unpause approvals threshold
    pub fn set_unpause_threshold(env: Env, caller: Address, threshold: u32) -> Result<(), Error> {
        security::set_unpause_threshold(&env, &caller, threshold)
    }

    /// Admin: set unpause timelock seconds
    pub fn set_unpause_timelock(env: Env, caller: Address, seconds: u64) -> Result<(), Error> {
        security::set_unpause_timelock(&env, &caller, seconds)
    }
}
