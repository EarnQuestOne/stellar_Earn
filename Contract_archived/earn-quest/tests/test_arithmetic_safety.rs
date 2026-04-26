use earn_quest::escrow;
use earn_quest::reputation;
use earn_quest::storage;
use earn_quest::submission;
use earn_quest::test::*;
use earn_quest::{Error, EarnQuestContract};
use soroban_sdk::{Address, Env, Symbol, I128_MAX, U32_MAX};

#[test]
fn test_escrow_deposit_overflow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create a quest
    let quest_id = Symbol::new(&env, "overflow_quest");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);

    EarnQuestContract::register_quest(
        env.clone(),
        quest_id.clone(),
        creator.clone(),
        reward_asset,
        100, // reward_amount
        verifier,
        1000, // deadline
        10,   // max_participants
    ).unwrap();

    // Set escrow balance to near maximum
    storage::set_escrow_balance(&env, &quest_id, I128_MAX);

    // Try to deposit more (should overflow)
    let result = escrow::deposit_escrow(&env, &quest_id, &creator, 1);
    assert_eq!(result, Err(Error::ArithmeticOverflow));
}

#[test]
fn test_escrow_deposit_large_amount() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create a quest
    let quest_id = Symbol::new(&env, "large_quest");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);

    EarnQuestContract::register_quest(
        env.clone(),
        quest_id.clone(),
        creator.clone(),
        reward_asset,
        100, // reward_amount
        verifier,
        1000, // deadline
        10,   // max_participants
    ).unwrap();

    // Try to deposit maximum amount (should work)
    let result = escrow::deposit_escrow(&env, &quest_id, &creator, I128_MAX);
    assert!(result.is_ok());

    // Verify balance
    assert_eq!(storage::get_escrow_balance(&env, &quest_id), I128_MAX);
}

#[test]
fn test_escrow_payout_underflow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create a quest with high reward amount
    let quest_id = Symbol::new(&env, "underflow_quest");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);

    EarnQuestContract::register_quest(
        env.clone(),
        quest_id.clone(),
        creator.clone(),
        reward_asset,
        1000, // reward_amount
        verifier,
        1000, // deadline
        10,   // max_participants
    ).unwrap();

    // Set escrow balance to less than reward amount
    storage::set_escrow_balance(&env, &quest_id, 500);

    // Try to process payout (should underflow)
    let recipient = Address::generate(&env);
    let result = escrow::process_payout(&env, &quest_id, &recipient);
    assert_eq!(result, Err(Error::ArithmeticUnderflow));
}

#[test]
fn test_escrow_payout_exact_balance() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create a quest
    let quest_id = Symbol::new(&env, "exact_quest");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);

    EarnQuestContract::register_quest(
        env.clone(),
        quest_id.clone(),
        creator.clone(),
        reward_asset,
        100, // reward_amount
        verifier,
        1000, // deadline
        10,   // max_participants
    ).unwrap();

    // Set escrow balance to exactly reward amount
    storage::set_escrow_balance(&env, &quest_id, 100);

    // Process payout (should work)
    let recipient = Address::generate(&env);
    let result = escrow::process_payout(&env, &quest_id, &recipient);
    assert!(result.is_ok());

    // Verify balance is now 0
    assert_eq!(storage::get_escrow_balance(&env, &quest_id), 0);
}

#[test]
fn test_xp_award_overflow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create user with maximum XP
    let user = Address::generate(&env);
    let mut stats = earn_quest::types::UserStats {
        address: user.clone(),
        total_xp: U32_MAX,
        level: 1,
        quests_completed: 0,
        badges: soroban_sdk::Vec::new(&env),
    };
    storage::set_user_stats(&env, &stats);

    // Try to award more XP (should overflow)
    let result = reputation::award_xp(&env, &user, 1);
    assert_eq!(result, Err(Error::ArithmeticOverflow));
}

#[test]
fn test_quests_completed_overflow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create user with maximum quests completed
    let user = Address::generate(&env);
    let mut stats = earn_quest::types::UserStats {
        address: user.clone(),
        total_xp: 0,
        level: 1,
        quests_completed: U32_MAX,
        badges: soroban_sdk::Vec::new(&env),
    };
    storage::set_user_stats(&env, &stats);

    // Try to award XP (should overflow on quests_completed)
    let result = reputation::award_xp(&env, &user, 100);
    assert_eq!(result, Err(Error::ArithmeticOverflow));
}

#[test]
fn test_xp_award_large_amount() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create user
    let user = Address::generate(&env);
    
    // Award maximum XP (should work)
    let result = reputation::award_xp(&env, &user, U32_MAX);
    assert!(result.is_ok());

    // Verify stats
    let stats = storage::get_user_stats(&env, &user).unwrap();
    assert_eq!(stats.total_xp, U32_MAX);
    assert_eq!(stats.quests_completed, 1);
    assert_eq!(stats.level, (U32_MAX / 100) + 1);
}

#[test]
fn test_total_claims_overflow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create a quest
    let quest_id = Symbol::new(&env, "claims_quest");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);

    EarnQuestContract::register_quest(
        env.clone(),
        quest_id.clone(),
        creator.clone(),
        reward_asset,
        100, // reward_amount
        verifier,
        1000, // deadline
        10,   // max_participants
    ).unwrap();

    // Manually set total_claims to maximum
    let mut quest = storage::get_quest(&env, &quest_id).unwrap();
    quest.total_claims = U32_MAX;
    storage::set_quest(&env, &quest);

    // Create and approve a submission (should overflow on total_claims)
    let submitter = Address::generate(&env);
    let proof_hash = [0; 32];
    
    // First create the submission
    EarnQuestContract::submit_proof(
        env.clone(),
        quest_id.clone(),
        submitter.clone(),
        proof_hash,
    ).unwrap();

    // Now try to approve it
    let result = EarnQuestContract::approve_submission(
        env.clone(),
        quest_id.clone(),
        submitter.clone(),
        verifier,
    );
    assert_eq!(result, Err(Error::ArithmeticOverflow));
}

#[test]
fn test_level_calculation_edge_cases() {
    let env = Env::default();
    
    // Test level calculation with various XP values
    assert_eq!(reputation::calculate_level(0), 1);
    assert_eq!(reputation::calculate_level(99), 1);
    assert_eq!(reputation::calculate_level(100), 2);
    assert_eq!(reputation::calculate_level(199), 2);
    assert_eq!(reputation::calculate_level(200), 3);
    assert_eq!(reputation::calculate_level(U32_MAX), (U32_MAX / 100) + 1);
}

#[test]
fn test_escrow_multiple_operations() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create a quest
    let quest_id = Symbol::new(&env, "multi_quest");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);

    EarnQuestContract::register_quest(
        env.clone(),
        quest_id.clone(),
        creator.clone(),
        reward_asset,
        100, // reward_amount
        verifier,
        1000, // deadline
        10,   // max_participants
    ).unwrap();

    // Perform multiple operations
    let amounts = [100, 200, 300, 400];
    let expected_total = 1000;

    for &amount in &amounts {
        escrow::deposit_escrow(&env, &quest_id, &creator, amount).unwrap();
    }

    // Verify total
    assert_eq!(storage::get_escrow_balance(&env, &quest_id), expected_total);

    // Process multiple payouts
    let recipients = [
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];

    for recipient in &recipients {
        // Create submission first
        EarnQuestContract::submit_proof(
            env.clone(),
            quest_id.clone(),
            recipient.clone(),
            [0; 32],
        ).unwrap();
        
        // Then approve
        EarnQuestContract::approve_submission(
            env.clone(),
            quest_id.clone(),
            recipient.clone(),
            verifier,
        ).unwrap();
    }

    // Verify remaining balance
    assert_eq!(storage::get_escrow_balance(&env, &quest_id), expected_total - 300);
}

#[test]
fn test_arithmetic_safety_with_zero_values() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Test XP award with 0 XP
    let user = Address::generate(&env);
    let result = reputation::award_xp(&env, &user, 0);
    assert!(result.is_ok());

    let stats = storage::get_user_stats(&env, &user).unwrap();
    assert_eq!(stats.total_xp, 0);
    assert_eq!(stats.quests_completed, 1); // Still increments quests_completed

    // Test escrow deposit with 0 amount (should fail validation)
    let quest_id = Symbol::new(&env, "zero_quest");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);

    EarnQuestContract::register_quest(
        env.clone(),
        quest_id.clone(),
        creator.clone(),
        reward_asset,
        100, // reward_amount
        verifier,
        1000, // deadline
        10,   // max_participants
    ).unwrap();

    let result = escrow::deposit_escrow(&env, &quest_id, &creator, 0);
    assert_eq!(result, Err(Error::InvalidEscrowAmount));
}

#[test]
fn test_concurrent_arithmetic_safety() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EarnQuestContract);
    env.set_current_contract_address(contract_id);

    // Initialize contract
    let admin = Address::generate(&env);
    EarnQuestContract::initialize(env.clone(), admin.clone()).unwrap();

    // Create a quest
    let quest_id = Symbol::new(&env, "concurrent_quest");
    let creator = Address::generate(&env);
    let reward_asset = Address::generate(&env);
    let verifier = Address::generate(&env);

    EarnQuestContract::register_quest(
        env.clone(),
        quest_id.clone(),
        creator.clone(),
        reward_asset,
        1, // reward_amount (minimal)
        verifier,
        1000, // deadline
        100,  // max_participants
    ).unwrap();

    // Deposit large amount
    escrow::deposit_escrow(&env, &quest_id, &creator, 1000).unwrap();

    // Create multiple users and process payouts rapidly
    let mut users = Vec::new(&env);
    for i in 0..100 {
        let user = Address::generate(&env);
        users.push_back(user.clone());
        
        // Create submission
        EarnQuestContract::submit_proof(
            env.clone(),
            quest_id.clone(),
            user.clone(),
            [i as u8; 32],
        ).unwrap();
    }

    // Process all approvals (should handle arithmetic safely)
    for user in users {
        let result = EarnQuestContract::approve_submission(
            env.clone(),
            quest_id.clone(),
            user.clone(),
            verifier,
        );
        
        // Should succeed until escrow runs out
        if storage::get_escrow_balance(&env, &quest_id) >= 1 {
            assert!(result.is_ok());
        } else {
            assert_eq!(result, Err(Error::ArithmeticUnderflow));
            break;
        }
    }

    // Final balance should be 0 or positive
    let final_balance = storage::get_escrow_balance(&env, &quest_id);
    assert!(final_balance >= 0);
}
