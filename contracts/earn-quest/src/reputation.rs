use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{Badge, Role, UserBadges, UserCore};
use soroban_sdk::{Address, Env};

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
        if !(storage::is_super_admin(env, caller) || storage::has_role(env, caller, &Role::Admin) || storage::has_role(env, caller, &Role::BadgeAdmin)) {
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
