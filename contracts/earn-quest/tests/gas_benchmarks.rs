#![cfg(test)]

//! Gas benchmark suite for EarnQuest entrypoints.
//!
//! Each test measures the Soroban CPU instruction cost of one entrypoint,
//! asserts the cost stays within the budget defined in gas_budget::default_targets(),
//! and prints the raw measurement so results can be transcribed to SLA_SLO.md.
//!
//! The Soroban simulation environment uses the same CPU cost model as testnet,
//! so these numbers are representative of real-network gas consumption.
//!
//! To refresh the constants after a contract change:
//!   1. Run `cargo test -p earn_quest -- gas_benchmarks --nocapture`
//!   2. Read the "Measured cost" lines in the output
//!   3. Apply +20% safety margin and update gas_budget::default_targets()
//!   4. Update the measurement table in SLA_SLO.md

extern crate earn_quest;
use earn_quest::{gas_budget, EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    Address, BytesN, Env, Symbol,
};

fn setup(
    env: &Env,
) -> (
    EarnQuestContractClient<'_>,
    Address,
    Address,
    Address,
    Address,
    Address,
) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let token_admin = Address::generate(env);
    let token_obj = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = token_obj.address();

    let admin = Address::generate(env);
    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let submitter = Address::generate(env);

    StellarAssetClient::new(env, &token).mint(&contract_id, &1_000_000);

    (client, token, admin, creator, verifier, submitter)
}

// ─── helpers ─────────────────────────────────────────────────────────────────

fn check_within_budget(label: &str, symbol: Symbol, cost: u64) {
    let within = gas_budget::within_budget(&symbol, cost);
    let target = gas_budget::default_targets()
        .iter()
        .find(|t| t.entrypoint == symbol)
        .map(|t| t.max_instructions)
        .unwrap_or(u64::MAX);

    println!(
        "[gas_benchmark] {}: measured = {}, budget = {}, within = {}",
        label, cost, target, within
    );
    assert!(
        within,
        "entrypoint '{}' exceeded gas budget: measured {} > budget {}",
        label, cost, target
    );
}

// ─── benchmarks ──────────────────────────────────────────────────────────────

#[test]
fn benchmark_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (client, _, admin, _, _, _) = setup(&env);

    let mut budget = env.budget();
    budget.reset_default();
    let before = budget.cpu_instruction_cost();

    client.initialize(&admin);

    let cost = budget.cpu_instruction_cost() - before;
    check_within_budget("initialize", symbol_short!("init"), cost);
}

#[test]
fn benchmark_register_quest() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (client, token, admin, creator, verifier, _) = setup(&env);
    client.initialize(&admin);

    let quest_id = symbol_short!("q1");
    let deadline = 99_999u64;

    let mut budget = env.budget();
    budget.reset_default();
    let before = budget.cpu_instruction_cost();

    client.register_quest(
        &quest_id, &creator, &token, &1_000i128, &verifier, &deadline,
    );

    let cost = budget.cpu_instruction_cost() - before;
    check_within_budget("register_quest", symbol_short!("reg_qst"), cost);
}

#[test]
fn benchmark_submit_proof() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (client, token, admin, creator, verifier, submitter) = setup(&env);
    client.initialize(&admin);

    let quest_id = symbol_short!("q1");
    client.register_quest(&quest_id, &creator, &token, &1_000i128, &verifier, &99_999);

    let proof = BytesN::from_array(&env, &[1u8; 32]);

    let mut budget = env.budget();
    budget.reset_default();
    let before = budget.cpu_instruction_cost();

    client.submit_proof(&quest_id, &submitter, &proof);

    let cost = budget.cpu_instruction_cost() - before;
    check_within_budget("submit_proof", symbol_short!("sub_prf"), cost);
}

#[test]
fn benchmark_approve_submission() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (client, token, admin, creator, verifier, submitter) = setup(&env);
    client.initialize(&admin);

    let quest_id = symbol_short!("q1");
    client.register_quest(&quest_id, &creator, &token, &1_000i128, &verifier, &99_999);

    let proof = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);

    let mut budget = env.budget();
    budget.reset_default();
    let before = budget.cpu_instruction_cost();

    client.approve_submission(&quest_id, &submitter, &verifier);

    let cost = budget.cpu_instruction_cost() - before;
    check_within_budget("approve_submission", symbol_short!("appr_sub"), cost);
}

#[test]
fn benchmark_claim_reward() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1_000);

    let (client, token, admin, creator, verifier, submitter) = setup(&env);
    client.initialize(&admin);

    let quest_id = symbol_short!("q1");
    let reward = 1_000i128;
    client.register_quest(&quest_id, &creator, &token, &reward, &verifier, &99_999);

    let proof = BytesN::from_array(&env, &[1u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);

    let mut budget = env.budget();
    budget.reset_default();
    let before = budget.cpu_instruction_cost();

    client.claim_reward(&quest_id, &submitter, &reward);

    let cost = budget.cpu_instruction_cost() - before;
    check_within_budget("claim_reward", symbol_short!("clm_rwd"), cost);
}

#[test]
fn benchmark_summary() {
    println!("\n=== GAS BUDGET CONSTANTS (soroban-sdk 21.7.4, 2026-06-26) ===");
    println!(
        "{:<20} {:>15} {:>15} {:>8}",
        "Entrypoint", "Raw Baseline", "Budget (+20%)", "Symbol"
    );
    println!("{}", "-".repeat(62));

    let rows = [
        ("initialize", 284_753u64, 341_704u64, "init"),
        ("register_quest", 341_268, 409_522, "reg_qst"),
        ("submit_proof", 386_946, 464_336, "sub_prf"),
        ("approve_submission", 438_714, 526_457, "appr_sub"),
        ("claim_reward", 767_838, 921_406, "clm_rwd"),
    ];
    for (name, baseline, budget, sym) in rows {
        println!("{:<20} {:>15} {:>15} {:>8}", name, baseline, budget, sym);
    }
    println!("=============================================================\n");
}
