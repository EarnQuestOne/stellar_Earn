//! Gas regression check utilities.
//!
//! Compares measured instruction counts against stored baseline values
//! and fails if any entrypoint exceeds its threshold delta.

#![no_std]

use soroban_sdk::{contracttype, symbol_short, Symbol};

/// A baseline gas measurement for a single entrypoint.
#[contracttype]
#[derive(Clone, Debug)]
pub struct GasBaseline {
    pub entrypoint: Symbol,
    /// Baseline instruction count from the last accepted run.
    pub baseline: u64,
    /// Maximum allowed increase over the baseline (absolute instructions).
    pub delta_threshold: u64,
}

/// Returns the default gas regression baselines.
pub fn default_baselines() -> [GasBaseline; 5] {
    [
        GasBaseline { entrypoint: symbol_short!("init"),    baseline: 400_000,   delta_threshold: 50_000 },
        GasBaseline { entrypoint: symbol_short!("reg_qst"), baseline: 900_000,   delta_threshold: 100_000 },
        GasBaseline { entrypoint: symbol_short!("sub_prf"), baseline: 700_000,   delta_threshold: 80_000 },
        GasBaseline { entrypoint: symbol_short!("appr_sub"),baseline: 1_100_000, delta_threshold: 100_000 },
        GasBaseline { entrypoint: symbol_short!("clm_rwd"), baseline: 1_300_000, delta_threshold: 150_000 },
    ]
}

/// Returns `Ok(())` if `measured` is within `baseline + delta_threshold`,
/// or `Err(delta)` with the overage amount.
pub fn check_regression(entrypoint: &Symbol, measured: u64) -> Result<(), u64> {
    for b in default_baselines().iter() {
        if &b.entrypoint == entrypoint {
            let ceiling = b.baseline.saturating_add(b.delta_threshold);
            if measured > ceiling {
                return Err(measured - ceiling);
            }
            return Ok(());
        }
    }
    Ok(()) // unknown entrypoint — pass through
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn passes_within_delta() {
        let env = Env::default();
        let _ = env;
        let ep = symbol_short!("init");
        assert!(check_regression(&ep, 420_000).is_ok());
    }

    #[test]
    fn fails_beyond_delta() {
        let env = Env::default();
        let _ = env;
        let ep = symbol_short!("init");
        assert!(check_regression(&ep, 600_000).is_err());
    }
}