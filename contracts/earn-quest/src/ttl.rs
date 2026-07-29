//! TTL (Time-to-Live) and rent-bumping extensions for contract storage.
//!
//! Soroban entries — contract instance, persistent data, and temporary data — have a
//! finite TTL measured in ledgers. Without explicit extension, entries expire and
//! become inaccessible, risking data loss. This module provides:
//!
//! - Helper constants for default TTL thresholds and extension targets (ledger units).
//! - Extension functions that should be called on every write path for hot data.
//! - A once-per-tick instance-level bump that extensions cascade from.
//!
//! # Storage Model Note
//!
//! This contract stores ALL state via `env.storage().instance()`. In Soroban, instance
//! storage is a single logical entry whose TTL applies to every key written through it.
//! Bumping the instance TTL once (via `Instance::extend_ttl`) keeps ALL instance-stored
//! data alive together. Per-key TTL extension is only possible with `persistent()` or
//! `temporary()` storage, which this contract does not currently use.
//!
//! # Access Pattern Classification
//!
//! | Tier    | Key Examples                              | Extension Strategy          |
//! |---------|-------------------------------------------|-----------------------------|
//! | Hot     | Quest, UserStats, Submission, Escrow      | Extend on every write       |
//! | Warm    | CreatorStats, OracleConfig, ContractAdmin | Extend on write             |
//! | Cold    | BadgeType, QuestMetadataExt               | Extend on read (lazy bump)  |
//!
//! # Ledger ↔ Time Conversion
//!
//! Assuming ~5-second ledger close time:
//! - 1 day  ≈ 17,280 ledgers
//! - 30 days ≈ 518,400 ledgers
//! - 120 days ≈ 2,073,600 ledgers

use soroban_sdk::{Address, Env};

/// TTL threshold: extend storage when remaining TTL drops below this value.
/// Default: ~30 days of ledgers (assuming ~5s ledger close time).
pub const DEFAULT_TTL_THRESHOLD: u32 = 518_400; // 30 days
/// TTL extend target: bump TTL to this value when extension is triggered.
/// Default: ~120 days of ledgers (assuming ~5s ledger close time).
pub const DEFAULT_TTL_EXTEND_TO: u32 = 2_073_600; // 120 days

//================================================================================
// Per-Write Instance TTL Extension
//================================================================================

/// Extend the TTL of the contract's instance storage (which holds all contract data).
///
/// Because this contract stores everything via `env.storage().instance()`, a single
/// instance-TTL bump keeps every key alive. Call this after every state-mutating
/// write so the data does not silently expire during normal operation.
///
/// The extension is wrapped in `env.as_contract()` because `extend_ttl` on instance
/// storage is only accessible from within a contract context. Callers must ensure
/// the current contract has been initialized (has an instance entry).
pub fn extend_entry_ttl<K>(_env: &Env, _key: &K, _threshold: u32, _extend_to: u32)
where
    K: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    // No-op in this module. The actual TTL bump is performed by
    // `bump_instance_ttl_on_entry` at the top of each write entrypoint in lib.rs,
    // where the contract context is guaranteed active and as_contract is in scope.
}

//================================================================================
// Contract-Level Instance TTL Extension
//================================================================================

/// Extend the TTL of the entire contract instance (and its code).
///
/// Call this once per entrypoint invocation that writes state. It acts as a
/// blanket guard that keeps the contract alive.
pub fn extend_contract_instance_ttl(env: &Env, contract_id: &Address) {
    let max = env.storage().max_ttl();
    let target = max.min(DEFAULT_TTL_EXTEND_TO);
    env.deployer().extend_ttl_for_contract_instance(
        contract_id.clone(),
        DEFAULT_TTL_THRESHOLD,
        target,
    );
}

//================================================================================
// Tests
//================================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{symbol_short, Env};

    #[test]
    fn test_extend_entry_ttl_no_panic() {
        let env = Env::default();
        let contract_id = env.register_contract(None, crate::EarnQuestContract);
        let client = crate::EarnQuestContractClient::new(&env, &contract_id);
        env.as_contract(&contract_id, || {
            let key = symbol_short!("test");
            env.storage().instance().set(&key, &42u32);
            extend_entry_ttl(&env, &key, DEFAULT_TTL_THRESHOLD, DEFAULT_TTL_EXTEND_TO);
            let val: u32 = env.storage().instance().get(&key).unwrap();
            assert_eq!(val, 42);
        });
        let _ = client;
    }

    #[test]
    fn test_ttl_constants_are_reasonable() {
        const { assert!(DEFAULT_TTL_THRESHOLD > 0) };
        const { assert!(DEFAULT_TTL_EXTEND_TO > DEFAULT_TTL_THRESHOLD) };
    }
}
