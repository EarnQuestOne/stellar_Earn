use crate::errors::Error;
use crate::init;
use crate::upgrade;
use soroban_sdk::{Address, BytesN, Env};

/// Upgrade the contract's WASM code and run any outstanding migrations.
/// Only available to the contract administrator.
pub fn upgrade_contract(env: &Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
    // Verify admin privileges and authorize upgrade
    init::authorize_upgrade(env, admin)?;

    // 1. Perform WASM update
    upgrade::upgrade_code(env, new_wasm_hash)?;

    // 2. Perform state migration to current version
    upgrade::migrate(env)?;

    Ok(())
}

/// Explicitly trigger state migrations to current CONTRACT_VERSION.
/// Useful if WASM was updated separately or schema version increased without code changes.
pub fn trigger_migration(env: &Env, admin: Address) -> Result<(), Error> {
    init::authorize_upgrade(env, admin)?;
    upgrade::migrate(env)
}

/// Explicitly trigger state rollback to a previous version.
/// This should be used with extreme caution.
pub fn trigger_rollback(env: &Env, admin: Address, target_version: u32) -> Result<(), Error> {
    init::authorize_upgrade(env, admin)?;
    upgrade::rollback(env, target_version)
}
