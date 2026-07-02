use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::Role;
use soroban_sdk::{Address, Env};

/// Adds a new administrator to the contract.
///
/// Only a SuperAdmin can add new administrators.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account performing the action.
/// * `new_admin` - The address of the account to be promoted to administrator.
///
/// # Returns
///
/// * `Ok(())` if the administrator is successfully added.
/// * `Err(Error::Unauthorized)` if the caller is not a SuperAdmin.
pub fn add_admin(env: &Env, caller: &Address, new_admin: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    storage::set_admin(env, new_admin);
    Ok(())
}

/// Removes an administrator from the contract.
///
/// Only a SuperAdmin can remove administrators.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account performing the action.
/// * `admin_to_remove` - The address of the administrator to be removed.
///
/// # Returns
///
/// * `Ok(())` if the administrator is successfully removed.
/// * `Err(Error::Unauthorized)` if the caller is not a SuperAdmin.
pub fn remove_admin(env: &Env, caller: &Address, admin_to_remove: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    storage::remove_admin(env, admin_to_remove);
    Ok(())
}

/// Checks if an address is an administrator.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `address` - The address to check.
///
/// # Returns
///
/// `true` if the address has the admin role or is a super admin, `false` otherwise.
pub fn is_admin(env: &Env, address: &Address) -> bool {
    storage::is_admin(env, address)
}

/// Requires that the caller has administrative privileges.
///
/// This is a helper function used to protect sensitive contract methods.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account to authorize.
///
/// # Returns
///
/// * `Ok(())` if the caller is an administrator or super administrator.
/// * `Err(Error::Unauthorized)` if the caller lacks administrative privileges.
pub fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !(storage::is_admin(env, caller) || storage::is_super_admin(env, caller)) {
        return Err(Error::Unauthorized);
    }

    Ok(())
}

/// Requires that the caller has a specific role or is a SuperAdmin.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account to check.
/// * `role` - The role required to perform the action.
///
/// # Returns
///
/// * `Ok(())` if the caller has the required role or is a SuperAdmin.
/// * `Err(Error::Unauthorized)` otherwise.
pub fn require_role(env: &Env, caller: &Address, role: Role) -> Result<(), Error> {
    caller.require_auth();
    if !(storage::is_super_admin(env, caller) || storage::has_role(env, caller, &role)) {
        return Err(Error::Unauthorized);
    }
    Ok(())
}

/// Grants a specific role to an address.
///
/// Only a SuperAdmin can grant roles.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account performing the action.
/// * `address` - The address receiving the role.
/// * `role` - The role to grant.
///
/// # Returns
///
/// * `Ok(())` if the role is successfully granted.
/// * `Err(Error::Unauthorized)` if the caller is not a SuperAdmin.
pub fn grant_role(env: &Env, caller: &Address, address: &Address, role: Role) -> Result<(), Error> {
    caller.require_auth();
    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    storage::grant_role(env, address, &role);
    Ok(())
}

/// Revokes a specific role from an address.
///
/// Only a SuperAdmin can revoke roles.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account performing the action.
/// * `address` - The address losing the role.
/// * `role` - The role to revoke.
///
/// # Returns
///
/// * `Ok(())` if the role is successfully revoked.
/// * `Err(Error::Unauthorized)` if the caller is not a SuperAdmin.
pub fn revoke_role(
    env: &Env,
    caller: &Address,
    address: &Address,
    role: Role,
) -> Result<(), Error> {
    caller.require_auth();
    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    storage::revoke_role(env, address, &role);
    Ok(())
}

/// Sets the minimum creator level required to create quests.
///
/// Only a SuperAdmin can set the minimum creator level.
/// Setting the level to 0 disables the requirement.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account performing the action.
/// * `level` - The minimum level required to create quests.
///
/// # Returns
///
/// * `Ok(())` if the minimum level is successfully set.
/// * `Err(Error::Unauthorized)` if the caller is not a SuperAdmin.
pub fn set_min_creator_level(env: &Env, caller: &Address, level: u32) -> Result<(), Error> {
    caller.require_auth();
    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    storage::set_min_creator_level(env, level);
    events::min_creator_level_set(env, caller.clone(), level);
    Ok(())
}

/// Sets the global default quest expiry grace period in seconds.
///
/// Quests with an explicit `grace_period_seconds` keep using their per-quest
/// value; this default only applies when the quest does not define one.
pub fn set_quest_grace_period(
    env: &Env,
    caller: &Address,
    grace_period_seconds: u64,
) -> Result<(), Error> {
    require_admin(env, caller)?;
    storage::set_quest_grace_period(env, grace_period_seconds);
    Ok(())
}

/// Adds an address to the creator whitelist, allowing them to bypass
/// the minimum creator level requirement when creating quests.
///
/// Only a SuperAdmin can whitelist addresses.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account performing the action.
/// * `address` - The address to whitelist.
///
/// # Returns
///
/// * `Ok(())` if the address is successfully whitelisted.
/// * `Err(Error::Unauthorized)` if the caller is not a SuperAdmin.
pub fn add_creator_whitelist(env: &Env, caller: &Address, address: &Address) -> Result<(), Error> {
    caller.require_auth();
    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    storage::add_creator_whitelist(env, address);
    events::creator_whitelist_added(env, caller.clone(), address.clone());
    Ok(())
}

/// Removes an address from the creator whitelist.
///
/// Only a SuperAdmin can remove addresses from the whitelist.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account performing the action.
/// * `address` - The address to remove from the whitelist.
///
/// # Returns
///
/// * `Ok(())` if the address is successfully removed from the whitelist.
/// * `Err(Error::Unauthorized)` if the caller is not a SuperAdmin.
pub fn remove_creator_whitelist(
    env: &Env,
    caller: &Address,
    address: &Address,
) -> Result<(), Error> {
    caller.require_auth();
    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    storage::remove_creator_whitelist(env, address);
    events::creator_whitelist_removed(env, caller.clone(), address.clone());
    Ok(())
}
