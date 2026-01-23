use soroban_sdk::{Env, Address, Vec};
use crate::types::{UserStats, Badge};
use crate::storage;
use crate::errors::Error;
use crate::events;

const LEVEL_2_XP: u64 = 300;
const LEVEL_3_XP: u64 = 600;
const LEVEL_4_XP: u64 = 1000;
const LEVEL_5_XP: u64 = 1500;

/// Award XP to a user upon quest completion
pub fn award_xp(env: &Env, user: &Address, xp_amount: u64) -> Result<UserStats, Error> {
    let mut stats = storage::get_user_stats(env, user).unwrap_or_else(|_| UserStats {
        xp: 0,
        level: 1,
        quests_completed: 0,
        badges: Vec::new(env),
    });
    
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

/// Grant a badge to a user (admin-authorized)
pub fn grant_badge(env: &Env, admin: &Address, user: &Address, badge: Badge) -> Result<(), Error> {
    admin.require_auth();
    
    let mut stats = storage::get_user_stats(env, user).unwrap_or_else(|_| UserStats {
        xp: 0,
        level: 1,
        quests_completed: 0,
        badges: Vec::new(env),
    });
    
    if !stats.badges.contains(&badge) {
        stats.badges.push_back(badge.clone());
        storage::set_user_stats(env, user, &stats);
        events::badge_granted(env, user.clone(), badge);
    }
    
    Ok(())
}

/// Get user reputation stats
pub fn get_user_stats(env: &Env, user: &Address) -> UserStats {
    storage::get_user_stats(env, user).unwrap_or_else(|_| UserStats {
        xp: 0,
        level: 1,
        quests_completed: 0,
        badges: Vec::new(env),
    })
}
