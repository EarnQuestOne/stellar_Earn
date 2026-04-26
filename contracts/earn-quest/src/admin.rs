use crate::errors::Error;
use crate::storage;
use crate::types::Role;
use soroban_sdk::{Address, Env};

/// Add a new admin (only callable by existing admin)
pub fn add_admin(env: &Env, caller: &Address, new_admin: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    storage::set_admin(env, new_admin);
    Ok(())
}

/// Remove an admin (only callable by existing admin)
pub fn remove_admin(env: &Env, caller: &Address, admin_to_remove: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }

    storage::remove_admin(env, admin_to_remove);
    Ok(())
}

/// Check if an address is an admin
pub fn is_admin(env: &Env, address: &Address) -> bool {
    storage::is_admin(env, address)
}

/// Require that caller is an admin (helper for protected functions)
pub fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    caller.require_auth();

    if !(storage::is_admin(env, caller) || storage::is_super_admin(env, caller)) {
        return Err(Error::Unauthorized);
    }

    Ok(())
}

pub fn require_role(env: &Env, caller: &Address, role: Role) -> Result<(), Error> {
    caller.require_auth();
    if !(storage::is_super_admin(env, caller) || storage::has_role(env, caller, &role)) {
        return Err(Error::Unauthorized);
    }
    Ok(())
}

pub fn grant_role(
    env: &Env,
    caller: &Address,
    address: &Address,
    role: Role,
) -> Result<(), Error> {
    caller.require_auth();
    if !storage::is_super_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    storage::grant_role(env, address, &role);
    Ok(())
}

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
