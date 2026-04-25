#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{symbol_short, token, Address, BytesN, Env, Symbol};

use earn_quest::{EarnQuestContract, EarnQuestContractClient};

// ──────────────────────────────────────────────
// Test setup helper
// ──────────────────────────────────────────────

#[allow(dead_code)]
struct TestEnv<'a> {
    env: Env,
    contract: EarnQuestContractClient<'a>,
    admin: Address,
    creator: Address,
    verifier: Address,
    user_a: Address,
    user_b: Address,
    user_c: Address,
    token_address: Address,
    token: token::Client<'a>,
    token_admin_client: token::StellarAssetClient<'a>,
}

fn setup() -> TestEnv<'static> {
    let env = Env::default();
    env.mock_all_auths();

    // Create addresses
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    let user_c = Address::generate(&env);

    // Deploy our contract
    let contract_id = env.register_contract(None, EarnQuestContract);
    let contract = EarnQuestContractClient::new(&env, &contract_id);

    // Create a test token
    let token_admin = Address::generate(&env);
    let token_contract_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract_obj.address();
    let token = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    // Give the creator tokens to work with
    token_admin_client.mint(&creator, &100_000);

    // Initialize the contract
    contract.initialize(&admin);

    TestEnv {
        env,
        contract,
        admin,
        creator,
        verifier,
        user_a,
        user_b,
        user_c,
        token_address,
        token,
        token_admin_client,
    }
}

/// Helper: register a quest with standard params
fn register_quest(t: &TestEnv, quest_id: &Symbol) {
    t.contract.register_quest(
        quest_id,
        &t.creator,
        &t.token_address,
        &1000_i128, // reward: 1000 per completion
        &t.verifier,
        &99999_u64, // far-future deadline
    );
}

/// Helper: register a quest with a custom deadline
fn register_quest_with_deadline(t: &TestEnv, quest_id: &Symbol, deadline: u64) {
    t.contract.register_quest(
        quest_id,
        &t.creator,
        &t.token_address,
        &1000_i128,
        &t.verifier,
        &deadline,
    );
}

/// Helper: submit proof for a user
fn submit_proof(t: &TestEnv, quest_id: &Symbol, user: &Address) {
    let proof = BytesN::from_array(&t.env, &[1u8; 32]);
    t.contract.submit_proof(quest_id, user, &proof);
}

/// Helper: full quest completion cycle (submit → approve → claim)
fn complete_quest(t: &TestEnv, quest_id: &Symbol, user: &Address) {
    submit_proof(t, quest_id, user);
    t.contract.approve_submission(quest_id, user, &t.verifier);
    t.contract.claim_reward(quest_id, user);
}

// ══════════════════════════════════════════════════════════════
// SECTION 1: DEPOSIT ESCROW
// ══════════════════════════════════════════════════════════════

#[test]
fn test_deposit_escrow() {
    let t = setup();
    let qid = symbol_short!("q1");
    register_quest(&t, &qid);

    // Creator starts with 100_000 tokens
    assert_eq!(t.token.balance(&t.creator), 100_000);

    // Deposit 5000 into escrow
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // Creator should have 100_000 - 5_000 = 95_000
    assert_eq!(t.token.balance(&t.creator), 95_000);

    // Contract should hold 5000
    assert_eq!(t.token.balance(&t.contract.address), 5_000);

    // Escrow balance query should return 5000
    let balance = t.contract.get_escrow_balance(&qid);
    assert_eq!(balance, 5_000);

    // Full info check
    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_deposited, 5_000);
    assert_eq!(info.total_paid_out, 0);
    assert_eq!(info.total_refunded, 0);
    assert!(info.is_active);
    assert_eq!(info.deposit_count, 1);
}

#[test]
fn test_topup_escrow() {
    let t = setup();
    let qid = symbol_short!("q2");
    register_quest(&t, &qid);

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &3000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 3_000);

    // Top up with 2000 more
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &2000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 5_000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_deposited, 5_000);
    assert_eq!(info.deposit_count, 2); // Two deposits
}

#[test]
fn test_multiple_topups_tracked() {
    let t = setup();
    let qid = symbol_short!("qtop");
    register_quest(&t, &qid);

    // Make 5 successive deposits
    for _ in 0..5 {
        t.contract
            .deposit_escrow(&qid, &t.creator, &t.token_address, &1000);
    }

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_deposited, 5_000);
    assert_eq!(info.deposit_count, 5);
    assert_eq!(t.contract.get_escrow_balance(&qid), 5_000);
    assert_eq!(t.token.balance(&t.creator), 95_000);
}

#[test]
fn test_zero_deposit_rejected() {
    let t = setup();
    let qid = symbol_short!("q15");
    register_quest(&t, &qid);

    let result = t
        .contract
        .try_deposit_escrow(&qid, &t.creator, &t.token_address, &0);
    assert!(result.is_err());
}

#[test]
fn test_negative_deposit_rejected() {
    let t = setup();
    let qid = symbol_short!("qneg");
    register_quest(&t, &qid);

    let result = t
        .contract
        .try_deposit_escrow(&qid, &t.creator, &t.token_address, &-100);
    assert!(result.is_err());
}

#[test]
fn test_wrong_token_rejected() {
    let t = setup();
    let qid = symbol_short!("q16");
    register_quest(&t, &qid);

    // Create a different token
    let other_admin = Address::generate(&t.env);
    let other_token_obj = t
        .env
        .register_stellar_asset_contract_v2(other_admin.clone());
    let other_token = other_token_obj.address();
    let other_admin_client = token::StellarAssetClient::new(&t.env, &other_token);
    other_admin_client.mint(&t.creator, &10_000);

    // Try to deposit the wrong token
    let result = t
        .contract
        .try_deposit_escrow(&qid, &t.creator, &other_token, &1000);
    assert!(result.is_err());
}

#[test]
fn test_stranger_cannot_deposit() {
    let t = setup();
    let qid = symbol_short!("q7");
    register_quest(&t, &qid);

    // User A tries to deposit — not the creator
    let result = t
        .contract
        .try_deposit_escrow(&qid, &t.user_a, &t.token_address, &1000);
    assert!(result.is_err());
}

#[test]
fn test_cannot_deposit_to_cancelled_quest() {
    let t = setup();
    let qid = symbol_short!("q10");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    t.contract.cancel_quest(&qid, &t.creator);

    // Try to deposit after cancel — should fail
    let result = t
        .contract
        .try_deposit_escrow(&qid, &t.creator, &t.token_address, &1000);
    assert!(result.is_err());
}

#[test]
fn test_cannot_deposit_to_nonexistent_quest() {
    let t = setup();
    let qid = symbol_short!("noquest");

    let result = t
        .contract
        .try_deposit_escrow(&qid, &t.creator, &t.token_address, &1000);
    assert!(result.is_err());
}

// ══════════════════════════════════════════════════════════════
// SECTION 2: PAYOUT DEDUCTS FROM ESCROW
// ══════════════════════════════════════════════════════════════

#[test]
fn test_payout_deducts_escrow() {
    let t = setup();
    let qid = symbol_short!("q3");
    register_quest(&t, &qid);

    // Deposit enough for at least 1 payout (reward is 1000)
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // User submits, verifier approves, user claims
    complete_quest(&t, &qid, &t.user_a);

    // User A should have 1000
    assert_eq!(t.token.balance(&t.user_a), 1_000);

    // Escrow should have 5000 - 1000 = 4000
    assert_eq!(t.contract.get_escrow_balance(&qid), 4_000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_paid_out, 1_000);
}

#[test]
fn test_multiple_payouts() {
    let t = setup();
    let qid = symbol_short!("q4");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // User A completes
    complete_quest(&t, &qid, &t.user_a);

    // User B completes
    complete_quest(&t, &qid, &t.user_b);

    assert_eq!(t.token.balance(&t.user_a), 1_000);
    assert_eq!(t.token.balance(&t.user_b), 1_000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 3_000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_paid_out, 2_000);
}

#[test]
fn test_three_payouts_exact_balance() {
    let t = setup();
    let qid = symbol_short!("q3x");
    register_quest(&t, &qid);

    // Deposit exactly enough for 3 payouts
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &3000);

    complete_quest(&t, &qid, &t.user_a);
    complete_quest(&t, &qid, &t.user_b);
    complete_quest(&t, &qid, &t.user_c);

    assert_eq!(t.contract.get_escrow_balance(&qid), 0);
    assert_eq!(t.token.balance(&t.user_a), 1_000);
    assert_eq!(t.token.balance(&t.user_b), 1_000);
    assert_eq!(t.token.balance(&t.user_c), 1_000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_deposited, 3_000);
    assert_eq!(info.total_paid_out, 3_000);
    assert_eq!(info.total_refunded, 0);
}

// ══════════════════════════════════════════════════════════════
// SECTION 3: INSUFFICIENT ESCROW PREVENTS APPROVALS
// ══════════════════════════════════════════════════════════════

#[test]
fn test_insufficient_escrow_blocks_approval() {
    let t = setup();
    let qid = symbol_short!("q5");
    register_quest(&t, &qid);

    // Deposit only 500, but reward is 1000 per completion
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &500);

    submit_proof(&t, &qid, &t.user_a);

    // Try to approve — should fail because escrow (500) < reward (1000)
    let result = t
        .contract
        .try_approve_submission(&qid, &t.user_a, &t.verifier);
    assert!(result.is_err());
}

#[test]
fn test_escrow_depleted_blocks_next_approval() {
    let t = setup();
    let qid = symbol_short!("qdep");
    register_quest(&t, &qid);

    // Deposit exactly enough for 1 payout
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &1000);

    // First user succeeds
    complete_quest(&t, &qid, &t.user_a);
    assert_eq!(t.contract.get_escrow_balance(&qid), 0);

    // Second user submits, but approval should fail (escrow depleted)
    submit_proof(&t, &qid, &t.user_b);
    let result = t
        .contract
        .try_approve_submission(&qid, &t.user_b, &t.verifier);
    assert!(result.is_err());
}

#[test]
fn test_topup_unblocks_approval_after_depletion() {
    let t = setup();
    let qid = symbol_short!("qunbl");
    register_quest(&t, &qid);

    // Deposit for 1 payout
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &1000);

    complete_quest(&t, &qid, &t.user_a);
    assert_eq!(t.contract.get_escrow_balance(&qid), 0);

    // Second user blocked
    submit_proof(&t, &qid, &t.user_b);
    let result = t
        .contract
        .try_approve_submission(&qid, &t.user_b, &t.verifier);
    assert!(result.is_err());

    // Top up with more funds
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &2000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 2_000);

    // Now approval should succeed
    t.contract.approve_submission(&qid, &t.user_b, &t.verifier);
    t.contract.claim_reward(&qid, &t.user_b);
    assert_eq!(t.token.balance(&t.user_b), 1_000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 1_000);
}

// ══════════════════════════════════════════════════════════════
// SECTION 4: CANCEL QUEST + REFUNDS
// ══════════════════════════════════════════════════════════════

#[test]
fn test_cancel_quest_refunds_escrow() {
    let t = setup();
    let qid = symbol_short!("q6");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // One payout first
    complete_quest(&t, &qid, &t.user_a);

    // Creator balance: 100_000 - 5_000 = 95_000
    assert_eq!(t.token.balance(&t.creator), 95_000);

    // Cancel → should refund 4000 (5000 - 1000 paid out)
    let refunded = t.contract.cancel_quest(&qid, &t.creator);
    assert_eq!(refunded, 4_000);

    // Creator: 95_000 + 4_000 = 99_000
    assert_eq!(t.token.balance(&t.creator), 99_000);

    // Escrow balance should be 0
    assert_eq!(t.contract.get_escrow_balance(&qid), 0);

    let info = t.contract.get_escrow_info(&qid);
    assert!(!info.is_active);
    assert_eq!(info.total_refunded, 4_000);
}

#[test]
fn test_cancel_quest_no_payouts_full_refund() {
    let t = setup();
    let qid = symbol_short!("qcfull");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &10_000);

    assert_eq!(t.token.balance(&t.creator), 90_000);

    let refunded = t.contract.cancel_quest(&qid, &t.creator);
    assert_eq!(refunded, 10_000);
    assert_eq!(t.token.balance(&t.creator), 100_000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_deposited, 10_000);
    assert_eq!(info.total_paid_out, 0);
    assert_eq!(info.total_refunded, 10_000);
    assert!(!info.is_active);
}

#[test]
fn test_cancel_quest_without_escrow() {
    let t = setup();
    let qid = symbol_short!("qnoesc");
    register_quest(&t, &qid);

    // Cancel without ever depositing — should return 0 refund
    let refunded = t.contract.cancel_quest(&qid, &t.creator);
    assert_eq!(refunded, 0);
}

#[test]
fn test_stranger_cannot_cancel() {
    let t = setup();
    let qid = symbol_short!("q8");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    let result = t.contract.try_cancel_quest(&qid, &t.user_a);
    assert!(result.is_err());
}

#[test]
fn test_cannot_cancel_already_cancelled() {
    let t = setup();
    let qid = symbol_short!("qcc");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    t.contract.cancel_quest(&qid, &t.creator);

    // Second cancel should fail (quest is already terminal)
    let result = t.contract.try_cancel_quest(&qid, &t.creator);
    assert!(result.is_err());
}

// ══════════════════════════════════════════════════════════════
// SECTION 5: EXPIRE QUEST + REFUNDS
// ══════════════════════════════════════════════════════════════

#[test]
fn test_expire_quest_refunds_escrow() {
    let t = setup();
    let qid = symbol_short!("qexp");

    // Register quest with deadline at timestamp 100
    register_quest_with_deadline(&t, &qid, 100);

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // Advance time past deadline
    t.env.ledger().with_mut(|li| {
        li.timestamp = 200;
    });

    // Expire the quest — should refund all 5000
    let refunded = t.contract.expire_quest(&qid, &t.creator);
    assert_eq!(refunded, 5_000);
    assert_eq!(t.token.balance(&t.creator), 100_000);

    let info = t.contract.get_escrow_info(&qid);
    assert!(!info.is_active);
    assert_eq!(info.total_refunded, 5_000);
}

#[test]
fn test_expire_quest_partial_payouts_then_refund() {
    let t = setup();
    let qid = symbol_short!("qexpp");

    register_quest_with_deadline(&t, &qid, 500);

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // User A completes before deadline
    complete_quest(&t, &qid, &t.user_a);
    assert_eq!(t.contract.get_escrow_balance(&qid), 4_000);

    // Advance past deadline
    t.env.ledger().with_mut(|li| {
        li.timestamp = 600;
    });

    // Expire — should refund remaining 4000
    let refunded = t.contract.expire_quest(&qid, &t.creator);
    assert_eq!(refunded, 4_000);

    // Creator: 100_000 - 5_000 + 4_000 = 99_000
    assert_eq!(t.token.balance(&t.creator), 99_000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_paid_out, 1_000);
    assert_eq!(info.total_refunded, 4_000);
}

#[test]
fn test_cannot_expire_before_deadline() {
    let t = setup();
    let qid = symbol_short!("qearly");

    register_quest_with_deadline(&t, &qid, 99999);

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // Time is still before deadline — expire should fail
    let result = t.contract.try_expire_quest(&qid, &t.creator);
    assert!(result.is_err());
}

#[test]
fn test_stranger_cannot_expire() {
    let t = setup();
    let qid = symbol_short!("qexpst");

    register_quest_with_deadline(&t, &qid, 100);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    t.env.ledger().with_mut(|li| {
        li.timestamp = 200;
    });

    let result = t.contract.try_expire_quest(&qid, &t.user_a);
    assert!(result.is_err());
}

// ══════════════════════════════════════════════════════════════
// SECTION 6: WITHDRAW UNCLAIMED
// ══════════════════════════════════════════════════════════════

#[test]
fn test_withdraw_unclaimed_after_cancel() {
    let t = setup();
    let qid = symbol_short!("q9");

    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // Cancel refunds everything
    let refunded = t.contract.cancel_quest(&qid, &t.creator);
    assert_eq!(refunded, 5_000);
    assert_eq!(t.token.balance(&t.creator), 100_000);
}

#[test]
fn test_withdraw_unclaimed_after_expiry() {
    let t = setup();
    let qid = symbol_short!("qwexp");

    register_quest_with_deadline(&t, &qid, 100);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &3000);

    // Complete one quest
    complete_quest(&t, &qid, &t.user_a);

    // Advance past deadline and expire
    t.env.ledger().with_mut(|li| {
        li.timestamp = 200;
    });

    let refunded = t.contract.expire_quest(&qid, &t.creator);
    assert_eq!(refunded, 2_000); // 3000 - 1000 paid
    assert_eq!(t.token.balance(&t.creator), 99_000); // 100k - 3k + 2k
}

#[test]
fn test_cannot_withdraw_from_active_quest() {
    let t = setup();
    let qid = symbol_short!("q11");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // Quest is Active — withdraw_unclaimed should fail
    let result = t.contract.try_withdraw_unclaimed(&qid, &t.creator);
    assert!(result.is_err());
}

#[test]
fn test_double_withdrawal_prevented() {
    let t = setup();
    let qid = symbol_short!("q12");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    // Cancel → refunds everything
    t.contract.cancel_quest(&qid, &t.creator);

    // Try to withdraw again — escrow is inactive, balance is 0
    let result = t.contract.try_withdraw_unclaimed(&qid, &t.creator);
    assert!(result.is_err());
}

#[test]
fn test_stranger_cannot_withdraw() {
    let t = setup();
    let qid = symbol_short!("qstrw");
    register_quest(&t, &qid);
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    t.contract.cancel_quest(&qid, &t.creator);

    // User A tries to withdraw — not the creator (already refunded anyway)
    let result = t.contract.try_withdraw_unclaimed(&qid, &t.user_a);
    assert!(result.is_err());
}

// ══════════════════════════════════════════════════════════════
// SECTION 7: BACKWARD COMPATIBILITY
// ══════════════════════════════════════════════════════════════

#[test]
fn test_quest_without_escrow_backward_compat() {
    let t = setup();
    let qid = symbol_short!("q13");
    register_quest(&t, &qid);

    // DON'T deposit escrow — old-style quest
    // Manually fund the contract so transfer_reward succeeds
    t.token_admin_client.mint(&t.contract.address, &10_000);

    // Should work without escrow
    complete_quest(&t, &qid, &t.user_a);

    assert_eq!(t.token.balance(&t.user_a), 1_000);
}

#[test]
fn test_multiple_quests_without_escrow() {
    let t = setup();
    let qid1 = symbol_short!("qno1");
    let qid2 = symbol_short!("qno2");
    register_quest(&t, &qid1);
    register_quest(&t, &qid2);

    // Fund contract directly (old style)
    t.token_admin_client.mint(&t.contract.address, &10_000);

    complete_quest(&t, &qid1, &t.user_a);
    complete_quest(&t, &qid2, &t.user_b);

    assert_eq!(t.token.balance(&t.user_a), 1_000);
    assert_eq!(t.token.balance(&t.user_b), 1_000);
}

// ══════════════════════════════════════════════════════════════
// SECTION 8: ESCROW QUERIES
// ══════════════════════════════════════════════════════════════

#[test]
fn test_escrow_balance_query() {
    let t = setup();
    let qid = symbol_short!("qbal");
    register_quest(&t, &qid);

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &7000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 7_000);

    // After a payout
    complete_quest(&t, &qid, &t.user_a);
    assert_eq!(t.contract.get_escrow_balance(&qid), 6_000);
}

#[test]
fn test_escrow_info_query() {
    let t = setup();
    let qid = symbol_short!("qinfo");
    register_quest(&t, &qid);

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &5000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.quest_id, qid);
    assert_eq!(info.depositor, t.creator);
    assert_eq!(info.token, t.token_address);
    assert_eq!(info.total_deposited, 5_000);
    assert_eq!(info.total_paid_out, 0);
    assert_eq!(info.total_refunded, 0);
    assert!(info.is_active);
    assert_eq!(info.deposit_count, 1);
}

#[test]
fn test_query_nonexistent_escrow_fails() {
    let t = setup();
    let qid = symbol_short!("qnone");

    let result = t.contract.try_get_escrow_balance(&qid);
    assert!(result.is_err());

    let result = t.contract.try_get_escrow_info(&qid);
    assert!(result.is_err());
}

// ══════════════════════════════════════════════════════════════
// SECTION 9: FULL LIFECYCLE & FUND TRACKING
// ══════════════════════════════════════════════════════════════

#[test]
fn test_full_lifecycle() {
    let t = setup();
    let qid = symbol_short!("q14");
    register_quest(&t, &qid);

    // 1. Deposit escrow for 3 completions (3 × 1000 = 3000)
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &3000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 3_000);
    assert_eq!(t.token.balance(&t.creator), 97_000);

    // 2. User A completes and claims
    complete_quest(&t, &qid, &t.user_a);
    assert_eq!(t.token.balance(&t.user_a), 1_000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 2_000);

    // 3. User B completes and claims
    complete_quest(&t, &qid, &t.user_b);
    assert_eq!(t.token.balance(&t.user_b), 1_000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 1_000);

    // 4. Creator cancels — 1 slot unused, gets 1000 back
    let refunded = t.contract.cancel_quest(&qid, &t.creator);
    assert_eq!(refunded, 1_000);
    assert_eq!(t.token.balance(&t.creator), 98_000); // 97000 + 1000

    // 5. Verify final state
    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_deposited, 3_000);
    assert_eq!(info.total_paid_out, 2_000);
    assert_eq!(info.total_refunded, 1_000);
    assert!(!info.is_active);
    assert_eq!(t.contract.get_escrow_balance(&qid), 0);
}

#[test]
fn test_full_lifecycle_with_topup() {
    let t = setup();
    let qid = symbol_short!("qlife2");
    register_quest(&t, &qid);

    // 1. Initial deposit for 2 completions
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &2000);
    assert_eq!(t.token.balance(&t.creator), 98_000);

    // 2. Two users complete
    complete_quest(&t, &qid, &t.user_a);
    complete_quest(&t, &qid, &t.user_b);
    assert_eq!(t.contract.get_escrow_balance(&qid), 0);

    // 3. Top up for 1 more
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &1000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 1_000);

    // 4. User C completes
    complete_quest(&t, &qid, &t.user_c);
    assert_eq!(t.contract.get_escrow_balance(&qid), 0);

    // 5. Final accounting
    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.total_deposited, 3_000);
    assert_eq!(info.total_paid_out, 3_000);
    assert_eq!(info.total_refunded, 0);
    assert_eq!(info.deposit_count, 2);
    assert_eq!(t.token.balance(&t.creator), 97_000); // 100k - 3k
}

#[test]
fn test_fund_movements_all_tracked() {
    let t = setup();
    let qid = symbol_short!("qtrack");
    register_quest(&t, &qid);

    let initial_creator_balance = t.token.balance(&t.creator);

    // Deposit
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &10_000);

    // Payouts
    complete_quest(&t, &qid, &t.user_a);
    complete_quest(&t, &qid, &t.user_b);

    // Cancel to get refund
    let refunded = t.contract.cancel_quest(&qid, &t.creator);

    let info = t.contract.get_escrow_info(&qid);

    // Invariant: deposited == paid_out + refunded + remaining_balance
    let remaining = info.total_deposited - info.total_paid_out - info.total_refunded;
    assert_eq!(remaining, 0); // After cancel, everything is accounted for

    // Invariant: creator_final = creator_initial - deposited + refunded
    let creator_final = t.token.balance(&t.creator);
    assert_eq!(
        creator_final,
        initial_creator_balance - info.total_deposited + info.total_refunded
    );

    // Invariant: all payouts went to users
    assert_eq!(t.token.balance(&t.user_a), 1_000);
    assert_eq!(t.token.balance(&t.user_b), 1_000);
    assert_eq!(info.total_paid_out, 2_000);
    assert_eq!(refunded, 8_000);
}

// ══════════════════════════════════════════════════════════════
// SECTION 10: MULTIPLE INDEPENDENT QUESTS
// ══════════════════════════════════════════════════════════════

#[test]
fn test_independent_escrows_per_quest() {
    let t = setup();
    let qid1 = symbol_short!("qm1");
    let qid2 = symbol_short!("qm2");
    register_quest(&t, &qid1);
    register_quest(&t, &qid2);

    // Deposit different amounts to each quest
    t.contract
        .deposit_escrow(&qid1, &t.creator, &t.token_address, &3000);
    t.contract
        .deposit_escrow(&qid2, &t.creator, &t.token_address, &7000);

    assert_eq!(t.contract.get_escrow_balance(&qid1), 3_000);
    assert_eq!(t.contract.get_escrow_balance(&qid2), 7_000);

    // Payout from quest 1 doesn't affect quest 2
    complete_quest(&t, &qid1, &t.user_a);
    assert_eq!(t.contract.get_escrow_balance(&qid1), 2_000);
    assert_eq!(t.contract.get_escrow_balance(&qid2), 7_000);

    // Cancel quest 1 doesn't affect quest 2
    let refunded = t.contract.cancel_quest(&qid1, &t.creator);
    assert_eq!(refunded, 2_000);
    assert_eq!(t.contract.get_escrow_balance(&qid2), 7_000);

    // Quest 2 still works independently
    complete_quest(&t, &qid2, &t.user_b);
    assert_eq!(t.contract.get_escrow_balance(&qid2), 6_000);
}

// ══════════════════════════════════════════════════════════════
// SECTION 11: ESCROW AUDIT FIELDS
// ══════════════════════════════════════════════════════════════

#[test]
fn test_created_at_timestamp() {
    let t = setup();
    let qid = symbol_short!("qstamp");
    register_quest(&t, &qid);

    // Set a known timestamp
    t.env.ledger().with_mut(|li| {
        li.timestamp = 42;
    });

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &1000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.created_at, 42);

    // Topup later should NOT change created_at
    t.env.ledger().with_mut(|li| {
        li.timestamp = 100;
    });

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &1000);

    let info2 = t.contract.get_escrow_info(&qid);
    assert_eq!(info2.created_at, 42); // Still the original timestamp
    assert_eq!(info2.deposit_count, 2);
}

#[test]
fn test_deposit_count_accuracy() {
    let t = setup();
    let qid = symbol_short!("qdcnt");
    register_quest(&t, &qid);

    for i in 1..=4 {
        t.contract
            .deposit_escrow(&qid, &t.creator, &t.token_address, &500);

        let info = t.contract.get_escrow_info(&qid);
        assert_eq!(info.deposit_count, i);
    }
}

// ══════════════════════════════════════════════════════════════
// SECTION 12: EDGE CASES
// ══════════════════════════════════════════════════════════════

#[test]
fn test_small_deposit_large_reward_blocked() {
    let t = setup();
    let qid = symbol_short!("qsmall");
    register_quest(&t, &qid);

    // Deposit 1 token, but reward is 1000
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &1);

    submit_proof(&t, &qid, &t.user_a);

    // Approval blocked
    let result = t
        .contract
        .try_approve_submission(&qid, &t.user_a, &t.verifier);
    assert!(result.is_err());
}

#[test]
fn test_exact_reward_deposit_works() {
    let t = setup();
    let qid = symbol_short!("qexact");
    register_quest(&t, &qid);

    // Deposit exactly the reward amount
    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &1000);

    complete_quest(&t, &qid, &t.user_a);

    assert_eq!(t.token.balance(&t.user_a), 1_000);
    assert_eq!(t.contract.get_escrow_balance(&qid), 0);
}

#[test]
fn test_cancel_with_zero_balance_after_all_payouts() {
    let t = setup();
    let qid = symbol_short!("qczero");
    register_quest(&t, &qid);

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &2000);

    complete_quest(&t, &qid, &t.user_a);
    complete_quest(&t, &qid, &t.user_b);

    // Balance is now 0
    assert_eq!(t.contract.get_escrow_balance(&qid), 0);

    // Cancel should still work, just refund 0
    let refunded = t.contract.cancel_quest(&qid, &t.creator);
    assert_eq!(refunded, 0);

    let info = t.contract.get_escrow_info(&qid);
    assert!(!info.is_active);
    assert_eq!(info.total_refunded, 0);
}

#[test]
fn test_escrow_info_reflects_correct_depositor() {
    let t = setup();
    let qid = symbol_short!("qdepsr");
    register_quest(&t, &qid);

    t.contract
        .deposit_escrow(&qid, &t.creator, &t.token_address, &1000);

    let info = t.contract.get_escrow_info(&qid);
    assert_eq!(info.depositor, t.creator);
    assert_eq!(info.token, t.token_address);
    assert_eq!(info.quest_id, qid);
}
