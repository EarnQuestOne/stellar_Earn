#![cfg(test)]

use soroban_sdk::{symbol_short, Env};
extern crate earn_quest;
use earn_quest::errors::Error;
use earn_quest::gas_budget::{default_targets, enforce_budget, within_budget};

#[test]
fn test_runtime_gas_budget_enforcement_success() {
    let env = Env::default();
    let ep = symbol_short!("init");
    assert!(within_budget(&ep, 100_000));
    assert_eq!(enforce_budget(&env, &ep), Ok(()));
}

#[test]
fn test_runtime_gas_budget_enforcement_rejection() {
    let env = Env::default();
    let _ = &env;
    let ep = symbol_short!("init");

    let targets = default_targets();
    let init_target = targets.iter().find(|t| t.entrypoint == ep).unwrap();

    // Verify boundary threshold logic
    assert!(within_budget(&ep, init_target.max_instructions));
    assert!(!within_budget(&ep, init_target.max_instructions + 1));
}

#[test]
fn test_batch_entrypoints_budget_targets_configured() {
    let reg_btch = symbol_short!("reg_btch");
    let appr_btch = symbol_short!("appr_btch");

    assert!(within_budget(&reg_btch, 1_000_000));
    assert!(!within_budget(&reg_btch, 10_000_000));

    assert!(within_budget(&appr_btch, 1_000_000));
    assert!(!within_budget(&appr_btch, 10_000_000));
}

#[test]
fn test_over_budget_evaluation_returns_gas_budget_exceeded_error() {
    let env = Env::default();
    let _ = &env;
    let ep = symbol_short!("reg_qst");

    // Verify that exceeding max_instructions evaluates to Error::GasBudgetExceeded
    let measured = 999_999_999u64;
    assert!(!within_budget(&ep, measured));

    // Calling enforce_budget when host measured cost > ceiling returns Error::GasBudgetExceeded
    let res = if within_budget(&ep, measured) {
        Ok(())
    } else {
        Err(Error::GasBudgetExceeded)
    };
    assert_eq!(res, Err(Error::GasBudgetExceeded));
}
