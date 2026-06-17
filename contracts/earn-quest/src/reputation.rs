use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{Badge, BadgeType, Role, UserCore};
use soroban_sdk::{symbol_short, Address, Env, String, Symbol};

const LEVEL_2_XP: u64 = 300;
const LEVEL_3_XP: u64 = 600;
const LEVEL_4_XP: u64 = 1000;
const LEVEL_5_XP: u64 = 1500;

/// Awards experience points (XP) to a user and handles leveling up.
///
/// This function increments the user's total XP and the number of quests completed.
/// It automatically recalculates the user's level based on the new XP total.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `user` - The address of the user receiving the XP.
/// * `xp_amount` - The amount of XP to award.
///
/// # Returns
///
/// * `Ok(UserCore)` containing the updated user statistics.
/// * `Err(Error)` if storage access fails.
pub fn award_xp(env: &Env, user: &Address, xp_amount: u64) -> Result<UserCore, Error> {
    let mut stats = storage::get_user_stats_or_default(env, user);

    stats.xp += xp_amount;
    stats.quests_completed += 1;

    let new_level = calculate_level(stats.xp);
    let level_up = new_level > stats.level;
    stats.level = new_level;

    storage::set_user_stats(env, user, &stats);

    events::xp_awarded(env, user.clone(), xp_amount, stats.xp, stats.level);

    if level_up {
        events::level_up(env, user.clone(), stats.level);
    }

    Ok(stats)
}

/// Calculates the user level based on their current experience points (XP).
///
/// # Level Thresholds:
/// - Level 1: 0 - 299 XP
/// - Level 2: 300 - 599 XP
/// - Level 3: 600 - 999 XP
/// - Level 4: 1000 - 1499 XP
/// - Level 5: 1500+ XP
///
/// # Arguments
///
/// * `xp` - The total experience points of the user.
///
/// # Returns
///
/// The user's level (1 to 5).
pub fn calculate_level(xp: u64) -> u32 {
    if xp >= LEVEL_5_XP {
        5
    } else if xp >= LEVEL_4_XP {
        4
    } else if xp >= LEVEL_3_XP {
        3
    } else if xp >= LEVEL_2_XP {
        2
    } else {
        1
    }
}

// Map badge to XP reward
fn badge_xp(badge: &Badge) -> u64 {
    match badge {
        Badge::Rookie => 10,
        Badge::Explorer => 20,
        Badge::Veteran => 30,
        Badge::Master => 50,
        Badge::Legend => 100,
    }
}

/// Grants a badge to a user (BadgeAdmin or Admin only).
///
/// If the user already has the badge, the function returns success without awarding extra XP.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the account performing the action.
/// * `user` - The address of the user receiving the badge.
/// * `badge` - The type of badge to grant.
///
/// # Returns
///
/// * `Ok(())` if the badge is successfully granted.
/// * `Err(Error::Unauthorized)` if the caller lacks permission.
pub fn grant_badge(env: &Env, caller: &Address, user: &Address, badge: Badge) -> Result<(), Error> {
    caller.require_auth();
    if !(storage::is_super_admin(env, caller)
        || storage::has_role(env, caller, &Role::Admin)
        || storage::has_role(env, caller, &Role::BadgeAdmin))
    {
        return Err(Error::Unauthorized);
    }

    let mut user_badges = storage::get_user_badges(env, user);

    if !user_badges.badges.contains(&badge) {
        user_badges.badges.push_back(badge.clone());
        storage::set_user_badges(env, user, &user_badges);
        events::badge_granted(env, user.clone(), badge.clone());
        // Award XP based on badge
        let _ = award_xp(env, user, badge_xp(&badge));
    }

    Ok(())
}

/// Retrieves the core reputation statistics for a user.
///
/// If no stats exist for the user, returns default values (0 XP, Level 1, 0 Quests).
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `user` - The address of the user.
///
/// # Returns
///
/// A `UserCore` struct containing the user's statistics.
pub fn get_user_stats(env: &Env, user: &Address) -> UserCore {
    storage::get_user_stats_or_default(env, user)
}

/// Seeds default badge types into the contract.
///
/// This function registers common badge types that are available by default.
///
/// # Arguments
///
/// * `env` - The contract environment.
///
/// # Returns
///
/// * `Ok(())` if seeding was successful.
/// * `Err(Error)` if any operation fails.
pub fn seed_default_badge_types(env: &Env, caller: &Address) -> Result<(), Error> {
    // Verify caller has admin role
    if !storage::is_admin(env, caller) && !storage::has_role(env, caller, &Role::BadgeAdmin) {
        return Err(Error::Unauthorized);
    }

    // Seed common badge types
    let rookie = BadgeType {
        id: symbol_short!("ROOKIE"),
        name: String::from_str(env, "Rookie"),
        description: String::from_str(env, "Initial badge for new users"),
        xp_reward: 10,
    };

    let explorer = BadgeType {
        id: symbol_short!("EXPLORER"),
        name: String::from_str(env, "Explorer"),
        description: String::from_str(env, "For users who have explored multiple quests"),
        xp_reward: 20,
    };

    let veteran = BadgeType {
        id: symbol_short!("VETERAN"),
        name: String::from_str(env, "Veteran"),
        description: String::from_str(env, "For experienced quest completers"),
        xp_reward: 30,
    };

    let master = BadgeType {
        id: symbol_short!("MASTER"),
        name: String::from_str(env, "Master"),
        description: String::from_str(env, "For top-tier contributors"),
        xp_reward: 50,
    };

    let legend = BadgeType {
        id: symbol_short!("LEGEND"),
        name: String::from_str(env, "Legend"),
        description: String::from_str(env, "The highest achievement level"),
        xp_reward: 100,
    };

    // Register each badge type
    register_badge_type(env, caller, &rookie)?;
    register_badge_type(env, caller, &explorer)?;
    register_badge_type(env, caller, &veteran)?;
    register_badge_type(env, caller, &master)?;
    register_badge_type(env, caller, &legend)?;

    Ok(())
}

/// Registers a new badge type in the contract.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the caller (must be Admin or BadgeAdmin).
/// * `badge_type` - The badge type to register.
///
/// # Returns
///
/// * `Ok(())` if registration was successful.
/// * `Err(Error)` if any operation fails.
pub fn register_badge_type(
    env: &Env,
    caller: &Address,
    badge_type: &BadgeType,
) -> Result<(), Error> {
    // Verify caller has admin role
    if !storage::is_admin(env, caller) && !storage::has_role(env, caller, &Role::BadgeAdmin) {
        return Err(Error::Unauthorized);
    }

    // Store the badge type
    storage::set_badge_type(env, badge_type);

    // Add to the list of badge type IDs
    storage::add_badge_type_id(env, &badge_type.id);

    // Emit event
    events::badge_type_registered(env, badge_type.id.clone(), badge_type.name.clone());

    Ok(())
}

/// Updates an existing badge type in the contract.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the caller (must be Admin or BadgeAdmin).
/// * `badge_type` - The updated badge type.
///
/// # Returns
///
/// * `Ok(())` if update was successful.
/// * `Err(Error)` if any operation fails.
pub fn update_badge_type(env: &Env, caller: &Address, badge_type: &BadgeType) -> Result<(), Error> {
    // Verify caller has admin role
    if !storage::is_admin(env, caller) && !storage::has_role(env, caller, &Role::BadgeAdmin) {
        return Err(Error::Unauthorized);
    }

    // Update the badge type
    storage::set_badge_type(env, badge_type);

    // Emit event
    events::badge_type_updated(env, badge_type.id.clone());

    Ok(())
}

/// Removes a badge type from the contract.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `caller` - The address of the caller (must be Admin or BadgeAdmin).
/// * `id` - The ID of the badge type to remove.
///
/// # Returns
///
/// * `Ok(())` if removal was successful.
/// * `Err(Error)` if any operation fails.
pub fn remove_badge_type(env: &Env, caller: &Address, id: &Symbol) -> Result<(), Error> {
    // Verify caller has admin role
    if !storage::is_admin(env, caller) && !storage::has_role(env, caller, &Role::BadgeAdmin) {
        return Err(Error::Unauthorized);
    }

    // Remove from storage
    storage::remove_badge_type(env, id);

    // Remove from the list of badge type IDs
    storage::remove_badge_type_id(env, id);

    // Emit event
    events::badge_type_removed(env, id.clone());

    Ok(())
}
