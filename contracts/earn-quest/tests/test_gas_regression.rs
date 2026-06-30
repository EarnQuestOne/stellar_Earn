#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{symbol_short, token, Address, BytesN, Env};
use std::collections::HashMap;

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

fn setup_env_and_client(
    env: &Env,
) -> (
    EarnQuestContractClient<'_>,
    Address, // token
    Address, // admin
    Address, // creator
    Address, // verifier
    Address, // submitter
) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);

    let token_admin = Address::generate(env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();

    let admin = Address::generate(env);
    let creator = Address::generate(env);
    let verifier = Address::generate(env);
    let submitter = Address::generate(env);

    (client, token_address, admin, creator, verifier, submitter)
}

#[test]
fn test_gas_regression_check() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let (client, token_address, admin, creator, verifier, submitter) = setup_env_and_client(&env);

    // Mint tokens to actors
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);
    token_admin_client.mint(&creator, &100_000);
    token_admin_client.mint(&submitter, &100_000);
    token_admin_client.mint(&verifier, &100_000);

    let token_client = token::Client::new(&env, &token_address);
    token_client.approve(&creator, &client.address, &10_000, &10000);

    let mut budget = env.budget();

    // 1. Measure initialize
    budget.reset_default();
    let start = budget.cpu_instruction_cost();
    client.initialize(&admin);
    let initialize_cost = budget.cpu_instruction_cost() - start;

    // 2. Measure register_quest
    let quest_id = symbol_short!("q1");
    let reward_amount = 1000i128;
    let deadline = 99999u64;

    budget.reset_default();
    let start = budget.cpu_instruction_cost();
    client.register_quest(
        &quest_id,
        &creator,
        &token_address,
        &reward_amount,
        &verifier,
        &deadline,
    );
    let register_quest_cost = budget.cpu_instruction_cost() - start;

    // Deposit escrow so payout/claim works later
    client.deposit_escrow(&quest_id, &creator, &token_address, &5000);

    // 3. Measure submit_proof
    let proof = BytesN::from_array(&env, &[1u8; 32]);
    budget.reset_default();
    let start = budget.cpu_instruction_cost();
    client.submit_proof(&quest_id, &submitter, &proof);
    let submit_proof_cost = budget.cpu_instruction_cost() - start;

    // 4. Measure approve_submission
    budget.reset_default();
    let start = budget.cpu_instruction_cost();
    client.approve_submission(&quest_id, &submitter, &verifier);
    let approve_submission_cost = budget.cpu_instruction_cost() - start;

    // 5. Measure claim_reward
    budget.reset_default();
    let start = budget.cpu_instruction_cost();
    client.claim_reward(&quest_id, &submitter, &reward_amount);
    let claim_reward_cost = budget.cpu_instruction_cost() - start;

    // Map measurements
    let mut current_measurements = HashMap::new();
    current_measurements.insert("initialize".to_string(), initialize_cost);
    current_measurements.insert("register_quest".to_string(), register_quest_cost);
    current_measurements.insert("submit_proof".to_string(), submit_proof_cost);
    current_measurements.insert("approve_submission".to_string(), approve_submission_cost);
    current_measurements.insert("claim_reward".to_string(), claim_reward_cost);

    // If UPDATE_GAS_BASELINES env var is set, update baseline file
    if std::env::var("UPDATE_GAS_BASELINES").is_ok() {
        let json_str = serde_json::to_string_pretty(&current_measurements).unwrap();
        std::fs::write("tests/gas_baselines.json", json_str)
            .expect("Failed to write gas_baselines.json");
        println!("✓ Gas baselines updated successfully!");
        return;
    }

    // Otherwise compare against baseline
    let baselines_str = include_str!("gas_baselines.json");
    let baselines: HashMap<String, u64> = serde_json::from_str(baselines_str).unwrap();

    let max_allowed_increase_percent = 5.0;
    let mut regression_detected = false;

    println!("\n=== GAS REGRESSION CHECK ===");
    for (entrypoint, baseline_val) in baselines.iter() {
        if let Some(&current_val) = current_measurements.get(entrypoint) {
            let delta = current_val as i64 - *baseline_val as i64;
            let delta_pct = (delta as f64 / *baseline_val as f64) * 100.0;

            println!(
                "  Entrypoint '{}': Baseline = {}, Current = {}, Delta = {} ({:+.2}%)",
                entrypoint, baseline_val, current_val, delta, delta_pct
            );

            if delta_pct > max_allowed_increase_percent {
                println!(
                    "  [FAIL] Gas regression detected in entrypoint '{}'! Gas usage increased by {:.2}%, exceeding the {:.2} limit.",
                    entrypoint, delta_pct, max_allowed_increase_percent
                );
                regression_detected = true;
            } else {
                println!(
                    "  [PASS] Entrypoint '{}' is within budget delta.",
                    entrypoint
                );
            }
        } else {
            println!(
                "  [WARN] No measurement found for baseline entrypoint '{}'",
                entrypoint
            );
        }
    }
    println!("============================\n");

    assert!(
        !regression_detected,
        "Gas regression check failed. See stdout logs for details."
    );
}
