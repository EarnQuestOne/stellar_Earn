use soroban_sdk::{contracttype, Address, BytesN, String, Symbol, Vec, U256};

// ─────────────────────────────────────────────────────────────────────────────
// Quest
// ─────────────────────────────────────────────────────────────────────────────
// Quest is already lean (8 fields, no Vec).  No split needed.

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Quest {
    pub id: Symbol,
    pub creator: Address,
    pub reward_asset: Address,
    pub reward_amount: i128,
    pub verifier: Address,
    pub deadline: u64,
    pub status: QuestStatus,
    pub total_claims: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum QuestStatus {
    Active,
    Paused,
    Completed,
    Expired,
    Cancelled,
}

// ─────────────────────────────────────────────────────────────────────────────
// Submission
// ─────────────────────────────────────────────────────────────────────────────
// Submission is lean (5 fields, fixed-size BytesN<32>).  No split needed.

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Submission {
    pub quest_id: Symbol,
    pub submitter: Address,
    pub proof_hash: BytesN<32>,
    pub status: SubmissionStatus,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
    Paid,
}

// ─────────────────────────────────────────────────────────────────────────────
// UserStats  →  UserCore  +  UserBadges
// ─────────────────────────────────────────────────────────────────────────────
//
// BEFORE (single entry, always loaded):
//   UserStats { xp: u64, level: u32, quests_completed: u32, badges: Vec<Badge> }
//
// AFTER:
//   UserCore   { xp, level, quests_completed }   ← hot path (award_xp, level check)
//   UserBadges { badges: Vec<Badge> }             ← cold path (grant_badge, display)
//
// Gas savings:
//   - award_xp() no longer deserialises the badge Vec (up to 50 entries × ~8 bytes)
//   - grant_badge() only loads the badge Vec, not the XP counters
//
// Backward compat:
//   `UserStats` is kept as a type alias for `UserCore` so existing public API
//   signatures (`get_user_stats`) are unchanged.  The `badges` field is now
//   fetched separately via `get_user_badges()`.

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeStatus {
    Pending,
    UnderReview,
    Resolved,
    Withdrawn,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    pub quest_id: Symbol,
    pub initiator: Address,
    pub arbitrator: Address,
    pub status: DisputeStatus,
    pub filed_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserStats {
    pub xp: u64,
    /// Current user level (1–5)
    pub level: u32,
    /// Number of quests successfully completed
    pub quests_completed: u32,
}

/// Separate storage entry for a user's badge collection.
/// Loaded only when badges are displayed or granted.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserBadges {
    pub badges: Vec<Badge>,
}

/// Backward-compatible alias: existing code that references `UserStats` still
/// compiles.  The `badges` field has moved to `UserBadges`.
pub type UserStats = UserCore;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Badge {
    Rookie,
    Explorer,
    Veteran,
    Master,
    Legend,
}

// ─────────────────────────────────────────────────────────────────────────────
// EscrowInfo  →  EscrowBalances  +  EscrowMeta
// ─────────────────────────────────────────────────────────────────────────────
//
// BEFORE (9 fields, always loaded):
//   EscrowInfo {
//     quest_id, depositor, token,
//     total_deposited, total_paid_out, total_refunded,
//     is_active, created_at, deposit_count
//   }
//
// AFTER:
//   EscrowBalances { total_deposited, total_paid_out, total_refunded,
//                    is_active, deposit_count }   ← hot path (every payout/deposit)
//   EscrowMeta     { depositor, token, created_at }  ← cold path (refund, display)
//
// Gas savings:
//   - validate_sufficient() / record_payout() only load EscrowBalances (5 fields)
//     instead of 9 fields including two Address values (~32 bytes each)
//   - refund_remaining() loads EscrowMeta only when actually refunding
//
// Backward compat:
//   `EscrowInfo` is kept as a **view struct** (not stored) assembled on demand
//   by `get_escrow_info()` for the public query API.

/// Hot-path escrow data: loaded on every deposit, payout, and balance check.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowBalances {
    /// Total tokens deposited (cumulative, includes top-ups)
    pub total_deposited: i128,
    /// Total tokens paid out to quest completers
    pub total_paid_out: i128,
    /// Total tokens refunded back to creator
    pub total_refunded: i128,
    /// Whether this escrow is still active
    pub is_active: bool,
    /// Number of deposits made (1 = initial, >1 = top-ups)
    pub deposit_count: u32,
}

/// Cold-path escrow metadata: loaded only for refunds and display queries.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowMeta {
    /// Who deposited (must be quest creator)
    pub depositor: Address,
    /// Which token is held
    pub token: Address,
    /// Ledger timestamp when the escrow was first created
    pub created_at: u64,
}

/// Full escrow view — assembled from EscrowBalances + EscrowMeta.
/// NOT stored directly; returned by `get_escrow_info()` for the public API.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowInfo {
    /// Which quest this escrow belongs to
    pub quest_id: Symbol,
    /// Who deposited (must be quest creator)
    pub depositor: Address,
    /// Which token is held
    pub token: Address,
    /// Total tokens deposited (cumulative, includes top-ups)
    pub total_deposited: i128,
    /// Total tokens paid out to quest completers
    pub total_paid_out: i128,
    /// Total tokens refunded back to creator
    pub total_refunded: i128,
    /// Whether this escrow is still active
    pub is_active: bool,
    /// Ledger timestamp when the escrow was first created
    pub created_at: u64,
    /// Number of deposits made (1 = initial, >1 = top-ups)
    pub deposit_count: u32,
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestMetadata  →  QuestMetadataCore  +  QuestMetadataExtended
// ─────────────────────────────────────────────────────────────────────────────
//
// BEFORE (5 fields, Vec<String> always loaded):
//   QuestMetadata { title, description, requirements: Vec<String>,
//                   category, tags: Vec<String> }
//
// AFTER:
//   QuestMetadataCore     { title, description, category }  ← hot path (display)
//   QuestMetadataExtended { requirements, tags }            ← cold path (validation)
//
// Gas savings:
//   - Quest listing / title display only loads 3 scalar fields
//   - Requirements/tags (up to 20 + 15 strings × up to 200 bytes each) are
//     loaded only when a submitter reads the full quest detail

/// Hot-path metadata: title, description, category — shown in quest listings.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QuestMetadataCore {
    pub title: String,
    pub description: MetadataDescription,
    pub category: String,
}

/// Cold-path metadata: requirements and tags — loaded only for full detail view.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QuestMetadataExtended {
    pub requirements: Vec<String>,
    pub tags: Vec<String>,
}

/// Full metadata view — assembled from Core + Extended.
/// Returned by `get_quest_metadata()` for the public API.
/// Also accepted by `register_quest_with_metadata()` for convenience.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QuestMetadata {
    pub title: String,
    pub description: MetadataDescription,
    pub requirements: Vec<String>,
    pub category: String,
    pub tags: Vec<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MetadataDescription {
    Inline(String),
    Hash(BytesN<32>),
}

// ─────────────────────────────────────────────────────────────────────────────
// PlatformStats  →  individual counters
// ─────────────────────────────────────────────────────────────────────────────
//
// BEFORE (5 fields, entire struct rewritten for every single counter increment):
//   PlatformStats { total_quests_created, total_submissions,
//                   total_rewards_distributed, total_active_users,
//                   total_rewards_claimed }
//
// AFTER:
//   Each counter stored under its own DataKey so only the touched counter
//   is read + written per transaction.
//
// Gas savings:
//   - register_quest() increments only `total_quests_created` (1 read + 1 write)
//     instead of reading/writing all 5 counters (5× the I/O)
//   - submit_proof() increments only `total_submissions`
//   - claim_reward() increments only `total_rewards_claimed`
//
// Backward compat:
//   `PlatformStats` struct is kept for the `get_platform_stats()` query API.
//   It is assembled from individual counters on read.

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlatformStats {
    pub total_quests_created: u64,
    pub total_submissions: u64,
    pub total_rewards_distributed: u128,
    pub total_active_users: u64,
    pub total_rewards_claimed: u64,
}

//================================================================================
// Oracle Types and Interface
//================================================================================

/// Price data from an oracle
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceData {
    pub base_asset: Address,
    pub quote_asset: Address,
    pub price: U256,
    pub decimals: u32,
    pub timestamp: u64,
    pub confidence: u32, // 0-100 percentage confidence score
}

/// Oracle provider types
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OracleType {
    StellarAsset,
    StellarOracle,
    Custom,
}

/// Oracle configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleConfig {
    pub oracle_address: Address,
    pub oracle_type: OracleType,
    pub max_age_seconds: u64,
    pub min_confidence: u32,
    pub is_active: bool,
}

/// Price feed request
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceFeedRequest {
    pub base_asset: Address,
    pub quote_asset: Address,
    pub max_age_seconds: u64,
}

/// Oracle response wrapper
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleResponse {
    pub price_data: PriceData,
    pub oracle_address: Address,
    pub response_timestamp: u64,
}

/// Oracle aggregation result for multiple sources
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AggregatedPrice {
    pub base_asset: Address,
    pub quote_asset: Address,
    pub weighted_price: U256,
    pub decimals: u32,
    pub sources_used: u32,
    pub total_sources: u32,
    pub confidence_score: u32,
    pub timestamp: u64,
}
