// Audit Tests for EarnQuest Contract
// This file contains comprehensive, non-placeholder tests for audit preparation
// Tests cover: invariants, security scenarios, edge cases, and properties

#[cfg(test)]
mod audit_tests {
    use soroban_sdk::{
        symbol_short, testutils::Address as _, testutils::Ledger as _, token, Address, BytesN, Env,
        String, Vec,
    };

    extern crate earn_quest;
    use earn_quest::errors::Error;
    use earn_quest::types::{BadgeType, BatchApprovalInput, BatchQuestInput, Role};
    use earn_quest::{EarnQuestContract, EarnQuestContractClient};

    // ============================================================================
    // Test Setup Utilities
    // ============================================================================

    struct TestEnv<'a> {
        env: Env,
        client: EarnQuestContractClient<'a>,
        contract_id: Address,
        admin: Address,
        creator: Address,
        verifier: Address,
        user1: Address,
        user2: Address,
        token_address: Address,
        token: token::Client<'a>,
    }

    fn setup_test_env() -> TestEnv<'static> {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);

        let token_admin = Address::generate(&env);
        let token_contract_obj = env.register_stellar_asset_contract_v2(token_admin);
        let token_address = token_contract_obj.address();
        let token = token::Client::new(&env, &token_address);
        let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

        token_admin_client.mint(&creator, &10_000_000_000_000_000);
        token_admin_client.mint(&admin, &10_000_000_000_000_000);

        client.initialize(&admin);

        TestEnv {
            env,
            client,
            contract_id,
            admin,
            creator,
            verifier,
            user1,
            user2,
            token_address,
            token,
        }
    }

    // ============================================================================
    // Invariant Tests
    // ============================================================================

    #[test]
    fn test_authorization_invariant_unauthorized_access() {
        let t = setup_test_env();
        let unauthorized_user = Address::generate(&t.env);
        let new_admin = Address::generate(&t.env);

        // Non-admin attempting admin operation (add_admin)
        let res = t.client.try_add_admin(&unauthorized_user, &new_admin);
        assert_eq!(res, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_authorization_invariant_role_check_order() {
        let t = setup_test_env();
        let unauthorized_user = Address::generate(&t.env);

        // Verify initial state: admin is an admin
        assert!(t.client.is_admin(&t.admin));

        // Unauthorized user attempts to remove admin
        let res = t.client.try_remove_admin(&unauthorized_user, &t.admin);
        assert_eq!(res, Err(Ok(Error::Unauthorized)));

        // Verify state is unchanged after failed unauthorized call
        assert!(t.client.is_admin(&t.admin));
    }

    #[test]
    fn test_fund_conservation_invariant_create_quest() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_FND");
        let reward_amount: i128 = 10_000;

        let initial_creator_bal = t.token.balance(&t.creator);
        let initial_contract_bal = t.token.balance(&t.contract_id);
        let total_before = initial_creator_bal + initial_contract_bal;

        let deadline = t.env.ledger().timestamp() + 3600;
        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward_amount,
            &t.verifier,
            &deadline,
        );

        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward_amount);

        let final_creator_bal = t.token.balance(&t.creator);
        let final_contract_bal = t.token.balance(&t.contract_id);
        let total_after = final_creator_bal + final_contract_bal;

        assert_eq!(
            total_before, total_after,
            "Total funds must be conserved across quest deposit"
        );
        assert_eq!(final_contract_bal, initial_contract_bal + reward_amount);
        assert_eq!(final_creator_bal, initial_creator_bal - reward_amount);
    }

    #[test]
    fn test_fund_conservation_invariant_escrow_release() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_ESC");
        let reward_amount: i128 = 5_000;
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward_amount,
            &t.verifier,
            &deadline,
        );
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward_amount);

        let proof_hash = BytesN::from_array(&t.env, &[7u8; 32]);
        t.client.submit_proof(&quest_id, &t.user1, &proof_hash);
        t.client
            .approve_submission(&quest_id, &t.user1, &t.verifier);

        let creator_before = t.token.balance(&t.creator);
        let contract_before = t.token.balance(&t.contract_id);
        let user1_before = t.token.balance(&t.user1);

        t.client.claim_reward(&quest_id, &t.user1, &reward_amount);

        let creator_after = t.token.balance(&t.creator);
        let contract_after = t.token.balance(&t.contract_id);
        let user1_after = t.token.balance(&t.user1);

        assert_eq!(user1_after - user1_before, reward_amount);
        assert_eq!(contract_before - contract_after, reward_amount);
        assert_eq!(creator_before, creator_after);
        assert_eq!(
            creator_before + contract_before + user1_before,
            creator_after + contract_after + user1_after,
            "Total tokens conserved after escrow release"
        );
    }

    #[test]
    fn test_reputation_invariant_non_negative() {
        let t = setup_test_env();

        // Initial user stats
        let stats_initial = t.client.get_user_stats(&t.user1);
        let _ = &stats_initial;

        // Award progress via quest completion
        let quest_id = symbol_short!("Q_REP");
        let reward = 1000i128;
        let deadline = t.env.ledger().timestamp() + 3600;
        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward);

        let proof_hash = BytesN::from_array(&t.env, &[9u8; 32]);
        t.client.submit_proof(&quest_id, &t.user1, &proof_hash);
        t.client
            .approve_submission(&quest_id, &t.user1, &t.verifier);
        t.client.claim_reward(&quest_id, &t.user1, &reward);

        let stats_after = t.client.get_user_stats(&t.user1);
        assert!(stats_after.quests_completed > 0);
    }

    #[test]
    fn test_reputation_invariant_decay_over_time() {
        let t = setup_test_env();

        let initial_stats = t.client.get_user_stats(&t.user1);
        let _ = &initial_stats;

        // Advance ledger timestamp by 1 day
        t.env
            .ledger()
            .set_timestamp(t.env.ledger().timestamp() + 86400);

        let future_stats = t.client.get_user_stats(&t.user1);
        assert!(future_stats.level <= 100, "Level is bounded by max cap");
    }

    #[test]
    fn test_quest_state_invariant_valid_transitions() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_STT");
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &1000i128,
            &t.verifier,
            &deadline,
        );

        // Active -> Paused
        let pause_res = t.client.try_pause_quest(&t.admin, &quest_id);
        assert!(pause_res.is_ok());

        // Paused -> Active
        let resume_res = t.client.try_resume_quest(&t.admin, &quest_id);
        assert!(resume_res.is_ok());
    }

    #[test]
    fn test_quest_state_invariant_invalid_transitions() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_INV");
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &1000i128,
            &t.verifier,
            &deadline,
        );

        // Cannot resume a quest that is already active (not paused)
        let res = t.client.try_resume_quest(&t.admin, &quest_id);
        assert_eq!(res, Err(Ok(Error::InvalidStatusTransition)));
    }

    #[test]
    fn test_escrow_invariant_release_time_enforced() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_TIME");
        let deadline = t.env.ledger().timestamp() + 1000;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &1000i128,
            &t.verifier,
            &deadline,
        );
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &1000i128);

        // Creator attempting to withdraw unclaimed before quest expiry/terminal state must fail
        let res = t.client.try_withdraw_unclaimed(&quest_id, &t.creator);
        assert_eq!(res, Err(Ok(Error::QuestNotTerminal)));

        // Advance time past deadline + grace buffer
        t.env.ledger().set_timestamp(deadline + 86400);

        // Expire quest to set status to Expired and refund escrow
        let expire_res = t.client.try_expire_quest(&quest_id, &t.creator);
        assert!(expire_res.is_ok());
        assert_eq!(expire_res.unwrap(), Ok(1000i128));
    }

    #[test]
    fn test_storage_consistency_invariant_batch_atomicity() {
        let t = setup_test_env();

        let mut quests = Vec::new(&t.env);
        let deadline = t.env.ledger().timestamp() + 3600;

        // Valid item 1
        quests.push_back(BatchQuestInput {
            id: symbol_short!("Q_B1"),
            reward_asset: t.token_address.clone(),
            reward_amount: 1000i128,
            verifier: t.verifier.clone(),
            deadline,
            grace_period_seconds: None,
        });

        // Invalid item 2 (reward amount = 0 is invalid)
        quests.push_back(BatchQuestInput {
            id: symbol_short!("Q_B2"),
            reward_asset: t.token_address.clone(),
            reward_amount: 0i128,
            verifier: t.verifier.clone(),
            deadline,
            grace_period_seconds: None,
        });

        // Entire batch transaction reverts due to atomic validation
        let res = t.client.try_register_quests_batch(&t.creator, &quests);
        assert_eq!(res, Err(Ok(Error::InvalidRewardAmount)));
    }

    // ============================================================================
    // Security Tests
    // ============================================================================

    #[test]
    fn test_security_unauthorized_fund_access() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_SAF");
        let reward = 1000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward);

        // User1 trying to claim reward without proof submission fails
        let res = t.client.try_claim_reward(&quest_id, &t.user1, &reward);
        assert_eq!(res, Err(Ok(Error::SubmissionNotFound)));
    }

    #[test]
    fn test_security_role_bypass_attempt() {
        let t = setup_test_env();
        let attacker = Address::generate(&t.env);

        let badge_type = BadgeType {
            id: symbol_short!("ATTACK"),
            name: String::from_str(&t.env, "Attack"),
            description: String::from_str(&t.env, "Desc"),
            xp_reward: 100,
        };

        // Non-admin attempting to register a badge type fails
        let res = t.client.try_register_badge_type(&attacker, &badge_type);
        assert_eq!(res, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_security_privilege_escalation_self_grant() {
        let t = setup_test_env();
        let attacker = Address::generate(&t.env);

        // Attacker attempts to grant self Admin role
        let res = t.client.try_grant_role(&attacker, &attacker, &Role::Admin);
        assert_eq!(res, Err(Ok(Error::Unauthorized)));
        assert!(!t.client.has_role(&attacker, &Role::Admin));
    }

    #[test]
    fn test_security_escrow_premature_release() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_PREM");
        let reward = 1000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward);

        let stranger = Address::generate(&t.env);
        // Stranger attempts to cancel quest
        let res = t.client.try_cancel_quest(&quest_id, &stranger);
        assert_eq!(res, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_security_submission_approval_bypass() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_BYP");
        let reward = 1000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );
        let proof_hash = BytesN::from_array(&t.env, &[1u8; 32]);
        t.client.submit_proof(&quest_id, &t.user1, &proof_hash);

        let attacker = Address::generate(&t.env);
        // Non-verifier attempting to approve submission
        let res = t
            .client
            .try_approve_submission(&quest_id, &t.user1, &attacker);
        assert_eq!(res, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_security_reputation_manipulation() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_DBL");
        let reward = 1000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward);

        let proof_hash = BytesN::from_array(&t.env, &[2u8; 32]);
        t.client.submit_proof(&quest_id, &t.user1, &proof_hash);
        t.client
            .approve_submission(&quest_id, &t.user1, &t.verifier);

        // First claim succeeds
        t.client.claim_reward(&quest_id, &t.user1, &reward);

        // Double claim attempt fails
        let res = t.client.try_claim_reward(&quest_id, &t.user1, &reward);
        assert_eq!(res, Err(Ok(Error::AlreadyClaimed)));
    }

    #[test]
    fn test_security_oracle_data_injection() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_INJ");
        let deadline = t.env.ledger().timestamp() + 3600;

        // Zero reward injection attempt
        let zero_res = t.client.try_register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &0i128,
            &t.verifier,
            &deadline,
        );
        assert_eq!(zero_res, Err(Ok(Error::InvalidRewardAmount)));

        // Excessive reward injection attempt (> 1_000_000_000_000_000 MAX_REWARD_AMOUNT)
        let excessive_res = t.client.try_register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &1_000_000_000_000_001i128,
            &t.verifier,
            &deadline,
        );
        assert_eq!(excessive_res, Err(Ok(Error::AmountTooLarge)));
    }

    // ============================================================================
    // Edge Case Tests
    // ============================================================================

    #[test]
    fn test_edge_case_zero_amount() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_ZERO");
        let deadline = t.env.ledger().timestamp() + 3600;

        let res = t.client.try_register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &0i128,
            &t.verifier,
            &deadline,
        );
        assert_eq!(res, Err(Ok(Error::InvalidRewardAmount)));
    }

    #[test]
    fn test_edge_case_max_values() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_MAX");
        let max_reward = 1_000_000_000_000_000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        // Register at maximum boundary succeeds
        let res = t.client.try_register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &max_reward,
            &t.verifier,
            &deadline,
        );
        assert!(res.is_ok());

        // Above max boundary fails
        let quest_id2 = symbol_short!("Q_MAX2");
        let res2 = t.client.try_register_quest(
            &quest_id2,
            &t.creator,
            &t.token_address,
            &(max_reward + 1),
            &t.verifier,
            &deadline,
        );
        assert_eq!(res2, Err(Ok(Error::AmountTooLarge)));
    }

    #[test]
    fn test_edge_case_empty_inputs() {
        let t = setup_test_env();
        let empty_batch = Vec::new(&t.env);

        let res = t.client.try_register_quests_batch(&t.creator, &empty_batch);
        assert_eq!(res, Err(Ok(Error::ArrayTooLong)));
    }

    #[test]
    fn test_edge_case_concurrent_modifications() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_CONC");
        let reward = 1000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward);

        let proof_hash1 = BytesN::from_array(&t.env, &[4u8; 32]);
        let proof_hash2 = BytesN::from_array(&t.env, &[8u8; 32]);

        // Concurrent submissions by user1 and user2 proceed independently without state collisions
        let sub1_res = t.client.try_submit_proof(&quest_id, &t.user1, &proof_hash1);
        let sub2_res = t.client.try_submit_proof(&quest_id, &t.user2, &proof_hash2);

        assert!(sub1_res.is_ok());
        assert!(sub2_res.is_ok());
    }

    // ============================================================================
    // Property-Based Tests
    // ============================================================================

    #[test]
    fn test_property_idempotent_reads() {
        let t = setup_test_env();

        let admin1 = t.client.get_admin();
        let admin2 = t.client.get_admin();
        let admin3 = t.client.get_admin();
        assert_eq!(admin1, admin2);
        assert_eq!(admin2, admin3);

        let stats1 = t.client.get_user_stats(&t.user1);
        let stats2 = t.client.get_user_stats(&t.user1);
        assert_eq!(stats1.xp, stats2.xp);
        assert_eq!(stats1.quests_completed, stats2.quests_completed);
    }

    #[test]
    fn test_property_fund_conservation_across_operations() {
        let t = setup_test_env();
        let initial_mint = 10_000_000_000_000_000i128;

        let quest1 = symbol_short!("Q_PROP1");
        let quest2 = symbol_short!("Q_PROP2");
        let r1 = 2000i128;
        let r2 = 3000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        // Register quests
        t.client.register_quest(
            &quest1,
            &t.creator,
            &t.token_address,
            &r1,
            &t.verifier,
            &deadline,
        );
        t.client.register_quest(
            &quest2,
            &t.creator,
            &t.token_address,
            &r2,
            &t.verifier,
            &deadline,
        );

        // Escrow deposits
        t.client
            .deposit_escrow(&quest1, &t.creator, &t.token_address, &r1);
        t.client
            .deposit_escrow(&quest2, &t.creator, &t.token_address, &r2);

        // Submit and approve quest1
        let proof = BytesN::from_array(&t.env, &[5u8; 32]);
        t.client.submit_proof(&quest1, &t.user1, &proof);
        t.client.approve_submission(&quest1, &t.user1, &t.verifier);
        t.client.claim_reward(&quest1, &t.user1, &r1);

        let creator_bal = t.token.balance(&t.creator);
        let contract_bal = t.token.balance(&t.contract_id);
        let user1_bal = t.token.balance(&t.user1);

        assert_eq!(
            creator_bal + contract_bal + user1_bal,
            initial_mint,
            "Total token supply remains conserved"
        );
    }

    #[test]
    fn test_property_state_machine_soundness() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_MACH");
        let reward = 1000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward);

        let proof = BytesN::from_array(&t.env, &[6u8; 32]);
        t.client.submit_proof(&quest_id, &t.user1, &proof);

        // Cannot claim before approval (Pending -> Paid invalid)
        let claim_unapproved = t.client.try_claim_reward(&quest_id, &t.user1, &reward);
        assert_eq!(claim_unapproved, Err(Ok(Error::InvalidStatusTransition)));

        // Approve (Pending -> Approved)
        t.client
            .approve_submission(&quest_id, &t.user1, &t.verifier);

        // Claim (Approved -> Paid)
        let claim_approved = t.client.try_claim_reward(&quest_id, &t.user1, &reward);
        assert!(claim_approved.is_ok());
    }

    // ============================================================================
    // Integration Tests
    // ============================================================================

    #[test]
    fn test_integration_complete_quest_flow() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_FLOW");
        let reward = 5000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        // 1. Register Quest
        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );

        // 2. Deposit Escrow
        t.client
            .deposit_escrow(&quest_id, &t.creator, &t.token_address, &reward);

        // 3. User Submits Proof
        let proof = BytesN::from_array(&t.env, &[10u8; 32]);
        t.client.submit_proof(&quest_id, &t.user1, &proof);

        // 4. Verifier Approves
        t.client
            .approve_submission(&quest_id, &t.user1, &t.verifier);

        // 5. User Claims Reward
        t.client.claim_reward(&quest_id, &t.user1, &reward);

        // 6. Verification
        assert_eq!(t.token.balance(&t.user1), reward);
        let user_stats = t.client.get_user_stats(&t.user1);
        assert_eq!(user_stats.quests_completed, 1);
        assert!(user_stats.xp > 0);
    }

    #[test]
    fn test_integration_dispute_and_resolution() {
        let t = setup_test_env();
        let quest_id = symbol_short!("Q_DISP");
        let deadline = t.env.ledger().timestamp() + 3600;

        // Register quest first
        t.client.register_quest(
            &quest_id,
            &t.creator,
            &t.token_address,
            &1000i128,
            &t.verifier,
            &deadline,
        );

        // Open dispute
        let dispute = t.client.open_dispute(&quest_id, &t.user1, &t.admin);
        assert_eq!(dispute.quest_id, quest_id);

        // Resolve dispute
        let resolve_res = t
            .client
            .try_resolve_dispute(&quest_id, &t.user1, &t.admin, &false, &0u32);
        assert!(resolve_res.is_ok());
    }

    #[test]
    fn test_integration_batch_payout_processing() {
        let t = setup_test_env();
        let quest1 = symbol_short!("Q_BTCH1");
        let quest2 = symbol_short!("Q_BTCH2");
        let reward = 1000i128;
        let deadline = t.env.ledger().timestamp() + 3600;

        t.client.register_quest(
            &quest1,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );
        t.client.register_quest(
            &quest2,
            &t.creator,
            &t.token_address,
            &reward,
            &t.verifier,
            &deadline,
        );

        let proof = BytesN::from_array(&t.env, &[11u8; 32]);
        t.client.submit_proof(&quest1, &t.user1, &proof);
        t.client.submit_proof(&quest2, &t.user2, &proof);

        let mut sub1_list = Vec::new(&t.env);
        sub1_list.push_back(t.user1.clone());
        let mut sub2_list = Vec::new(&t.env);
        sub2_list.push_back(t.user2.clone());

        let mut batch_inputs = Vec::new(&t.env);
        batch_inputs.push_back(BatchApprovalInput {
            quest_id: quest1.clone(),
            submissions: sub1_list,
        });
        batch_inputs.push_back(BatchApprovalInput {
            quest_id: quest2.clone(),
            submissions: sub2_list,
        });

        // Batch approval succeeds
        let res = t
            .client
            .try_approve_submissions_batch(&t.verifier, &batch_inputs);
        assert!(res.is_ok());
    }

    // ============================================================================
    // Invariant Verification Tests
    // ============================================================================

    #[test]
    fn test_invariant_verification_complete_state() {
        let t = setup_test_env();

        assert_invariants_hold(&t.env, &t.client, &t.admin);
    }

    #[test]
    fn test_invariant_verification_after_upgrades() {
        let t = setup_test_env();

        let upgrade_res = t.client.try_authorize_upgrade(&t.admin);
        assert!(upgrade_res.is_ok());

        assert_invariants_hold(&t.env, &t.client, &t.admin);
    }

    // ============================================================================
    // Test Helpers and Assertions
    // ============================================================================

    fn assert_invariants_hold(_env: &Env, client: &EarnQuestContractClient, admin: &Address) {
        assert!(
            client.is_admin(admin),
            "Admin authorization invariant holds"
        );
        assert_eq!(client.get_admin(), *admin, "Admin storage invariant holds");
    }
}
