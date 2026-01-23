use crate::types::{Quest, Submission, UserStats};
use crate::errors::Error;
use crate::types::{Quest, Submission};
use soroban_sdk::{contracttype, Address, Env, Symbol, Vec};

/// Storage keys for the contract
#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    /// Quest storage key
    Quest(Symbol),
    /// Submission storage key (quest_id, submitter)
    Submission(Symbol, Address),
    /// User stats storage key
    UserStats(Address),
}

/// Store a quest
pub fn set_quest(env: &Env, quest: &Quest) {
    let key = StorageKey::Quest(quest.id.clone());
    env.storage().persistent().set(&key, quest);
}

/// Get a quest
pub fn get_quest(env: &Env, quest_id: &Symbol) -> Option<Quest> {
    let key = StorageKey::Quest(quest_id.clone());
    env.storage().persistent().get(&key)
}

/// Check if a quest exists
pub fn has_quest(env: &Env, quest_id: &Symbol) -> bool {
    let key = StorageKey::Quest(quest_id.clone());
    env.storage().persistent().has(&key)
}

/// Store a submission
pub fn set_submission(env: &Env, submission: &Submission) {
    let key = StorageKey::Submission(submission.quest_id.clone(), submission.submitter.clone());
    env.storage().persistent().set(&key, submission);
}

/// Get a submission
pub fn get_submission(env: &Env, quest_id: &Symbol, submitter: &Address) -> Option<Submission> {
    let key = StorageKey::Submission(quest_id.clone(), submitter.clone());
    env.storage().persistent().get(&key)
}

/// Check if a submission exists
pub fn has_submission(env: &Env, quest_id: &Symbol, submitter: &Address) -> bool {
    let key = StorageKey::Submission(quest_id.clone(), submitter.clone());
    env.storage().persistent().has(&key)
}

/// Store user stats
pub fn set_user_stats(env: &Env, stats: &UserStats) {
    let key = StorageKey::UserStats(stats.address.clone());
    env.storage().persistent().set(&key, stats);
}

/// Get user stats
pub fn get_user_stats(env: &Env, address: &Address) -> Option<UserStats> {
    let key = StorageKey::UserStats(address.clone());
    env.storage().persistent().get(&key)
}

/// Check if user stats exist
pub fn has_user_stats(env: &Env, address: &Address) -> bool {
    let key = StorageKey::UserStats(address.clone());
    env.storage().persistent().has(&key)
}
