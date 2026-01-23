use soroban_sdk::{contracttype, Address, BytesN, Symbol, Vec};

/// Status of a quest
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum QuestStatus {
    /// Quest is active and accepting submissions
    Active,
    /// Quest is temporarily paused
    Paused,
    /// Quest has reached participant limit or been manually completed
    Completed,
    /// Quest deadline has passed
    Expired,
}

/// Status of a submission
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubmissionStatus {
    /// Submission is awaiting verification
    Pending,
    /// Submission has been approved
    Approved,
    /// Submission has been rejected
    Rejected,
    /// Reward has been paid out
    Paid,
}

/// Quest structure with participant limit tracking
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Quest {
    /// Unique quest identifier
    pub id: Symbol,
    /// Address of the quest creator
    pub creator: Address,
    /// Asset address for rewards
    pub reward_asset: Address,
    /// Reward amount per participant
    pub reward_amount: i128,
    /// Address authorized to verify submissions
    pub verifier: Address,
    /// Quest deadline (Unix timestamp)
    pub deadline: u64,
    /// Current quest status
    pub status: QuestStatus,
    /// Maximum number of participants allowed
    pub max_participants: u32,
    /// Total number of approved claims
    pub total_claims: u32,
}

/// Submission structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Submission {
    /// Associated quest ID
    pub quest_id: Symbol,
    /// Address of the submitter
    pub submitter: Address,
    /// Hash of the proof data
    pub proof_hash: BytesN<32>,
    /// Current submission status
    pub status: SubmissionStatus,
    /// Submission timestamp
    pub timestamp: u64,
}

/// User reputation statistics
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserStats {
    /// User address
    pub address: Address,
    /// Total experience points earned
    pub total_xp: u32,
    /// Current user level
    pub level: u32,
    /// Number of quests completed
    pub quests_completed: u32,
    /// Earned badges
    pub badges: Vec<Symbol>,
}
