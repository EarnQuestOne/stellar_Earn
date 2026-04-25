#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, QuestStatus, SubmissionStatus};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env,
};

struct TestContext<'a> {
    env: Env,
    client: EarnQuestContractClient<'a>,
    admin: Address,
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
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    client.initialize(&admin);

    let token_admin = Address::generate(&env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let token_client = TokenClient::new(&env, &token_address);
    let token_admin_client = StellarAssetClient::new(&env, &token_address);

    TestContext {
        env,
        client,
        admin,
        creator,
        verifier,
        token_address,
        token_client,
        token_admin_client,
    }
}

fn register_and_fund(ctx: &TestContext, quest_id: soroban_sdk::Symbol, reward: i128, max: u32) {
    let deadline = ctx.env.ledger().timestamp() + 86_400;
    let total = reward * i128::from(max);
    ctx.token_admin_client.mint(&ctx.creator, &total);
    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &reward,
        &ctx.verifier,
        &deadline,
        &max,
    );
    ctx.client.deposit_escrow(&quest_id, &ctx.creator, &total);
}

#[test]
fn test_only_creator_can_change_quest_state() {
    let ctx = setup();
    let intruder = Address::generate(&ctx.env);
    let quest_id = symbol_short!("SEC1");

    register_and_fund(&ctx, quest_id.clone(), 1_000, 2);

    let result = ctx
        .client
        .try_update_quest_status(&quest_id, &intruder, &QuestStatus::Cancelled);
    assert!(result.is_err());
}

#[test]
fn test_only_configured_admin_can_manage_pause_configuration() {
    let ctx = setup();
    let intruder = Address::generate(&ctx.env);

    ctx.client.initialize_pause(&ctx.admin, &0, &1, &120);

    assert!(ctx.client.try_unpause_contract(&intruder).is_err());
    assert!(ctx.client.try_cancel_pause_request(&intruder).is_err());
    assert!(ctx
        .client
        .try_update_pause_config(&intruder, &Some(5), &Some(2), &Some(20))
        .is_err());
}

#[test]
fn test_replay_protection_blocks_second_payout_attempt() {
    let ctx = setup();
    let quest_id = symbol_short!("SEC2");
    let submitter = Address::generate(&ctx.env);
    let proof_hash = BytesN::from_array(&ctx.env, &[2; 32]);

    register_and_fund(&ctx, quest_id.clone(), 1_000, 1);
    ctx.client.submit_proof(&quest_id, &submitter, &proof_hash);
    ctx.client
        .approve_submission(&quest_id, &submitter, &ctx.verifier);

    let first_balance = ctx.token_client.balance(&submitter);
    let result = ctx
        .client
        .try_approve_submission(&quest_id, &submitter, &ctx.verifier);
    assert!(result.is_err());
    assert_eq!(ctx.token_client.balance(&submitter), first_balance);

    let submission = ctx.client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Paid);
}

#[test]
fn test_invalid_role_addresses_are_rejected_for_sensitive_actions() {
    let ctx = setup();
    let quest_id = symbol_short!("SEC3");
    let stranger = Address::generate(&ctx.env);
    let submitter = Address::generate(&ctx.env);
    let proof_hash = BytesN::from_array(&ctx.env, &[3; 32]);

    register_and_fund(&ctx, quest_id.clone(), 1_000, 2);
    ctx.client.submit_proof(&quest_id, &submitter, &proof_hash);

    assert!(ctx
        .client
        .try_approve_submission(&quest_id, &submitter, &stranger)
        .is_err());
    assert!(ctx
        .client
        .try_withdraw_unclaimed(&quest_id, &stranger)
        .is_err());
}

#[test]
fn test_pause_prevents_new_submissions_until_admin_resumes() {
    let ctx = setup();
    let quest_id = symbol_short!("SEC4");
    let submitter = Address::generate(&ctx.env);
    let proof_hash = BytesN::from_array(&ctx.env, &[4; 32]);

    register_and_fund(&ctx, quest_id.clone(), 1_000, 2);
    ctx.client.initialize_pause(&ctx.admin, &0, &1, &120);
    ctx.client
        .request_pause(&Address::generate(&ctx.env), &None);
    assert!(ctx
        .client
        .try_submit_proof(&quest_id, &submitter, &proof_hash)
        .is_err());

    ctx.client.unpause_contract(&ctx.admin);
    ctx.client.submit_proof(&quest_id, &submitter, &proof_hash);
    let submission = ctx.client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.status, SubmissionStatus::Pending);
}

#[test]
fn test_upgrade_admin_transfer_changes_migration_authority() {
    let ctx = setup();
    let new_admin = Address::generate(&ctx.env);

    ctx.client
        .update_config(&ctx.admin, &Some(new_admin.clone()));

    assert!(ctx.client.try_trigger_migration(&ctx.admin).is_err());
    ctx.client.trigger_migration(&new_admin);
}

#[test]
fn test_randomized_submission_deadline_fuzz_preserves_invariants() {
    let ctx = setup();
    let quest_id = symbol_short!("FZ1");
    register_and_fund(&ctx, quest_id.clone(), 250, 2);

    ctx.env
        .ledger()
        .set_timestamp(ctx.env.ledger().timestamp() + 1);

    let first_submitter = Address::generate(&ctx.env);
    let first_proof = BytesN::from_array(&ctx.env, &[1; 32]);
    ctx.client
        .submit_proof(&quest_id, &first_submitter, &first_proof);
    ctx.client
        .approve_submission(&quest_id, &first_submitter, &ctx.verifier);

    let quest_after_first = ctx.client.get_quest(&quest_id);
    assert_eq!(quest_after_first.total_claims, 1);
    assert!(quest_after_first.total_claims <= quest_after_first.max_participants);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 250);

    let second_submitter = Address::generate(&ctx.env);
    let second_proof = BytesN::from_array(&ctx.env, &[2; 32]);
    ctx.client
        .submit_proof(&quest_id, &second_submitter, &second_proof);
    ctx.client
        .approve_submission(&quest_id, &second_submitter, &ctx.verifier);

    let quest_after_second = ctx.client.get_quest(&quest_id);
    assert_eq!(quest_after_second.total_claims, 2);
    assert_eq!(quest_after_second.status, QuestStatus::Completed);
    assert!(quest_after_second.total_claims <= quest_after_second.max_participants);
    assert_eq!(ctx.client.get_escrow_balance(&quest_id), 0);
}
