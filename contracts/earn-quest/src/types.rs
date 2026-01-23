use soroban_sdk::{contracttype, Address, Symbol, BytesN, Vec};

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
pub struct Submission {
    pub quest_id: Symbol,
    pub submitter: Address,
    pub proof_hash: BytesN<32>,
    pub status: SubmissionStatus,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum QuestStatus {
    Active,
    Paused,
    Completed,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
    Paid,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserStats {
    pub xp: u64,
    pub level: u32,
    pub quests_completed: u32,
    pub badges: Vec<Badge>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Badge {
    Rookie,
    Explorer,
    Veteran,
    Master,
    Legend,
}
