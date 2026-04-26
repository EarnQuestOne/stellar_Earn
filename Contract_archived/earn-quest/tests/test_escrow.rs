#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, QuestStatus};
use soroban_sdk::{
    symbol_short,
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env,
};

struct TestContext<'a> {
    env: Env,
    client: EarnQuestContractClient<'a>,
    contract_address: Address,
    creator: Address,
    verifier: Address,
    token_address: Address,
    token_client: TokenClient<'a>,
    token_admin_client: StellarAssetClient<'a>,
    #[allow(dead_code)]
    token_admin: Address,
}

fn setup<'a>() -> TestContext<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin.clone())
        .address();
    let token_admin_client = StellarAssetClient::new(&env, &token_address);
    let token_client = TokenClient::new(&env, &token_address);

    TestContext {
        env,
        client,
        contract_address: contract_id,
        creator,
        verifier,
        token_address,
        token_client,
        token_admin_client,
        token_admin,
    }
}

fn create_funded_quest(
    ctx: &TestContext,
    quest_id: soroban_sdk::Symbol,
    reward: i128,
    max_participants: u32,
) {
    let deadline = ctx.env.ledger().timestamp() + 86400;
    let total_escrow = reward * (max_participants as i128);

    ctx.token_admin_client.mint(&ctx.creator, &total_escrow);

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &reward,
        &ctx.verifier,
        &deadline,
        &max_participants,
    );

    ctx.client
        .deposit_escrow(&quest_id, &ctx.creator, &total_escrow);
}

// ── Deposit Tests ──

#[test]
fn test_deposit_escrow_success() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_DEP");
    let reward: i128 = 1000;
    let max_p: u32 = 5;
    let total = reward * (max_p as i128);
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.token_admin_client.mint(&ctx.creator, &total);

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &reward,
        &ctx.verifier,
        &deadline,
        &max_p,
    );

    ctx.client.deposit_escrow(&quest_id, &ctx.creator, &total);

    assert_eq!(ctx.client.get_escrow_balance(&quest_id), total);
    assert_eq!(ctx.token_client.balance(&ctx.creator), 0);
    assert_eq!(ctx.token_client.balance(&ctx.contract_address), total);
}

#[test]
fn test_deposit_escrow_multiple_deposits() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_MULTI");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.token_admin_client.mint(&ctx.creator, &10000);

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &500,
        &ctx.verifier,
        &deadline,
        &10,
    );

    ctx.client.deposit_escrow(&quest_id, &ctx.creator, &2000);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 2000);

    ctx.client.deposit_escrow(&quest_id, &ctx.creator, &3000);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 5000);
}

#[test]
fn test_deposit_escrow_zero_amount_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_ZERO");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    let result = ctx.client.try_deposit_escrow(&quest_id, &ctx.creator, &0);
    assert!(result.is_err());
}

#[test]
fn test_deposit_escrow_negative_amount_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_NEG");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    let result = ctx
        .client
        .try_deposit_escrow(&quest_id, &ctx.creator, &-100);
    assert!(result.is_err());
}

#[test]
fn test_deposit_escrow_non_creator_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_AUTH");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    let other = Address::generate(&ctx.env);
    ctx.token_admin_client.mint(&other, &5000);

    let result = ctx.client.try_deposit_escrow(&quest_id, &other, &5000);
    assert!(result.is_err());
}

#[test]
fn test_deposit_escrow_nonexistent_quest_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_NONE");

    let result = ctx
        .client
        .try_deposit_escrow(&quest_id, &ctx.creator, &1000);
    assert!(result.is_err());
}

#[test]
fn test_deposit_escrow_completed_quest_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_COMP");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    ctx.client
        .update_quest_status(&quest_id, &ctx.creator, &QuestStatus::Completed);

    ctx.token_admin_client.mint(&ctx.creator, &5000);
    let result = ctx
        .client
        .try_deposit_escrow(&quest_id, &ctx.creator, &5000);
    assert!(result.is_err());
}

// ── Payout from Escrow Tests ──

#[test]
fn test_approve_deducts_from_escrow() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_PAY");
    let reward: i128 = 1000;
    let max_p: u32 = 5;

    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);

    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);
    ctx.client
        .approve_submission(&quest_id, &submitter, &ctx.verifier);

    let total = reward * (max_p as i128);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), total - reward);
    assert_eq!(ctx.token_client.balance(&submitter), reward);
}

#[test]
fn test_multiple_payouts_from_escrow() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_MPAY");
    let reward: i128 = 500;
    let max_p: u32 = 3;

    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);

    for i in 1u8..=3 {
        let submitter = Address::generate(&ctx.env);
        let proof = BytesN::from_array(&ctx.env, &[i; 32]);
        ctx.client.submit_proof(&quest_id, &submitter, &proof);
        ctx.client
            .approve_submission(&quest_id, &submitter, &ctx.verifier);

        assert_eq!(ctx.token_client.balance(&submitter), reward);
    }

    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
}

#[test]
fn test_approve_fails_with_insufficient_escrow() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_INSUF");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    // No escrow deposited — approval should fail
    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);

    let result = ctx
        .client
        .try_approve_submission(&quest_id, &submitter, &ctx.verifier);
    assert!(result.is_err());
}

#[test]
fn test_approve_fails_when_escrow_partially_depleted() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_PART");
    let reward: i128 = 1000;
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.token_admin_client.mint(&ctx.creator, &reward);

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &reward,
        &ctx.verifier,
        &deadline,
        &5,
    );

    // Only deposit enough for 1 payout
    ctx.client.deposit_escrow(&quest_id, &ctx.creator, &reward);

    // First approval should succeed
    let sub1 = Address::generate(&ctx.env);
    let proof1 = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(&quest_id, &sub1, &proof1);
    ctx.client
        .approve_submission(&quest_id, &sub1, &ctx.verifier);

    // Second approval should fail (no more escrow)
    let sub2 = Address::generate(&ctx.env);
    let proof2 = BytesN::from_array(&ctx.env, &[2u8; 32]);
    ctx.client.submit_proof(&quest_id, &sub2, &proof2);

    let result = ctx
        .client
        .try_approve_submission(&quest_id, &sub2, &ctx.verifier);
    assert!(result.is_err());
}

// ── Withdrawal Tests ──

#[test]
fn test_withdraw_unclaimed_after_completion() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_WD");
    let reward: i128 = 1000;
    let max_p: u32 = 5;
    let total = reward * (max_p as i128);

    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);

    // Approve 2 out of 5
    for i in 1u8..=2 {
        let submitter = Address::generate(&ctx.env);
        let proof = BytesN::from_array(&ctx.env, &[i; 32]);
        ctx.client.submit_proof(&quest_id, &submitter, &proof);
        ctx.client
            .approve_submission(&quest_id, &submitter, &ctx.verifier);
    }

    ctx.client
        .update_quest_status(&quest_id, &ctx.creator, &QuestStatus::Completed);

    let withdrawn = ctx.client.withdraw_unclaimed(&quest_id, &ctx.creator);
    let expected_remaining = total - (reward * 2);
    assert_eq!(withdrawn, expected_remaining);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
    assert_eq!(ctx.token_client.balance(&ctx.creator), expected_remaining);
}

#[test]
fn test_withdraw_unclaimed_after_expiry() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_EXP");
    let reward: i128 = 1000;
    let max_p: u32 = 5;
    let total = reward * (max_p as i128);

    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);

    ctx.client.expire_quest(&quest_id, &ctx.creator);

    let withdrawn = ctx.client.withdraw_unclaimed(&quest_id, &ctx.creator);
    assert_eq!(withdrawn, total);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
}

#[test]
fn test_withdraw_unclaimed_after_cancel() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_CAN");
    let reward: i128 = 2000;
    let max_p: u32 = 3;
    let total = reward * (max_p as i128);

    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);

    ctx.client.cancel_quest(&quest_id, &ctx.creator);

    let withdrawn = ctx.client.withdraw_unclaimed(&quest_id, &ctx.creator);
    assert_eq!(withdrawn, total);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
    assert_eq!(ctx.token_client.balance(&ctx.creator), total);
}

#[test]
fn test_withdraw_active_quest_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_ACTV");
    let reward: i128 = 1000;

    create_funded_quest(&ctx, quest_id.clone(), reward, 5);

    let result = ctx.client.try_withdraw_unclaimed(&quest_id, &ctx.creator);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_non_creator_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_NOWN");
    let reward: i128 = 1000;

    create_funded_quest(&ctx, quest_id.clone(), reward, 5);

    ctx.client
        .update_quest_status(&quest_id, &ctx.creator, &QuestStatus::Completed);

    let other = Address::generate(&ctx.env);
    let result = ctx.client.try_withdraw_unclaimed(&quest_id, &other);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_zero_balance_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_ZBAL");
    let reward: i128 = 1000;
    let max_p: u32 = 1;

    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);

    // Approve the single participant — escrow fully drained
    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);
    ctx.client
        .approve_submission(&quest_id, &submitter, &ctx.verifier);

    // Quest auto-completed, try to withdraw (balance is 0)
    let result = ctx.client.try_withdraw_unclaimed(&quest_id, &ctx.creator);
    assert!(result.is_err());
}

#[test]
fn test_double_withdraw_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_DBL");

    create_funded_quest(&ctx, quest_id.clone(), 1000, 5);

    ctx.client.expire_quest(&quest_id, &ctx.creator);

    ctx.client.withdraw_unclaimed(&quest_id, &ctx.creator);

    let result = ctx.client.try_withdraw_unclaimed(&quest_id, &ctx.creator);
    assert!(result.is_err());
}

// ── Cancel Quest Tests ──

#[test]
fn test_cancel_quest_success() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_CANC");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    ctx.client.cancel_quest(&quest_id, &ctx.creator);

    let quest = ctx.client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Cancelled);
}

#[test]
fn test_cancel_quest_non_creator_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_CAUN");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    let other = Address::generate(&ctx.env);
    let result = ctx.client.try_cancel_quest(&quest_id, &other);
    assert!(result.is_err());
}

#[test]
fn test_cancel_completed_quest_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_CACO");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    ctx.client
        .update_quest_status(&quest_id, &ctx.creator, &QuestStatus::Completed);

    let result = ctx.client.try_cancel_quest(&quest_id, &ctx.creator);
    assert!(result.is_err());
}

#[test]
fn test_cancel_expired_quest_fails() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_CAEX");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    ctx.client.expire_quest(&quest_id, &ctx.creator);

    let result = ctx.client.try_cancel_quest(&quest_id, &ctx.creator);
    assert!(result.is_err());
}

// ── Escrow Balance Query Tests ──

#[test]
fn test_escrow_balance_unset_is_zero() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_BAL0");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
}

#[test]
fn test_escrow_balance_tracks_deposits_and_payouts() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_TRCK");
    let reward: i128 = 500;
    let max_p: u32 = 4;
    let total = reward * (max_p as i128);

    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), total);

    // One payout
    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);
    ctx.client
        .approve_submission(&quest_id, &submitter, &ctx.verifier);

    assert_eq!(ctx.client.get_escrow_balance(&quest_id), total - reward);
}

// ── Full Lifecycle Test ──

#[test]
fn test_full_escrow_lifecycle() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_LIFE");
    let reward: i128 = 1000;
    let max_p: u32 = 3;
    let total = reward * (max_p as i128);

    // 1. Create quest and fund escrow
    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), total);
    assert_eq!(ctx.token_client.balance(&ctx.contract_address), total);

    // 2. Process 2 payouts
    for i in 1u8..=2 {
        let submitter = Address::generate(&ctx.env);
        let proof = BytesN::from_array(&ctx.env, &[i; 32]);
        ctx.client.submit_proof(&quest_id, &submitter, &proof);
        ctx.client
            .approve_submission(&quest_id, &submitter, &ctx.verifier);
        assert_eq!(ctx.token_client.balance(&submitter), reward);
    }
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), reward);

    // 3. Complete quest and withdraw remaining
    ctx.client
        .update_quest_status(&quest_id, &ctx.creator, &QuestStatus::Completed);

    let withdrawn = ctx.client.withdraw_unclaimed(&quest_id, &ctx.creator);
    assert_eq!(withdrawn, reward);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
    assert_eq!(ctx.token_client.balance(&ctx.creator), reward);
}

// ── Cancel + Refund Lifecycle Test ──

#[test]
fn test_cancel_and_refund_lifecycle() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_CREF");
    let reward: i128 = 2000;
    let max_p: u32 = 5;
    let total = reward * (max_p as i128);

    create_funded_quest(&ctx, quest_id.clone(), reward, max_p);

    // Process 1 payout before cancelling
    let submitter = Address::generate(&ctx.env);
    let proof = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);
    ctx.client
        .approve_submission(&quest_id, &submitter, &ctx.verifier);

    assert_eq!(ctx.client.get_escrow_balance(&quest_id), total - reward);

    // Cancel and withdraw remaining
    ctx.client.cancel_quest(&quest_id, &ctx.creator);

    let quest = ctx.client.get_quest(&quest_id);
    assert_eq!(quest.status, QuestStatus::Cancelled);

    let withdrawn = ctx.client.withdraw_unclaimed(&quest_id, &ctx.creator);
    assert_eq!(withdrawn, total - reward);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
}

// ── Deposit on Paused Quest Test ──

#[test]
fn test_deposit_on_paused_quest_succeeds() {
    let ctx = setup();
    let quest_id = symbol_short!("Q_PAUS");
    let deadline = ctx.env.ledger().timestamp() + 86400;

    ctx.token_admin_client.mint(&ctx.creator, &5000);

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &1000,
        &ctx.verifier,
        &deadline,
        &5,
    );

    ctx.client
        .update_quest_status(&quest_id, &ctx.creator, &QuestStatus::Paused);

    ctx.client.deposit_escrow(&quest_id, &ctx.creator, &5000);

    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 5000);
}
