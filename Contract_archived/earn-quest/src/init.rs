use crate::errors::Error;
use crate::storage;
use soroban_sdk::{Address, Env};

/// Current contract version
pub const CONTRACT_VERSION: u32 = 1;

/// Configuration for the contract
#[soroban_sdk::contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractConfig {
    /// Admin address with upgrade and configuration permissions
    pub admin: Address,
    /// Current contract version
    pub version: u32,
    /// Whether the contract has been initialized
    pub initialized: bool,
}

/// Initialize the contract with admin setup
///
/// This function can only be called once. Subsequent calls will fail with AlreadyInitialized.
///
/// # Arguments
/// * `env` - The contract environment
/// * `admin` - The address that will have admin privileges
///
/// # Returns
/// * `Ok(())` if initialization succeeds
/// * `Err(AlreadyInitialized)` if contract is already initialized
/// * `Err(InvalidAdmin)` if admin address is invalid
pub fn initialize(env: &Env, admin: Address) -> Result<(), Error> {
    // Verify admin address is valid
    admin.require_auth();

    // Check if already initialized
    if storage::is_initialized(env) {
        return Err(Error::AlreadyInitialized);
    }

    // Create initial configuration
    let config = ContractConfig {
        admin: admin.clone(),
        version: CONTRACT_VERSION,
        initialized: true,
    };

    // Store configuration
    storage::set_config(env, &config);

    // Set initial data version
    storage::set_data_version(env, CONTRACT_VERSION);

    Ok(())
}

/// Get current contract configuration
///
/// # Arguments
/// * `env` - The contract environment
///
/// # Returns
/// * `Ok(ContractConfig)` with the current configuration
/// * `Err(NotInitialized)` if contract has not been initialized
pub fn get_config(env: &Env) -> Result<ContractConfig, Error> {
    storage::get_config(env).ok_or(Error::NotInitialized)
}

/// Update contract configuration (admin only)
///
/// # Arguments
/// * `env` - The contract environment
/// * `admin` - The address making the update (must match current admin)
/// * `new_admin` - The new admin address (optional)
///
/// # Returns
/// * `Ok(())` if update succeeds
/// * `Err(NotInitialized)` if contract has not been initialized
/// * `Err(Unauthorized)` if caller is not the admin
pub fn update_config(env: &Env, admin: Address, new_admin: Option<Address>) -> Result<(), Error> {
    // Require auth from the caller
    admin.require_auth();

    // Get current config
    let mut config = get_config(env)?;

    // Verify caller is the admin
    if config.admin != admin {
        return Err(Error::Unauthorized);
    }

    // Update admin if provided
    if let Some(new_admin_addr) = new_admin {
        config.admin = new_admin_addr;
    }

    // Store updated configuration
    storage::set_config(env, &config);

    Ok(())
}

/// Authorize a contract upgrade (admin only)
///
/// This function verifies that the caller is the admin and returns the authorization.
/// It does NOT perform the upgrade itself, but validates that the upgrade is authorized.
///
/// # Arguments
/// * `env` - The contract environment
/// * `admin` - The address making the authorization (must match current admin)
///
/// # Returns
/// * `Ok(())` if upgrade is authorized
/// * `Err(NotInitialized)` if contract has not been initialized
/// * `Err(UnauthorizedUpgrade)` if caller is not the admin
pub fn authorize_upgrade(env: &Env, admin: Address) -> Result<(), Error> {
    // Require auth from the caller
    admin.require_auth();

    // Get current config
    let config = get_config(env)?;

    // Verify caller is the admin
    if config.admin != admin {
        return Err(Error::UnauthorizedUpgrade);
    }

    Ok(())
}

/// Check if contract is initialized
///
/// # Arguments
/// * `env` - The contract environment
///
/// # Returns
/// * `true` if contract is initialized, `false` otherwise
pub fn is_initialized(env: &Env) -> bool {
    storage::is_initialized(env)
}

/// Get current contract version
///
/// # Arguments
/// * `env` - The contract environment
///
/// # Returns
/// * `Ok(u32)` with the current version number
/// * `Err(NotInitialized)` if contract has not been initialized
pub fn get_version(env: &Env) -> Result<u32, Error> {
    let config = get_config(env)?;
    Ok(config.version)
}

/// Get the current admin address
///
/// # Arguments
/// * `env` - The contract environment
///
/// # Returns
/// * `Ok(Address)` with the current admin address
/// * `Err(NotInitialized)` if contract has not been initialized
pub fn get_admin(env: &Env) -> Result<Address, Error> {
    let config = get_config(env)?;
    Ok(config.admin)
}
