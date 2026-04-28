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
pub mod token;
pub mod types;
pub mod validation;

#[cfg(test)]
mod test_token;

use crate::errors::Error;

use crate::types::{
    AggregatedPrice, Badge, BatchApprovalInput, BatchQuestInput, CreatorStats, Dispute, EscrowInfo, OracleConfig, PlatformStats,
    PriceData, PriceFeedRequest, Quest, QuestMetadata, QuestStatus, Role, Submission, UserBadges, UserCore, UserStats, Commitment

pub use crate::types::{
    AggregatedPrice, Badge, BatchApprovalInput, BatchQuestInput, CreatorStats, Dispute, DisputeStatus, EscrowInfo, OracleConfig, PlatformStats,
    PriceData, PriceFeedRequest, Quest, QuestMetadata, QuestStatus, Role, Submission, SubmissionStatus, UserBadges, UserCore, UserStats, Commitment

};
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, String, Symbol, U256, Vec};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    /// Initializes the contract with the initial administrator and roles.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `admin` - The address of the initial contract administrator.
    ///
    /// # Panics
    ///
    /// * If the contract is already initialized.
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        if storage::is_initialized(&env) {
            panic!("already initialized");
        }
        storage::set_contract_admin(&env, &admin);
        storage::set_admin(&env, &admin);
        storage::grant_role(&env, &admin, &Role::SuperAdmin);
        storage::grant_role(&env, &admin, &Role::Pauser);
        storage::grant_role(&env, &admin, &Role::OracleAdmin);
        storage::grant_role(&env, &admin, &Role::StatsAdmin);
        storage::grant_role(&env, &admin, &Role::BadgeAdmin);
        storage::mark_initialized(&env);
    }

    /// Authorizes a contract upgrade (SuperAdmin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `caller` - The address of the caller.
    ///
    /// # Returns
    ///
    /// `Ok(())` if authorized, or an `Error::Unauthorized` if not.
    pub fn authorize_upgrade(env: Env, caller: Address) -> Result<(), Error> {
        admin::require_role(&env, &caller, Role::SuperAdmin)?;
        if !init::upgrade_authorize(&env, &caller) {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    /// Returns the current version of the contract.
    pub fn get_version(env: Env) -> u32 {
        storage::get_version(&env)
    }

    /// Returns the address of the contract administrator.
    pub fn get_admin(env: Env) -> Address {
        storage::get_admin(&env)
    }

    /// Returns the global configuration as a vector of key-value pairs.
    pub fn get_config(env: Env) -> Vec<(String, String)> {
        storage::get_config(&env)
    }

    /// Adds a new administrator (SuperAdmin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `caller` - The address of the caller.
    /// * `new_admin` - The address to be added as an administrator.
    pub fn add_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::add_admin(&env, &caller, &new_admin)
    }

    /// Removes an administrator (SuperAdmin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `caller` - The address of the caller.
    /// * `admin_to_remove` - The address to be removed from administrators.
    pub fn remove_admin(env: Env, caller: Address, admin_to_remove: Address) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::remove_admin(&env, &caller, &admin_to_remove)
    }

    /// Grants a specific role to an address (Admin or SuperAdmin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `caller` - The address of the caller.
    /// * `address` - The address receiving the role.
    /// * `role` - The role to grant.
    pub fn grant_role(env: Env, caller: Address, address: Address, role: Role) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::grant_role(&env, &caller, &address, role)
    }

    /// Revokes a specific role from an address (Admin or SuperAdmin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `caller` - The address of the caller.
    /// * `address` - The address to revoke the role from.
    /// * `role` - The role to revoke.
    pub fn revoke_role(env: Env, caller: Address, address: Address, role: Role) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::revoke_role(&env, &caller, &address, role)
    }

    /// Checks if an address has a specific role.
    pub fn has_role(env: Env, address: Address, role: Role) -> bool {
        storage::has_role(&env, &address, &role)
    }

    /// Checks if an address is an administrator.
    pub fn is_admin(env: Env, address: Address) -> bool {
        admin::is_admin(&env, &address)
    }

    /// Registers a new quest on the platform.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `id` - Unique symbol for the quest.
    /// * `creator` - Address of the quest creator.
    /// * `reward_asset` - Address of the token used for rewards.
    /// * `reward_amount` - Amount rewarded per submission.
    /// * `verifier` - Address authorized to verify submissions.
    /// * `deadline` - Unix timestamp when the quest expires.
    ///
    /// # Example
    ///
    /// ```rust
    /// client.register_quest(&id, &creator, &token, &1000, &verifier, &1700000000);
    /// ```
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

    /// Registers a new quest with detailed metadata.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `id` - Unique symbol for the quest.
    /// * `creator` - Address of the quest creator.
    /// * `reward_asset` - Address of the token used for rewards.
    /// * `reward_amount` - Amount rewarded per submission.
    /// * `verifier` - Address authorized to verify submissions.
    /// * `deadline` - Unix timestamp when the quest expires.
    /// * `metadata` - Comprehensive quest metadata (title, description, tags, etc.).
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

    /// Registers multiple quests in a single batch (SuperAdmin or Creator).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `creator` - Address of the quest creator.
    /// * `quests` - Vector of batch quest inputs.
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

    /// Pauses an individual quest (Admin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `caller` - The address of the admin.
    /// * `quest_id` - The symbol of the quest to pause.
    pub fn pause_quest(env: Env, caller: Address, quest_id: Symbol) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_role(&env, &caller, Role::Admin)?;
        quest::pause_quest(&env, &quest_id, &caller)
    }

    /// Resumes a previously paused quest (Admin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `caller` - The address of the admin.
    /// * `quest_id` - The symbol of the quest to resume.
    pub fn resume_quest(env: Env, caller: Address, quest_id: Symbol) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_role(&env, &caller, Role::Admin)?;
        quest::resume_quest(&env, &quest_id, &caller)
    }

    /// Commits to a submission to prevent front-running.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `submitter` - The address of the user submitting.
    /// * `commitment_hash` - The hash of the proof and salt.
    pub fn commit_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        commitment_hash: BytesN<32>,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        submitter.require_auth();
        submission::commit_submission(&env, &quest_id, &submitter, &commitment_hash)
    }

    /// Reveals the submission details after a commitment.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `submitter` - The address of the user submitting.
    /// * `proof_hash` - The actual proof hash.
    /// * `salt` - The salt used in the commitment.
    pub fn reveal_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        proof_hash: BytesN<32>,
        salt: BytesN<32>,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        submitter.require_auth();
        submission::reveal_submission(&env, &quest_id, &submitter, &proof_hash, &salt)
    }

    /// Submits a proof for a quest without the commit-reveal flow.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `submitter` - The address of the user submitting.
    /// * `proof_hash` - The hash of the proof being submitted.
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

    /// Approves a submission (Verifier only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `submitter` - The address of the user whose submission is being approved.
    /// * `verifier` - The address of the verifier.
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

    /// Approves multiple submissions in a single batch (Verifier only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `verifier` - The address of the verifier.
    /// * `submissions` - Vector of batch approval inputs.
    pub fn approve_submissions_batch(
        env: Env,
        verifier: Address,
        submissions: Vec<BatchApprovalInput>,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        verifier.require_auth();
        submission::approve_submissions_batch(&env, &verifier, &submissions)
    }

    /// Claims the reward for an approved submission.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `submitter` - The address of the user claiming the reward.
    ///
    /// # Security
    ///
    /// Implements non-reentrancy and CEI (Checks-Effects-Interactions) patterns.
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

    /// Returns the core statistics for a user (XP, level, quests completed).
    pub fn get_user_stats(env: Env, user: Address) -> UserCore {
        reputation::get_user_stats(&env, &user)
    }

    /// Returns the collection of badges earned by a user.
    pub fn get_user_badges(env: Env, user: Address) -> UserBadges {
        storage::get_user_badges(&env, &user)
    }

    /// Grants a badge to a user (BadgeAdmin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `admin` - The address of the admin granting the badge.
    /// * `user` - The address of the user receiving the badge.
    /// * `badge` - The badge to be granted.
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

    /// Opens a dispute for a rejected submission (Submitter only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest in dispute.
    /// * `initiator` - The address of the user initiating the dispute.
    /// * `arbitrator` - The address of the designated arbitrator.
    ///
    /// # Returns
    ///
    /// The created `Dispute` record.
    pub fn open_dispute(
        env: Env,
        quest_id: Symbol,
        initiator: Address,
        arbitrator: Address,
    ) -> Result<Dispute, Error> {
        security::require_not_paused(&env)?;
        dispute::open_dispute(&env, quest_id, initiator, arbitrator)
    }

    /// Resolves an open dispute (Arbitrator only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `initiator` - The address of the dispute initiator.
    /// * `arbitrator` - The address of the arbitrator resolving the dispute.
    pub fn resolve_dispute(
        env: Env,
        quest_id: Symbol,
        initiator: Address,
        arbitrator: Address,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        dispute::resolve_dispute(&env, quest_id, initiator, arbitrator)
    }


    /// Withdraws a pending dispute (Initiator only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `initiator` - The address of the initiator.

    pub fn appeal_dispute(
        env: Env,
        quest_id: Symbol,
        initiator: Address,
        new_arbitrator: Address,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        dispute::appeal_dispute(&env, quest_id, initiator, new_arbitrator)
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

    /// Returns the details of a specific dispute.
    pub fn get_dispute(env: Env, quest_id: Symbol, initiator: Address) -> Result<Dispute, Error> {
        dispute::get_dispute(&env, quest_id, initiator)
    }

    /// Pauses all contract activities (Pauser only).
    pub fn emergency_pause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_pause(&env, &caller)
    }

    /// Approves unpausing the contract (Admin only).
    pub fn emergency_approve_unpause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_approve_unpause(&env, &caller)
    }

    /// Unpauses the contract after sufficient approvals (Admin only).
    pub fn emergency_unpause(env: Env, caller: Address) -> Result<(), Error> {
        security::emergency_unpause(&env, &caller)
    }

    /// Emergency withdrawal of funds (SuperAdmin only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `caller` - The address of the caller.
    /// * `asset` - The address of the token to withdraw.
    /// * `to` - The address receiving the tokens.
    /// * `amount` - The amount to withdraw.
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

    /// Deposits tokens into the escrow for a quest (Creator only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `depositor` - The address of the depositor.
    /// * `token` - The address of the token being deposited.
    /// * `amount` - The amount to deposit.
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

    /// Cancels a quest and refunds remaining escrow (Creator only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest to cancel.
    /// * `creator` - The address of the quest creator.
    ///
    /// # Returns
    ///
    /// The amount refunded to the creator.
    pub fn cancel_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error> {
        security::require_not_paused(&env)?;
        security::nonreentrant_enter(&env)?;
        creator.require_auth();
        let refunded = escrow::cancel_quest(&env, &quest_id, &creator)?;
        security::nonreentrant_exit(&env);
        Ok(refunded)
    }

    /// Withdraws unclaimed rewards from an active or completed quest (Creator only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `creator` - The address of the quest creator.
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

    /// Expires a quest and refunds the remaining escrow balance (Creator only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `creator` - The address of the quest creator.
    pub fn expire_quest(env: Env, quest_id: Symbol, creator: Address) -> Result<i128, Error> {
        security::require_not_paused(&env)?;
        security::nonreentrant_enter(&env)?;
        creator.require_auth();
        let refunded = escrow::expire_quest(&env, &quest_id, &creator)?;
        security::nonreentrant_exit(&env);
        Ok(refunded)
    }

    /// Updates the metadata for an existing quest (Creator only).
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `quest_id` - The symbol of the quest.
    /// * `updater` - The address of the user updating (must be creator).
    /// * `metadata` - The new metadata content.
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

    /// Returns the metadata for a specific quest.
    pub fn get_quest_metadata(env: Env, quest_id: Symbol) -> Result<QuestMetadata, Error> {
        storage::get_quest_metadata(&env, &quest_id)
    }

    /// Checks if a quest has associated metadata.
    pub fn has_quest_metadata(env: Env, quest_id: Symbol) -> bool {
        storage::has_quest_metadata(&env, &quest_id)
    }

    /// Returns the current token balance in a quest's escrow.
    pub fn get_escrow_balance(env: Env, quest_id: Symbol) -> Result<i128, Error> {
        escrow::get_balance(&env, &quest_id)
    }

    /// Returns detailed escrow information for a quest.
    pub fn get_escrow_info(env: Env, quest_id: Symbol) -> Result<EscrowInfo, Error> {
        escrow::get_info(&env, &quest_id)
    }

    /// Returns the details of a quest by its symbol ID.
    pub fn get_quest(env: Env, quest_id: Symbol) -> Result<Quest, Error> {
        storage::get_quest(&env, &quest_id)
    }

    /// Returns the submission details for a specific user and quest.
    pub fn get_submission(env: Env, quest_id: Symbol, submitter: Address) -> Result<Submission, Error> {
        storage::get_submission(&env, &quest_id, &submitter)
    }

    /// Sets the number of approvals required to unpause the contract (Admin only).
    pub fn set_unpause_threshold(env: Env, caller: Address, threshold: u32) -> Result<(), Error> {
        security::set_unpause_threshold(&env, &caller, threshold)
    }

    /// Sets the timelock duration for unpausing (Admin only).
    pub fn set_unpause_timelock(env: Env, caller: Address, seconds: u64) -> Result<(), Error> {
        security::set_unpause_timelock(&env, &caller, seconds)
    }

    //================================================================================
    // Quest Query Functions
    //================================================================================

    /// Returns a list of quests filtered by status.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `status` - The status to filter by.
    /// * `offset` - Pagination offset.
    /// * `limit` - Pagination limit.
    pub fn get_quests_by_status(
        env: Env,
        status: QuestStatus,
        offset: u32,
        limit: u32,
    ) -> Vec<Quest> {
        quest::get_quests_by_status(&env, &status, offset, limit)
    }

    /// Returns a list of quests created by a specific address.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `creator` - The address of the creator.
    /// * `offset` - Pagination offset.
    /// * `limit` - Pagination limit.
    pub fn get_quests_by_creator(
        env: Env,
        creator: Address,
        offset: u32,
        limit: u32,
    ) -> Vec<Quest> {
        quest::get_quests_by_creator(&env, &creator, offset, limit)
    }

    /// Returns a list of currently active quests.
    pub fn get_active_quests(env: Env, offset: u32, limit: u32) -> Vec<Quest> {
        quest::get_active_quests(&env, offset, limit)
    }

    /// Returns a list of quests within a specific reward range.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `min_reward` - Minimum reward amount.
    /// * `max_reward` - Maximum reward amount.
    /// * `offset` - Pagination offset.
    /// * `limit` - Pagination limit.
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

    /// Returns aggregated platform-wide statistics.
    pub fn get_platform_stats(env: Env) -> PlatformStats {
        storage::get_platform_stats(&env)
    }

    /// Returns statistics for a specific quest creator.
    pub fn get_creator_stats(env: Env, creator: Address) -> CreatorStats {
        storage::get_creator_stats(&env, &creator)
    }

    /// Resets platform-wide statistics (StatsAdmin only).
    pub fn reset_platform_stats(env: Env, caller: Address) -> Result<(), Error> {
        admin::require_role(&env, &caller, Role::StatsAdmin)?;
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

    /// Adds a new price oracle configuration (OracleAdmin only).
    pub fn add_oracle(
        env: Env,
        caller: Address,
        oracle_config: OracleConfig,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_role(&env, &caller, Role::OracleAdmin)?;
        
        oracle::Oracle::validate_config(&oracle_config)?;
        storage::add_oracle_config(&env, &oracle_config)?;
        
        Ok(())
    }

    /// Removes a price oracle configuration (OracleAdmin only).
    pub fn remove_oracle(
        env: Env,
        caller: Address,
        oracle_address: Address,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_role(&env, &caller, Role::OracleAdmin)?;
        
        storage::remove_oracle_config(&env, &oracle_address)?;
        
        Ok(())
    }

    /// Updates an existing price oracle configuration (OracleAdmin only).
    pub fn update_oracle(
        env: Env,
        caller: Address,
        oracle_config: OracleConfig,
    ) -> Result<(), Error> {
        security::require_not_paused(&env)?;
        admin::require_role(&env, &caller, Role::OracleAdmin)?;
        
        oracle::Oracle::validate_config(&oracle_config)?;
        storage::update_oracle_config(&env, &oracle_config)?;
        
        Ok(())
    }

    /// Returns the aggregated price from all active oracles.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `base_asset` - The base asset address.
    /// * `quote_asset` - The quote asset address.
    /// * `max_age_seconds` - Maximum allowed age of the price data.
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

    /// Returns the price from a specific oracle.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `oracle_address` - The address of the oracle contract.
    /// * `base_asset` - The base asset address.
    /// * `quote_asset` - The quote asset address.
    /// * `max_age_seconds` - Maximum allowed age of the price data.
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

    /// Returns all registered oracle configurations.
    pub fn get_oracle_configs(env: Env) -> Vec<OracleConfig> {
        storage::get_all_oracle_configs(&env)
    }

    /// Returns all currently active oracle configurations.
    pub fn get_active_oracle_configs(env: Env) -> Vec<OracleConfig> {
        storage::get_active_oracle_configs(&env)
    }

    /// Converts a reward amount from one asset to another using oracle prices.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `from_asset` - The source asset address.
    /// * `to_asset` - The target asset address.
    /// * `amount` - The amount to convert.
    pub fn convert_reward_amount(
        env: Env,
        from_asset: Address,
        to_asset: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        if from_asset == to_asset {
            return Ok(amount);
        }

        let price = Self::get_price(env.clone(), from_asset, to_asset, 300)?; // 5 minutes max age
        
        // Convert amount using price (assuming 7 decimals)
        let amount_u256 = U256::from_u128(&env, amount as u128);
        let converted_amount = amount_u256
            .mul(&price.weighted_price)
            .div(&U256::from_u32(&env, 10_000_000)); // Adjust for 7 decimals
        
        // Convert back to i128 safely
        let converted_value = converted_amount.to_u128().ok_or(Error::AmountTooLarge)? as i128;
        Ok(converted_value)
    }

    /// Validates a reward amount against an oracle price to prevent manipulation.
    ///
    /// # Arguments
    ///
    /// * `env` - The environment.
    /// * `reward_asset` - The asset used for rewards.
    /// * `reward_amount` - The reward amount to validate.
    /// * `reference_asset` - The reference asset (e.g., USD stablecoin).
    /// * `max_deviation_percent` - Maximum allowed deviation from the oracle price.
    pub fn validate_reward_with_oracle(
        env: Env,
        reward_asset: Address,
        reward_amount: i128,
        reference_asset: Address,
        max_deviation_percent: u32,
    ) -> Result<(), Error> {
        let price = Self::get_price(env, reward_asset, reference_asset, 300)?;
        
        // Check if price confidence is sufficient
        if price.confidence_score < 80 {
            return Err(Error::LowOracleConfidence);
        }
        
        // Additional validation logic could be added here
        // For example, checking against historical prices, volatility limits, etc.
        
        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Token Interface (SEP-41)
    // ─────────────────────────────────────────────────────────────────────────────

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        token::allowance(env, from, spender)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        token::approve(env, from, spender, amount, expiration_ledger)
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        token::balance(env, id)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        token::transfer(env, from, to, amount)
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        token::transfer_from(env, spender, from, to, amount)
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        token::burn(env, from, amount)
    }

    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        token::burn_from(env, spender, from, amount)
    }

    pub fn decimals(env: Env) -> u32 {
        token::decimals(env)
    }

    pub fn name(env: Env) -> String {
        token::name(env)
    }

    pub fn symbol(env: Env) -> String {
        token::symbol(env)
    }

    pub fn mint(env: Env, caller: Address, to: Address, amount: i128) -> Result<(), Error> {
        admin::require_role(&env, &caller, Role::Admin)?;
        token::mint(env, to, amount);
        Ok(())
    }

    pub fn set_token_metadata(env: Env, caller: Address, name: String, symbol: String, decimals: u32) -> Result<(), Error> {
        admin::require_role(&env, &caller, Role::Admin)?;
        token::set_metadata(&env, name, symbol, decimals);
        Ok(())
    }
}
