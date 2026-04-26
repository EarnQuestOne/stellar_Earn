use crate::init::ContractConfig;
use crate::pausable::PauseState;
use crate::types::{Quest, Submission, UserStats};
use soroban_sdk::{contracttype, Address, Env, Symbol};

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
    /// Contract configuration storage key
    Config,
    /// Escrow balance per quest
    EscrowBal(Symbol),
    /// Data version storage key
    Version,
    /// Pause state storage key
    PauseState,
}

/// Get current data version
pub fn get_data_version(env: &Env) -> u32 {
    let key = StorageKey::Version;
    env.storage().persistent().get(&key).unwrap_or(0)
}

/// Set data version
pub fn set_data_version(env: &Env, version: u32) {
    let key = StorageKey::Version;
    env.storage().persistent().set(&key, &version);
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
#[allow(dead_code)]
pub fn has_user_stats(env: &Env, address: &Address) -> bool {
    let key = StorageKey::UserStats(address.clone());
    env.storage().persistent().has(&key)
}
/// Store contract configuration
pub fn set_config(env: &Env, config: &ContractConfig) {
    let key = StorageKey::Config;
    env.storage().persistent().set(&key, config);
}

/// Get contract configuration
pub fn get_config(env: &Env) -> Option<ContractConfig> {
    let key = StorageKey::Config;
    env.storage().persistent().get(&key)
}

/// Check if contract is initialized
pub fn is_initialized(env: &Env) -> bool {
    let key = StorageKey::Config;
    env.storage().persistent().has(&key)
}

/// Get escrow balance for a quest (returns 0 if not set)
pub fn get_escrow_balance(env: &Env, quest_id: &Symbol) -> i128 {
    let key = StorageKey::EscrowBal(quest_id.clone());
    env.storage().persistent().get(&key).unwrap_or(0)
}

/// Set escrow balance for a quest
pub fn set_escrow_balance(env: &Env, quest_id: &Symbol, balance: i128) {
    let key = StorageKey::EscrowBal(quest_id.clone());
    env.storage().persistent().set(&key, &balance);
}

/// Store pause state
pub fn set_pause_state(env: &Env, pause_state: &PauseState) {
    let key = StorageKey::PauseState;
    env.storage().persistent().set(&key, pause_state);
}

/// Get pause state
pub fn get_pause_state(env: &Env) -> Option<PauseState> {
    let key = StorageKey::PauseState;
    env.storage().persistent().get(&key)
}

/// Check if pause state exists
#[allow(dead_code)]
pub fn has_pause_state(env: &Env) -> bool {
    let key = StorageKey::PauseState;
    env.storage().persistent().has(&key)
}

/// Emit pause event
pub fn emit_pause_event(env: &Env, is_paused: bool, reason: Option<Symbol>) {
    #[soroban_sdk::contracttype]
    #[derive(Clone)]
    struct PauseEvent {
        is_paused: bool,
        reason: Option<Symbol>,
        timestamp: u64,
    }

    env.events().publish(
        ("pause", Symbol::new(env, "state_changed")),
        PauseEvent {
            is_paused,
            reason,
            timestamp: env.ledger().timestamp(),
        },
    );
}

/// Emit unpause event
pub fn emit_unpause_event(env: &Env) {
    #[soroban_sdk::contracttype]
    #[derive(Clone)]
    struct UnpauseEvent {
        timestamp: u64,
    }

    env.events().publish(
        ("pause", Symbol::new(env, "contract_resumed")),
        UnpauseEvent {
            timestamp: env.ledger().timestamp(),
        },
    );
}

/// Emit emergency withdrawal event
#[allow(dead_code)]
pub fn emit_emergency_withdrawal(env: &Env, user: Address, amount: i128, quest_id: Symbol) {
    #[soroban_sdk::contracttype]
    #[derive(Clone)]
    struct EmergencyWithdrawalEvent {
        user: Address,
        amount: i128,
        quest_id: Symbol,
        timestamp: u64,
    }

    env.events().publish(
        ("emergency", Symbol::new(env, "withdrawal")),
        EmergencyWithdrawalEvent {
            user,
            amount,
            quest_id,
            timestamp: env.ledger().timestamp(),
        },
    );
}
