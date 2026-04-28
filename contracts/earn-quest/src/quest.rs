use crate::errors::Error;
use crate::events;
use crate::storage;
use crate::types::{BatchQuestInput, MetadataDescription, Quest, QuestMetadata, QuestStatus, Role};
use crate::validation;
use soroban_sdk::{Address, Env, Symbol, Vec};

const MAX_METADATA_TITLE_LEN: u32 = 80;
const MAX_METADATA_CATEGORY_LEN: u32 = 40;
const MAX_METADATA_TAG_LEN: u32 = 32;
const MAX_METADATA_REQUIREMENT_LEN: u32 = 200;
const MAX_METADATA_INLINE_DESCRIPTION_LEN: u32 = 1200;
const MAX_METADATA_TAGS: u32 = 15;
const MAX_METADATA_REQUIREMENTS: u32 = 20;

/// Registers a new quest in the platform's storage.
///
/// This function creates a new `Quest` record with the status set to `Active`.
/// It validates the quest's parameters before persisting the data.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `id` - A unique symbol identifying the quest.
/// * `creator` - The address of the account creating the quest.
/// * `reward_asset` - The address of the token asset used for rewards.
/// * `reward_amount` - The amount of the reward asset per successful submission.
/// * `verifier` - The address authorized to verify submissions for this quest.
/// * `deadline` - The Unix timestamp after which the quest expires.
///
/// # Returns
///
/// * `Ok(())` if the quest is successfully registered.
/// * `Err(Error::QuestAlreadyExists)` if a quest with the same ID already exists.
/// * `Err(Error)` if validation fails for any parameter.
///
/// # Example
///
/// ```rust
/// let id = symbol_short!("QUEST1");
/// register_quest(&env, &id, &creator, &token, 1000, &verifier, 1700000000)?;
/// ```
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

/// Registers a new quest along with its detailed metadata.
///
/// This is a convenience function that calls `register_quest` and then
/// stores the provided metadata in a split storage pattern (Core + Extended).
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `id` - A unique symbol identifying the quest.
/// * `creator` - The address of the account creating the quest.
/// * `reward_asset` - The address of the token asset used for rewards.
/// * `reward_amount` - The amount of the reward asset per successful submission.
/// * `verifier` - The address authorized to verify submissions for this quest.
/// * `deadline` - The Unix timestamp after which the quest expires.
/// * `metadata` - The comprehensive metadata including title, description, and tags.
///
/// # Returns
///
/// * `Ok(())` if registration and metadata storage are successful.
/// * `Err(Error)` if quest registration or metadata validation fails.
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

/// Registers multiple quests in a single batch operation.
///
/// This function iterates through a vector of `BatchQuestInput` and registers
/// each one. If any registration fails, the entire transaction reverts.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `creator` - The address of the account creating these quests.
/// * `quests` - A vector of quest registration inputs.
///
/// # Returns
///
/// * `Ok(())` if all quests are successfully registered.
/// * `Err(Error::BatchSizeExceeded)` if the number of quests exceeds the limit.
/// * `Err(Error)` if any individual quest registration fails.
pub fn register_quests_batch(
    env: &Env,
    creator: &Address,
    quests: &Vec<BatchQuestInput>,
) -> Result<(), Error> {
    let len = quests.len();
    validation::validate_batch_quest_size(len)?;

    for i in 0u32..len {
        let batch = quests.get(i).unwrap();
        for j in 0u32..batch.quests.len() {
            let q = batch.quests.get(j).unwrap();
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

/// Updates the metadata for an existing quest.
///
/// Only the original creator or an administrator can update quest metadata.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `quest_id` - The symbol of the quest to update.
/// * `updater` - The address of the account performing the update.
/// * `metadata` - The new metadata content.
///
/// # Returns
///
/// * `Ok(())` if the update is successful.
/// * `Err(Error::Unauthorized)` if the updater is not the creator or an admin.
/// * `Err(Error::QuestNotFound)` if the quest does not exist.
/// * `Err(Error)` if metadata validation fails.
pub fn update_quest_metadata(
    env: &Env,
    quest_id: &Symbol,
    updater: &Address,
    metadata: &QuestMetadata,
) -> Result<(), Error> {
    let quest = storage::get_quest(env, quest_id)?;
    if &quest.creator != updater
        && !(storage::is_super_admin(env, updater)
            || storage::has_role(env, updater, &Role::Admin))
    {
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
        let tag = metadata.tags.get(i).unwrap();
        validate_string_len(&tag, MAX_METADATA_TAG_LEN)?;
    }

    validation::validate_array_length(metadata.requirements.len(), MAX_METADATA_REQUIREMENTS)?;
    for i in 0..metadata.requirements.len() {
        let requirement = metadata.requirements.get(i).unwrap();
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

/// Retrieves a list of quests filtered by their current status.
///
/// Supports pagination through `offset` and `limit` parameters.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `status` - The status to filter by (e.g., Active, Paused).
/// * `offset` - The number of matching quests to skip.
/// * `limit` - The maximum number of quests to return.
///
/// # Returns
///
/// A `Vec<Quest>` containing the matching quests.
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

/// Retrieves a list of quests created by a specific address.
///
/// Supports pagination through `offset` and `limit` parameters.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `creator` - The address of the quest creator.
/// * `offset` - The number of matching quests to skip.
/// * `limit` - The maximum number of quests to return.
///
/// # Returns
///
/// A `Vec<Quest>` containing the matching quests.
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

/// Retrieves a list of all currently active quests.
///
/// This is a convenience wrapper around `get_quests_by_status` with `QuestStatus::Active`.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `offset` - Pagination offset.
/// * `limit` - Pagination limit.
///
/// # Returns
///
/// A `Vec<Quest>` of active quests.
pub fn get_active_quests(env: &Env, offset: u32, limit: u32) -> Vec<Quest> {
    get_quests_by_status(env, &QuestStatus::Active, offset, limit)
}

/// Retrieves a list of quests whose reward amount falls within a specified range.
///
/// # Arguments
///
/// * `env` - The contract environment.
/// * `min_reward` - The minimum reward amount (inclusive).
/// * `max_reward` - The maximum reward amount (inclusive).
/// * `offset` - Pagination offset.
/// * `limit` - Pagination limit.
///
/// # Returns
///
/// A `Vec<Quest>` containing quests within the reward range.
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
