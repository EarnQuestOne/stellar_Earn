use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::errors::Error;
use crate::storage;
use crate::types::UserStats;

/// Award XP to a user and update their stats
pub fn award_xp(env: &Env, address: &Address, xp: u32) -> Result<(), Error> {
    // Get or create user stats
    let mut stats = storage::get_user_stats(env, address).unwrap_or_else(|| UserStats {
        address: address.clone(),
        total_xp: 0,
        level: 1,
        quests_completed: 0,
        badges: Vec::new(env),
    });

    // Add XP
    stats.total_xp += xp;

    // Update level based on XP
    stats.level = calculate_level(stats.total_xp);

    // Increment quests completed
    stats.quests_completed += 1;

    // Store updated stats
    storage::set_user_stats(env, &stats);

    // Emit event
    env.events()
        .publish((Symbol::new(env, "xp_award"), address.clone()), xp);

    Ok(())
}

/// Calculate user level based on total XP
/// Level formula: level = floor(sqrt(total_xp / 100)) + 1
fn calculate_level(total_xp: u32) -> u32 {
    // Simple level calculation: 100 XP per level
    // Level 1: 0-99 XP
    // Level 2: 100-199 XP
    // Level 3: 200-299 XP, etc.
    (total_xp / 100) + 1
}

/// Grant a badge to a user (admin only)
pub fn grant_badge(
    env: &Env,
    address: &Address,
    badge: Symbol,
    admin: &Address,
) -> Result<(), Error> {
    // Verify admin authorization
    admin.require_auth();

    // Get user stats
    let mut stats = storage::get_user_stats(env, address).ok_or(Error::UserStatsNotFound)?;

    // Add badge if not already present
    if !stats.badges.contains(&badge) {
        stats.badges.push_back(badge.clone());
        storage::set_user_stats(env, &stats);

        // Emit event
        env.events()
            .publish((Symbol::new(env, "badge_grant"), address.clone()), badge);
    }

    Ok(())
}
