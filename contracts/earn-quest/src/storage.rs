use soroban_sdk::{contracttype, Env, Symbol, Address};
use crate::types::{Quest, Submission, UserStats};
use crate::errors::Error;

#[contracttype]
pub enum DataKey {
    Quest(Symbol),
    Submission(Symbol, Address),
    UserStats(Address),
}

pub fn has_quest(env: &Env, id: &Symbol) -> bool {
    env.storage().instance().has(&DataKey::Quest(id.clone()))
}

pub fn get_quest(env: &Env, id: &Symbol) -> Result<Quest, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Quest(id.clone()))
        .ok_or(Error::QuestNotFound)
}

pub fn set_quest(env: &Env, id: &Symbol, quest: &Quest) {
    env.storage().instance().set(&DataKey::Quest(id.clone()), quest);
}

pub fn get_submission(env: &Env, quest_id: &Symbol, submitter: &Address) -> Result<Submission, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Submission(quest_id.clone(), submitter.clone()))
        .ok_or(Error::SubmissionNotFound)
}

pub fn set_submission(env: &Env, quest_id: &Symbol, submitter: &Address, submission: &Submission) {
    env.storage()
        .instance()
        .set(&DataKey::Submission(quest_id.clone(), submitter.clone()), submission);
}

pub fn get_user_stats(env: &Env, user: &Address) -> Result<UserStats, Error> {
    env.storage()
        .instance()
        .get(&DataKey::UserStats(user.clone()))
        .ok_or(Error::UserStatsNotFound)
}

pub fn set_user_stats(env: &Env, user: &Address, stats: &UserStats) {
    env.storage()
        .instance()
        .set(&DataKey::UserStats(user.clone()), stats);
}
