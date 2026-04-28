use soroban_sdk::{contracttype, Address, BytesN, String, Symbol, Vec, U256};

// ─────────────────────────────────────────────────────────────────────────────
// Quest
// ─────────────────────────────────────────────────────────────────────────────
// Quest is already lean (8 fields, no Vec).  No split needed.

/// Represents a quest on the StellarEarn platform.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Quest {
    /// Unique identifier for the quest.
    pub id: Symbol,
    /// Address of the quest creator.
    pub creator: Address,
    /// Address of the token used for rewards.
    pub reward_asset: Address,
    /// Amount of tokens rewarded per successful submission.
    pub reward_amount: i128,
    /// Address authorized to approve or reject submissions.
    pub verifier: Address,
    /// Unix timestamp when the quest expires.
    pub deadline: u64,
    /// Current status of the quest.
    pub status: QuestStatus,
    /// Total number of successful claims.
    pub total_claims: u32,
}

/// Possible states of a quest.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum QuestStatus {
    /// Quest is open for submissions.
    Active,
    /// Quest is temporarily paused by an admin or creator.
    Paused,
    /// Quest has reached its claim limit or been manually closed.
    Completed,
    /// Quest deadline has passed.
    Expired,
    /// Quest was cancelled by the creator.
    Cancelled,
}

// ─────────────────────────────────────────────────────────────────────────────
// Submission
// ─────────────────────────────────────────────────────────────────────────────
// Submission is lean (5 fields, fixed-size BytesN<32>).  No split needed.

/// Represents a user's submission for a quest.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Submission {
    /// ID of the quest this submission is for.
    pub quest_id: Symbol,
    /// Address of the user who submitted.
    pub submitter: Address,
    /// Hash of the proof (e.g., IPFS CID or custom proof).
    pub proof_hash: BytesN<32>,
    /// Current status of the submission.
    pub status: SubmissionStatus,
    /// Unix timestamp when the submission was created.
    pub timestamp: u64,
}

/// Possible states of a quest submission.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubmissionStatus {
    /// Awaiting review by the verifier.
    Pending,
    /// Approved by the verifier, reward can be claimed.
    Approved,
    /// Rejected by the verifier.
    Rejected,
    /// Reward has been successfully claimed.
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

/// Possible states of a dispute.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeStatus {
    /// Dispute has been opened and is awaiting review.
    Pending,
    /// Arbitrator is currently reviewing the evidence.
    UnderReview,
    /// Dispute has been resolved by the arbitrator.
    Resolved,
    /// Dispute was withdrawn by the initiator.
    Withdrawn,
    Appealed,
}

/// Represents a dispute over a rejected submission.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    /// ID of the quest in dispute.
    pub quest_id: Symbol,
    /// Address of the user who initiated the dispute.
    pub initiator: Address,
    /// Address of the designated arbitrator.
    pub arbitrator: Address,
    /// Current status of the dispute.
    pub status: DisputeStatus,
    /// Unix timestamp when the dispute was filed.
    pub filed_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]

/// A commitment for a submission to prevent front-running.
pub struct Commitment {
    /// Hash of the submission proof + salt.
    pub hash: BytesN<32>,
    /// Unix timestamp of the commitment.
    pub timestamp: u64,
}

/// Core user statistics (Hot path).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserCore {
    /// Total experience points earned.

pub struct UserCore {

    pub xp: u64,
    /// Current user level.
    pub level: u32,
    /// Total number of quests successfully completed.
    pub quests_completed: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Commitment {
    pub hash: BytesN<32>,
    pub timestamp: u64,
}

/// Separate storage entry for a user's badge collection.
/// Loaded only when badges are displayed or granted.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserBadges {
    pub badges: Vec<Badge>,
}

/// Achievement badges that can be granted to users.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Badge {
    /// Initial badge for new users.
    Rookie,
    /// For users who have explored multiple quests.
    Explorer,
    /// For experienced quest completers.
    Veteran,
    /// For top-tier contributors.
    Master,
    /// The highest achievement level.
    Legend,
}

/// Backward-compatible alias: existing code that references `UserStats` still
/// compiles.  The `badges` field has moved to `UserBadges`.
pub type UserStats = UserCore;

// ─────────────────────────────────────────────────────────────────────────────
// EscrowInfo  →  EscrowBalances  +  EscrowMeta
// ─────────────────────────────────────────────────────────────────────────────

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
// QuestMetadata
// ─────────────────────────────────────────────────────────────────────────────

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
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QuestMetadata {
    pub title: String,
    pub description: MetadataDescription,
    pub requirements: Vec<String>,
    pub category: String,
    pub tags: Vec<String>,
}

/// Options for providing a quest description.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MetadataDescription {
    /// Inline text description.
    Inline(String),
    /// Hash of an external description (e.g., IPFS CID).
    Hash(BytesN<32>),
}

/// Administrative roles within the contract.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Role {
    /// Full administrative control, including upgrades.
    SuperAdmin = 0,
    /// General administrative tasks (e.g., pausing quests).
    Admin = 1,
    /// Authorized to pause/unpause the entire contract.
    Pauser = 2,
    /// Manages oracle configurations.
    OracleAdmin = 3,
    /// Manages platform and creator statistics.
    StatsAdmin = 4,
    /// Authorized to grant badges to users.
    BadgeAdmin = 5,
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────────────────────

/// Platform-wide statistics.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlatformStats {
    /// Total number of quests ever created.
    pub total_quests_created: u64,
    /// Total number of submissions received across all quests.
    pub total_submissions: u64,
    /// Total rewards distributed (in asset units).
    pub total_rewards_distributed: u128,
    /// Total number of unique users who interacted with the contract.
    pub total_active_users: u64,
    /// Total number of rewards claimed.
    pub total_rewards_claimed: u64,
}

/// Statistics for a specific quest creator.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreatorStats {
    /// Number of quests created by this user.
    pub quests_created: u32,
    /// Total amount of rewards posted in escrows.
    pub total_rewards_posted: i128,
    /// Total submissions received for their quests.
    pub total_submissions_received: u32,
    /// Total number of claims paid out.
    pub total_claims_paid: u32,
    /// Creator's reputation score.
    pub reputation_score: u32,
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Inputs
// ─────────────────────────────────────────────────────────────────────────────

/// Batch input for quest registration.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BatchQuestInput {
    pub id: Symbol,
    pub reward_asset: Address,
    pub reward_amount: i128,
    pub verifier: Address,
    pub deadline: u64,
}

/// Batch input for approving multiple submissions.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BatchApprovalInput {
    /// ID of the quest the submissions belong to.
    pub quest_id: Symbol,
    /// List of submitter addresses to approve.
    pub submissions: Vec<Address>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Oracle Types
// ─────────────────────────────────────────────────────────────────────────────

/// Price data returned by an oracle.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceData {
    /// Base asset of the price pair.
    pub base_asset: Address,
    /// Quote asset of the price pair.
    pub quote_asset: Address,
    /// Price value scaled by decimals.
    pub price: U256,
    /// Number of decimal places in the price.
    pub decimals: u32,
    /// Unix timestamp of the price data.
    pub timestamp: u64,
    /// Confidence score (0-100 percentage).
    pub confidence: u32,
}

/// Types of oracle providers supported.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OracleType {
    /// Standard Stellar asset price.
    StellarAsset,
    /// External Stellar oracle contract.
    StellarOracle,
    /// Custom price feed implementation.
    Custom,
}

/// Configuration for a price oracle.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleConfig {
    /// Address of the oracle contract.
    pub oracle_address: Address,
    /// Type of oracle provider.
    pub oracle_type: OracleType,
    /// Maximum age of price data allowed (seconds).
    pub max_age_seconds: u64,
    /// Minimum confidence score required.
    pub min_confidence: u32,
    /// Whether this oracle is currently enabled.
    pub is_active: bool,
}

/// Request parameters for fetching a price feed.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceFeedRequest {
    /// Base asset for the price pair.
    pub base_asset: Address,
    /// Quote asset for the price pair.
    pub quote_asset: Address,
    /// Maximum allowed age of the price data.
    pub max_age_seconds: u64,
}

/// Response from a specific oracle.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleResponse {
    /// The price data provided.
    pub price_data: PriceData,
    /// Address of the responding oracle.
    pub oracle_address: Address,
    /// Unix timestamp when the response was received.
    pub response_timestamp: u64,
}

/// Aggregated price result from multiple oracle sources.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AggregatedPrice {
    /// Base asset of the price pair.
    pub base_asset: Address,
    /// Quote asset of the price pair.
    pub quote_asset: Address,
    /// Weighted average price from all sources.
    pub weighted_price: U256,
    /// Number of decimal places in the weighted price.
    pub decimals: u32,
    /// Number of sources that successfully provided data.
    pub sources_used: u32,
    /// Total number of sources consulted.
    pub total_sources: u32,
    /// Overall confidence score of the aggregated price.
    pub confidence_score: u32,
    /// Unix timestamp of the aggregated data.
    pub timestamp: u64,
}
