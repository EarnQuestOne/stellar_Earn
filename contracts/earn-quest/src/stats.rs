// ============================================================
// ADD THESE STRUCTS TO contracts/earn-quest/src/types.rs
// ============================================================
// Paste both structs at the bottom of the existing types.rs
// file. They reuse the existing `#[contracttype]` + `#[derive]` pattern.
// ============================================================

use soroban_sdk::contracttype;

/// Platform-wide aggregated statistics.
///
/// Updated atomically on every quest creation, submission, and claim.
/// Queried via `EarnQuestContract::get_platform_stats()`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlatformStats {
    /// Total number of quests ever registered (never decremented).
    pub total_quests_created: u64,
    /// Total number of proof submissions ever received.
    pub total_submissions: u64,
    /// Sum of `reward_amount` across all quests ever created (in token base units).
    /// Represents total value posted, not necessarily paid out.
    pub total_rewards_distributed: u128,
    /// Number of unique wallet addresses that have submitted at least once.
    pub total_active_users: u64,
    /// Number of rewards that reached the `Paid` status (successful claims).
    pub total_rewards_claimed: u64,
}

/// Per-creator statistics, scoped to a single quest creator address.
///
/// Updated on quest creation and whenever a submission or claim
/// targets a quest owned by this creator.
/// Queried via `EarnQuestContract::get_creator_stats(creator)`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreatorStats {
    /// Total quests created by this address.
    pub quests_created: u64,
    /// Sum of `reward_amount` across all quests created by this address.
    pub total_rewards_posted: u128,
    /// Total submissions received across all of this creator's quests.
    pub total_submissions_received: u64,
    /// Total successful claims paid out across all of this creator's quests.
    pub total_claims_paid: u64,
}