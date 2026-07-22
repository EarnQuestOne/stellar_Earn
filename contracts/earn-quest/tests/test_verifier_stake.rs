//! Integration tests for verifier stake deposit and slash logic.

#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
use soroban_sdk::{symbol_short, token, Address, BytesN, Env};

use earn_quest::{EarnQuestContract, EarnQuestContractClient};

// ─── helpers ────────────────────────────────────────────────────────────────

fn set_time(env: &Env, ts: u64) {
    env.ledger().set(LedgerInfo {
        protocol_version: 20,
        sequence_number: 1,
        timestamp: ts,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 1_000_000,
    });
}

struct TestCtx<'a> {
    env: Env,
    client: EarnQuestContractClient<'a>,
    token_addr: Address,
    token_admin: token::StellarAssetClient<'a>,
}

fn setup() -> TestCtx<'static> {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, 1_000);

    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &cid);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let token_issuer = Address::generate(&env);
    let token_obj = env.register_stellar_asset_contract_v2(token_issuer);
    let token_addr = token_obj.address();
    let token_admin = token::StellarAssetClient::new(&env, &token_addr);

    TestCtx {
        env,
        client,
        token_addr,
        token_admin,
    }
}

/// Register a quest and return (quest_id, verifier, creator).
fn register_quest(
    ctx: &TestCtx,
    id: soroban_sdk::Symbol,
) -> (soroban_sdk::Symbol, Address, Address) {
    let creator = Address::generate(&ctx.env);
    let verifier = Address::generate(&ctx.env);
    let deadline = ctx.env.ledger().timestamp() + 86_400;
    ctx.client.register_quest(
        &id,
        &creator,
        &ctx.token_addr,
        &100_i128,
        &verifier,
        &deadline,
    );
    (id, verifier, creator)
}

// ─── deposit tests ──────────────────────────────────────────────────────────

#[test]
fn test_deposit_verifier_stake_succeeds() {
    let ctx = setup();
    let (quest_id, verifier, _) = register_quest(&ctx, symbol_short!("q001"));

    ctx.token_admin.mint(&verifier, &1_000);
    ctx.client
        .deposit_verifier_stake(&quest_id, &verifier, &ctx.token_addr, &500_u128);

    let tok = token::Client::new(&ctx.env, &ctx.token_addr);
    assert_eq!(tok.balance(&verifier), 500); // 500 transferred in, 500 remain
}

#[test]
#[should_panic]
fn test_deposit_verifier_stake_zero_amount_rejected() {
    let ctx = setup();
    let (quest_id, verifier, _) = register_quest(&ctx, symbol_short!("q002"));

    ctx.client
        .deposit_verifier_stake(&quest_id, &verifier, &ctx.token_addr, &0_u128);
}

#[test]
#[should_panic]
fn test_deposit_verifier_stake_wrong_token_rejected() {
    let ctx = setup();
    let (quest_id, verifier, _) = register_quest(&ctx, symbol_short!("q003"));

    let other_issuer = Address::generate(&ctx.env);
    let other_obj = ctx.env.register_stellar_asset_contract_v2(other_issuer);
    let wrong_token = other_obj.address();

    ctx.client
        .deposit_verifier_stake(&quest_id, &verifier, &wrong_token, &100_u128);
}

// ─── slash tests ────────────────────────────────────────────────────────────

#[test]
fn test_resolve_dispute_upheld_full_slash() {
    let ctx = setup();
    let (quest_id, verifier, _) = register_quest(&ctx, symbol_short!("q004"));
    let submitter = Address::generate(&ctx.env);

    ctx.token_admin.mint(&verifier, &1_000);
    ctx.client
        .deposit_verifier_stake(&quest_id, &verifier, &ctx.token_addr, &1_000_u128);

    let proof: BytesN<32> = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);

    let arbitrator = Address::generate(&ctx.env);
    ctx.client.open_dispute(&quest_id, &submitter, &arbitrator);

    ctx.client
        .resolve_dispute(&quest_id, &submitter, &arbitrator, &true, &10_000_u32);

    let tok = token::Client::new(&ctx.env, &ctx.token_addr);
    // Full stake slashed to submitter (initiator)
    assert_eq!(tok.balance(&submitter), 1_000);
    assert_eq!(tok.balance(&verifier), 0);
}

#[test]
fn test_resolve_dispute_not_upheld_no_slash() {
    let ctx = setup();
    let (quest_id, verifier, _) = register_quest(&ctx, symbol_short!("q005"));
    let submitter = Address::generate(&ctx.env);

    ctx.token_admin.mint(&verifier, &1_000);
    ctx.client
        .deposit_verifier_stake(&quest_id, &verifier, &ctx.token_addr, &1_000_u128);

    let proof: BytesN<32> = BytesN::from_array(&ctx.env, &[2u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);

    let arbitrator = Address::generate(&ctx.env);
    ctx.client.open_dispute(&quest_id, &submitter, &arbitrator);

    // Not upheld — stake is NOT slashed
    ctx.client
        .resolve_dispute(&quest_id, &submitter, &arbitrator, &false, &10_000_u32);

    let tok = token::Client::new(&ctx.env, &ctx.token_addr);
    assert_eq!(tok.balance(&submitter), 0); // nothing transferred
    assert_eq!(tok.balance(&verifier), 0); // still held in contract
}

#[test]
fn test_resolve_dispute_no_stake_still_resolves() {
    // Stake is optional — dispute resolution must succeed when verifier has no stake
    let ctx = setup();
    let (quest_id, _, _) = register_quest(&ctx, symbol_short!("q006"));
    let submitter = Address::generate(&ctx.env);

    let proof: BytesN<32> = BytesN::from_array(&ctx.env, &[3u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);

    let arbitrator = Address::generate(&ctx.env);
    ctx.client.open_dispute(&quest_id, &submitter, &arbitrator);

    ctx.client
        .resolve_dispute(&quest_id, &submitter, &arbitrator, &true, &10_000_u32);
    // No panic = passed
}

#[test]
fn test_resolve_dispute_partial_slash() {
    let ctx = setup();
    let (quest_id, verifier, _) = register_quest(&ctx, symbol_short!("q007"));
    let submitter = Address::generate(&ctx.env);

    ctx.token_admin.mint(&verifier, &1_000);
    ctx.client
        .deposit_verifier_stake(&quest_id, &verifier, &ctx.token_addr, &1_000_u128);

    let proof: BytesN<32> = BytesN::from_array(&ctx.env, &[4u8; 32]);
    ctx.client.submit_proof(&quest_id, &submitter, &proof);

    let arbitrator = Address::generate(&ctx.env);
    ctx.client.open_dispute(&quest_id, &submitter, &arbitrator);

    // 50% slash: 500 to submitter, 500 back to verifier
    ctx.client
        .resolve_dispute(&quest_id, &submitter, &arbitrator, &true, &5_000_u32);

    let tok = token::Client::new(&ctx.env, &ctx.token_addr);
    assert_eq!(tok.balance(&submitter), 500);
    assert_eq!(tok.balance(&verifier), 500);
}

// ─── return tests ───────────────────────────────────────────────────────────

#[test]
fn test_return_verifier_stake_by_creator() {
    let ctx = setup();
    let (quest_id, verifier, creator) = register_quest(&ctx, symbol_short!("q008"));

    ctx.token_admin.mint(&verifier, &500);
    ctx.client
        .deposit_verifier_stake(&quest_id, &verifier, &ctx.token_addr, &500_u128);

    let tok = token::Client::new(&ctx.env, &ctx.token_addr);
    assert_eq!(tok.balance(&verifier), 0); // all staked

    // Creator returns stake — no dispute occurred
    ctx.client
        .return_verifier_stake(&quest_id, &verifier, &creator);

    assert_eq!(tok.balance(&verifier), 500); // fully returned
}
