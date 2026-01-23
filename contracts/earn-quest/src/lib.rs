#![no_std]

mod payout;
mod storage;
pub mod types;
mod errors;
mod events;
mod reputation;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, BytesN};
use crate::types::{Quest, QuestStatus, Submission, SubmissionStatus, UserStats, Badge};
use crate::errors::Error;

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    /// Register a new quest
    pub fn register_quest(
        env: Env,
        id: Symbol,
        creator: Address,
        reward_asset: Address,
        reward_amount: i128,
        verifier: Address,
        deadline: u64,
    ) -> Result<(), Error> {
        creator.require_auth();
        
        if storage::has_quest(&env, &id) {
            return Err(Error::QuestAlreadyExists);
        }
        
        if reward_amount <= 0 {
             return Err(Error::InvalidRewardAmount);
        }

        let quest = Quest {
            id: id.clone(),
            creator: creator.clone(),
            reward_asset: reward_asset.clone(),
            reward_amount,
            verifier: verifier.clone(),
            deadline,
            status: QuestStatus::Active,
            total_claims: 0,
        };
        
        storage::set_quest(&env, &id, &quest);

        // EMIT EVENT: QuestRegistered
        events::quest_registered(
            &env, 
            id, 
            creator, 
            reward_asset, 
            reward_amount, 
            verifier, 
            deadline
        );

        Ok(())
    }
    
    /// Submit proof
    pub fn submit_proof(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        proof_hash: BytesN<32>,
    ) -> Result<(), Error> {
        submitter.require_auth();
        
        // Verify quest exists
        let _quest = storage::get_quest(&env, &quest_id)?;
        
        let submission = Submission {
            quest_id: quest_id.clone(),
            submitter: submitter.clone(),
            proof_hash: proof_hash.clone(),
            status: SubmissionStatus::Pending,
            timestamp: env.ledger().timestamp(),
        };
        
        storage::set_submission(&env, &quest_id, &submitter, &submission);

        // EMIT EVENT: ProofSubmitted
        events::proof_submitted(&env, quest_id, submitter, proof_hash);

        Ok(())
    }

    /// Approve submission (Internal/Verifier)
    pub fn approve_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        verifier: Address,
    ) -> Result<(), Error> {
        // Auth check
        verifier.require_auth();
        
        let quest = storage::get_quest(&env, &quest_id)?;
        
        if verifier != quest.verifier {
            return Err(Error::Unauthorized);
        }
        
        let mut submission = storage::get_submission(&env, &quest_id, &submitter)?;
        
        // Only Pending can be approved
        if submission.status != SubmissionStatus::Pending {
            return Err(Error::InvalidSubmissionStatus);
        }
        
        submission.status = SubmissionStatus::Approved;
        storage::set_submission(&env, &quest_id, &submitter, &submission);
        
        // EMIT EVENT: SubmissionApproved
        events::submission_approved(&env, quest_id, submitter, verifier);

        Ok(())
    }

    /// Claim approved reward for a completed quest
    pub fn claim_reward(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
    ) -> Result<(), Error> {
        // 1. Auth
        submitter.require_auth();

        // 2. Data Retrieval
        let mut quest = storage::get_quest(&env, &quest_id)?;
        let mut submission = storage::get_submission(&env, &quest_id, &submitter)?;

        // 3. Validation
        if submission.status == SubmissionStatus::Paid {
            return Err(Error::AlreadyClaimed);
        }
        if submission.status != SubmissionStatus::Approved {
            return Err(Error::InvalidSubmissionStatus);
        }

        // 4. Payout
        // Logic handled in payout module (includes balance check)
        payout::transfer_reward(
            &env, 
            &quest.reward_asset, 
            &submitter, 
            quest.reward_amount
        )?;

        // 5. State Update
        submission.status = SubmissionStatus::Paid;
        storage::set_submission(&env, &quest_id, &submitter, &submission);

        quest.total_claims += 1;
        storage::set_quest(&env, &quest_id, &quest);

        // EMIT EVENT: RewardClaimed
        events::reward_claimed(
            &env, 
            quest_id.clone(), 
            submitter.clone(), 
            quest.reward_asset, 
            quest.reward_amount
        );

        // 6. Award XP for quest completion
        reputation::award_xp(&env, &submitter, 100)?;

        Ok(())
    }

    /// Get user reputation stats
    pub fn get_user_stats(env: Env, user: Address) -> UserStats {
        reputation::get_user_stats(&env, &user)
    }

    /// Grant a badge to a user (admin only)
    pub fn grant_badge(
        env: Env,
        admin: Address,
        user: Address,
        badge: Badge,
    ) -> Result<(), Error> {
        reputation::grant_badge(&env, &admin, &user, badge)
    }
}
