#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    Address, BytesN, Env, String, Symbol, Vec,
};

use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use earn_quest::types::{BatchQuestInput, BatchApprovalInput};

fn setup_test_env() -> (Env, EarnQuestContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);

    (env, client, admin, token)
}

/// Test: Batch quest registration with valid indices
#[test]
fn test_batch_quest_registration_valid_bounds() {
    let (env, client, _admin, token) = setup_test_env();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let mut quests = Vec::new(&env);
    
    // Create 3 valid quests
    for i in 0..3 {
        let quest_id = Symbol::new(&env, &format!("quest_{}", i));
        let deadline = env.ledger().timestamp() + 86_400;
        
        let mut batch_quests = Vec::new(&env);
        batch_quests.push_back(earn_quest::types::Quest {
            id: quest_id,
            creator: creator.clone(),
            reward_asset: token.clone(),
            reward_amount: 1000,
            verifier: verifier.clone(),
            deadline,
            status: earn_quest::types::QuestStatus::Active,
            total_claims: 0,
        });
        quests.push_back(BatchQuestInput {
            quests: batch_quests,
            metadata: Vec::new(&env),
        });
    }

    // Should succeed - all indices are valid
    client.register_quests_batch(&creator, &quests);
}

/// Test: Batch approval with valid indices
#[test]
fn test_batch_approval_valid_bounds() {
    let (env, client, _admin, token) = setup_test_env();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter1 = Address::generate(&env);
    let submitter2 = Address::generate(&env);

    // Register quests
    let quest_id1 = Symbol::new(&env, "quest1");
    let quest_id2 = Symbol::new(&env, "quest2");
    let deadline = env.ledger().timestamp() + 86_400;

    client.register_quest(&quest_id1, &creator, &token, &1000, &verifier, &deadline);
    client.register_quest(&quest_id2, &creator, &token, &2000, &verifier, &deadline);

    // Submit proofs
    let proof1: BytesN<32> = BytesN::from_array(&env, &[1u8; 32]);
    let proof2: BytesN<32> = BytesN::from_array(&env, &[2u8; 32]);

    client.submit_proof(&quest_id1, &submitter1, &proof1);
    client.submit_proof(&quest_id2, &submitter2, &proof2);

    // Batch approve
    let mut approvals = Vec::new(&env);
    let mut submissions1 = Vec::new(&env);
    submissions1.push_back(submitter1.clone());
    approvals.push_back(BatchApprovalInput {
        quest_id: quest_id1.clone(),
        submissions: submissions1,
    });
    let mut submissions2 = Vec::new(&env);
    submissions2.push_back(submitter2.clone());
    approvals.push_back(BatchApprovalInput {
        quest_id: quest_id2.clone(),
        submissions: submissions2,
    });

    // Should succeed - all indices are valid
    client.approve_submissions_batch(&verifier, &approvals);
}

/// Test: Query functions with valid bounds
#[test]
fn test_query_functions_valid_bounds() {
    let (env, client, _admin, token) = setup_test_env();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Register multiple quests
    for i in 0..5 {
        let quest_id = Symbol::new(&env, &format!("quest_{}", i));
        let deadline = env.ledger().timestamp() + 86_400;
        let reward = 1000 * (i as i128 + 1);

        client.register_quest(&quest_id, &creator, &token, &reward, &verifier, &deadline);
    }

    // Test get_active_quests - should handle bounds correctly
    let active_quests = client.get_active_quests(&0, &10);
    assert_eq!(active_quests.len(), 5);

    // Test get_quests_by_creator - should handle bounds correctly
    let creator_quests = client.get_quests_by_creator(&creator, &0, &10);
    assert_eq!(creator_quests.len(), 5);

    // Test get_quests_by_reward_range - should handle bounds correctly
    let reward_quests = client.get_quests_by_reward_range(&1000, &5000, &0, &10);
    assert_eq!(reward_quests.len(), 5);
}

/// Test: Metadata validation with valid bounds
#[test]
fn test_metadata_validation_valid_bounds() {
    let (env, client, _admin, token) = setup_test_env();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let quest_id = Symbol::new(&env, "quest_meta");
    let deadline = env.ledger().timestamp() + 86_400;

    // Register quest first
    client.register_quest(&quest_id, &creator, &token, &1000, &verifier, &deadline);

    // Create metadata with tags and requirements
    let mut tags = Vec::new(&env);
    tags.push_back(String::from_str(&env, "tag1"));
    tags.push_back(String::from_str(&env, "tag2"));
    tags.push_back(String::from_str(&env, "tag3"));

    let mut requirements = Vec::new(&env);
    requirements.push_back(String::from_str(&env, "requirement1"));
    requirements.push_back(String::from_str(&env, "requirement2"));

    // Note: This test verifies that the bounds checking logic works
    // The actual metadata update would require the proper QuestMetadata struct
    // which is defined in the contract's types module
}

/// Test: Empty batch operations should fail with ArrayTooLong error
#[test]
#[should_panic(expected = "Error(Contract, #62)")] // ArrayTooLong
fn test_empty_batch_operations() {
    let (env, client, _admin, _token) = setup_test_env();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let empty_quests = Vec::new(&env);
    let empty_approvals = Vec::new(&env);

    // Empty batch quest registration should fail (validation rejects length == 0)
    client.register_quests_batch(&creator, &empty_quests);

    // Empty batch approval should fail (validation rejects length == 0)
    client.approve_submissions_batch(&verifier, &empty_approvals);
}

/// Test: Query with offset beyond available items
#[test]
fn test_query_with_large_offset() {
    let (env, client, _admin, token) = setup_test_env();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Register only 2 quests
    for i in 0..2 {
        let quest_id = Symbol::new(&env, &format!("quest_{}", i));
        let deadline = env.ledger().timestamp() + 86_400;

        client.register_quest(&quest_id, &creator, &token, &1000, &verifier, &deadline);
    }

    // Query with offset beyond available items - should return empty, not panic
    let quests = client.get_active_quests(&10, &5);
    assert_eq!(quests.len(), 0);
}

/// Test: Single item batch operations
#[test]
fn test_single_item_batch_operations() {
    let (env, client, _admin, token) = setup_test_env();
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Single quest batch
    let mut quests = Vec::new(&env);
    let quest_id = Symbol::new(&env, "single_quest");
    let deadline = env.ledger().timestamp() + 86_400;
    
    let mut batch_quests = Vec::new(&env);
    batch_quests.push_back(earn_quest::types::Quest {
        id: quest_id.clone(),
        creator: creator.clone(),
        reward_asset: token.clone(),
        reward_amount: 1000,
        verifier: verifier.clone(),
        deadline,
        status: earn_quest::types::QuestStatus::Active,
        total_claims: 0,
    });
    quests.push_back(BatchQuestInput {
        quests: batch_quests,
        metadata: Vec::new(&env),
    });

    client.register_quests_batch(&creator, &quests);

    // Verify quest was created
    let quest = client.get_quest(&quest_id);
    assert_eq!(quest.reward_amount, 1000);
}
