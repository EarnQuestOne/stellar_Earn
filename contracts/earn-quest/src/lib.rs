#![no_std]

mod admin;
pub mod errors;
mod escrow;
mod events;
mod init;
mod payout;
mod quest;
mod reputation;
mod security;
pub mod storage;
mod submission;
pub mod types;
pub mod validation;

use crate::errors::Error;
use crate::types::{Badge, BatchApprovalInput, BatchQuestInput, CreatorStats, EscrowInfo, PlatformStats, Quest, QuestMetadata, QuestStatus, UserStats, Submission};
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, String, Symbol, Vec};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        if storage::is_initialized(&env) {
            panic!("already initialized");
        }
        storage::set_contract_admin(&env, &admin);
        storage::set_admin(&env, &admin);
        storage::mark_initialized(&env);
    }

    pub fn authorize_upgrade(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        if !init::upgrade_authorize(&env, &caller) {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    pub fn get_version(env: Env) -> u32 {
        storage::get_version(&env)
    }

    pub fn get_admin(env: Env) -> Address {
        storage::get_admin(&env)
    }

    pub fn get_config(env: Env) -> Vec<(String, String)> {
        storage::get_config(&env)
    }

    pub fn add_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::add_admin(&env, &caller, &new_admin)
    }

    pub fn remove_admin(env: Env, caller: Address, admin_to_remove: Address) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::remove_admin(&env, &caller, &admin_to_remove)
    }

    pub fn is_admin(env: Env, address: Address) -> bool {
        admin::is_admin(&env, &address)
    }

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
        validation::validate_symbol_length(&id)?;
        validation::validate_addresses_distinct(&creator, &verifier)?;
        validation::validate_reward_amount(reward_amount)?;
        validation::validate_deadline(&env, deadline)?;
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

    pub fn register_quest_with_metadata(
        env: Env,
        id: Symbol,
        creator: Address,
        reward_asset: Address,
        reward_amount: i128,
        verifier: Address,
        deadline: u64,
        metadata: QuestMetadata,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        creator.require_auth();
        validation::validate_symbol_length(&id)?;
        validation::validate_addresses_distinct(&creator, &verifier)?;
        validation::validate_reward_amount(reward_amount)?;
        validation::validate_deadline(&env, deadline)?;
        quest::register_quest_with_metadata(
            &env,
            &id,
            &creator,
            &reward_asset,
            reward_amount,
            &verifier,
            deadline,
            &metadata,
        )
    }

    pub fn register_quests_batch(
        env: Env,
        creator: Address,
        quests: Vec<BatchQuestInput>,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        creator.require_auth();
        validation::validate_array_length(
            quests.len() as u32,
            validation::MAX_BATCH_QUEST_REGISTRATION,
        )?;
        quest::register_quests_batch(&env, &creator, &quests)
    }

    /// Pause an individual quest (admin only).
    pub fn pause_quest(env: Env, caller: Address, quest_id: Symbol) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_admin(&env, &caller)?;
        quest::pause_quest(&env, &quest_id, &caller)
    }

    /// Resume an individual quest (admin only).
    pub fn resume_quest(env: Env, caller: Address, quest_id: Symbol) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_admin(&env, &caller)?;
        quest::resume_quest(&env, &quest_id, &caller)
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

    pub fn approve_submissions_batch(
        env: Env,
        verifier: Address,
        submissions: Vec<BatchApprovalInput>,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        verifier.require_auth();
        submission::approve_submissions_batch(&env, &verifier, &submissions)
    }

    pub fn claim_reward(env: Env, quest_id: Symbol, submitter: Address) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        submitter.require_auth();
        submission::validate_claim(&env, &quest_id, &submitter)?;

        let quest = storage::get_quest(&env, &quest_id)?;

        payout::transfer_reward_from_escrow(
            &env,
            &quest_id,
            &quest.reward_asset,
            &submitter,
            quest.reward_amount,
        )?;
        storage::update_submission_status(
            &env,
            &quest_id,
            &submitter,
            types::SubmissionStatus::Paid,
        )?;
        storage::increment_quest_claims(&env, &quest_id)?;

        events::reward_claimed(
            &env,
            quest_id.clone(),
            submitter.clone(),
            quest.reward_asset,
            quest.reward_amount,
        );

        reputation::award_xp(&env, &submitter, 100)?;

        Ok(())
    }

    pub fn get_user_stats(env: Env, user: Address) -> UserStats {
        reputation::get_user_stats(&env, &user)
    }

    pub fn grant_badge(
        env: Env,
        admin: Address,
        user: Address,
        badge: Badge,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        let stats = storage::get_user_stats_or_default(&env, &user);
        validation::validate_badge_count(stats.badges.len())?;
        reputation::grant_badge(&env, &admin, &user, badge)
    }

    pub fn emergency_pause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_pause(&env, &caller)
    }

    pub fn emergency_approve_unpause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_approve_unpause(&env, &caller)
    }

    pub fn emergency_unpause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_unpause(&env, &caller)
    }

    pub fn emergency_withdraw(
        env: Env,
        caller: Address,
        asset: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        validation::validate_reward_amount(amount)?;
        security::emergency_withdraw(&env, &caller, &asset, &to, amount)
    }

    pub fn deposit_escrow(
        env: Env,
        quest_id: Symbol,
        depositor: Address,
        token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        depositor.require_auth();
        escrow::deposit(&env, &quest_id, &depositor, &token, amount)
    }

    pub fn cancel_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error> {
        security::require_not_paused(&env)?;
        creator.require_auth();
        escrow::cancel_quest(&env, &quest_id, &creator)
    }

    pub fn withdraw_unclaimed(
        env: Env,
        quest_id: Symbol,
        creator: Address,
    ) -> Result<i128, Error> {
        security::require_not_paused(&env)?;
        creator.require_auth();
        escrow::withdraw_unclaimed(&env, &quest_id, &creator)
    }

    pub fn expire_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error> {
        security::require_not_paused(&env)?;
        creator.require_auth();
        escrow::expire_quest(&env, &quest_id, &creator)
    }

    pub fn update_quest_metadata(
        env: Env,
        quest_id: Symbol,
        updater: Address,
        metadata: QuestMetadata,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        updater.require_auth();
        quest::update_quest_metadata(&env, &quest_id, &updater, &metadata)
    }

    pub fn get_quest_metadata(env: Env, quest_id: Symbol) -> Result<QuestMetadata, Error> {
        storage::get_quest_metadata(&env, &quest_id)
    }

    pub fn has_quest_metadata(env: Env, quest_id: Symbol) -> bool {
        storage::has_quest_metadata(&env, &quest_id)
    }

    pub fn get_escrow_balance(env: Env, quest_id: Symbol) -> Result<i128, Error> {
        escrow::get_balance(&env, &quest_id)
    }

    pub fn get_escrow_info(env: Env, quest_id: Symbol) -> Result<EscrowInfo, Error> {
        escrow::get_info(&env, &quest_id)
    }

    /// Query quest details by ID.
    pub fn get_quest(env: Env, quest_id: Symbol) -> Result<Quest, Error> {
        storage::get_quest(&env, &quest_id)
    }

    /// Query submission details for a user.
    pub fn get_submission(env: Env, quest_id: Symbol, submitter: Address) -> Result<Submission, Error> {
        storage::get_submission(&env, &quest_id, &submitter)
    }

    /// Admin: set unpause approvals threshold
    pub fn set_unpause_threshold(env: Env, caller: Address, threshold: u32) -> Result<(), Error> {
        security::set_unpause_threshold(&env, &caller, threshold)
    }

    pub fn set_unpause_timelock(env: Env, caller: Address, seconds: u64) -> Result<(), Error> {
        security::set_unpause_timelock(&env, &caller, seconds)
    }

    //================================================================================
    // Quest Query Functions
    //================================================================================

    pub fn get_quests_by_status(
        env: Env,
        status: QuestStatus,
        offset: u32,
        limit: u32,
    ) -> Vec<Quest> {
        quest::get_quests_by_status(&env, &status, offset, limit)
    }

    pub fn get_quests_by_creator(
        env: Env,
        creator: Address,
        offset: u32,
        limit: u32,
    ) -> Vec<Quest> {
        quest::get_quests_by_creator(&env, &creator, offset, limit)
    }

    pub fn get_active_quests(env: Env, offset: u32, limit: u32) -> Vec<Quest> {
        quest::get_active_quests(&env, offset, limit)
    }

    pub fn get_quests_by_reward_range(
        env: Env,
        min_reward: i128,
        max_reward: i128,
        offset: u32,
        limit: u32,
    ) -> Vec<Quest> {
        quest::get_quests_by_reward_range(&env, min_reward, max_reward, offset, limit)
    }

    //================================================================================
    // Platform & Creator Stats
    //================================================================================

    pub fn get_platform_stats(env: Env) -> PlatformStats {
        storage::get_platform_stats(&env)
    }

    pub fn get_creator_stats(env: Env, creator: Address) -> CreatorStats {
        storage::get_creator_stats(&env, &creator)
    }

    pub fn reset_platform_stats(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        if !storage::is_admin(&env, &caller) {
            return Err(Error::Unauthorized);
        }
        storage::set_platform_stats(
            &env,
            &PlatformStats {
                total_quests_created: 0,
                total_submissions: 0,
                total_rewards_distributed: 0,
                total_active_users: 0,
                total_rewards_claimed: 0,
            },
        );
        Ok(())
    }
}
