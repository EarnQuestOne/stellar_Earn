#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient, QuestStatus};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    token::StellarAssetClient,
    Address, BytesN, Env, Symbol,
};

struct TestContext<'a> {
    env: Env,
    client: EarnQuestContractClient<'a>,
    admin: Address,
    creator: Address,
    verifier: Address,
    token_address: Address,
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
    let token_admin_client = StellarAssetClient::new(&env, &token_address);

    TestContext {
        env,
        client,
        admin,
        creator,
        verifier,
        token_address,
        token_admin_client,
    }
}

fn register_quest(ctx: &TestContext, quest_id: Symbol, reward: i128) {
    let deadline = ctx.env.ledger().timestamp() + 86_400;
    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &reward,
        &ctx.verifier,
        &deadline,
        &2,
    );
}

fn fund_and_cancel_quest(ctx: &TestContext, quest_id: Symbol, reward: i128) {
    let total = reward * 2;
    register_quest(ctx, quest_id.clone(), reward);
    ctx.token_admin_client.mint(&ctx.creator, &total);
    ctx.client.deposit_escrow(&quest_id, &ctx.creator, &total);
    ctx.client.cancel_quest(&quest_id, &ctx.creator);
}

#[test]
fn test_pause_initialization_sets_expected_configuration() {
    let ctx = setup();

    ctx.client.initialize_pause(&ctx.admin, &300, &2, &3_600);

    let state = ctx.client.get_pause_state();
    assert!(!state.is_paused);
    assert_eq!(state.timelock_delay, 300);
    assert_eq!(state.required_signatures, 2);
    assert_eq!(state.grace_period, 3_600);
}

#[test]
fn test_pause_requires_signatures_and_timelock() {
    let ctx = setup();
    let signer_one = Address::generate(&ctx.env);
    let signer_two = Address::generate(&ctx.env);

    ctx.client.initialize_pause(&ctx.admin, &60, &2, &300);
    ctx.client
        .request_pause(&signer_one, &Some(symbol_short!("ALERT")));

    assert_eq!(ctx.client.get_remaining_pause_signatures(), 1);
    assert!(!ctx.client.is_paused());

    ctx.client.request_pause(&signer_two, &None);
    assert!(!ctx.client.is_paused());
    assert_eq!(ctx.client.get_pause_timelock_remaining(), 60);

    ctx.env.ledger().set_timestamp(61);
    assert!(ctx.client.is_paused());
}

#[test]
fn test_duplicate_signer_is_rejected() {
    let ctx = setup();
    let signer = Address::generate(&ctx.env);

    ctx.client.initialize_pause(&ctx.admin, &0, &2, &300);
    ctx.client.request_pause(&signer, &None);

    let result = ctx.client.try_request_pause(&signer, &None);
    assert!(result.is_err());
}

#[test]
fn test_pause_blocks_mutating_operations_after_activation() {
    let ctx = setup();
    let quest_id = symbol_short!("PAUS1");
    let submitter = Address::generate(&ctx.env);
    let proof_hash = BytesN::from_array(&ctx.env, &[7; 32]);

    register_quest(&ctx, quest_id.clone(), 1_000);
    ctx.client.initialize_pause(&ctx.admin, &0, &1, &300);
    ctx.client
        .request_pause(&Address::generate(&ctx.env), &Some(symbol_short!("PAUSE")));

    assert!(ctx.client.is_paused());
    assert!(ctx
        .client
        .try_register_quest(
            &symbol_short!("PAUS2"),
            &ctx.creator,
            &ctx.token_address,
            &1_000,
            &ctx.verifier,
            &(ctx.env.ledger().timestamp() + 100),
            &2,
        )
        .is_err());
    assert!(ctx
        .client
        .try_submit_proof(&quest_id, &submitter, &proof_hash)
        .is_err());
}

#[test]
fn test_unpause_resumes_operations() {
    let ctx = setup();

    ctx.client.initialize_pause(&ctx.admin, &0, &1, &300);
    ctx.client
        .request_pause(&Address::generate(&ctx.env), &None);
    assert!(ctx.client.is_paused());

    ctx.client.unpause_contract(&ctx.admin);
    assert!(!ctx.client.is_paused());

    register_quest(&ctx, symbol_short!("LIVE1"), 1_000);
    let quest = ctx.client.get_quest(&symbol_short!("LIVE1"));
    assert_eq!(quest.status, QuestStatus::Active);
}

#[test]
fn test_cancel_pending_pause_clears_signers() {
    let ctx = setup();
    let signer = Address::generate(&ctx.env);

    ctx.client.initialize_pause(&ctx.admin, &120, &2, &300);
    ctx.client
        .request_pause(&signer, &Some(symbol_short!("CHECK")));
    assert_eq!(ctx.client.get_pause_signers().len(), 1);

    ctx.client.cancel_pause_request(&ctx.admin);

    assert_eq!(ctx.client.get_pause_signers().len(), 0);
    assert_eq!(ctx.client.get_remaining_pause_signatures(), 2);
}

#[test]
fn test_emergency_withdrawal_works_only_during_grace_period() {
    let ctx = setup();
    let quest_id = symbol_short!("EMERG");

    fund_and_cancel_quest(&ctx, quest_id.clone(), 1_000);
    ctx.client.initialize_pause(&ctx.admin, &0, &1, &60);
    ctx.client
        .request_pause(&Address::generate(&ctx.env), &Some(symbol_short!("RISK")));

    let withdrawn = ctx.client.emergency_withdraw(&quest_id, &ctx.creator);
    assert_eq!(withdrawn, 2_000);

    ctx.client.unpause_contract(&ctx.admin);
    fund_and_cancel_quest(&ctx, symbol_short!("EMER2"), 1_000);
    ctx.client
        .request_pause(&Address::generate(&ctx.env), &Some(symbol_short!("RISK2")));
    ctx.env.ledger().set_timestamp(61);

    let result = ctx
        .client
        .try_emergency_withdraw(&symbol_short!("EMER2"), &ctx.creator);
    assert!(result.is_err());
}

#[test]
fn test_pause_configuration_updates_require_admin() {
    let ctx = setup();
    let intruder = Address::generate(&ctx.env);

    ctx.client.initialize_pause(&ctx.admin, &0, &1, &60);
    assert!(ctx
        .client
        .try_update_pause_config(&intruder, &Some(10), &Some(2), &Some(120))
        .is_err());

    ctx.client
        .update_pause_config(&ctx.admin, &Some(10), &Some(2), &Some(120));
    let state = ctx.client.get_pause_state();
    assert_eq!(state.timelock_delay, 10);
    assert_eq!(state.required_signatures, 2);
    assert_eq!(state.grace_period, 120);
}

#[test]
fn test_timelock_and_grace_period_countdowns_are_reported() {
    let ctx = setup();

    ctx.client.initialize_pause(&ctx.admin, &100, &1, &250);
    ctx.client
        .request_pause(&Address::generate(&ctx.env), &Some(symbol_short!("TIME")));

    assert_eq!(ctx.client.get_pause_timelock_remaining(), 100);
    assert_eq!(ctx.client.get_grace_period_remaining(), 250);

    ctx.env.ledger().set_timestamp(40);
    assert_eq!(ctx.client.get_pause_timelock_remaining(), 60);
    assert_eq!(ctx.client.get_grace_period_remaining(), 210);

    ctx.env.ledger().set_timestamp(400);
    assert_eq!(ctx.client.get_pause_timelock_remaining(), 0);
    assert_eq!(ctx.client.get_grace_period_remaining(), 0);
}
