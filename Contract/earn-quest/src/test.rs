#[cfg(test)]
mod tests {
    use soroban_sdk::{
        symbol_short,
        testutils::Address as _,
        token::{Client as TokenClient, StellarAssetClient},
        Address, BytesN, Env, Symbol,
    };

    use crate::{types::QuestStatus, EarnQuestContract, EarnQuestContractClient};

    fn setup_token(env: &Env) -> (Address, StellarAssetClient<'_>, TokenClient<'_>) {
        let admin = Address::generate(env);
        let address = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        let admin_client = StellarAssetClient::new(env, &address);
        let client = TokenClient::new(env, &address);
        (address, admin_client, client)
    }

    #[allow(clippy::too_many_arguments)]
    fn register_and_fund(
        _env: &Env,
        client: &EarnQuestContractClient,
        quest_id: &Symbol,
        creator: &Address,
        token_address: &Address,
        token_admin_client: &StellarAssetClient,
        reward: i128,
        verifier: &Address,
        deadline: u64,
        max_participants: u32,
    ) {
        let total = reward * (max_participants as i128);
        token_admin_client.mint(creator, &total);
        client.register_quest(
            quest_id,
            creator,
            token_address,
            &reward,
            verifier,
            &deadline,
            &max_participants,
        );
        client.deposit_escrow(quest_id, creator, &total);
    }

    #[test]
    fn test_register_quest_with_participant_limit() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);

        client.register_quest(
            &symbol_short!("Q001"),
            &creator,
            &reward_asset,
            &1000,
            &verifier,
            &1000000,
            &5,
        );

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
        let (token_address, token_admin_client, _token_client) = setup_token(&env);
        let quest_id = symbol_short!("QLIMIT");

        register_and_fund(
            &env,
            &client,
            &quest_id,
            &creator,
            &token_address,
            &token_admin_client,
            1000,
            &verifier,
            9999999999,
            2,
        );

        for i in 1..=2 {
            let submitter = Address::generate(&env);
            let proof = BytesN::from_array(&env, &[i; 32]);
            client.submit_proof(&quest_id, &submitter, &proof);
            client.approve_submission(&quest_id, &submitter, &verifier);
        }

        let is_full = client.is_quest_full(&quest_id);
        assert!(is_full);

        let quest = client.get_quest(&quest_id);
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
        let (token_address, token_admin_client, _token_client) = setup_token(&env);
        let quest_id = symbol_short!("QFULL");

        register_and_fund(
            &env,
            &client,
            &quest_id,
            &creator,
            &token_address,
            &token_admin_client,
            1000,
            &verifier,
            9999999999,
            1,
        );

        let submitter1 = Address::generate(&env);
        let proof1 = BytesN::from_array(&env, &[1u8; 32]);
        client.submit_proof(&quest_id, &submitter1, &proof1);
        client.approve_submission(&quest_id, &submitter1, &verifier);

        let submitter2 = Address::generate(&env);
        let proof2 = BytesN::from_array(&env, &[2u8; 32]);
        let result = client.try_submit_proof(&quest_id, &submitter2, &proof2);
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
        let (token_address, token_admin_client, _token_client) = setup_token(&env);
        let quest_id = symbol_short!("QCOUNT");

        register_and_fund(
            &env,
            &client,
            &quest_id,
            &creator,
            &token_address,
            &token_admin_client,
            500,
            &verifier,
            9999999999,
            5,
        );

        let quest = client.get_quest(&quest_id);
        assert_eq!(quest.total_claims, 0);

        for i in 1..=3 {
            let submitter = Address::generate(&env);
            let proof = BytesN::from_array(&env, &[i; 32]);
            client.submit_proof(&quest_id, &submitter, &proof);
            client.approve_submission(&quest_id, &submitter, &verifier);

            let quest = client.get_quest(&quest_id);
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
        let submitter = Address::generate(&env);
        let (token_address, token_admin_client, _token_client) = setup_token(&env);
        let quest_id = symbol_short!("QREP");

        register_and_fund(
            &env,
            &client,
            &quest_id,
            &creator,
            &token_address,
            &token_admin_client,
            1000,
            &verifier,
            9999999999,
            10,
        );

        let proof = BytesN::from_array(&env, &[1u8; 32]);
        client.submit_proof(&quest_id, &submitter, &proof);
        client.approve_submission(&quest_id, &submitter, &verifier);

        let stats = client.get_user_stats(&submitter);
        assert_eq!(stats.total_xp, 100);
        assert_eq!(stats.quests_completed, 1);
    }
}
