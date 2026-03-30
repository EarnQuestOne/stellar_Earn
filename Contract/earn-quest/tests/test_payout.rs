#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, SubmissionStatus};
use soroban_sdk::{
    symbol_short,
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env, Symbol,
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
}

fn setup<'a>() -> TestContext<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_address = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_address);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let token_client = TokenClient::new(&env, &token_address);
    let token_admin_client = StellarAssetClient::new(&env, &token_address);

    TestContext {
        env,
        client,
        contract_address,
        creator,
        verifier,
        token_address,
        token_client,
        token_admin_client,
    }
}

fn create_funded_quest(ctx: &TestContext, quest_id: Symbol, reward: i128, max_participants: u32) {
    let deadline = ctx.env.ledger().timestamp() + 86_400;
    let total_escrow = reward * i128::from(max_participants);

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

fn submit_proof_for(ctx: &TestContext, quest_id: &Symbol, submitter: &Address, seed: u8) {
    let proof_hash = BytesN::from_array(&ctx.env, &[seed; 32]);
    ctx.client.submit_proof(quest_id, submitter, &proof_hash);
}

#[test]
fn test_approve_submission_marks_paid_and_credits_submitter() {
    let ctx = setup();
    let quest_id = symbol_short!("PAY1");
    let reward = 1_500;

    create_funded_quest(&ctx, quest_id.clone(), reward, 2);

    let submitter = Address::generate(&ctx.env);
    submit_proof_for(&ctx, &quest_id, &submitter, 1);

    ctx.client
        .approve_submission(&quest_id, &submitter, &ctx.verifier);

    let submission = ctx.client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Paid);
    assert_eq!(ctx.token_client.balance(&submitter), reward);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), reward);
}

#[test]
fn test_replayed_approval_does_not_double_pay() {
    let ctx = setup();
    let quest_id = symbol_short!("PAY2");
    let reward = 1_000;

    create_funded_quest(&ctx, quest_id.clone(), reward, 2);

    let submitter = Address::generate(&ctx.env);
    submit_proof_for(&ctx, &quest_id, &submitter, 2);

    ctx.client
        .approve_submission(&quest_id, &submitter, &ctx.verifier);

    let escrow_after_first = ctx.client.get_escrow_balance(&quest_id);
    let submitter_balance_after_first = ctx.token_client.balance(&submitter);

    let replay = ctx
        .client
        .try_approve_submission(&quest_id, &submitter, &ctx.verifier);
    assert!(replay.is_err());
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), escrow_after_first);
    assert_eq!(
        ctx.token_client.balance(&submitter),
        submitter_balance_after_first
    );
}

#[test]
fn test_unauthorized_verifier_cannot_trigger_payout() {
    let ctx = setup();
    let quest_id = symbol_short!("PAY3");
    let reward = 750;

    create_funded_quest(&ctx, quest_id.clone(), reward, 2);

    let unauthorized = Address::generate(&ctx.env);
    let submitter = Address::generate(&ctx.env);
    submit_proof_for(&ctx, &quest_id, &submitter, 3);

    let result = ctx
        .client
        .try_approve_submission(&quest_id, &submitter, &unauthorized);
    assert!(result.is_err());
    assert_eq!(ctx.token_client.balance(&submitter), 0);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), reward * 2);
}

#[test]
fn test_insufficient_escrow_keeps_submission_pending() {
    let ctx = setup();
    let quest_id = symbol_short!("PAY4");
    let deadline = ctx.env.ledger().timestamp() + 86_400;

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &2_000,
        &ctx.verifier,
        &deadline,
        &2,
    );

    let submitter = Address::generate(&ctx.env);
    submit_proof_for(&ctx, &quest_id, &submitter, 4);

    let result = ctx
        .client
        .try_approve_submission(&quest_id, &submitter, &ctx.verifier);
    assert!(result.is_err());

    let submission = ctx.client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Pending);
    assert_eq!(ctx.token_client.balance(&submitter), 0);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
}

#[test]
fn test_multiple_payouts_preserve_total_value_invariant() {
    let ctx = setup();
    let quest_id = symbol_short!("PAY5");
    let reward = 500;
    let max_participants = 4_u32;

    create_funded_quest(&ctx, quest_id.clone(), reward, max_participants);

    let mut paid_out = 0_i128;
    for seed in 1..=max_participants {
        let submitter = Address::generate(&ctx.env);
        submit_proof_for(&ctx, &quest_id, &submitter, seed as u8);
        ctx.client
            .approve_submission(&quest_id, &submitter, &ctx.verifier);
        paid_out += reward;
    }

    let escrow_balance = ctx.client.get_escrow_balance(&quest_id);
    let contract_balance = ctx.token_client.balance(&ctx.contract_address);
    assert_eq!(escrow_balance, 0);
    assert_eq!(contract_balance, 0);
    assert_eq!(paid_out, reward * i128::from(max_participants));
}

#[test]
fn test_approve_submission_budget_stays_below_reasonable_threshold() {
    let ctx = setup();
    let quest_id = symbol_short!("PAY6");

    create_funded_quest(&ctx, quest_id.clone(), 1_000, 2);

    let submitter = Address::generate(&ctx.env);
    submit_proof_for(&ctx, &quest_id, &submitter, 6);

    let mut budget = ctx.env.budget();
    budget.reset_unlimited();
    budget.reset_tracker();

    ctx.client
        .approve_submission(&quest_id, &submitter, &ctx.verifier);

    let budget_after = ctx.env.budget();
    assert!(budget_after.cpu_instruction_cost() > 0);
    assert!(budget_after.memory_bytes_cost() > 0);
    assert!(budget_after.cpu_instruction_cost() < 80_000_000);
    assert!(budget_after.memory_bytes_cost() < 8_000_000);
}
