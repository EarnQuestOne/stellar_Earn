//! Test suite for the 2-of-2 SuperAdmin clawback feature.
//!
//! Tests:
//!   1. Non-SuperAdmin cannot initiate a clawback
//!   2. First SuperAdmin can initiate a clawback
//!   3. Same admin cannot both initiate and execute (ClawbackAlreadySigned)
//!   4. Initiating twice by the same admin returns ClawbackAlreadySigned
//!   5. Execute fails when no pending clawback exists (ClawbackNotFound)
//!   6. Execute fails when the caller is not a SuperAdmin
//!   7. Second SuperAdmin can execute and the record is removed

#![cfg(test)]

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{symbol_short, Address, Env};

use earn_quest::{EarnQuestContract, EarnQuestContractClient};

fn make_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

/// Returns a client, a primary super-admin, and a secondary super-admin.
fn setup(env: &Env) -> (EarnQuestContractClient, Address, Address) {
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &cid);

    let admin1 = Address::generate(env);
    let admin2 = Address::generate(env);

    client.initialize(&admin1);
    // Grant SuperAdmin role to the second admin via add_admin + grant_role
    client.add_admin(&admin1, &admin2);
    client.grant_role(&admin1, &admin2, &earn_quest::Role::SuperAdmin);

    (client, admin1, admin2)
}

fn mock_asset(env: &Env) -> Address {
    Address::generate(env)
}

// ──────────────────────────────────────────────────────────────────────────
// 1. Non-SuperAdmin cannot initiate
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_non_superadmin_cannot_initiate() {
    let env = make_env();
    let (client, _admin1, _admin2) = setup(&env);

    let rando = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset = mock_asset(&env);
    let quest_id = symbol_short!("q1");

    let result = client.try_initiate_clawback(&rando, &quest_id, &recipient, &asset, &100i128);
    assert!(result.is_err());
}

// ──────────────────────────────────────────────────────────────────────────
// 2. First SuperAdmin can initiate
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_superadmin_can_initiate() {
    let env = make_env();
    let (client, admin1, _admin2) = setup(&env);

    let recipient = Address::generate(&env);
    let asset = mock_asset(&env);
    let quest_id = symbol_short!("q1");

    client.initiate_clawback(&admin1, &quest_id, &recipient, &asset, &500i128);
    // No panic means success
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Same admin cannot execute their own initiation
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_initiator_cannot_execute() {
    let env = make_env();
    let (client, admin1, _admin2) = setup(&env);

    let recipient = Address::generate(&env);
    let asset = mock_asset(&env);
    let quest_id = symbol_short!("q1");

    client.initiate_clawback(&admin1, &quest_id, &recipient, &asset, &200i128);

    let result = client.try_execute_clawback(&admin1, &quest_id, &recipient);
    assert!(result.is_err());
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Initiating twice by the same admin is rejected
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_double_initiate_rejected() {
    let env = make_env();
    let (client, admin1, _admin2) = setup(&env);

    let recipient = Address::generate(&env);
    let asset = mock_asset(&env);
    let quest_id = symbol_short!("q1");

    client.initiate_clawback(&admin1, &quest_id, &recipient, &asset, &300i128);

    let result = client.try_initiate_clawback(&admin1, &quest_id, &recipient, &asset, &300i128);
    assert!(result.is_err());
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Execute fails when no pending clawback exists
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_execute_without_initiation_fails() {
    let env = make_env();
    let (client, _admin1, admin2) = setup(&env);

    let recipient = Address::generate(&env);
    let quest_id = symbol_short!("q1");

    let result = client.try_execute_clawback(&admin2, &quest_id, &recipient);
    assert!(result.is_err());
}

// ──────────────────────────────────────────────────────────────────────────
// 6. Non-SuperAdmin cannot execute
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_non_superadmin_cannot_execute() {
    let env = make_env();
    let (client, admin1, _admin2) = setup(&env);

    let rando = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset = mock_asset(&env);
    let quest_id = symbol_short!("q1");

    client.initiate_clawback(&admin1, &quest_id, &recipient, &asset, &100i128);

    let result = client.try_execute_clawback(&rando, &quest_id, &recipient);
    assert!(result.is_err());
}

// ──────────────────────────────────────────────────────────────────────────
// 7. Happy path: second admin executes, pending record cleared
//    (token transfer is mocked via mock_all_auths + built-in contract token)
// ──────────────────────────────────────────────────────────────────────────

#[test]
fn test_happy_path_two_admins() {
    let env = make_env();
    let (client, admin1, admin2) = setup(&env);

    let recipient = Address::generate(&env);
    // Use the contract's own built-in token so the transfer resolves.
    let contract_addr = client.address.clone();
    let asset = contract_addr.clone();

    // Mint some tokens to the recipient via the contract's built-in token.
    client.mint(&admin1, &recipient, &1000i128);
    assert_eq!(client.balance(&recipient), 1000);

    let quest_id = symbol_short!("q1");

    client.initiate_clawback(&admin1, &quest_id, &recipient, &asset, &400i128);
    client.execute_clawback(&admin2, &quest_id, &recipient);

    // Recipient balance should have decreased by 400.
    assert_eq!(client.balance(&recipient), 600);

    // A second execute on the same record must now fail (record cleaned up).
    let result = client.try_execute_clawback(&admin2, &quest_id, &recipient);
    assert!(result.is_err());
}
