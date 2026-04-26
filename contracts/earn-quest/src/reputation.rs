use crate::admin;
use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{Badge, UserBadges, UserCore};
use soroban_sdk::{Address, Env};

const LEVEL_2_XP: u64 = 300;
const LEVEL_3_XP: u64 = 600;
const LEVEL_4_XP: u64 = 1000;
const LEVEL_5_XP: u64 = 1500;

/// Award XP to a user upon quest completion.
/// Only reads/writes UserCore (hot path) — badge Vec not touched.
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

/// Calculate user level based on total XP
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

/// Grant a badge to a user (admin-authorized).
/// Only reads/writes UserBadges (cold path) — XP counters not touched.
pub fn grant_badge(env: &Env, caller: &Address, user: &Address, badge: Badge) -> Result<(), Error> {
    admin::require_admin(env, caller)?;

    let mut user_badges = storage::get_user_badges(env, user);

    if !user_badges.badges.contains(&badge) {
        user_badges.badges.push_back(badge.clone());
        storage::set_user_badges(env, user, &user_badges);
        events::badge_granted(env, user.clone(), badge);
    }

    Ok(())
}

/// Get user reputation stats (UserCore only — no badge Vec).
pub fn get_user_stats(env: &Env, user: &Address) -> UserCore {
    storage::get_user_stats_or_default(env, user)
}
