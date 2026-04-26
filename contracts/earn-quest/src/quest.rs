use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{BatchQuestInput, MetadataDescription, Quest, QuestMetadata, QuestStatus};
use crate::validation;
use soroban_sdk::{Address, Env, Symbol, Vec};

const MAX_METADATA_TITLE_LEN: u32 = 80;
const MAX_METADATA_CATEGORY_LEN: u32 = 40;
const MAX_METADATA_TAG_LEN: u32 = 32;
const MAX_METADATA_REQUIREMENT_LEN: u32 = 200;
const MAX_METADATA_INLINE_DESCRIPTION_LEN: u32 = 1200;
const MAX_METADATA_TAGS: u32 = 15;
const MAX_METADATA_REQUIREMENTS: u32 = 20;

pub fn register_quest(
    env: &Env,
    id: &Symbol,
    creator: &Address,
    reward_asset: &Address,
    reward_amount: i128,
    verifier: &Address,
    deadline: u64,
) -> Result<(), Error> {
    validation::validate_symbol_length(id)?;

    if storage::has_quest(env, id) {
        return Err(Error::QuestAlreadyExists);
    }

    validation::validate_reward_amount(reward_amount)?;
    validation::validate_deadline(env, deadline)?;
    validation::validate_addresses_distinct(creator, verifier)?;

    let quest = Quest {
        id: id.clone(),
        creator: creator.clone(),
        reward_asset: reward_asset.clone(),
        reward_amount,
        verifier: verifier.clone(),
        deadline,
        status: QuestStatus::Active,
        total_claims: 0,
    };

    storage::set_quest(env, id, &quest);
    storage::add_quest_id(env, id)?;

    events::quest_registered(
        env,
        id.clone(),
        creator.clone(),
        reward_asset.clone(),
        reward_amount,
        verifier.clone(),
        deadline,
    );

    Ok(())
}

pub fn register_quest_with_metadata(
    env: &Env,
    id: &Symbol,
    creator: &Address,
    reward_asset: &Address,
    reward_amount: i128,
    verifier: &Address,
    deadline: u64,
    metadata: &QuestMetadata,
) -> Result<(), Error> {
    register_quest(env, id, creator, reward_asset, reward_amount, verifier, deadline)?;
    validate_metadata(metadata)?;
    storage::set_quest_metadata(env, id, metadata);
    Ok(())
}

pub fn register_quests_batch(
    env: &Env,
    creator: &Address,
    quests: &Vec<BatchQuestInput>,
) -> Result<(), Error> {
    let len = quests.len();
    validation::validate_batch_quest_size(len)?;

    for i in 0u32..len {
        let q = quests.get(i).ok_or(Error::IndexOutOfBounds)?;
        register_quest(
            env,
            &q.id,
            creator,
            &q.reward_asset,
            q.reward_amount,
            &q.verifier,
            q.deadline,
        )?;
    }

    Ok(())
}

/// Pause a quest (admin only).
///
/// Validates:
/// - Quest exists
/// - Status transition (Active -> Paused) is valid
pub fn pause_quest(env: &Env, id: &Symbol, caller: &Address) -> Result<(), Error> {
    let quest = storage::get_quest(env, id)?;

    // Validate status transition
    validation::validate_quest_status_transition(&quest.status, &QuestStatus::Paused)?;

    // Update status directly to avoid redundant read
    let mut quest = quest;
    quest.status = QuestStatus::Paused;
    storage::set_quest(env, id, &quest);

    // EMIT EVENT: QuestPaused
    events::quest_paused(env, id.clone(), caller.clone());

    Ok(())
}

/// Resume a quest (admin only).
///
/// Validates:
/// - Quest exists
/// - Status transition (Paused -> Active) is valid
pub fn resume_quest(env: &Env, id: &Symbol, caller: &Address) -> Result<(), Error> {
    let quest = storage::get_quest(env, id)?;

    // Validate status transition
    validation::validate_quest_status_transition(&quest.status, &QuestStatus::Active)?;

    // Update status directly to avoid redundant read
    let mut quest = quest;
    quest.status = QuestStatus::Active;
    storage::set_quest(env, id, &quest);

    // EMIT EVENT: QuestResumed
    events::quest_resumed(env, id.clone(), caller.clone());

    Ok(())
}

pub fn update_quest_metadata(
    env: &Env,
    quest_id: &Symbol,
    updater: &Address,
    metadata: &QuestMetadata,
) -> Result<(), Error> {
    let quest = storage::get_quest(env, quest_id)?;
    if &quest.creator != updater && !storage::is_admin(env, updater) {
        return Err(Error::Unauthorized);
    }
    validate_metadata(metadata)?;
    storage::set_quest_metadata(env, quest_id, metadata);
    Ok(())
}

fn validate_metadata(metadata: &QuestMetadata) -> Result<(), Error> {
    validate_string_len(&metadata.title, MAX_METADATA_TITLE_LEN)?;
    validate_string_len(&metadata.category, MAX_METADATA_CATEGORY_LEN)?;

    validation::validate_array_length(metadata.tags.len(), MAX_METADATA_TAGS)?;
    for i in 0..metadata.tags.len() {
        let tag = metadata.tags.get(i).ok_or(Error::IndexOutOfBounds)?;
        validate_string_len(&tag, MAX_METADATA_TAG_LEN)?;
    }

    validation::validate_array_length(metadata.requirements.len(), MAX_METADATA_REQUIREMENTS)?;
    for i in 0..metadata.requirements.len() {
        let requirement = metadata.requirements.get(i).ok_or(Error::IndexOutOfBounds)?;
        validate_string_len(
            &requirement,
            MAX_METADATA_REQUIREMENT_LEN,
        )?;
    }

    if let MetadataDescription::Inline(desc) = &metadata.description {
        validate_string_len(desc, MAX_METADATA_INLINE_DESCRIPTION_LEN)?;
    }

    Ok(())
}

fn validate_string_len(value: &soroban_sdk::String, max: u32) -> Result<(), Error> {
    if value.len() > max {
        return Err(Error::StringTooLong);
    }
    Ok(())
}

//================================================================================
// Query Functions
//================================================================================

pub fn get_quests_by_status(
    env: &Env,
    status: &QuestStatus,
    offset: u32,
    limit: u32,
) -> Vec<Quest> {
    let ids = storage::get_quest_ids(env);
    let mut results = Vec::new(env);
    let mut matched = 0u32;
    let mut count = 0u32;

    for i in 0..ids.len() {
        if i >= validation::MAX_SCAN_ITERATIONS || count >= limit {
            break;
        }
        let id = ids.get(i).unwrap();
        // Single read: get_quest returns Err if not found, which we ignore
        if let Ok(quest) = storage::get_quest(env, &id) {
            if &quest.status == status {
                if matched >= offset {
                    results.push_back(quest);
                    count += 1;
                }
                matched += 1;
            }
        }
    }

    results
}

pub fn get_quests_by_creator(
    env: &Env,
    creator: &Address,
    offset: u32,
    limit: u32,
) -> Vec<Quest> {
    let ids = storage::get_quest_ids(env);
    let mut results = Vec::new(env);
    let mut matched = 0u32;
    let mut count = 0u32;

    for i in 0..ids.len() {
        if i >= validation::MAX_SCAN_ITERATIONS || count >= limit {
            break;
        }
        // Bounds check before accessing
        if let Some(id) = ids.get(i) {
            if let Ok(quest) = storage::get_quest(env, &id) {
                if &quest.creator == creator {
                    if matched >= offset {
                        results.push_back(quest);
                        count += 1;
                    }
                    matched += 1;
                }
            }
        }
    }

    results
}

pub fn get_active_quests(env: &Env, offset: u32, limit: u32) -> Vec<Quest> {
    get_quests_by_status(env, &QuestStatus::Active, offset, limit)
}

pub fn get_quests_by_reward_range(
    env: &Env,
    min_reward: i128,
    max_reward: i128,
    offset: u32,
    limit: u32,
) -> Vec<Quest> {
    let ids = storage::get_quest_ids(env);
    let mut results = Vec::new(env);
    let mut matched = 0u32;
    let mut count = 0u32;

    for i in 0..ids.len() {
        if i >= validation::MAX_SCAN_ITERATIONS || count >= limit {
            break;
        }
        // Bounds check before accessing
        if let Some(id) = ids.get(i) {
            if let Ok(quest) = storage::get_quest(env, &id) {
                if quest.reward_amount >= min_reward && quest.reward_amount <= max_reward {
                    if matched >= offset {
                        results.push_back(quest);
                        count += 1;
                    }
                    matched += 1;
                }
            }
        }
    }

    results
}
