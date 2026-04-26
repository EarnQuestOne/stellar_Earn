#![cfg(test)]

use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{
    symbol_short, testutils::Address as _, token::StellarAssetClient, Address, BytesN, Env, Symbol,
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

fn create_and_approve(
    ctx: &TestContext,
    quest_id: Symbol,
    submitter: &Address,
    proof_seed: u8,
    reward: i128,
) {
    let deadline = ctx.env.ledger().timestamp() + 86_400;
    ctx.token_admin_client.mint(&ctx.creator, &reward);

    ctx.client.register_quest(
        &quest_id,
        &ctx.creator,
        &ctx.token_address,
        &reward,
        &ctx.verifier,
        &deadline,
        &1,
    );
    ctx.client.deposit_escrow(&quest_id, &ctx.creator, &reward);

    let proof_hash = BytesN::from_array(&ctx.env, &[proof_seed; 32]);
    ctx.client.submit_proof(&quest_id, submitter, &proof_hash);
    ctx.client
        .approve_submission(&quest_id, submitter, &ctx.verifier);
}

#[test]
fn test_approval_creates_user_stats_for_new_user() {
    let ctx = setup();
    let submitter = Address::generate(&ctx.env);

    create_and_approve(&ctx, symbol_short!("REP1"), &submitter, 1, 1_000);

    let stats = ctx.client.get_user_stats(&submitter);
    assert_eq!(stats.total_xp, 100);
    assert_eq!(stats.level, 2);
    assert_eq!(stats.quests_completed, 1);
    assert_eq!(stats.badges.len(), 0);
}

#[test]
fn test_reputation_accumulates_across_multiple_approvals() {
    let ctx = setup();
    let submitter = Address::generate(&ctx.env);
    let quests = [
        symbol_short!("REP2A"),
        symbol_short!("REP2B"),
        symbol_short!("REP2C"),
    ];

    for (index, quest_id) in quests.into_iter().enumerate() {
        create_and_approve(&ctx, quest_id, &submitter, (index + 1) as u8, 1_000);
    }

    let stats = ctx.client.get_user_stats(&submitter);
    assert_eq!(stats.total_xp, 300);
    assert_eq!(stats.level, 4);
    assert_eq!(stats.quests_completed, 3);
}

#[test]
fn test_grant_badge_by_admin_succeeds() {
    let ctx = setup();
    let submitter = Address::generate(&ctx.env);
    let badge = symbol_short!("EARLY");

    create_and_approve(&ctx, symbol_short!("REP3"), &submitter, 3, 1_000);
    ctx.client.grant_badge(&submitter, &badge, &ctx.admin);

    let stats = ctx.client.get_user_stats(&submitter);
    assert_eq!(stats.badges.len(), 1);
    assert!(stats.badges.contains(&badge));
}

#[test]
fn test_non_admin_cannot_grant_badge() {
    let ctx = setup();
    let submitter = Address::generate(&ctx.env);
    let intruder = Address::generate(&ctx.env);

    create_and_approve(&ctx, symbol_short!("REP4"), &submitter, 4, 1_000);

    let result = ctx
        .client
        .try_grant_badge(&submitter, &symbol_short!("VIP"), &intruder);
    assert!(result.is_err());

    let stats = ctx.client.get_user_stats(&submitter);
    assert_eq!(stats.badges.len(), 0);
}

#[test]
fn test_duplicate_badge_is_not_added_twice() {
    let ctx = setup();
    let submitter = Address::generate(&ctx.env);
    let badge = symbol_short!("TOP");

    create_and_approve(&ctx, symbol_short!("REP5"), &submitter, 5, 1_000);

    ctx.client.grant_badge(&submitter, &badge, &ctx.admin);
    ctx.client.grant_badge(&submitter, &badge, &ctx.admin);

    let stats = ctx.client.get_user_stats(&submitter);
    assert_eq!(stats.badges.len(), 1);
    assert!(stats.badges.contains(&badge));
}

#[test]
fn test_grant_badge_requires_existing_stats() {
    let ctx = setup();
    let submitter = Address::generate(&ctx.env);

    let result = ctx
        .client
        .try_grant_badge(&submitter, &symbol_short!("NEW"), &ctx.admin);
    assert!(result.is_err());
}
