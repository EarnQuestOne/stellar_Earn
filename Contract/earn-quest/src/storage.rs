use crate::errors::Error;
use crate::types::{Quest, Submission};
use soroban_sdk::{contracttype, Address, Env, Symbol, Vec};

/// Storage keys for the contract
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Quest(Symbol),
    Submission(Symbol, Address),
    UserSubmissions(Address),
}

/// Store a quest
pub fn store_quest(env: &Env, quest: &Quest) -> Result<(), Error> {
    let key = DataKey::Quest(quest.id.clone());
    env.storage().instance().set(&key, quest);
    Ok(())
}

/// Get a quest by ID
pub fn get_quest(env: &Env, quest_id: &Symbol) -> Result<Quest, Error> {
    let key = DataKey::Quest(quest_id.clone());
    env.storage()
        .instance()
        .get(&key)
        .ok_or(Error::QuestNotFound)
}

/// Check if a quest exists
pub fn quest_exists(env: &Env, quest_id: &Symbol) -> bool {
    let key = DataKey::Quest(quest_id.clone());
    env.storage().instance().has(&key)
}

/// Store a submission
pub fn store_submission(env: &Env, submission: &Submission) -> Result<(), Error> {
    let key = DataKey::Submission(submission.quest_id.clone(), submission.submitter.clone());
    env.storage().instance().set(&key, submission);
    Ok(())
}

/// Get a submission by quest_id and submitter
pub fn get_submission(
    env: &Env,
    quest_id: &Symbol,
    submitter: &Address,
) -> Result<Submission, Error> {
    let key = DataKey::Submission(quest_id.clone(), submitter.clone());
    env.storage()
        .instance()
        .get(&key)
        .ok_or(Error::SubmissionNotFound)
}

/// Check if a submission exists
pub fn submission_exists(env: &Env, quest_id: &Symbol, submitter: &Address) -> bool {
    let key = DataKey::Submission(quest_id.clone(), submitter.clone());
    env.storage().instance().has(&key)
}

/// Add submission to user's submission list
pub fn add_user_submission(env: &Env, user: &Address, quest_id: &Symbol) -> Result<(), Error> {
    let key = DataKey::UserSubmissions(user.clone());

    let mut user_submissions: Vec<Symbol> =
        env.storage().instance().get(&key).unwrap_or(Vec::new(env));

    // Check for duplicates
    if !user_submissions.contains(quest_id) {
        user_submissions.push_back(quest_id.clone());
        env.storage().instance().set(&key, &user_submissions);
    }

    Ok(())
}

/// Get all quest IDs submitted by a user
pub fn get_user_submissions(env: &Env, user: &Address) -> Vec<Symbol> {
    let key = DataKey::UserSubmissions(user.clone());
    env.storage().instance().get(&key).unwrap_or(Vec::new(env))
}
