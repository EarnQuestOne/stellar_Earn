// types.rs
use soroban_sdk::{contracttype, Address, BytesN, Symbol};

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

pub struct Submission {
    pub quest_id: Symbol,
    pub submitter: Address,
    pub proof_hash: BytesN<32>,
    pub status: SubmissionStatus,
    pub timestamp: u64,
}

pub struct UserStats {
    pub address: Address,
    pub total_xp: u32,
    pub level: u32,
    pub quests_completed: u32,
    pub badges: Vec<Symbol>,
}

pub enum QuestStatus {
    Active,
    Paused,
    Completed,
    Expired,
}

pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
    Paid,
}
