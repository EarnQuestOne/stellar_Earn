use soroban_sdk::{
    testutils::Address as _, 
    Address, 
    Env, 
    Symbol,
    symbol_short,
    contract,
    contractimpl,
    BytesN
};

use crate::{
    EarnQuestContract, 
    EarnQuestContractClient,
    types::QuestStatus
};

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_register_quest_with_participant_limit() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);

        // Register quest with max_participants = 5
        client.register_quest(
            &symbol_short!("Q001"),
            &creator,
            &reward_asset,
            &1000,
            &verifier,
            &1000000,
            &5,
        );

        // Verify quest was created
        let quest = client.get_quest(&symbol_short!("Q001"));
        assert_eq!(quest.max_participants, 5);
        assert_eq!(quest.total_claims, 0);
    }

    #[test]
    fn test_register_quest_with_zero_participants() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);

        // Should fail with InvalidParticipantLimit
        let result = client.try_register_quest(
            &symbol_short!("Q002"),
            &creator,
            &reward_asset,
            &1000,
            &verifier,
            &1000000,
            &0,
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_participant_limit_enforcement() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);

        // Register quest with max_participants = 2
        client.register_quest(
            &symbol_short!("QLIMIT"),
            &creator,
            &reward_asset,
            &1000,
            &verifier,
            &9999999999,
            &2,
        );

        // Submit and approve 2 submissions
        for i in 1..=2 {
            let submitter = Address::generate(&env);
            let proof = BytesN::from_array(&env, &[i; 32]);
            client.submit_proof(&symbol_short!("QLIMIT"), &submitter, &proof);
            client.approve_submission(&symbol_short!("QLIMIT"), &submitter, &verifier);
        }

        // Verify quest is full
        let is_full = client.is_quest_full(&symbol_short!("QLIMIT"));
        assert!(is_full);

        // Verify quest status is Completed
        let quest = client.get_quest(&symbol_short!("QLIMIT"));
        assert_eq!(quest.status, QuestStatus::Completed);
    }

    #[test]
    fn test_submission_rejected_when_quest_full() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);

        // Register quest with max_participants = 1
        client.register_quest(
            &symbol_short!("QFULL"),
            &creator,
            &reward_asset,
            &1000,
            &verifier,
            &9999999999,
            &1,
        );

        // Submit and approve 1 submission
        let submitter1 = Address::generate(&env);
        let proof1 = BytesN::from_array(&env, &[1u8; 32]);
        client.submit_proof(&symbol_short!("QFULL"), &submitter1, &proof1);
        client.approve_submission(&symbol_short!("QFULL"), &submitter1, &verifier);

        // Try to submit another (should fail with QuestFull or QuestNotActive)
        let submitter2 = Address::generate(&env);
        let proof2 = BytesN::from_array(&env, &[2u8; 32]);
        let result = client.try_submit_proof(&symbol_short!("QFULL"), &submitter2, &proof2);
        assert!(result.is_err());
    }

    #[test]
    fn test_claim_counter_accuracy() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);

        // Register quest
        client.register_quest(
            &symbol_short!("QCOUNT"),
            &creator,
            &reward_asset,
            &500,
            &verifier,
            &9999999999,
            &5,
        );

        // Verify initial count
        let quest = client.get_quest(&symbol_short!("QCOUNT"));
        assert_eq!(quest.total_claims, 0);

        // Approve 3 submissions
        for i in 1..=3 {
            let submitter = Address::generate(&env);
            let proof = BytesN::from_array(&env, &[i; 32]);
            client.submit_proof(&symbol_short!("QCOUNT"), &submitter, &proof);
            client.approve_submission(&symbol_short!("QCOUNT"), &submitter, &verifier);

            // Verify counter incremented
            let quest = client.get_quest(&symbol_short!("QCOUNT"));
            assert_eq!(quest.total_claims, i as u32);
        }
    }

    #[test]
    fn test_user_stats_after_approval() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);
        let submitter = Address::generate(&env);

        // Register quest
        client.register_quest(
            &symbol_short!("QREP"),
            &creator,
            &reward_asset,
            &1000,
            &verifier,
            &9999999999,
            &10,
        );

        // Submit and approve
        let proof = BytesN::from_array(&env, &[1u8; 32]);
        client.submit_proof(&symbol_short!("QREP"), &submitter, &proof);
        client.approve_submission(&symbol_short!("QREP"), &submitter, &verifier);

        // Check user stats
        let stats = client.get_user_stats(&submitter);
        assert_eq!(stats.total_xp, 100);
        assert_eq!(stats.quests_completed, 1);
    }
}