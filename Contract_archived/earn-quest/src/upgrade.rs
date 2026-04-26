use crate::errors::Error;
use crate::init::CONTRACT_VERSION;
use crate::storage;
use soroban_sdk::{BytesN, Env};

/// Migrate state from current version to CONTRACT_VERSION
pub fn migrate(env: &Env) -> Result<(), Error> {
    let mut current_version = storage::get_data_version(env);

    // If not initialized (or no version set), start from 0 or 1.
    // Assuming 1 was initial version without explicit version storage key.
    if current_version == 0 && storage::is_initialized(env) {
        current_version = 1;
        storage::set_data_version(env, 1);

        // Update version in config for consistency
        if let Some(mut config) = storage::get_config(env) {
            config.version = 1;
            storage::set_config(env, &config);
        }
    }

    if current_version >= CONTRACT_VERSION {
        return Ok(());
    }

    // Run migrations sequentially
    for version in (current_version + 1)..=CONTRACT_VERSION {
        run_migration(env, version)?;
        storage::set_data_version(env, version);

        // Update version in config for consistency
        if let Some(mut config) = storage::get_config(env) {
            config.version = version;
            storage::set_config(env, &config);
        }
    }

    Ok(())
}

/// Run a specific version migration
fn run_migration(env: &Env, version: u32) -> Result<(), Error> {
    match version {
        2 => migrate_v1_to_v2(env),
        // Add future migrations here, e.g.
        // 3 => migrate_v2_to_v3(env),
        _ => Err(Error::InvalidVersionNumber),
    }
}

/// Placeholder migration from v1 to v2.
/// Actual migration logic should be implemented here when a schema change is needed.
fn migrate_v1_to_v2(_env: &Env) -> Result<(), Error> {
    // Example: Update existing storage entries or add new required fields
    Ok(())
}

/// Revert state to a previous version if possible
/// This is a complex operation and depends on what migrations were performed.
/// For simple additions, it might just be deleting data.
pub fn rollback(env: &Env, target_version: u32) -> Result<(), Error> {
    let current_version = storage::get_data_version(env);

    if target_version >= current_version {
        return Err(Error::InvalidVersionNumber);
    }

    // Rollback sequentially in reverse
    for version in (target_version..current_version).rev() {
        run_rollback(env, version + 1)?;
        storage::set_data_version(env, version);

        // Update version in config for consistency
        if let Some(mut config) = storage::get_config(env) {
            config.version = version;
            storage::set_config(env, &config);
        }
    }

    Ok(())
}

fn run_rollback(env: &Env, version: u32) -> Result<(), Error> {
    match version {
        1 => Ok(()), // v1 is the base version, rollback to it is a no-op
        2 => rollback_v2_to_v1(env),
        _ => Err(Error::InvalidVersionNumber),
    }
}

fn rollback_v2_to_v1(_env: &Env) -> Result<(), Error> {
    // Reverse v1 to v2 migration
    Ok(())
}

/// Upgrade contract code to a new WASM hash
/// Admin only
pub fn upgrade_code(env: &Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
    env.deployer().update_current_contract_wasm(new_wasm_hash);
    Ok(())
}
