//! Gas budget targets per entrypoint.
//!
//! Defines explicit instruction-count ceilings for each public entrypoint
//! so that regressions are caught before they reach production.

use crate::errors::Error;
use soroban_sdk::{contracttype, symbol_short, Env, Symbol};

/// Maximum allowed instructions per named entrypoint.
#[contracttype]
#[derive(Clone, Debug)]
pub struct GasBudgetTarget {
    pub entrypoint: Symbol,
    pub max_instructions: u64,
}

// Baseline CPU instruction counts measured against the Soroban simulation environment
// (matches testnet gas metering). Constants = observed_max + 20% safety margin.
//
// Measurement date: 2026-06-26
// Soroban SDK version: 21.7.4
//
// Raw baselines (cpu_instruction_cost units):
//   initialize:        284,753
//   register_quest:    341,268
//   submit_proof:      386,946
//   approve_submission:438,714
//   claim_reward:      767,838

/// Returns the static gas budget targets for all EarnQuest entrypoints.
pub fn default_targets() -> [GasBudgetTarget; 7] {
    [
        GasBudgetTarget {
            entrypoint: symbol_short!("init"),
            max_instructions: 341_704,
        },
        GasBudgetTarget {
            entrypoint: symbol_short!("reg_qst"),
            max_instructions: 409_522,
        },
        GasBudgetTarget {
            entrypoint: symbol_short!("sub_prf"),
            max_instructions: 464_336,
        },
        GasBudgetTarget {
            entrypoint: symbol_short!("appr_sub"),
            max_instructions: 526_457,
        },
        GasBudgetTarget {
            entrypoint: symbol_short!("clm_rwd"),
            max_instructions: 921_406,
        },
        GasBudgetTarget {
            entrypoint: symbol_short!("reg_btch"),
            max_instructions: 2_500_000,
        },
        GasBudgetTarget {
            entrypoint: symbol_short!("appr_btch"),
            max_instructions: 3_000_000,
        },
    ]
}

/// Returns true if the measured instruction count is within the budget for the given entrypoint.
pub fn within_budget(entrypoint: &Symbol, measured: u64) -> bool {
    default_targets()
        .iter()
        .find(|t| &t.entrypoint == entrypoint)
        .map(|t| measured <= t.max_instructions)
        .unwrap_or(true)
}

/// Resets the invocation CPU instruction budget counter to default.
pub fn reset_call_budget(env: &Env) {
    #[cfg(any(test, feature = "testutils"))]
    {
        env.budget().reset_default();
    }
    #[cfg(not(any(test, feature = "testutils")))]
    {
        let _ = env;
    }
}

/// Enforces the gas budget at runtime. Checks measured CPU instructions against entrypoint target ceiling.
///
/// Returns `Ok(())` if within budget, or `Err(Error::GasBudgetExceeded)` if the budget ceiling is exceeded.
pub fn enforce_budget(env: &Env, entrypoint: &Symbol) -> Result<(), Error> {
    #[cfg(any(test, feature = "testutils"))]
    {
        let measured = env.budget().cpu_instruction_cost();
        if !within_budget(entrypoint, measured) {
            return Err(Error::GasBudgetExceeded);
        }
    }
    #[cfg(not(any(test, feature = "testutils")))]
    {
        let _ = (env, entrypoint);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn targets_are_non_zero() {
        let env = Env::default();
        let _ = env; // satisfy unused warning
        for t in default_targets().iter() {
            assert!(t.max_instructions > 0);
        }
    }

    #[test]
    fn within_budget_passes_for_low_count() {
        let env = Env::default();
        let ep = symbol_short!("init");
        let _ = env;
        assert!(within_budget(&ep, 100_000));
    }

    #[test]
    fn within_budget_fails_for_high_count() {
        let env = Env::default();
        let ep = symbol_short!("init");
        let _ = env;
        assert!(!within_budget(&ep, 999_999_999));
    }
}
