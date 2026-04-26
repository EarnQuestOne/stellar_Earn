#![no_std]

mod admin;
pub mod errors;
mod dispute;
mod escrow;
mod events;
mod init;
mod oracle;
mod payout;
mod quest;
mod reputation;
mod security;
pub mod storage;
mod submission;
pub mod types;
pub mod validation;

use crate::errors::Error;
use crate::types::{Badge, BatchApprovalInput, BatchQuestInput, CreatorStats, Dispute, EscrowInfo, PlatformStats, Quest, QuestMetadata, QuestStatus, UserStats, Submission};
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
        security::nonreentrant_enter(&env)?;
        submitter.require_auth();

        // Single read of quest and submission for all subsequent operations
        let quest = storage::get_quest(&env, &quest_id)?;
        let submission = storage::get_submission(&env, &quest_id, &submitter)?;

        // Validate using pre-read data
        submission::validate_claim_data(&quest, &submission)?;

        // CEI: flip the submission to Paid and increment claims BEFORE the
        // external token transfer. If a malicious token re-enters during
        // the transfer the AlreadyClaimed check in validate_claim will
        // reject the second attempt even before the reentrancy guard kicks
        // in, giving us defence in depth.
        let mut submission = submission;
        submission.status = types::SubmissionStatus::Paid;
        storage::set_submission(&env, &quest_id, &submitter, &submission);

        // Increment claims: directly update quest to avoid extra read
        let mut quest = quest;
        quest.total_claims += 1;
        storage::set_quest(&env, &quest_id, &quest);

        payout::transfer_reward_from_escrow(
            &env,
            &quest_id,
            &quest.reward_asset,
            &submitter,
            quest.reward_amount,
        )?;

        events::reward_claimed(
            &env,
            quest_id.clone(),
            submitter.clone(),
            quest.reward_asset,
            quest.reward_amount,
        );

        reputation::award_xp(&env, &submitter, 100)?;

        security::nonreentrant_exit(&env);
        Ok(())
    }

    pub fn get_user_stats(env: Env, user: Address) -> UserCore {
        reputation::get_user_stats(&env, &user)
    }

    /// Get user badges separately (cold path — only loaded when needed).
    pub fn get_user_badges(env: Env, user: Address) -> UserBadges {
        storage::get_user_badges(&env, &user)
    }

    pub fn grant_badge(
        env: Env,
        admin: Address,
        user: Address,
        badge: Badge,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        let user_badges = storage::get_user_badges(&env, &user);
        validation::validate_badge_count(user_badges.badges.len())?;
        reputation::grant_badge(&env, &admin, &user, badge)
    }

    // ── Dispute Resolution ──

    /// Open a dispute for a rejected submission.
    ///
    /// Only the submitter can open a dispute. They must have a submission
    /// on this quest that was previously rejected. The dispute is assigned
    /// to an arbitrator (could be the verifier or a designated third party).
    ///
    /// Returns the created Dispute record.
    pub fn open_dispute(
        env: Env,
        quest_id: Symbol,
        initiator: Address,
        arbitrator: Address,
    ) -> Result<Dispute, Error> {
        security::require_not_paused(&env)?;
        dispute::open_dispute(&env, quest_id, initiator, arbitrator)
    }

    /// Resolve an open dispute. Only the assigned arbitrator can resolve.
    pub fn resolve_dispute(
        env: Env,
        quest_id: Symbol,
        initiator: Address,
        arbitrator: Address,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        dispute::resolve_dispute(&env, quest_id, initiator, arbitrator)
    }

    /// Withdraw a pending dispute (only by initiator).
    pub fn withdraw_dispute(
        env: Env,
        quest_id: Symbol,
        initiator: Address,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        dispute::withdraw_dispute(&env, quest_id, initiator)
    }

    /// Get dispute details.
    pub fn get_dispute(env: Env, quest_id: Symbol, initiator: Address) -> Result<Dispute, Error> {
        dispute::get_dispute(&env, quest_id, initiator)
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
        security::nonreentrant_enter(&env)?;
        validation::validate_reward_amount(amount)?;
        security::emergency_withdraw(&env, &caller, &asset, &to, amount)?;
        security::nonreentrant_exit(&env);
        Ok(())
    }

    pub fn deposit_escrow(
        env: Env,
        quest_id: Symbol,
        depositor: Address,
        token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        security::nonreentrant_enter(&env)?;
        depositor.require_auth();
        escrow::deposit(&env, &quest_id, &depositor, &token, amount)?;
        security::nonreentrant_exit(&env);
        Ok(())
    }

    pub fn cancel_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error> {
        security::require_not_paused(&env)?;
        security::nonreentrant_enter(&env)?;
        creator.require_auth();
        let refunded = escrow::cancel_quest(&env, &quest_id, &creator)?;
        security::nonreentrant_exit(&env);
        Ok(refunded)
    }

    pub fn withdraw_unclaimed(
        env: Env,
        quest_id: Symbol,
        creator: Address,
    ) -> Result<i128, Error> {
        security::require_not_paused(&env)?;
        security::nonreentrant_enter(&env)?;
        creator.require_auth();
        let withdrawn = escrow::withdraw_unclaimed(&env, &quest_id, &creator)?;
        security::nonreentrant_exit(&env);
        Ok(withdrawn)
    }

    pub fn expire_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error> {
        security::require_not_paused(&env)?;
        security::nonreentrant_enter(&env)?;
        creator.require_auth();
        let refunded = escrow::expire_quest(&env, &quest_id, &creator)?;
        security::nonreentrant_exit(&env);
        Ok(refunded)
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

    //================================================================================
    // Oracle Management Functions
    //================================================================================

    /// Add a new oracle configuration (admin only)
    pub fn add_oracle(
        env: Env,
        caller: Address,
        oracle_config: OracleConfig,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_admin(&env, &caller)?;
        
        oracle::Oracle::validate_config(&oracle_config)?;
        storage::add_oracle_config(&env, &oracle_config)?;
        
        Ok(())
    }

    /// Remove an oracle configuration (admin only)
    pub fn remove_oracle(
        env: Env,
        caller: Address,
        oracle_address: Address,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_admin(&env, &caller)?;
        
        storage::remove_oracle_config(&env, &oracle_address)?;
        
        Ok(())
    }

    /// Update oracle configuration (admin only)
    pub fn update_oracle(
        env: Env,
        caller: Address,
        oracle_config: OracleConfig,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_admin(&env, &caller)?;
        
        oracle::Oracle::validate_config(&oracle_config)?;
        storage::update_oracle_config(&env, &oracle_config)?;
        
        Ok(())
    }

    /// Get price from all active oracles (aggregated)
    pub fn get_price(
        env: Env,
        base_asset: Address,
        quote_asset: Address,
        max_age_seconds: u64,
    ) -> Result<AggregatedPrice, Error> {
        let oracle_configs = storage::get_active_oracle_configs(&env);
        let request = PriceFeedRequest {
            base_asset,
            quote_asset,
            max_age_seconds,
        };
        
        oracle::Oracle::get_aggregated_price(&env, &oracle_configs, &request)
    }

    /// Get price from a specific oracle
    pub fn get_price_from_oracle(
        env: Env,
        oracle_address: Address,
        base_asset: Address,
        quote_asset: Address,
        max_age_seconds: u64,
    ) -> Result<PriceData, Error> {
        let oracle_config = storage::get_oracle_config(&env, &oracle_address)?;
        let request = PriceFeedRequest {
            base_asset,
            quote_asset,
            max_age_seconds,
        };
        
        oracle::Oracle::get_price(&env, &oracle_config, &request)
    }

    /// Get all oracle configurations
    pub fn get_oracle_configs(env: Env) -> Vec<OracleConfig> {
        storage::get_all_oracle_configs(&env)
    }

    /// Get active oracle configurations
    pub fn get_active_oracle_configs(env: Env) -> Vec<OracleConfig> {
        storage::get_active_oracle_configs(&env)
    }

    /// Convert reward amount using oracle price
    pub fn convert_reward_amount(
        env: Env,
        from_asset: Address,
        to_asset: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        if from_asset == to_asset {
            return Ok(amount);
        }

        let price = Self::get_price(env, from_asset, to_asset, 300)?; // 5 minutes max age
        
        // Convert amount using price (assuming 7 decimals)
        let amount_u256 = U256::from_u128(amount as u128);
        let converted_amount = (amount_u256 * price.weighted_price) / U256::from_u32(10_000_000); // Adjust for 7 decimals
        
        // Convert back to i128 safely
        let converted_value = converted_amount.to_u128() as i128;
        Ok(converted_value)
    }

    /// Validate reward amount against oracle price (anti-manipulation)
    pub fn validate_reward_amount_with_oracle(
        env: Env,
        reward_asset: Address,
        reward_amount: i128,
        reference_asset: Address,
        max_deviation_percent: u32,
    ) -> Result<(), Error> {
        let price = Self::get_price(env, reward_asset, reference_asset, 300)?;
        
        // Check if price confidence is sufficient
        if price.confidence_score < 80 {
            return Err(Error::InsufficientOracleConfidence);
        }
        
        // Additional validation logic could be added here
        // For example, checking against historical prices, volatility limits, etc.
        
        Ok(())
    }
}
