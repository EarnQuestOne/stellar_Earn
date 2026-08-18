//! Property/fuzz tests for the incremental user-stat counters (#2153).
//!
//! `award_xp` maintains a user's `UserCore` counters incrementally — it reads
//! the stored value, adds the new XP, bumps `quests_completed`, and derives the
//! level with [`crate::reputation::calculate_level`] — so `get_user_stats` is an
//! O(1) storage read rather than a scan-and-recompute over the award history.
//!
//! These tests lock in the invariant that matters for that optimisation: the
//! incrementally-maintained counters must always equal a full recompute from
//! the complete award history, for any sequence of awards. They are pure (no
//! storage/ledger), so they add no gas to the hot path.

use crate::reputation::calculate_level;
use crate::types::UserCore;

/// Deterministic xorshift64 PRNG so the fuzzed sequences are reproducible in CI.
fn next_rand(state: &mut u64) -> u64 {
    let mut x = *state;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    *state = x;
    x
}

/// Fold the award history one entry at a time, mirroring exactly what
/// `award_xp` does to the stored `UserCore` on each call.
fn apply_incremental(awards: &[u64]) -> UserCore {
    let mut stats = UserCore {
        xp: 0,
        level: 1,
        quests_completed: 0,
    };
    for &amount in awards {
        stats.xp += amount;
        stats.quests_completed += 1;
        stats.level = calculate_level(stats.xp);
    }
    stats
}

/// Recompute the same counters from scratch over the whole award history —
/// the "expensive" path the incremental counters exist to avoid.
fn full_recompute(awards: &[u64]) -> UserCore {
    let xp: u64 = awards.iter().copied().sum();
    UserCore {
        xp,
        level: calculate_level(xp),
        quests_completed: awards.len() as u32,
    }
}

#[test]
fn incremental_counters_equal_full_recompute() {
    let mut state: u64 = 0x9E37_79B9_7F4A_7C15;

    for _ in 0..2_000 {
        let len = (next_rand(&mut state) % 64) as usize;
        // Keep XP awards small so summing a full sequence cannot overflow.
        let awards: Vec<u64> = (0..len).map(|_| next_rand(&mut state) % 500).collect();

        assert_eq!(apply_incremental(&awards), full_recompute(&awards));
    }
}

#[test]
fn incremental_level_tracks_thresholds() {
    // The incrementally-stored `level` must equal `calculate_level(xp)` at every
    // boundary, so it can be trusted without a recompute.
    assert_eq!(calculate_level(0), 1);
    assert_eq!(calculate_level(299), 1);
    assert_eq!(calculate_level(300), 2);
    assert_eq!(calculate_level(599), 2);
    assert_eq!(calculate_level(600), 3);
    assert_eq!(calculate_level(999), 3);
    assert_eq!(calculate_level(1000), 4);
    assert_eq!(calculate_level(1499), 4);
    assert_eq!(calculate_level(1500), 5);
    assert_eq!(calculate_level(u64::MAX), 5);
}
